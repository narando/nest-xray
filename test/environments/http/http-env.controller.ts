import { Controller, Get } from "@nestjs/common";
import { HttpEnvService } from "./http-env.service";

@Controller()
export class HttpEnvController {
  constructor(private readonly service: HttpEnvService) {}

  @Get("url")
  index() {
    return this.service.index();
  }
}
