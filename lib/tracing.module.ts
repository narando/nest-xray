import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common";
import * as AWSXRay from "aws-xray-sdk";

import { AsyncHooksMiddleware, AsyncHooksModule } from "./hooks";
import { TracingConfig } from "./interfaces";
import { XRAY_CLIENT } from "./tracing.constants";
import { TracingMiddleware } from "./tracing.middleware";
import { TracingService } from "./tracing.service";

@Global()
@Module({
  imports: [AsyncHooksModule],
  providers: [
    {
      provide: TracingConfig,
      useValue: new TracingConfig(),
    },
    {
      provide: XRAY_CLIENT,
      useValue: AWSXRay,
    },
    TracingService,
  ],
  exports: [TracingService],
})
export class TracingModule implements NestModule {
  public static forRoot(options: TracingConfig): DynamicModule {
    return {
      module: TracingModule,
      providers: [{ provide: TracingConfig, useValue: options }],
    };
  }

  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AsyncHooksMiddleware)
      .forRoutes("*")
      .apply(TracingMiddleware)
      .forRoutes("*");
  }
}
