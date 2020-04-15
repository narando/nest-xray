import { MiddlewareConsumer, Module, NestModule, Global } from "@nestjs/common";
import { AsyncHooksModule } from "../../async-hooks";
import { TracingCoreModule } from "../../core";
import { AsyncHooksMiddleware } from "./async-hooks.middleware";
import { HttpTracingMiddleware } from "./tracing.middleware";

// this module is global to ensure that middlewares are only called once
@Global()
@Module({ imports: [AsyncHooksModule, TracingCoreModule] })
export class HttpEnvironmentModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AsyncHooksMiddleware)
      .forRoutes("*")
      .apply(HttpTracingMiddleware)
      .forRoutes("*");
  }
}
