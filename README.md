# @narando/nest-xray

This module implements [Distributed Tracing](https://opentracing.io/docs/overview/what-is-tracing/) with [AWS X-Ray](https://aws.amazon.com/xray/) for Nest.js services.

## Features

- Supported Environments
  - HTTP (express.js)
- Clients
  - `HttpService`/`HttpModule`
- Manually create new Subsegments to trace custom functions

## Usage

> ⚠️ If you want to use `@narando/nest-xray` with NestJS Version 6 or 7,
> please use the v1 release.
>
> The v2 release is only compatible with NestJS Version 8 or 9 and @nestjs/axios `>=0.0.5 <=0.1.0`.

### Installation

Install this module and `aws-xray-sdk`:

```shell
$ npm i @narando/nest-xray aws-xray-sdk
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

### Environments

An _environment_ is responsible for automatically reading the trace metadata from the incoming request (if available), creating a segment for the processing that happens in the service and recording additional metadata about the request.

There are multiple available _environment candidates_ in Nest.js. By default most applications use the HTTP application model, where they define a `@Controller` and use `express` or `fastify` in the background.  
For this application type, the `HttpEnvironment` tries to read an existing trace segment from the `X-Amzn-Trace-Id`, and then creates a new segment and adds the URL and other information about the request to the segment. This segment is then made available throughout the request, **Clients** can now read the segment and add subsegment for the calls that are made through them.

The `HttpEnvironment` is activated by default in `@narando/nest-xray`.

Currently no other environments are supported.

> **If you are interested in contributing**:
>
> Building and supporting more environments would greatly improve the usefulness of this package.
>
> Potential environments could be:
>
> - `@nestjs/graphql`
> - `@nestjs/websockets`
> - `@nestjs/microservices`
> - `AWS Lambda` - where the trace metadata is presented in environment variables, see #67

#### Http

The `HttpEnvironment` checks whether the `X-Amzn-Trace-Id` header is set and valid, and then creates a segment that references this origin trace.
When the request succeeds or fails, the environment adds the current time and the success/error status to the segment.

This environment is mostly implemented through the [express middleware](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express) of the official `aws-xray-sdk`

### Clients

To trace calls made to a different service, you can either use a premade _client_, or use the `TracingService#createSubSegment` method to manually instrument the client of your choosing.
The premade _clients_ will automatically create a subsegment for all requests made, and track the duration and response code.

#### `HttpService`

This _client_ is a drop-in replacement for the [`HttpService`](https://docs.nestjs.com/techniques/http-module) from `@nestjs/axios`.

To use it, you must only replace the imports like this:

```diff
- import { HttpModule } from "@nestjs/axios"
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

Keep using `HttpService` as before, and all requests are traced as Subsegment and the necessary header for the downstream service is added to the the request.

### Custom Tracing

If the premade _clients_ are not sufficient or you want more control, you can use the `TracingService`.

You can use it to create new subsegments and to access the currently set segment and subsegment.

Once you have access to a segment/subsegment, you can add any data you want to it.

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

We use `async_hooks` to store the traces and `aws-xray-sdk` to interact with AWS X-Ray.

### `async_hooks`

This module uses the Node.js API [`async_hooks`](https://nodejs.org/api/async_hooks.html) to persist the Segment without having to explicitly pass it around to every function involved. It is what enables the "automatic" part of this module.

This API is currently not considered stable, though I have not yet seen any issues (besides slightly worse performance) from using it. This stability is currently being worked on in [nodejs/diagnostics#124](https://github.com/nodejs/diagnostics/issues/124).

### AsyncContext

`AsyncContext` is an experimental integration of `async_hooks` into the Nest.js ecosystem. It was initially developed by Kamil Mysliwiec in [nestjs/nest#1407](https://github.com/nestjs/nest/pull/1407) but not merged because `async_hooks` are not yet stable.

I adopted his implementation into this module for following reasons:

a) It implements all the hard parts with `async_hooks` and provides enough functionality for our use cases.
b) It was developed by the Nest.js Maintainer and is proposed to be merged into Nest.js. If this happens, we may be able to switch to the official implementation without changing any usages of the module.

### TracingCoreModule

The TracingCoreModule combines the `AsyncContext` with the official `AWSXRay` client. It exports the `TracingService`, that can be used by other modules to implement additional tracing behaviour (e.g. tracing outgoing http requests).

## Known Bugs

- The XRay Daemon Address can only be configured through the environment variable.

## License

This repository is published under the [MIT License](./LICENSE).
