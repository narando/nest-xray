import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Segment, Subsegment } from "aws-xray-sdk";
import { RequestHandler } from "express";
import {
  TracingNotInitializedException,
  UnknownAsyncContextException,
} from "./exceptions";
import { AsyncContext } from "./hooks";
import { TracingConfig, XRayClient } from "./interfaces";
import {
  TRACING_ASYNC_CONTEXT_SEGMENT,
  TRACING_ASYNC_CONTEXT_SUBSEGMENT,
  XRAY_CLIENT,
} from "./tracing.constants";

// WORKAROUND: AWSXRay initializes quite early after importing and the
// Daemon address can not be changed after that. Our usual initialiation
// will happen later, so it can not have an effect.
// If you need a custom daemon address, use variable "AWS_XRAY_DAEMON_ADDRESS".
if (!process.env.AWS_XRAY_DAEMON_ADDRESS) {
  process.env.AWS_XRAY_DAEMON_ADDRESS = "172.17.0.1:2000";
}

@Injectable()
export class TracingService implements OnModuleInit {
  private readonly config: Required<TracingConfig>;
  constructor(
    @Inject(XRAY_CLIENT) private readonly xrayClient: XRayClient,
    private readonly asyncContext: AsyncContext,
    options: TracingConfig
  ) {
    this.config = {
      serviceName: options.serviceName || "example-service",
      rate: options.rate !== undefined ? options.rate : 1,
      daemonAddress: options.daemonAddress || "172.17.0.1:2000",
    }; // Set defaults
  }

  public onModuleInit() {
    // AWSXRay uses continuation-local-storage for the automatic mode, this
    // does not work in async/await Scenarios. We will implement our own
    // "automatic mode"

    this.xrayClient.enableManualMode();

    this.xrayClient.setDaemonAddress(this.config.daemonAddress);
    this.xrayClient.middleware.setSamplingRules(this.getSamplingRules());

    // This might result in "Error loading EC2 plugin" error message if ran
    // outside of EC2/ECS
    this.xrayClient.config([
      this.xrayClient.plugins.EC2Plugin,
      this.xrayClient.plugins.ECSPlugin,
    ]);

    // Disable errors on missing context
    this.xrayClient.setContextMissingStrategy(() => {});
  }

  public tracingMiddleware(): RequestHandler {
    return this.xrayClient.express.openSegment(this.config.serviceName);
  }

  public setRootSegment(segment: Segment) {
    try {
      this.asyncContext.set(TRACING_ASYNC_CONTEXT_SEGMENT, segment);
    } catch (err) {
      if (err instanceof UnknownAsyncContextException) {
        throw new TracingNotInitializedException();
      }

      throw err;
    }
  }

  public getRootSegment(): Segment {
    try {
      return this.asyncContext.get<string, Segment>(
        TRACING_ASYNC_CONTEXT_SEGMENT
      );
    } catch (err) {
      if (err instanceof UnknownAsyncContextException) {
        throw new TracingNotInitializedException();
      }

      throw err;
    }
  }

  public setSubSegment(segment: Subsegment) {
    try {
      this.asyncContext.set(TRACING_ASYNC_CONTEXT_SUBSEGMENT, segment);
    } catch (err) {
      if (err instanceof UnknownAsyncContextException) {
        throw new TracingNotInitializedException();
      }

      throw err;
    }
  }

  public getSubSegment(): Subsegment {
    try {
      return this.asyncContext.get<string, Subsegment>(
        TRACING_ASYNC_CONTEXT_SUBSEGMENT
      );
    } catch (err) {
      if (err instanceof UnknownAsyncContextException) {
        throw new TracingNotInitializedException();
      }

      throw err;
    }
  }

  public getTracingHeader(parentSegment: Subsegment): string {
    const rootSegment = this.getRootSegment();
    return `Root=${rootSegment.trace_id};Parent=${parentSegment.id};Sampled=1`;
  }

  public createSubSegment(name: string): Subsegment {
    const rootSegment = this.getRootSegment();

    const subSegment = rootSegment.addNewSubsegment(name);

    return subSegment;
  }

  private getSamplingRules() {
    return {
      rules: [
        {
          description: "LoadBalancer HealthCheck",
          http_method: "GET",
          host: "*",
          url_path: "/status",
          fixed_target: 0,
          rate: 0,
        },
      ],
      default: { fixed_target: 0, rate: this.config.rate },
      version: 2,
    };
  }
}
