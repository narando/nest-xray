// @ts-ignore
import * as SegmentEmitter from "aws-xray-sdk-core/lib/segment_emitter.js";

export const segmentEmitterMock = () =>
  jest.spyOn(SegmentEmitter, "send").mockImplementation(() => {});
