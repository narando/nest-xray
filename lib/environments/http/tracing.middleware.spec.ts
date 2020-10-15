import { Test } from "@nestjs/testing";
import { TracingService } from "../../core";
import { HttpTracingMiddleware } from "./tracing.middleware";

describe("HttpTracingMiddleware", () => {
  let tracingMiddleware: HttpTracingMiddleware;
  let tracingService: TracingService;
  let xrayMiddleware: jest.Mock;

  beforeEach(async () => {
    xrayMiddleware = jest.fn().mockImplementation((req, res, next) => next());

    const module = await Test.createTestingModule({
      providers: [
        HttpTracingMiddleware,
        {
          provide: TracingService,
          useFactory: () => ({
            tracingMiddleware: () => xrayMiddleware,
          }),
        },
      ],
    }).compile();

    tracingMiddleware = module.get<HttpTracingMiddleware>(
      HttpTracingMiddleware
    );
    tracingService = module.get<TracingService>(TracingService);
  });

  it("should be defined", () => {
    expect(tracingMiddleware).toBeDefined();
    expect(tracingService).toBeDefined();
  });

  describe("use", () => {
    let req: any;
    let res: any;
    let next: jest.Mock;

    beforeEach(() => {
      req = {
        segment: {
          id: 1337,
          http: { request: { url: "https://example.com/path?foo=bar" } },
        },
      };
      res = {};
      next = jest.fn();

      tracingService.setRootSegment = jest.fn();
    });

    it("should call the xray middleware", async () => {
      tracingMiddleware.use(req, res, next);

      expect(xrayMiddleware).toHaveBeenCalled();
      expect(xrayMiddleware).toHaveBeenCalledWith(
        req,
        res,
        expect.any(Function)
      );
    });

    it("should remove the query string", async () => {
      await new Promise((resolve) => tracingMiddleware.use(req, res, resolve));

      expect(req.segment.http.request.url).toEqual("https://example.com/path");
    });

    it("should persist the generated segment", async () => {
      await new Promise((resolve) => tracingMiddleware.use(req, res, resolve));

      expect(tracingService.setRootSegment).toHaveBeenCalledTimes(1);
      expect(tracingService.setRootSegment).toHaveBeenCalledWith(req.segment);
    });

    it("should call next", async () => {
      tracingMiddleware.use(req, res, next);
      expect(next).toBeCalledTimes(1);
    });
  });
});
