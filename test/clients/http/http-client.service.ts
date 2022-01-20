import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class HttpClientService {
  constructor(private readonly httpService: HttpService) {}

  async makeHttpRequest(): Promise<string> {
    const res = await this.httpService.get("/example-endpoint").toPromise();

    return res?.data;
  }
}
