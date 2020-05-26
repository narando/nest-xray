import { Controller, Get, Query, Body } from "@nestjs/common";
import { HttpClientService } from "./http-client.service";

@Controller()
export class HttpClientController {
  constructor(private readonly service: HttpClientService) {}

  @Get("url")
  makeHttpRequest() {
    return this.service.makeHttpRequest();
  }
}
