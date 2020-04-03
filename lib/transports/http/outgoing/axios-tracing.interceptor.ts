import { HttpService, Injectable, OnModuleInit } from "@nestjs/common";
import { getCauseTypeFromHttpStatus } from "aws-xray-sdk-core/lib/utils";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { ClientRequest, IncomingMessage } from "http";
import { TracingService } from "../../../core";
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
      const subSegment = this.tracingService.createSubSegment("http-call");
      this.tracingService.setSubSegment(subSegment);

      config.headers[
        HEADER_TRACE_CONTEXT
      ] = this.tracingService.getTracingHeader(subSegment);

      return config;
    };
  }

  public getRequestErrorInterceptor(): AxiosOnRejectedInterceptor {
    // Cause: Networking Error
    // Add error to Subsegment
    // Close Subsegment
    return (error) => {
      const subSegment = this.tracingService.getSubSegment();

      if (subSegment) {
        subSegment.addError(error);
        subSegment.addFaultFlag();
        subSegment.close(error);
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

      return response;
    };
  }

  public getResponseErrorInterceptor(): AxiosOnRejectedInterceptor {
    // Non 2xx Status Code
    // Add error to Subsegment
    // Close Subsegment
    return (error) => {
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

      throw error;
    };
  }
}
