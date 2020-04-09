import { HttpService, Injectable, OnModuleInit } from "@nestjs/common";
import { getCauseTypeFromHttpStatus } from "aws-xray-sdk-core/lib/utils";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { ClientRequest, IncomingMessage } from "http";
import { TracingNotInitializedException } from "../exceptions";
import { TracingService } from "../tracing.service";
import { HEADER_TRACE_CONTEXT } from "./http-tracing.constants";

export type AxiosOnFulfilledInterceptor<T> = (value: T) => T | Promise<T>;
export type AxiosOnRejectedInterceptor = (error: any) => any;

@Injectable()
export class AxiosTracingInterceptor implements OnModuleInit {
  constructor(
    private readonly tracingService: TracingService,
    private readonly httpService: HttpService
  ) {}

  public onModuleInit() {
    const { axiosRef: axios } = this.httpService;

    axios.interceptors.request.use(
      this.getRequestConfigInterceptor(),
      this.getRequestErrorInterceptor()
    );
    axios.interceptors.response.use(
      this.getResponseSuccessInterceptor(),
      this.getResponseErrorInterceptor()
    );
  }

  public getRequestConfigInterceptor(): AxiosOnFulfilledInterceptor<
    AxiosRequestConfig
  > {
    // Add Info to Subsegment
    // Persist Subsegment to Async context
    return (config) => {
      // Create Subsegment
      try {
        const subSegment = this.tracingService.createSubSegment("http-call");
        this.tracingService.setSubSegment(subSegment);

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

  public getRequestErrorInterceptor(): AxiosOnRejectedInterceptor {
    // Cause: Networking Error
    // Add error to Subsegment
    // Close Subsegment
    return (error) => {
      try {
        const subSegment = this.tracingService.getSubSegment();

        if (subSegment) {
          subSegment.addError(error);
          subSegment.addFaultFlag();
          subSegment.close(error);
        }
      } catch (tracingError) {
        // request error is "more important" than the error from tracing
        // so we swallow the tracing exception (probably TracingNotInitializedException)
      }
      throw error;
    };
  }

  public getResponseSuccessInterceptor(): AxiosOnFulfilledInterceptor<
    AxiosResponse
  > {
    // Add response code to Subsegment
    // Close Subsegment
    return (response) => {
      try {
        const subSegment = this.tracingService.getSubSegment();

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

  public getResponseErrorInterceptor(): AxiosOnRejectedInterceptor {
    // Non 2xx Status Code
    // Add error to Subsegment
    // Close Subsegment
    return (error) => {
      try {
        const subSegment = this.tracingService.getSubSegment();

        if (subSegment) {
          if (error.request && error.response) {
            const request = error.request as ClientRequest;
            const response =
              {
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

      throw error;
    };
  }
}
