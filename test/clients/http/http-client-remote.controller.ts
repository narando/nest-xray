import { Controller, Get } from "@nestjs/common";
import { HttpClientRemoteService } from "./http-client-remote.service";

@Controller()
export class HttpClientRemoteController {
  constructor(private readonly service: HttpClientRemoteService) {}

  @Get("example-endpoint")
  exampleEndpoint() {
    return this.service.exampleEndpoint();
  }
}
