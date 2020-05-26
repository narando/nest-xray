import { Injectable } from "@nestjs/common";

@Injectable()
export class HttpClientRemoteService {
  exampleEndpoint(): string {
    return "ExampleEndpoint";
  }
}
