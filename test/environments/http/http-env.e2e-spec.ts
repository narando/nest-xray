// @ts-ignore
import {
  Controller,
  Get,
  INestApplication,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { TracingModule } from "../../../lib";
import { XRAY_CLIENT } from "../../../lib/core/constants";
import { XRayClient } from "../../../lib/core/interfaces";
import { segmentEmitterMock } from "../../util/segmentEmitterMock";
import { Segment } from "aws-xray-sdk";
import { HttpEnvController } from "./http-env.controller";
import { HttpEnvService } from "./http-env.service";

describe("HttpEnvironment (e2e)", () => {
  let app: INestApplication;

  let controller: HttpEnvController;
  let service: HttpEnvService;
  let xrayClient: XRayClient;
  let sendSegment: jest.SpyInstance<Segment>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TracingModule.forRoot({
          serviceName: "http-env-e2e-test",
          // EC2 plugin crashes in Github Actions
          plugins: [],
        }),
      ],
      providers: [HttpEnvService],
      controllers: [HttpEnvController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();

    controller = app.get<HttpEnvController>(HttpEnvController);
    service = app.get<HttpEnvService>(HttpEnvService);
    xrayClient = app.get<XRayClient>(XRAY_CLIENT);

    sendSegment = segmentEmitterMock();
  });

  afterEach(async () => {
    await app.close();
    sendSegment.mockRestore();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(xrayClient).toBeDefined();
  });

  it("should send a segment for a successful request", async () => {
    await request(app.getHttpServer())
      .get("/url")
      .expect(200)
      .expect("HttpEnv");

    expect(sendSegment).toHaveBeenCalledTimes(1);
    expect(sendSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "http-env-e2e-test",
        service: expect.objectContaining({ name: "@narando/nest-xray" }),
        http: expect.objectContaining({
          request: expect.objectContaining({
            client_ip: "::ffff:127.0.0.1",
            method: "GET",
            url: expect.stringMatching(/^http:\/\/127.0.0.1:[0-9]{1,5}\/url/),
            user_agent: expect.stringMatching(/^node-superagent/),
          }),
          response: expect.objectContaining({
            status: 200,
          }),
        }),
        subsegments: expect.arrayContaining([
          expect.objectContaining({ name: "http-env-e2e-test-subsegment" }),
        ]),
      })
    );
  });

  it("should send a segment for a 4xx error", async () => {
    service.index = jest.fn().mockRejectedValue(new BadRequestException());

    await request(app.getHttpServer()).get("/url").expect(400);

    expect(sendSegment).toHaveBeenCalledTimes(1);
    expect(sendSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({
        http: expect.objectContaining({
          request: expect.objectContaining({
            method: "GET",
            url: expect.stringMatching(/^http:\/\/127.0.0.1:[0-9]{1,5}\/url/),
          }),
          response: expect.objectContaining({
            status: 400,
          }),
        }),
      })
    );
  });

  it("should send a segment for a 5xx error", async () => {
    service.index = jest
      .fn()
      .mockRejectedValue(new InternalServerErrorException());

    await request(app.getHttpServer()).get("/url").expect(500);

    expect(sendSegment).toHaveBeenCalledTimes(1);
    expect(sendSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({
        http: expect.objectContaining({
          request: expect.objectContaining({
            method: "GET",
            url: expect.stringMatching(/^http:\/\/127.0.0.1:[0-9]{1,5}\/url/),
          }),
          response: expect.objectContaining({
            status: 500,
          }),
        }),
      })
    );
  });
});
