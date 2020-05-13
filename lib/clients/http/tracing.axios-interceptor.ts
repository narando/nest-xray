import {
  AxiosFulfilledInterceptor,
  AxiosInterceptor,
  AxiosRejectedInterceptor,
  AxiosResponseCustomConfig,
} from "@narando/nest-axios-interceptor";
import { HttpService, Injectable } from "@nestjs/common";
import { Subsegment } from "aws-xray-sdk";
import { getCauseTypeFromHttpStatus } from "aws-xray-sdk-core/lib/utils";
import { AxiosRequestConfig } from "axios";
import { ClientRequest, IncomingMessage } from "http";
import { TracingService } from "../../core";
import { TracingNotInitializedException } from "../../exceptions";
import { HEADER_TRACE_CONTEXT } from "./http-tracing.constants";

export const TRACING_CONFIG_KEY = Symbol("kTracingAxiosInterceptor");

export interface TracingConfig extends AxiosRequestConfig {
  [TRACING_CONFIG_KEY]: {
    subSegment: Subsegment;
  };
}

@Injectable()
export class TracingAxiosInterceptor extends AxiosInterceptor<TracingConfig> {
  constructor(
    private readonly tracingService: TracingService,
    httpService: HttpService
  ) {
    super(httpService);
  }

  public requestFulfilled(): AxiosFulfilledInterceptor<TracingConfig> {
    // Add Info to Subsegment
    return (config) => {
      // Create Subsegment
      try {
        const subSegment = this.tracingService.createSubSegment("http-call");

        config[TRACING_CONFIG_KEY] = {
          subSegment,
        };

        config.headers[
          HEADER_TRACE_CONTEXT
        ] = this.tracingService.getTracingHeader(subSegment);

        return config;
      } catch (err) {
        if (err instanceof TracingNotInitializedException) {
          // TODO: Define proper behaviour for this case:
          // - should we create a new root segment for this?
          // - should we log the error so the user can investigate why its occuring?
          return config;
        }

        throw err;
      }
    };
  }

  public requestRejected(): AxiosRejectedInterceptor {
    // Cause: Networking Error
    // Add error to Subsegment
    // Close Subsegment
    return (error) => {
      if (this.isAxiosError(error)) {
        try {
          const subSegment = error.config[TRACING_CONFIG_KEY].subSegment;

          if (subSegment) {
            subSegment.addError(error);
            subSegment.addFaultFlag();
            subSegment.close(error);
          }
        } catch (tracingError) {
          // request error is "more important" than the error from tracing
          // so we swallow the tracing exception (probably TracingNotInitializedException)
        }
      }

      throw error;
    };
  }

  public responseFulfilled(): AxiosFulfilledInterceptor<
    AxiosResponseCustomConfig<TracingConfig>
  > {
    // Add response code to Subsegment
    // Close Subsegment
    return (response) => {
      try {
        const subSegment = response.config[TRACING_CONFIG_KEY].subSegment;

        if (subSegment) {
          subSegment.addRemoteRequestData(
            response.request,
            {
              statusCode: response.status,
              headers: response.headers,
            } as IncomingMessage,
            true
          );

          const cause = getCauseTypeFromHttpStatus(response.status);

          switch (cause) {
            case "error":
              subSegment.addErrorFlag();
              break;
            case "fault":
              subSegment.addFaultFlag();
              break;
            case undefined:
            default:
              break;
          }

          subSegment.close();
        }
      } catch (err) {
        if (err instanceof TracingNotInitializedException) {
          return response;
        }

        throw err;
      }

      return response;
    };
  }

  public responseRejected(): AxiosRejectedInterceptor {
    // Non 2xx Status Code
    // Add error to Subsegment
    // Close Subsegment
    return (error) => {
      if (this.isAxiosError(error)) {
        try {
          const subSegment = error.config[TRACING_CONFIG_KEY].subSegment;

          if (subSegment) {
            if (error.request && error.response) {
              const request = error.request as ClientRequest;
              const response = {
                statusCode: error.response.status,
              } as IncomingMessage;

              subSegment.addRemoteRequestData(request, response, true);
            } else if (error.config) {
              // Networking Error
              // TODO: Implement addRemoteRequestData
            }

            subSegment.close(error);
          }
        } catch (tracingError) {
          // response error is "more important" than the error from tracing
          // so we swallow the tracing exception (probably TracingNotInitializedException)
        }
      }

      throw error;
    };
  }
}
