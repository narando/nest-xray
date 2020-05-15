import {
  DynamicModule,
  HttpModule,
  HttpModuleAsyncOptions,
  HttpService,
  Module,
} from "@nestjs/common";
import { TracingCoreModule } from "../../core";
import { TracingAxiosInterceptor } from "./tracing.axios-interceptor";

@Module({
  imports: [TracingCoreModule],
  providers: [HttpService, TracingAxiosInterceptor],
  exports: [HttpService],
})
export class HttpTracingModule {
  public static registerAsync(options: HttpModuleAsyncOptions): DynamicModule {
    const httpModule = HttpModule.registerAsync(options);

    return {
      ...httpModule,
      module: HttpTracingModule,
    };
  }
}
