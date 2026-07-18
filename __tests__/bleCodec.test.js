import {
  base64ToBytes,
  bytesToBase64,
  decodeAllParamsSnapshot,
  decodeBuzzerOnTime,
  encodeBuzzerOnTime,
} from "../src/ble/bleCodec";

function buildSnapshotBytes(includeParam10 = false) {
  const buffer = new ArrayBuffer(includeParam10 ? 42 : 40);
  const view = new DataView(buffer);
  view.setBigUint64(0, 1720000000n, true);
  for (let index = 0; index < 4; index += 1) {
    view.setUint16(8 + index * 4, 10 + index, true);
    view.setUint16(10 + index * 4, 20 + index, true);
    view.setFloat32(24 + index * 4, 1.5 + index, true);
  }
  if (includeParam10) view.setUint16(40, 10, true);
  return new Uint8Array(buffer);
}

describe("decodeAllParamsSnapshot", () => {
  it("decodes the ESP32 40-byte snapshot layout", () => {
    const snapshot = decodeAllParamsSnapshot(bytesToBase64(buildSnapshotBytes()));

    expect(snapshot).toEqual({
      param1Epoch: 1720000000,
      param2: { lower: 10, upper: 20 },
      param3: { lower: 11, upper: 21 },
      param4: { lower: 12, upper: 22 },
      param5: { lower: 13, upper: 23 },
      param6: 1.5,
      param7: 2.5,
      param8: 3.5,
      param9: 4.5,
      param10: 10,
    });
  });

  it("decodes the ESP32 42-byte snapshot with parameter 10", () => {
    const snapshot = decodeAllParamsSnapshot(bytesToBase64(buildSnapshotBytes(true)));
    expect(snapshot.param10).toBe(10);
  });

  it.each([20, 22, 39, 41, 43])("reports the received length for a %i-byte payload", (length) => {
    const payload = bytesToBase64(new Uint8Array(length));
    expect(() => decodeAllParamsSnapshot(payload)).toThrow(
      `All params payload must be 40 or 42 bytes; received ${length}.`
    );
  });
});

describe("buzzer on-time codec", () => {
  it.each([0, 1, 10, 100])("round-trips %i seconds as uint16 little-endian", (seconds) => {
    const encoded = encodeBuzzerOnTime(seconds);
    expect(Array.from(base64ToBytes(encoded))).toEqual([seconds, 0]);
    expect(decodeBuzzerOnTime(encoded)).toBe(seconds);
  });

  it.each([-1, 101, 1.5, "abc", ""])("rejects invalid value %p", (value) => {
    expect(() => encodeBuzzerOnTime(value)).toThrow(
      "Buzzer on-time must be an integer from 0 to 100 seconds."
    );
  });
});
