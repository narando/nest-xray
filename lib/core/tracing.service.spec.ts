import { Test, TestingModule } from "@nestjs/testing";
import { Segment, Subsegment } from "aws-xray-sdk";
import { AsyncContext } from "../async-hooks";
import {
  TracingNotInitializedException,
  UnknownAsyncContextException,
} from "../exceptions";
import {
  TRACING_ASYNC_CONTEXT_SEGMENT,
  TRACING_ASYNC_CONTEXT_SUBSEGMENT,
  XRAY_CLIENT,
} from "./constants";
import { TracingConfig, XRayClient } from "./interfaces";
import { TracingService } from "./tracing.service";

describe("TracingService", () => {
  let testingModule: TestingModule;
  let tracingService: TracingService;
  let xrayClient: XRayClient;
  let asyncContext: AsyncContext;
  let tracingConfig: TracingConfig;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        TracingService,
        {
          provide: XRAY_CLIENT,
          useFactory: () => ({ middleware: {}, plugins: {}, express: {} }),
        },
        {
          provide: AsyncContext,
          useFactory: () => ({}),
        },
        {
          provide: TracingConfig,
          useFactory: () => ({
            serviceName: "tracing-service-test",
          }),
        },
      ],
    }).compile();

    tracingService = testingModule.get<TracingService>(TracingService);
    xrayClient = testingModule.get<XRayClient>(XRAY_CLIENT);
    asyncContext = testingModule.get<AsyncContext>(AsyncContext);
    tracingConfig = testingModule.get<TracingConfig>(TracingConfig);
  });

  it("should be defined", () => {
    expect(tracingService).toBeDefined();
    expect(xrayClient).toBeDefined();
    expect(asyncContext).toBeDefined();
    expect(tracingConfig).toBeDefined();
  });

  describe("onModuleInit", () => {
    beforeEach(() => {
      xrayClient.enableManualMode = jest.fn();
      xrayClient.setDaemonAddress = jest.fn();
      xrayClient.middleware.setSamplingRules = jest.fn();
      xrayClient.config = jest.fn();
      xrayClient.setContextMissingStrategy = jest.fn();
    });

    afterEach(() => {
      testingModule.close();
    });

    it("should configure the XRayClient", async () => {
      await testingModule.init();

      expect(xrayClient.enableManualMode).toHaveBeenCalled();
      expect(xrayClient.middleware.setSamplingRules).toHaveBeenCalled();
      expect(xrayClient.config).toHaveBeenCalled();
      expect(xrayClient.setContextMissingStrategy).toHaveBeenCalled();
    });
  });

  describe("tracingMiddleware", () => {
    beforeEach(() => {
      xrayClient.express.openSegment = jest.fn();
    });

    it("should return xray middleware", () => {
      tracingService.tracingMiddleware();

      expect(xrayClient.express.openSegment).toHaveBeenCalled();
    });

    it("should set the service name", () => {
      tracingService.tracingMiddleware();

      expect(xrayClient.express.openSegment).toHaveBeenCalledWith(
        tracingConfig.serviceName
      );
    });
  });

  describe("setRootSegment", () => {
    beforeEach(() => {
      asyncContext.set = jest.fn();
    });

    it("should save the root segment to the async context", () => {
      const segment = { id: "1337" } as Segment;
      tracingService.setRootSegment(segment);

      expect(asyncContext.set).toHaveBeenCalledTimes(1);
      expect(asyncContext.set).toHaveBeenLastCalledWith(
        TRACING_ASYNC_CONTEXT_SEGMENT,
        segment
      );
    });

    it("should throw TracingNotInitializedException when AsyncContext#run was not used", () => {
      asyncContext.set = jest.fn().mockImplementation(() => {
        throw new UnknownAsyncContextException(123);
      });

      const segment = { id: "1337" } as Segment;

      expect(() => tracingService.setRootSegment(segment)).toThrow(
        TracingNotInitializedException
      );
    });
  });

  describe("getRootSegment", () => {
    const segment = { id: "1337" } as Segment;

    beforeEach(() => {
      asyncContext.get = jest.fn().mockReturnValue(segment);
    });

    it("should retrieve the segment from async context", () => {
      tracingService.getRootSegment();

      expect(asyncContext.get).toHaveBeenCalledTimes(1);
      expect(asyncContext.get).toHaveBeenLastCalledWith(
        TRACING_ASYNC_CONTEXT_SEGMENT
      );
    });

    it("should return the saved segment", () => {
      const returnedSegment = tracingService.getRootSegment();

      expect(returnedSegment).toEqual(segment);
    });

    it("should throw TracingNotInitializedException when AsyncContext#run was not used", () => {
      asyncContext.get = jest.fn().mockImplementation(() => {
        throw new UnknownAsyncContextException(123);
      });

      expect(() => tracingService.getRootSegment()).toThrow(
        TracingNotInitializedException
      );
    });
  });

  describe("setSubSegment", () => {
    beforeEach(() => {
      asyncContext.set = jest.fn();
    });

    it("should save the sub segment to the async context", () => {
      const subsegment = { id: "1337" } as Subsegment;
      tracingService.setSubSegment(subsegment);

      expect(asyncContext.set).toHaveBeenCalledTimes(1);
      expect(asyncContext.set).toHaveBeenLastCalledWith(
        TRACING_ASYNC_CONTEXT_SUBSEGMENT,
        subsegment
      );
    });

    it("should throw TracingNotInitializedException when AsyncContext#run was not used", () => {
      asyncContext.set = jest.fn().mockImplementation(() => {
        throw new UnknownAsyncContextException(123);
      });

      const subsegment = { id: "1337" } as Subsegment;
      expect(() => tracingService.setSubSegment(subsegment)).toThrow(
        TracingNotInitializedException
      );
    });
  });

  describe("getSubSegment", () => {
    const subsegment = { id: "1337" } as Subsegment;

    beforeEach(() => {
      asyncContext.get = jest.fn().mockReturnValue(subsegment);
    });

    it("should retrieve the sub segment from async context", () => {
      tracingService.getSubSegment();

      expect(asyncContext.get).toHaveBeenCalledTimes(1);
      expect(asyncContext.get).toHaveBeenLastCalledWith(
        TRACING_ASYNC_CONTEXT_SUBSEGMENT
      );
    });

    it("should return the saved sub segment", () => {
      const returnedSegment = tracingService.getSubSegment();

      expect(returnedSegment).toEqual(subsegment);
    });

    it("should throw TracingNotInitializedException when AsyncContext#run was not used", () => {
      asyncContext.get = jest.fn().mockImplementation(() => {
        throw new UnknownAsyncContextException(123);
      });

      expect(() => tracingService.getSubSegment()).toThrow(
        TracingNotInitializedException
      );
    });
  });

  describe("getTracingHeader", () => {
    let rootSegment: Segment;
    let subSegment: Subsegment;

    beforeEach(() => {
      rootSegment = {
        id: "1337",
        trace_id: "1-5759e988-bd862e3fe1be46a994272793",
      } as Segment;
      subSegment = { id: "3117" } as Subsegment;

      asyncContext.get = jest.fn().mockReturnValue(rootSegment);
    });

    it("should use the persisted root segment", () => {
      tracingService.getTracingHeader(subSegment);

      expect(asyncContext.get).toHaveBeenCalledWith(
        TRACING_ASYNC_CONTEXT_SEGMENT
      );
    });

    it("should return the expected header", () => {
      const header = tracingService.getTracingHeader(subSegment);

      expect(header).toEqual(
        "Root=1-5759e988-bd862e3fe1be46a994272793;Parent=3117;Sampled=1"
      );
    });
  });

  describe("createSubSegment", () => {
    let rootSegment: Segment;

    beforeEach(() => {
      rootSegment = {} as Segment;
      rootSegment.addNewSubsegment = jest.fn();

      asyncContext.get = jest.fn().mockReturnValue(rootSegment);
    });

    it("should use the persisted root segment", () => {
      tracingService.createSubSegment("testing-segment");

      expect(asyncContext.get).toHaveBeenCalledWith(
        TRACING_ASYNC_CONTEXT_SEGMENT
      );
    });

    it("should create a new subsegment with the given name", () => {
      tracingService.createSubSegment("testing-segment");

      expect(rootSegment.addNewSubsegment).toHaveBeenCalledTimes(1);
      expect(rootSegment.addNewSubsegment).toHaveBeenCalledWith(
        "testing-segment"
      );
    });

    it("should return the created subsegment", () => {
      const subSegment = {
        id: 1337,
        name: "testing-segment",
      };
      rootSegment.addNewSubsegment = jest.fn().mockReturnValue(subSegment);

      const returnedSubSegment =
        tracingService.createSubSegment("testing-segment");

      expect(returnedSubSegment).toBe(subSegment);
    });
  });
});
