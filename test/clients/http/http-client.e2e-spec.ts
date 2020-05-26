// @ts-ignore
import { HttpService, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Segment } from "aws-xray-sdk";
import * as request from "supertest";
import { HttpTracingModule, TracingModule } from "../../../lib";
import { XRAY_CLIENT } from "../../../lib/core/constants";
import { XRayClient } from "../../../lib/core/interfaces";
import { segmentEmitterMock } from "../../util/segmentEmitterMock";
import { HttpClientRemoteController } from "./http-client-remote.controller";
import { HttpClientRemoteService } from "./http-client-remote.service";
import { HttpClientController } from "./http-client.controller";
import { HttpClientService } from "./http-client.service";

describe("HttpClient (e2e)", () => {
  let app: INestApplication;
  let appRemote: INestApplication;

  let remoteController: HttpClientRemoteController;
  let remoteService: HttpClientRemoteService;

  let controller: HttpClientController;
  let service: HttpClientService;

  let httpService: HttpService;
  let xrayClient: XRayClient;
  let sendSegment: jest.SpyInstance<Segment>;

  beforeEach(async () => {
    const moduleFixtureRemote: TestingModule = await Test.createTestingModule({
      imports: [
        TracingModule.forRoot({
          serviceName: "http-client-e2e-test-remote",
          // EC2 plugin crashes in Github Actions
          plugins: [],
        }),
      ],
      controllers: [HttpClientRemoteController],
      providers: [HttpClientRemoteService],
    }).compile();

    appRemote = moduleFixtureRemote.createNestApplication();
    await appRemote.init();

    await appRemote.getHttpServer().listen(0);
    const remotePort: number = appRemote.getHttpServer().address().port;

    remoteController = moduleFixtureRemote.get<HttpClientRemoteController>(
      HttpClientRemoteController
    );
    remoteService = moduleFixtureRemote.get<HttpClientRemoteService>(
      HttpClientRemoteService
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TracingModule.forRoot({
          serviceName: "http-client-e2e-test",
          // EC2 plugin crashes in Github Actions
          plugins: [],
        }),
        HttpTracingModule.registerAsync({
          useFactory: () => ({
            baseURL: `http://127.0.0.1:${remotePort}`,
          }),
        }),
      ],
      providers: [HttpClientService],
      controllers: [HttpClientController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    controller = app.get<HttpClientController>(HttpClientController);
    service = app.get<HttpClientService>(HttpClientService);
    httpService = app.get<HttpService>(HttpService);
    xrayClient = app.get<XRayClient>(XRAY_CLIENT);

    sendSegment = segmentEmitterMock();
  });

  afterEach(async () => {
    await app.close();
    await appRemote.close();
    sendSegment.mockRestore();
  });

  it("should be defined", () => {
    expect(remoteController).toBeDefined();
    expect(remoteService).toBeDefined();

    expect(controller).toBeDefined();
    expect(service).toBeDefined();

    expect(httpService).toBeDefined();
    expect(xrayClient).toBeDefined();
  });

  it("should return the correct value", async () => {
    await request(app.getHttpServer())
      .get("/url")
      .expect(200)
      .expect("ExampleEndpoint");
  });

  it("should generate the correct segments", async () => {
    await request(app.getHttpServer())
      .get("/url")
      .expect(200)
      .expect("ExampleEndpoint");

    expect(sendSegment).toHaveBeenCalledTimes(2);

    expect(sendSegment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "http-client-e2e-test",
        http: expect.objectContaining({
          request: expect.objectContaining({
            method: "GET",
            url: expect.stringMatching(
              /^http:\/\/127.0.0.1:[0-9]{1,5}\/example-endpoint/
            ),
            user_agent: expect.stringMatching(/^axios/),
          }),
          response: expect.objectContaining({
            status: 200,
          }),
        }),
        parent_id: expect.any(String),
        trace_id: expect.any(String),
      })
    );
    expect(sendSegment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: "http-client-e2e-test",
        http: expect.objectContaining({
          request: expect.objectContaining({
            method: "GET",
            url: expect.stringMatching(/^http:\/\/127.0.0.1:[0-9]{1,5}\/url/),
            user_agent: expect.stringMatching(/^node-superagent/),
          }),
          response: expect.objectContaining({
            status: 200,
          }),
        }),
        subsegments: expect.arrayContaining([
          expect.objectContaining({
            http: expect.objectContaining({
              request: expect.objectContaining({
                method: "GET",
                url: expect.stringMatching(
                  /^http:\/\/127.0.0.1:[0-9]{1,5}\/example-endpoint/
                ),
              }),
              response: expect.objectContaining({
                status: 200,
              }),
            }),
            name: "http-call",
          }),
        ]),
      })
    );

    const [[remoteSegment], [localSegment]] = sendSegment.mock.calls;

    expect(remoteSegment.trace_id).toEqual(localSegment.trace_id);
    expect(remoteSegment.parent_id).toEqual(localSegment.subsegments[0].id);
  });
});
