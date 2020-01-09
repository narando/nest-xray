import {
  DynamicModule,
  HttpModule,
  HttpModuleAsyncOptions,
  HttpService,
  Module
} from "@nestjs/common";
import { AxiosTracingInterceptor } from "./axios-tracing.interceptor";

@Module({
  providers: [HttpService, AxiosTracingInterceptor],
  exports: [HttpService]
})
export class HttpTracingModule {
  public static registerAsync(options: HttpModuleAsyncOptions): DynamicModule {
    const httpModule = HttpModule.registerAsync(options);

    return {
      ...httpModule,
      module: HttpTracingModule
    };
  }
}
