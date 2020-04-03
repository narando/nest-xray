import { DynamicModule, Global, Module } from "@nestjs/common";
import { AsyncHooksModule } from "./async-hooks";
import { TracingCoreModule } from "./core";
import { TracingConfig } from "./core/interfaces";
import { HttpEnvironmentModule } from "./environments/http";

@Module({
  imports: [AsyncHooksModule, HttpEnvironmentModule],
})
export class TracingModule {
  public static forRoot(options: TracingConfig): DynamicModule {
    return {
      module: TracingModule,
      imports: [TracingCoreModule.forRoot(options)],
      exports: [TracingCoreModule],
    };
  }
}
