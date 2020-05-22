import {
  AxiosFulfilledInterceptor,
  AxiosRejectedInterceptor,
} from "@narando/nest-axios-interceptor";
import { HttpService } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Subsegment } from "aws-xray-sdk";
import {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { TracingService } from "../../core";
import { TracingNotInitializedException } from "../../exceptions";
import { HEADER_TRACE_CONTEXT } from "./http-tracing.constants";
import {
  TracingAxiosInterceptor,
  TRACING_CONFIG_KEY,
} from "./tracing.axios-interceptor";

describe("TracingAxiosInterceptor", () => {
  let testingModule: TestingModule;

  let interceptor: TracingAxiosInterceptor;
  let tracingService: TracingService;
  let httpService: HttpService;
  let axios: AxiosInstance;

  beforeEach(async () => {
    axios = ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as any) as AxiosInstance;

    testingModule = await Test.createTestingModule({
      providers: [
        TracingAxiosInterceptor,
        {
          provide: TracingService,
          useFactory: () => ({}),
        },
        { provide: HttpService, useFactory: () => ({ axiosRef: axios }) },
      ],
    }).compile();

    interceptor = testingModule.get<TracingAxiosInterceptor>(
      TracingAxiosInterceptor
    );
    tracingService = testingModule.get<TracingService>(TracingService);
    httpService = testingModule.get<HttpService>(HttpService);
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
    expect(tracingService).toBeDefined();
    expect(httpService).toBeDefined();
  });

  describe("requestFulfilled", () => {
    let interceptorFn: AxiosFulfilledInterceptor<AxiosRequestConfig>;
    let config: AxiosRequestConfig;
    let subSegment: Subsegment;

    beforeEach(() => {
      interceptorFn = interceptor.requestFulfilled();

      config = {
        headers: {},
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

    it("should persist the subsegment to the request config", () => {
      interceptorFn(config);

      // @ts-ignore
      expect(config[TRACING_CONFIG_KEY].subSegment).toBe(subSegment);
    });

    it("should add the tracing header to the request config", () => {
      const returnedConfig = interceptorFn(config);

      expect(tracingService.getTracingHeader).toHaveBeenCalledTimes(1);
      expect(tracingService.getTracingHeader).toHaveBeenCalledWith(subSegment);

      expect(returnedConfig).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            [HEADER_TRACE_CONTEXT]:
              "Root=1-5759e988-bd862e3fe1be46a994272793;Parent=1337;Sampled=1",
          }),
        })
      );
    });

    it("should do nothing when tracing was not initialized", () => {
      tracingService.createSubSegment = jest.fn().mockImplementation(() => {
        throw new TracingNotInitializedException();
      });

      const returnedConfig = interceptorFn(config);
      expect(returnedConfig).toEqual(config);
    });
  });

  describe("requestRejected", () => {
    let interceptorFn: AxiosRejectedInterceptor;
    let subSegment: Subsegment;
    let error: AxiosError;

    beforeEach(() => {
      interceptorFn = interceptor.requestRejected();

      subSegment = ({
        id: "1337",
        name: "http-call",
        addError: jest.fn(),
        addFaultFlag: jest.fn(),
        close: jest.fn(),
      } as any) as Subsegment;

      // @ts-ignore
      error = new Error("Error in request");
      error.isAxiosError = true;
      error.config = {
        [TRACING_CONFIG_KEY]: {
          subSegment,
        },
      } as AxiosRequestConfig;
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

    it("should do nothing if the error is not an AxiosError", () => {
      (error as any).isAxiosError = false;
      expect(() => interceptorFn(error)).toThrow(error);
    });
  });

  describe("responseFulfilled", () => {
    let interceptorFn: AxiosFulfilledInterceptor<AxiosResponse>;
    let response: AxiosResponse;
    let subSegment: Subsegment;

    beforeEach(() => {
      interceptorFn = interceptor.responseFulfilled();

      subSegment = ({
        id: "1337",
        name: "http-call",
        addRemoteRequestData: jest.fn(),
        addErrorFlag: jest.fn(),
        addFaultFlag: jest.fn(),
        close: jest.fn(),
      } as any) as Subsegment;

      response = {
        status: 200,
        headers: {
          accept: "application/json",
        },
        request: {
          id: 321312, // Fake data for equality check
        },
        config: {
          [TRACING_CONFIG_KEY]: {
            subSegment,
          },
        } as AxiosRequestConfig,
      } as AxiosResponse;
    });

    it("should do nothing if no subsegment was saved", () => {
      // @ts-ignore
      response.config[TRACING_CONFIG_KEY] = {};

      expect(interceptorFn(response)).toEqual(response);
    });

    it("should add HTTP data to subsegment", () => {
      interceptorFn(response);

      expect(subSegment.addRemoteRequestData).toHaveBeenCalledTimes(1);
      expect(subSegment.addRemoteRequestData).toHaveBeenCalledWith(
        response.request,
        expect.objectContaining({
          statusCode: 200,
          headers: { accept: "application/json" },
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
    let interceptorFn: AxiosRejectedInterceptor;
    let subSegment: Subsegment;
    let error: AxiosError;

    beforeEach(() => {
      interceptorFn = interceptor.responseRejected();

      subSegment = ({
        id: "1337",
        name: "http-call",
        addRemoteRequestData: jest.fn(),
        close: jest.fn(),
      } as any) as Subsegment;

      error = new Error("Error in request") as AxiosError;
      error.isAxiosError = true;
      error.request = {
        id: 3123,
      };
      error.response = {
        status: 419,
      } as AxiosResponse;
      error.config = {
        [TRACING_CONFIG_KEY]: {
          subSegment,
        },
      } as AxiosRequestConfig;
    });

    it("should do nothing if no subsegment is returned", () => {
      // @ts-ignore
      error.config[TRACING_CONFIG_KEY] = {};

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
