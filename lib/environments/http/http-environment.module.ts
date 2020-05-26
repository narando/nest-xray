import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AsyncHooksModule } from "../../async-hooks";
import { AsyncHooksMiddleware } from "./async-hooks.middleware";
import { HttpTracingMiddleware } from "./tracing.middleware";

// this module is global to ensure that middlewares are only called once
@Global()
@Module({ imports: [AsyncHooksModule] })
export class HttpEnvironmentModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AsyncHooksMiddleware)
      .forRoutes("*")
      .apply(HttpTracingMiddleware)
      .forRoutes("*");
  }
}
