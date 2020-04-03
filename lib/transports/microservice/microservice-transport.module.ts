import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AsyncHooksModule } from "../../async-hooks";
import { TracingCoreModule } from "../../core";
import { MicroserviceTracingInterceptor } from "./incoming/tracing.interceptor";

@Module({
  imports: [AsyncHooksModule, TracingCoreModule],
  providers: [
    MicroserviceTracingInterceptor,
    { provide: APP_INTERCEPTOR, useClass: MicroserviceTracingInterceptor },
  ],
  exports: [MicroserviceTracingInterceptor],
})
export class MicroserviceTransportModule {}
