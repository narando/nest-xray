import { DynamicModule, Module } from "@nestjs/common";
import * as AWSXRay from "aws-xray-sdk";
import { AsyncHooksModule } from "../async-hooks";
import { XRAY_CLIENT } from "./constants";
import { TracingConfig } from "./interfaces";
import { TracingService } from "./tracing.service";

@Module({
  imports: [AsyncHooksModule],
  providers: [
    TracingService,
    {
      provide: XRAY_CLIENT,
      useValue: AWSXRay,
    },
    {
      provide: TracingConfig,
      useValue: new TracingConfig(),
    },
  ],
  exports: [TracingService],
})
export class TracingCoreModule {
  static forRoot(options: TracingConfig): DynamicModule {
    return {
      global: true,
      module: TracingCoreModule,
      providers: [{ provide: TracingConfig, useValue: options }],
    };
  }
}
