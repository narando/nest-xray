import { Injectable, NestMiddleware } from "@nestjs/common";
import { RequestHandler } from "express";
import { TracingService } from "../../../core";

interface PatchSegmentURLRequest {
  segment: {
    http: {
      request: {
        url: string;
      };
    };
  };
  originalUrl: string;
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
        // Nest.js does not use default express Routing, so we have to patch
        // the URL to include path.
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
          request: { url },
        },
      },
      originalUrl,
    } = req;

    let patchedURL = url;

    if (patchedURL.endsWith("/")) {
      patchedURL = patchedURL.substring(0, patchedURL.length - 1);
    }

    patchedURL = `${patchedURL}${originalUrl}`;

    return patchedURL;
  }
}
