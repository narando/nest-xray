import { HttpService } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Subsegment } from "aws-xray-sdk";
import {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse
} from "axios";
import { TracingService } from "../tracing.service";
import {
  AxiosOnFulfilledInterceptor,
  AxiosOnRejectedInterceptor,
  AxiosTracingInterceptor
} from "./axios-tracing.interceptor";
import { HEADER_TRACE_CONTEXT } from "./http-tracing.constants";

describe("AxiosTracingInterceptor", () => {
  let testingModule: TestingModule;

  let interceptor: AxiosTracingInterceptor;
  let tracingService: TracingService;
  let httpService: HttpService;
  let axios: AxiosInstance;

  beforeEach(async () => {
    axios = ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any) as AxiosInstance;

    testingModule = await Test.createTestingModule({
      providers: [
        AxiosTracingInterceptor,
        {
          provide: TracingService,
          useFactory: () => ({})
        },
        { provide: HttpService, useFactory: () => ({ axiosRef: axios }) }
      ]
    }).compile();

    interceptor = testingModule.get<AxiosTracingInterceptor>(
      AxiosTracingInterceptor
    );
    tracingService = testingModule.get<TracingService>(TracingService);
    httpService = testingModule.get<HttpService>(HttpService);
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
    expect(tracingService).toBeDefined();
    expect(httpService).toBeDefined();
  });

  describe("onModuleInit", () => {
    let requestConfigInterceptor: jest.Mock;
    let requestErrorInterceptor: jest.Mock;
    let responseSuccessInterceptor: jest.Mock;
    let responseErrorInterceptor: jest.Mock;

    beforeEach(() => {
      requestConfigInterceptor = jest.fn();
      requestErrorInterceptor = jest.fn();
      responseSuccessInterceptor = jest.fn();
      responseErrorInterceptor = jest.fn();

      interceptor.getRequestConfigInterceptor = jest
        .fn()
        .mockReturnValue(requestConfigInterceptor);
      interceptor.getRequestErrorInterceptor = jest
        .fn()
        .mockReturnValue(requestErrorInterceptor);
      interceptor.getResponseSuccessInterceptor = jest
        .fn()
        .mockReturnValue(responseSuccessInterceptor);
      interceptor.getResponseErrorInterceptor = jest
        .fn()
        .mockReturnValue(responseErrorInterceptor);
    });

    afterEach(() => {
      testingModule.close();
    });

    it("registers the interceptors", () => {
      testingModule.init();

      expect(axios.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(axios.interceptors.request.use).toHaveBeenCalledWith(
        requestConfigInterceptor,
        requestErrorInterceptor
      );

      expect(axios.interceptors.response.use).toHaveBeenCalledTimes(1);
      expect(axios.interceptors.response.use).toHaveBeenCalledWith(
        responseSuccessInterceptor,
        responseErrorInterceptor
      );
    });
  });

  describe("requestConfigInterceptor", () => {
    let interceptorFn: AxiosOnFulfilledInterceptor<AxiosRequestConfig>;
    let config: AxiosRequestConfig;
    let subSegment: Subsegment;

    beforeEach(() => {
      interceptorFn = interceptor.getRequestConfigInterceptor();

      config = {
        headers: {}
      };

      subSegment = { id: "1337", name: "http-call" } as Subsegment;
      tracingService.createSubSegment = jest.fn().mockReturnValue(subSegment);

      tracingService.setSubSegment = jest.fn();

      tracingService.getTracingHeader = jest
        .fn()
        .mockReturnValue(
          "Root=1-5759e988-bd862e3fe1be46a994272793;Parent=1337;Sampled=1"
        );
    });

    it("should create a new sub segment", () => {
      interceptorFn(config);

      expect(tracingService.createSubSegment).toHaveBeenCalledTimes(1);
      expect(tracingService.createSubSegment).toHaveBeenCalledWith(
        expect.any(String)
      );
    });

    it("should persist the subsegment to tracing service", () => {
      interceptorFn(config);

      expect(tracingService.setSubSegment).toHaveBeenCalledTimes(1);
      expect(tracingService.setSubSegment).toHaveBeenCalledWith(subSegment);
    });

    it("should add the tracing header to the request config", () => {
      const returnedConfig = interceptorFn(config);

      expect(tracingService.getTracingHeader).toHaveBeenCalledTimes(1);
      expect(tracingService.getTracingHeader).toHaveBeenCalledWith(subSegment);

      expect(returnedConfig).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            [HEADER_TRACE_CONTEXT]:
              "Root=1-5759e988-bd862e3fe1be46a994272793;Parent=1337;Sampled=1"
          })
        })
      );
    });
  });

  describe("requestErrorInterceptor", () => {
    let interceptorFn: AxiosOnRejectedInterceptor;
    let subSegment: Subsegment;
    let error: Error;

    beforeEach(() => {
      interceptorFn = interceptor.getRequestErrorInterceptor();

      subSegment = ({
        id: "1337",
        name: "http-call",
        addError: jest.fn(),
        addFaultFlag: jest.fn(),
        close: jest.fn()
      } as any) as Subsegment;
      tracingService.getSubSegment = jest.fn().mockReturnValue(subSegment);

      error = new Error("Error in request");
    });

    it("should use get the subsegment from tracing service", () => {
      expect(() => interceptorFn(error)).toThrow();

      expect(tracingService.getSubSegment).toHaveBeenCalledTimes(1);
    });

    it("should add the error data to the subsegment", () => {
      expect(() => interceptorFn(error)).toThrow();

      expect(subSegment.addError).toHaveBeenCalledTimes(1);
      expect(subSegment.addFaultFlag).toHaveBeenCalledTimes(1);
      expect(subSegment.close).toHaveBeenCalledTimes(1);

      expect(subSegment.addError).toHaveBeenCalledWith(error);
      expect(subSegment.addFaultFlag).toHaveBeenCalledWith();
      expect(subSegment.close).toHaveBeenCalledWith(error);
    });

    it("should rethrow the error", () => {
      expect(() => interceptorFn(error)).toThrow(error);
    });
  });

  describe("responseSuccessInterceptor", () => {
    let interceptorFn: AxiosOnFulfilledInterceptor<AxiosResponse>;
    let response: AxiosResponse;
    let subSegment: Subsegment;

    beforeEach(() => {
      interceptorFn = interceptor.getResponseSuccessInterceptor();

      response = {
        status: 200,
        headers: {
          accept: "application/json"
        },
        request: {
          id: 321312 // Fake data for equality check
        }
      } as AxiosResponse;

      subSegment = ({
        id: "1337",
        name: "http-call",
        addRemoteRequestData: jest.fn(),
        addErrorFlag: jest.fn(),
        addFaultFlag: jest.fn(),
        close: jest.fn()
      } as any) as Subsegment;
      tracingService.getSubSegment = jest.fn().mockReturnValue(subSegment);
    });

    it("should use get the subsegment from tracing service", () => {
      interceptorFn(response);

      expect(tracingService.getSubSegment).toHaveBeenCalledTimes(1);
    });

    it("should do nothing if no subsegment was saved", () => {
      tracingService.getSubSegment = jest.fn().mockReturnValue(undefined);

      expect(interceptorFn(response)).toEqual(response);
    });

    it("should add HTTP data to subsegment", () => {
      interceptorFn(response);

      expect(subSegment.addRemoteRequestData).toHaveBeenCalledTimes(1);
      expect(subSegment.addRemoteRequestData).toHaveBeenCalledWith(
        response.request,
        expect.objectContaining({
          statusCode: 200,
          headers: { accept: "application/json" }
        }),
        true
      );
    });

    it("should add error flag for 4xx response code", () => {
      response.status = 400;
      interceptorFn(response);

      expect(subSegment.addErrorFlag).toHaveBeenCalledTimes(1);
      expect(subSegment.addFaultFlag).toHaveBeenCalledTimes(0);
    });

    it("should add fault flag for 5xx response code", () => {
      response.status = 500;
      interceptorFn(response);

      expect(subSegment.addFaultFlag).toHaveBeenCalledTimes(1);
      expect(subSegment.addErrorFlag).toHaveBeenCalledTimes(0);
    });

    it("should add no error/fault flag for 2xx response code", () => {
      response.status = 200;
      interceptorFn(response);

      expect(subSegment.addFaultFlag).toHaveBeenCalledTimes(0);
      expect(subSegment.addErrorFlag).toHaveBeenCalledTimes(0);
    });

    it("should mark the subsegment as finished", () => {
      interceptorFn(response);

      expect(subSegment.close).toHaveBeenCalledTimes(1);
    });

    it("should return the response", () => {
      expect(interceptorFn(response)).toEqual(response);
    });
  });

  describe("responseErrorInterceptor", () => {
    let interceptorFn: AxiosOnRejectedInterceptor;
    let subSegment: Subsegment;
    let error: AxiosError;

    beforeEach(() => {
      interceptorFn = interceptor.getResponseErrorInterceptor();

      subSegment = ({
        id: "1337",
        name: "http-call",
        addRemoteRequestData: jest.fn(),
        close: jest.fn()
      } as any) as Subsegment;
      tracingService.getSubSegment = jest.fn().mockReturnValue(subSegment);

      error = new Error("Error in request") as AxiosError;
      error.request = {
        id: 3123
      };
      error.response = {
        status: 419
      } as AxiosResponse;
    });

    it("should use get the subsegment from tracing service", () => {
      expect(() => interceptorFn(error)).toThrow();

      expect(tracingService.getSubSegment).toHaveBeenCalledTimes(1);
    });

    it("should do nothing if no subsegment is returned", () => {
      tracingService.getSubSegment = jest.fn().mockReturnValue(undefined);

      expect(() => interceptorFn(error)).toThrow(
        error /* Make sure no other error is thrown because Subsegment is undefined */
      );
    });

    it("should add HTTP data to subsegment", () => {
      expect(() => interceptorFn(error)).toThrow();

      expect(subSegment.addRemoteRequestData).toHaveBeenCalledTimes(1);
      expect(subSegment.addRemoteRequestData).toHaveBeenCalledWith(
        { id: 3123 },
        { statusCode: 419 },
        true
      );
    });

    it.todo("should handle networking error");

    it("should close the subsegment", () => {
      expect(() => interceptorFn(error)).toThrow();

      expect(subSegment.close).toHaveBeenCalledTimes(1);
      expect(subSegment.close).toHaveBeenCalledWith(error);
    });

    it("should rethrow the error", () => {
      expect(() => interceptorFn(error)).toThrow(error);
    });
  });
});
