import { Injectable, NestMiddleware } from "@nestjs/common";
import { AsyncContext } from "./async-context";

@Injectable()
export class AsyncHooksMiddleware implements NestMiddleware {
  constructor(private readonly asyncContext: AsyncContext) {}

  public use(req: any, res: any, next: () => void) {
    this.asyncContext.run(next);
  }
}
