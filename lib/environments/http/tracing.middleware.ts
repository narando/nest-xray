import { Injectable, NestMiddleware } from "@nestjs/common";
import { RequestHandler } from "express";
import { TracingService } from "../../core";

interface PatchSegmentURLRequest {
  segment: {
    http: {
      request: {
        url: string;
      };
    };
  };
}

@Injectable()
export class HttpTracingMiddleware implements NestMiddleware {
  private readonly middleware: RequestHandler;

  constructor(private readonly tracingService: TracingService) {
    this.middleware = this.tracingService.tracingMiddleware();
  }

  public use(req: any, res: any, next: () => void) {
    this.middleware(req, res, () => {
      if (req.segment) {
        // AWS X-Ray does not remove the query string from incoming requests
        req.segment.http.request.url = this.patchSegmentURL(req);

        this.tracingService.setRootSegment(req.segment);
      }
      next();
    });
  }

  private patchSegmentURL(req: PatchSegmentURLRequest): string {
    const {
      segment: {
        http: {
          request: { url: xrayParsedUrl },
        },
      },
    } = req;

    // xrayParsedUrl is relative and requires a generic base
    const xrayUrl = new URL(xrayParsedUrl, "https://example.com/");

    // Remove SearchParams/QueryParams
    // See #140
    xrayUrl.search = "";

    return xrayUrl.href;
  }
}
