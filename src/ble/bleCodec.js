/* global BigInt */

const BASE64_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const n = (a << 16) | (b << 8) | c;
    out += BASE64_TABLE[(n >> 18) & 63];
    out += BASE64_TABLE[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64_TABLE[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64_TABLE[n & 63] : "=";
  }
  return out;
}

export function base64ToBytes(base64) {
  const cleaned = String(base64 || "").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!cleaned) return new Uint8Array(0);

  const chunks = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const c1 = BASE64_TABLE.indexOf(cleaned[i]);
    const c2 = BASE64_TABLE.indexOf(cleaned[i + 1]);
    const c3 = cleaned[i + 2] === "=" ? -1 : BASE64_TABLE.indexOf(cleaned[i + 2]);
    const c4 = cleaned[i + 3] === "=" ? -1 : BASE64_TABLE.indexOf(cleaned[i + 3]);

    const n1 = c1 < 0 ? 0 : c1;
    const n2 = c2 < 0 ? 0 : c2;
    const n3 = c3 < 0 ? 0 : c3;
    const n4 = c4 < 0 ? 0 : c4;
    const triple = (n1 << 18) | (n2 << 12) | (n3 << 6) | n4;

    chunks.push((triple >> 16) & 0xff);
    if (c3 >= 0) chunks.push((triple >> 8) & 0xff);
    if (c4 >= 0) chunks.push(triple & 0xff);
  }

  return new Uint8Array(chunks);
}

function encodeU16LE(value) {
  const bytes = new Uint8Array(2);
  const v = Number(value) & 0xffff;
  bytes[0] = v & 0xff;
  bytes[1] = (v >> 8) & 0xff;
  return bytes;
}

function decodeU16LE(bytes, offset = 0) {
  return (bytes[offset] | (bytes[offset + 1] << 8)) >>> 0;
}

function encodeU64LE(value) {
  let v = BigInt(value);
  if (v < 0n) v = 0n;
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number((v >> BigInt(i * 8)) & 0xffn);
  }
  return out;
}

function decodeU64LE(bytes, offset = 0) {
  let out = 0n;
  for (let i = 0; i < 8; i += 1) {
    out |= BigInt(bytes[offset + i]) << BigInt(i * 8);
  }
  return out;
}

function encodeFloat32LE(value) {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setFloat32(0, Number(value), true);
  return new Uint8Array(buf);
}

function decodeFloat32LE(bytes, offset = 0) {
  const buf = new ArrayBuffer(4);
  const arr = new Uint8Array(buf);
  arr[0] = bytes[offset];
  arr[1] = bytes[offset + 1];
  arr[2] = bytes[offset + 2];
  arr[3] = bytes[offset + 3];
  const view = new DataView(buf);
  return view.getFloat32(0, true);
}

export function encodeParam1Epoch(epochSeconds) {
  return bytesToBase64(encodeU64LE(BigInt(epochSeconds)));
}

export function decodeParam1Epoch(base64) {
  const bytes = base64ToBytes(base64);
  if (bytes.length < 8) throw new Error("Param1 payload must be 8 bytes.");
  return Number(decodeU64LE(bytes, 0));
}

export function encodeThresholdPair(lower, upper) {
  const out = new Uint8Array(4);
  out.set(encodeU16LE(lower), 0);
  out.set(encodeU16LE(upper), 2);
  return bytesToBase64(out);
}

export function decodeThresholdPair(base64) {
  const bytes = base64ToBytes(base64);
  if (bytes.length < 4) throw new Error("Threshold payload must be 4 bytes.");
  return {
    lower: decodeU16LE(bytes, 0),
    upper: decodeU16LE(bytes, 2),
  };
}

export function encodeFloatParam(value) {
  return bytesToBase64(encodeFloat32LE(value));
}

export function decodeFloatParam(base64) {
  const bytes = base64ToBytes(base64);
  if (bytes.length < 4) throw new Error("Float payload must be 4 bytes.");
  return decodeFloat32LE(bytes, 0);
}

export function encodeBuzzerOnTime(seconds) {
  if (typeof seconds === "string" && seconds.trim() === "") {
    throw new Error("Buzzer on-time must be an integer from 0 to 100 seconds.");
  }
  const value = Number(seconds);
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error("Buzzer on-time must be an integer from 0 to 100 seconds.");
  }
  return bytesToBase64(encodeU16LE(value));
}

export function decodeBuzzerOnTime(base64) {
  const bytes = base64ToBytes(base64);
  if (bytes.length !== 2) throw new Error("Buzzer on-time payload must be 2 bytes.");
  return decodeU16LE(bytes, 0);
}

export function decodeAllParamsSnapshot(base64) {
  const bytes = base64ToBytes(base64);
  if (bytes.length !== 40 && bytes.length !== 42) {
    throw new Error(`All params payload must be 40 or 42 bytes; received ${bytes.length}.`);
  }

  return {
    param1Epoch: Number(decodeU64LE(bytes, 0)),
    param2: { lower: decodeU16LE(bytes, 8), upper: decodeU16LE(bytes, 10) },
    param3: { lower: decodeU16LE(bytes, 12), upper: decodeU16LE(bytes, 14) },
    param4: { lower: decodeU16LE(bytes, 16), upper: decodeU16LE(bytes, 18) },
    param5: { lower: decodeU16LE(bytes, 20), upper: decodeU16LE(bytes, 22) },
    param6: decodeFloat32LE(bytes, 24),
    param7: decodeFloat32LE(bytes, 28),
    param8: decodeFloat32LE(bytes, 32),
    param9: decodeFloat32LE(bytes, 36),
    param10: bytes.length === 42 ? decodeU16LE(bytes, 40) : 10,
  };
}

export function decodeStatus(base64) {
  const bytes = base64ToBytes(base64);
  if (bytes.length < 2) return null;
  return { paramId: bytes[0], statusCode: bytes[1] };
}

export function decodeTelemetry(base64) {
  const bytes = base64ToBytes(base64);
  const text = decodeUtf8(bytes);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function encodeUtf8Text(value) {
  const text = String(value ?? "");
  const Encoder = typeof global !== "undefined" ? global.TextEncoder : undefined;
  if (typeof Encoder === "function") {
    return bytesToBase64(new Encoder().encode(text));
  }

  const bytes = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }
    // Fallback keeps compatibility when TextEncoder is unavailable.
    bytes.push(0x3f); // '?'
  }
  return bytesToBase64(new Uint8Array(bytes));
}

export function decodeUtf8Text(base64) {
  return decodeUtf8(base64ToBytes(base64));
}

function decodeUtf8(bytes) {
  if (!bytes || bytes.length === 0) return "";
  const Decoder = typeof global !== "undefined" ? global.TextDecoder : undefined;
  if (typeof Decoder === "function") {
    return new Decoder("utf-8").decode(bytes);
  }

  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}
