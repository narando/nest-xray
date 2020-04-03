# @narando/nest-xray

This module implements [Distributed Tracing](https://opentracing.io/docs/overview/what-is-tracing/) with [AWS X-Ray](https://aws.amazon.com/xray/) for Nest.js services.

## Features

- Automatic tracing
  - For incoming http requests
  - For outgoing http requests
- Manually create new Subsegments to trace custom functions

## Usage

### Installation

Install this module and `aws-sdk-xray`:

```shell
$ npm i @narando/nest-xray aws-sdk-xray
```

### Initialization

Register the `TracingModule` with your app module:

```typescript
import { TracingModule } from "@narando/nest-xray";

@Module({
  imports: [TracingModule.forRoot({ serviceName: "your-service-name" })],
})
export class AppModule {}
```

### Transports

#### HTTP

##### Incoming Requests

Incoming Requests are traced automatically.

##### Outgoing Requests (HttpService)

If you use the [`HttpModule`](https://docs.nestjs.com/techniques/http-module), you can use this module to auto-trace outgoing HTTP requests.

Replace all usages of `HttpModule` with `HttpTracingModule`, and keep the same configuration.

```diff
- import { HttpModule } from "@nestjs/common"
+ import { HttpTracingModule } from "@narando/nest-xray"

 @Module({
   imports: [
-    HttpModule.registerAsync({
+    HttpTracingModule.registerAsync({
       useFactory: async (config: ConfigService) => ({
         baseURL: config.get("api.base_url"),
         timeout: config.get("api.http_timeout"),
         headers: {
           "user-agent": config.get("api.http_user_agent")
         }
       }),
       inject: [ConfigService]
     })
   ],
   providers: [APIService],
   exports: [APIService]
 })
 export class APIModule {}
```

Keep using `HttpService` as before, and all requests are traced as Subsegment and the necessary header for the downstream service is added the the request.

### Custom Tracing

If you want to do any of the following things, the `TracingService` is the right entrypoint:

- Create custom subsegments for internal functions
- Add data to the current Segment/Subsegment

```typescript
import { TracingService } from "@narando/nest-xray";

@Injectable()
export class ExternalAPIClient {
  constructor(
    private readonly client: ExternalModule,
    private readonly tracingService: TracingService
  ) {}

  async doThing() {
    // Create Subsegment for any Function
    const subSegment = this.tracingService.createSubSegment("external-doThing");

    let response;

    try {
      response = await client.doThing();
    } catch (err) {
      subSegment.close(err);
      throw err;
    }

    subSegment.close();
  }
}
```

## Implementation

### `async_hooks`

This module uses the Node.js API [`async_hooks`](https://nodejs.org/api/async_hooks.html) to persist the Segment without having to explicitly pass it around to every function involved. It is what enables the "automatic" part of this module.

This API is currently not considered stable, though I have not yet seen any issues (besides slightly worse performance) from using it. This stability is currently being worked on in [nodejs/diagnostics#124](https://github.com/nodejs/diagnostics/issues/124).

### AsyncContext

`AsyncContext` is an experimental integration of `async_hooks` into the Nest.js ecosystem. It was initially developed by Kamil Mysliwiec in [nestjs/nest#1407](https://github.com/nestjs/nest/pull/1407) but not merged because `async_hooks` are not yet stable.

I adopted his implementation into this module for following reasons:

a) It implements all the hard parts with `async_hooks` and provides enough functionality for our use cases.
b) It was developed by the Nest.js Maintainer and is proposed to be merged into Nest.js. If this happens, we may be able to switch to the official implementation without changing any usages of the module.

### TracingModule

The TracingModule combines the `AsyncContext` with the official `AWSXRay` client. It exports the `TracingService`, that can be used by other modules to implement additional tracing behaviour (e.g. tracing outgoing http requests).

### HttpTracingModule

THe `HttpTracingModule` wraps the official `HttpModule` and adds interceptors to the used axios client that automatically trace all outgoing requests.

## Known Bugs

- Only one Subsegment can be persisted at a time. This causes issues when multiple outgoing http requests are made in parallel, some subsegments may never be marked as "finished".
- The XRay Daemon Address can only be configured through the environment variable.

## License

This repository is published under the [MIT License](./LICENSE).
