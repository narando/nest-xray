import { TracingService } from "../../../core/tracing.service";
import { AsyncContext } from "../../../async-hooks";
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { from as fromPromise, Observable } from "rxjs";
import { Segment } from "aws-xray-sdk";

@Injectable()
export class MicroserviceTracingInterceptor implements NestInterceptor {
  constructor(
    private readonly tracingService: TracingService,
    private readonly asyncContext: AsyncContext
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "rpc") {
      // Only handle rpc/microservice
      return next.handle();
    }

    return fromPromise(
      new Promise((resolve, reject) => {
        this.asyncContext.run(async () => {
          const segment = new Segment("microservice-invokation");

          this.tracingService.setRootSegment(segment);

          try {
            const value = await next.handle().toPromise();

            segment.close();

            resolve(value);
          } catch (err) {
            segment.close(err);
            reject(err);
          }
        });
      })
    );
  }
}
