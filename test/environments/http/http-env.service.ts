import { Injectable } from "@nestjs/common";
import { TracingService } from "../../../lib";

@Injectable()
export class HttpEnvService {
  constructor(private readonly tracingService: TracingService) {}

  async index() {
    const subsegment = this.tracingService.createSubSegment(
      "http-env-e2e-test-subsegment"
    );

    return new Promise((resolve) => {
      subsegment.close();
      resolve("HttpEnv");
    });
  }
}
