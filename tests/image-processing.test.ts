import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeImage, inspectImage, MAX_IMAGE_PIXELS, MAX_JPEG_DIMENSION_SCAN_BYTES,
} from "../src/lib/tools/images/processing.ts";

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
  const length = payload.length + 2;
  assert.ok(length <= 0xffff);
  return concatBytes(Uint8Array.of(0xff, marker, length >> 8, length & 0xff), payload);
}

function sof(width: number, height: number): Uint8Array {
  return jpegSegment(0xc0, Uint8Array.of(8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0));
}

function jpegFile(segments: Uint8Array[], options: { width?: number; height?: number; includeSos?: boolean } = {}): File {
  const tail = options.includeSos === false ? [] : [Uint8Array.of(0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0xc0, 0x00, 0x0b)];
  const data = concatBytes(Uint8Array.of(0xff, 0xd8), ...segments, ...tail);
  return new File([data.buffer as ArrayBuffer], "fixture.jpg", { type: "image/jpeg" });
}

function smallJpeg(width = 640, height = 480): File {
  return jpegFile([jpegSegment(0xe0, Uint8Array.of(0x4a, 0x46, 0x49, 0x46, 0, 0)), sof(width, height)]);
}

async function withBitmapStub<T>(run: (calls: number[]) => Promise<T>, width = 640, height = 480): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  const calls: number[] = [];
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: async () => {
      calls.push(1);
      return { width, height, close() {} } as ImageBitmap;
    },
  });
  try { return await run(calls); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, "createImageBitmap", descriptor);
    else Reflect.deleteProperty(globalThis, "createImageBitmap");
  }
}

test("parses an ordinary JPEG frame before decoding", async () => {
  await withBitmapStub(async (calls) => {
    assert.deepEqual(await inspectImage(smallJpeg()), { width: 640, height: 480, type: "image/jpeg" });
    assert.equal(calls.length, 1);
  });
});

test("safely parses a SOF marker beyond the previous 1 MB scan window", async () => {
  const padding = jpegSegment(0xe1, new Uint8Array(65_533).fill(0x11));
  const file = jpegFile(Array.from({ length: 17 }, () => padding).concat(sof(1200, 800)));
  assert.ok(file.size > 1_000_000 && file.size < MAX_JPEG_DIMENSION_SCAN_BYTES);
  await withBitmapStub(async (calls) => {
    assert.deepEqual(await inspectImage(file), { width: 1200, height: 800, type: "image/jpeg" });
    assert.equal(calls.length, 1);
  }, 1200, 800);
});

test("rejects an oversized JPEG frame before bitmap decoding", async () => {
  const file = smallJpeg(6000, 5000);
  assert.equal(6000 * 5000 > MAX_IMAGE_PIXELS, true);
  await withBitmapStub(async (calls) => {
    await assert.rejects(inspectImage(file), /too many pixels/);
    await assert.rejects(decodeImage(file, "image/jpeg"), /too many pixels/);
    assert.equal(calls.length, 0);
  });
});

test("does not decode JPEGs with missing SOF, malformed lengths, or truncated segments", async () => {
  const missingFrame = jpegFile([jpegSegment(0xe0, new Uint8Array(8))]);
  const malformedLength = new File([Uint8Array.of(0xff, 0xd8, 0xff, 0xe1, 0x00, 0x01).buffer], "bad.jpg", { type: "image/jpeg" });
  const truncatedSegment = new File([Uint8Array.of(0xff, 0xd8, 0xff, 0xe1, 0x00, 0x0a, 0x01).buffer], "truncated.jpg", { type: "image/jpeg" });
  await withBitmapStub(async (calls) => {
    for (const file of [missingFrame, malformedLength, truncatedSegment]) {
      await assert.rejects(inspectImage(file), /malformed or truncated/);
    }
    assert.equal(calls.length, 0);
  });
});

test("does not mistake SOF-like bytes inside APP data or after SOS for a frame", async () => {
  const payload = new Uint8Array(32).fill(0x22);
  payload.set([0xff, 0xc0, 0x00, 0x0b, 8, 0, 1, 0, 1, 1, 1, 0x11, 0], 5);
  const fakeOnly = jpegFile([jpegSegment(0xe1, payload)], { includeSos: true });
  await withBitmapStub(async (calls) => {
    await assert.rejects(inspectImage(fakeOnly), /malformed or truncated/);
    assert.equal(calls.length, 0);
  });
});

test("rejects a SOF beyond the documented inspection limit before bitmap decoding", async () => {
  const padding = jpegSegment(0xe1, new Uint8Array(65_533).fill(0x11));
  const segmentCount = Math.ceil(MAX_JPEG_DIMENSION_SCAN_BYTES / padding.length) + 1;
  const file = jpegFile(Array.from({ length: segmentCount }, () => padding).concat(sof(320, 240)));
  assert.ok(file.size > MAX_JPEG_DIMENSION_SCAN_BYTES);
  await withBitmapStub(async (calls) => {
    await assert.rejects(inspectImage(file), /within the first 2 MB/);
    assert.equal(calls.length, 0);
  });
});
