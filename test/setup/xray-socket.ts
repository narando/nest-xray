// @ts-ignore
import * as SegmentEmitter from "aws-xray-sdk-core/lib/segment_emitter.js";

// By default the AWS XRay SDK opens a UDP socket and keeps it for the whole lifetime.
// This keeps the testsuite from finishing. By disabling the reusable socket,
// a new socket is created and closed for each operation.
SegmentEmitter.disableReusableSocket();
