/*
 * dataService.js
 *
 * This module handles all API interactions with the backend (AWS Lambda/Gateway).
 * It includes robust error handling, timeouts, and response normalization.
 *
 * Key Features:
 * - Fetch with AbortController and configurable timeouts.
 * - Safe JSON parsing to prevent crashes on malformed responses.
 * - Lambda Proxy response normalization (handling "body" string vs direct JSON).
 */

const API_URL = "https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com";
const DASHBOARD_PATH = "/prod"; // change only if your stage/path differs
const DEFAULT_FETCH_TIMEOUT_MS = 60000;
const FAST_STATUS_TIMEOUT_MS = 5000;
const FAST_STATUS_CACHE_DEFAULT_MAX_AGE_MS = 30000;

let fastDeviceStatusCache = {
  items: null,
  fetchedAtMs: 0,
};
let fastDeviceStatusInFlight = null;

function normalizeTimeoutMs(timeoutMs, fallbackMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const n = Number(timeoutMs);
  if (Number.isFinite(n) && n > 0) {
    return Math.max(1000, Math.round(n));
  }
  return fallbackMs;
}

function setFastDeviceStatusCache(items) {
  fastDeviceStatusCache = {
    items: Array.isArray(items) ? items : [],
    fetchedAtMs: Date.now(),
  };
}

export function getCachedFastDeviceStatus(options = {}) {
  if (!Array.isArray(fastDeviceStatusCache.items)) return null;

  const maxAgeMsRaw = Number(options?.maxAgeMs);
  const maxAgeMs = Number.isFinite(maxAgeMsRaw) && maxAgeMsRaw >= 0
    ? Math.round(maxAgeMsRaw)
    : FAST_STATUS_CACHE_DEFAULT_MAX_AGE_MS;

  const ageMs = Date.now() - Number(fastDeviceStatusCache.fetchedAtMs || 0);
  if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) return null;

  return fastDeviceStatusCache.items;
}

function toQueryValue(value) {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const out = String(value);
    return out.length ? out : undefined;
  }
  try {
    const out = JSON.stringify(value);
    return out && out !== "{}" ? out : undefined;
  } catch {
    return undefined;
  }
}

function buildApiUrl(path, query) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, raw]) => {
    const value = toQueryValue(raw);
    if (value !== undefined) params.append(String(key), value);
  });
  const queryString = params.toString();
  return `${API_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function extractIoTReadingsNextToken(json) {
  if (!json || typeof json !== "object") return undefined;

  const pagination = json.pagination && typeof json.pagination === "object" ? json.pagination : {};
  const iotPage = pagination.IoTReadings && typeof pagination.IoTReadings === "object"
    ? pagination.IoTReadings
    : {};

  const rootLek = json.LastEvaluatedKey;
  const iotLek = firstDefined(
    json.IoTReadingsLastEvaluatedKey,
    json.iotReadingsLastEvaluatedKey,
    iotPage.lastEvaluatedKey,
    rootLek?.IoTReadings,
    rootLek?.iotReadings
  );

  return firstDefined(
    json.IoTReadingsNextToken,
    json.iotReadingsNextToken,
    json.IoTReadingsCursor,
    json.iotReadingsCursor,
    json.nextTokenIoTReadings,
    iotPage.nextToken,
    iotPage.cursor,
    pagination.IoTReadingsNextToken,
    pagination.iotReadingsNextToken,
    json.nextToken,
    json.pageToken,
    json.cursor,
    json.continuationToken,
    iotLek,
    rootLek
  );
}

function extractIoTReadingsHasMore(json) {
  if (!json || typeof json !== "object") return undefined;

  const pagination = json.pagination && typeof json.pagination === "object" ? json.pagination : {};
  const iotPage = pagination.IoTReadings && typeof pagination.IoTReadings === "object"
    ? pagination.IoTReadings
    : {};

  const raw = firstDefined(
    json.IoTReadingsHasMore,
    json.iotReadingsHasMore,
    iotPage.hasMore,
    iotPage.hasNextPage,
    pagination.IoTReadingsHasMore,
    pagination.hasMore,
    pagination.hasNextPage,
    json.hasMore,
    json.hasNextPage,
    json.truncated
  );

  if (raw === undefined || raw === null) return undefined;
  const parsed = parseBoolean(raw);
  if (typeof parsed === "boolean") return parsed;

  const n = Number(raw);
  if (Number.isFinite(n)) return n !== 0;
  return undefined;
}

/**
 * Fetches text content from a URL with a strictly enforced timeout.
 * @param {string} url - The endpoint URL
 * @param {{ timeoutMs?: number }} options
 * @returns {Promise<string>} - The raw text response
 */
async function fetchText(url, options = {}) {
  const timeoutMs = normalizeTimeoutMs(options?.timeoutMs, DEFAULT_FETCH_TIMEOUT_MS);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safely parses JSON string without throwing errors.
 * @param {string} text - JSON string
 * @returns {object|null} - Parsed object or null if failed
 */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Normalizes response from AWS Lambda.
 * Lambda can return checks in two formats:
 * 1. Direct JSON object
 * 2. Proxy integration format: { statusCode: 200, body: "{\"key\":\"value\"}" }
 */
function normalizeLambdaResponse(parsed) {
  // Case A: Lambda proxy format -> parse the inner 'body' string
  if (parsed && typeof parsed === "object" && typeof parsed.body === "string") {
    const inner = safeJsonParse(parsed.body);
    return inner ?? {};
  }

  // Case B: direct JSON response
  return parsed ?? {};
}

/**
 * Unmarshals DynamoDB AttributeValues into plain JS values.
 * Supports common types used in the app (S, N, BOOL, NULL, M, L).
 */
function unmarshalAttributeValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1) {
      if ("S" in value) return String(value.S);
      if ("N" in value) {
        const n = Number(value.N);
        return Number.isFinite(n) ? n : value.N;
      }
      if ("BOOL" in value) return Boolean(value.BOOL);
      if ("NULL" in value) return null;
      if ("M" in value) return unmarshalMap(value.M);
      if ("L" in value && Array.isArray(value.L)) {
        return value.L.map(unmarshalAttributeValue);
      }
    }
  }
  return value;
}

function unmarshalMap(map) {
  if (!map || typeof map !== "object") return map;
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = unmarshalAttributeValue(v);
  }
  return out;
}

function unmarshalItem(item) {
  if (!item || typeof item !== "object") return item;
  return unmarshalMap(item);
}

// Helpers to canonicalize field names for UI consumption
function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pickNumber(...vals) {
  for (const v of vals) {
    const n = asNumber(v);
    if (n !== undefined) return n;
  }
  return undefined;
}

function toEpochMs(value) {
  if (value == null) return undefined;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    // Normalize common timestamp units to epoch milliseconds.
    // - seconds:   1e9..1e12
    // - millis:    ~1e12
    // - micros:    >1e13
    // - nanos:     >1e16
    if (numeric > 1e16) return Math.round(numeric / 1e6); // ns -> ms
    if (numeric > 1e13) return Math.round(numeric / 1e3); // us -> ms
    if (numeric > 1e9 && numeric < 1e12) return Math.round(numeric * 1000); // s -> ms
    return Math.round(numeric);
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function pickEpochMs(...vals) {
  for (const v of vals) {
    const ts = toEpochMs(v);
    if (ts !== undefined) return ts;
  }
  return undefined;
}

function toBool01(value) {
  const bool = parseBoolean(value);
  if (typeof bool === "boolean") return bool ? 1 : 0;
  const n = Number(value);
  if (Number.isFinite(n)) return n !== 0 ? 1 : 0;
  return 0;
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on", "alarm", "active"].includes(lowered)) return true;
    if (["0", "false", "no", "n", "off", "ok", "normal", "inactive", "none"].includes(lowered)) {
      return false;
    }
  }
  return undefined;
}

function normalizeAlarm(alarm) {
  if (!alarm || typeof alarm !== "object") {
    return { active: false, severity: "none" };
  }
  const activeRaw =
    alarm.active ??
    alarm.isActive ??
    alarm.alarm ??
    alarm.flag ??
    alarm.value;
  const active = parseBoolean(activeRaw);
  const severity = String(alarm.severity || alarm.level || "none").toLowerCase();
  return { active: Boolean(active), severity };
}

function normalizeParameters(parameters) {
  const source = (() => {
    if (Array.isArray(parameters)) return parameters;
    if (typeof parameters === "string") {
      const parsed = safeJsonParse(parameters);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  })();

  if (!Array.isArray(source)) return [];

  return source
    .map((item, idx) => {
      const resolvedItem = typeof item === "string" ? safeJsonParse(item) : item;
      if (!resolvedItem || typeof resolvedItem !== "object") return null;
      const order = asNumber(resolvedItem.order);
      return {
        key: String(resolvedItem.key ?? `param_${idx + 1}`),
        label: String(resolvedItem.label ?? resolvedItem.key ?? `Param ${idx + 1}`),
        value: resolvedItem.value,
        unit: resolvedItem.unit != null ? String(resolvedItem.unit) : "",
        valueType: String(
          resolvedItem.valueType ?? resolvedItem.type ?? typeof resolvedItem.value ?? "unknown"
        ),
        order: Number.isFinite(order) ? order : idx + 1,
        showOnCard: resolvedItem.showOnCard !== false,
        alarm: normalizeAlarm(resolvedItem.alarm),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

function findPhaseId(parameter) {
  const key = String(parameter?.key || "").toLowerCase();
  const label = String(parameter?.label || "").toLowerCase();
  const match =
    key.match(/phase[_\s-]?(\d+)/) ||
    label.match(/phase[_\s-]?(\d+)/) ||
    key.match(/press[_\s-]?(\d+)/) ||
    label.match(/press[_\s-]?(\d+)/);
  return match ? match[1] : null;
}

function isBiotTelemetryRecord(lookup, parameters) {
  const schemaVersion = Number(lookup?.schemaVersion);
  const msgType = String(lookup?.msgType || "").toLowerCase();
  const statusObj = lookup?.status && typeof lookup.status === "object" ? lookup.status : null;

  const hasEnvelope =
    Number.isFinite(schemaVersion) &&
    schemaVersion >= 1 &&
    msgType === "telemetry";

  // Some backend paths may omit schemaVersion/msgType but still return BIOT-style records.
  const hasBiotShape =
    Array.isArray(parameters) &&
    (statusObj !== null ||
      lookup?.siteId != null ||
      lookup?.deviceType != null ||
      lookup?.tsEpochMs != null ||
      msgType === "telemetry");

  return hasEnvelope || hasBiotShape;
}

function applyCanonicalCompatFields(merged, parameters) {
  const out = {};
  const status = merged?.status && typeof merged.status === "object" ? merged.status : {};

  const wifiStrength = pickNumber(
    status?.wifiStrength,
    status?.wifi_strength,
    status?.wifi?.level,
    merged?.wifi_strength,
    merged?.wifiStrength,
    merged?.wifiSignal,
    merged?.wifi
  );
  if (wifiStrength !== undefined) out.wifi_strength = wifiStrength;

  const overallAlarmRaw =
    status?.overallAlarm ??
    status?.overall_alarm ??
    status?.commonAlarm ??
    merged?.overallAlarm;
  if (overallAlarmRaw !== undefined) {
    out["Common Alarm"] = toBool01(overallAlarmRaw);
  }

  parameters.forEach((parameter) => {
    const keyLower = String(parameter?.key || "").toLowerCase();
    const labelLower = String(parameter?.label || "").toLowerCase();
    const numericValue = asNumber(parameter?.value);
    const phaseId = findPhaseId(parameter);

    if (numericValue !== undefined && (keyLower.includes("temperature") || keyLower.endsWith("_c") || labelLower.includes("temp"))) {
      if (out.temperature === undefined) out.temperature = numericValue;
    }

    if (numericValue !== undefined && (keyLower.includes("humidity") || keyLower.endsWith("_pct") || labelLower.includes("hum"))) {
      if (out.humidity === undefined) out.humidity = numericValue;
    }

    if (phaseId && numericValue !== undefined) {
      out[`Press ${phaseId} Amps`] = numericValue;
      out[`Press ${phaseId} Alarm`] = parameter?.alarm?.active ? 1 : 0;
    }
  });

  return out;
}

/**
 * Normalizes a reading:
 * - Unwraps payload into top-level
 * - Coerces common aliases for temperature/humidity/ts
 * - Ensures deviceId is stringified
 */
function normalizeReading(entry) {
  if (!entry || typeof entry !== "object") return entry;

  const merged = (() => {
    const out = { ...entry };
    if (typeof out.payload === "string") {
      const parsedPayload = safeJsonParse(out.payload);
      if (parsedPayload && typeof parsedPayload === "object") {
        Object.assign(out, parsedPayload);
      }
    } else if (out.payload && typeof out.payload === "object") {
      Object.assign(out, out.payload);
    }
    return out;
  })();

  const parameters = normalizeParameters(merged.parameters);
  const compat = applyCanonicalCompatFields(merged, parameters);
  const lookup = { ...merged, ...compat };

  // Case-insensitive lookup helper for numeric fields
  const pickNumberAlias = (obj, keys) => {
    const lowerMap = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      lowerMap[String(k).toLowerCase()] = v;
    });
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const n = asNumber(obj[key]);
        if (n !== undefined) return n;
      }
      const lk = String(key).toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowerMap, lk)) {
        const n = asNumber(lowerMap[lk]);
        if (n !== undefined) return n;
      }
    }
    return undefined;
  };

  const tsServerMs = pickEpochMs(lookup.ts, lookup.timestamp, lookup.time);
  const tsDeviceMs = pickEpochMs(lookup.tsEpochMs, lookup.ts_epoch_ms);

  return {
    ...merged,
    ...compat,
    parameters,
    schemaVersion: asNumber(lookup.schemaVersion) ?? lookup.schemaVersion,
    msgType: lookup.msgType != null ? String(lookup.msgType) : lookup.msgType,
    deviceId: lookup.deviceId != null ? String(lookup.deviceId) : lookup.deviceId,
    deviceType: lookup.deviceType != null ? String(lookup.deviceType) : lookup.deviceType,
    siteId: lookup.siteId != null ? String(lookup.siteId) : lookup.siteId,
    temperature: pickNumberAlias(lookup, [
      "temperature",
      "Temperature",
      "Temperature deg",
      "temperature deg",
      "temperature Deg",
      "temp",
      "Temp"
    ]),
    humidity: pickNumberAlias(lookup, [
      "humidity",
      "Humidity",
      "Humidity %",
      "humidity %",
      "hum",
      "Hum"
    ]),
    // Use server-ingestion time for online/offline freshness when available.
    // Keep device epoch as fallback and for date-range/history flows.
    tsServerMs,
    tsDeviceMs,
    ts: pickEpochMs(tsServerMs, tsDeviceMs),
    _schemaValid: isBiotTelemetryRecord(lookup, parameters),
  };
}

function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(unmarshalItem).map(normalizeReading);
}

function deviceKey(item) {
  const raw = item?.deviceId;
  if (raw == null) return "";
  return String(raw).trim().toUpperCase();
}

function hasObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function mergeReadingWithFallback(primary, fallback) {
  if (!fallback || typeof fallback !== "object") return primary;
  if (!primary || typeof primary !== "object") return fallback;

  const merged = { ...fallback, ...primary };

  const primaryStatus = hasObject(primary.status) ? primary.status : {};
  const fallbackStatus = hasObject(fallback.status) ? fallback.status : {};
  if (Object.keys(primaryStatus).length || Object.keys(fallbackStatus).length) {
    merged.status = { ...fallbackStatus, ...primaryStatus };
  }

  const primaryParams = Array.isArray(primary.parameters) ? primary.parameters : [];
  const fallbackParams = Array.isArray(fallback.parameters) ? fallback.parameters : [];
  if (primaryParams.length > 0) merged.parameters = primaryParams;
  else if (fallbackParams.length > 0) merged.parameters = fallbackParams;

  const copyIfMissing = (key) => {
    const current = merged[key];
    const missing =
      current === undefined ||
      current === null ||
      (typeof current === "string" && current.trim() === "");
    if (missing && fallback[key] !== undefined) {
      merged[key] = fallback[key];
    }
  };

  copyIfMissing("temperature");
  copyIfMissing("humidity");
  copyIfMissing("wifi_strength");
  copyIfMissing("wifiStrength");
  copyIfMissing("deviceName");
  copyIfMissing("deviceType");
  copyIfMissing("siteId");
  copyIfMissing("ts");

  return merged;
}

function mergeRealtimeAndReadings(realtime, readings) {
  const realtimeSafe = Array.isArray(realtime) ? realtime : [];
  const readingsSafe = Array.isArray(readings) ? readings : [];

  if (!realtimeSafe.length && !readingsSafe.length) {
    return { mergedRealtime: [], readingOnly: [] };
  }
  if (!realtimeSafe.length) {
    return { mergedRealtime: [], readingOnly: readingsSafe };
  }
  if (!readingsSafe.length) {
    return { mergedRealtime: realtimeSafe, readingOnly: [] };
  }

  const readingsByDevice = new Map();
  readingsSafe.forEach((item) => {
    const key = deviceKey(item);
    if (!key) return;
    const prev = readingsByDevice.get(key);
    if (!prev || Number(item?.ts || 0) >= Number(prev?.ts || 0)) {
      readingsByDevice.set(key, item);
    }
  });

  const mergedRealtime = realtimeSafe.map((item) => {
    const key = deviceKey(item);
    if (!key) return item;
    const fallback = readingsByDevice.get(key);
    return mergeReadingWithFallback(item, fallback);
  });

  const realtimeKeys = new Set(mergedRealtime.map(deviceKey).filter(Boolean));
  const readingOnly = readingsSafe.filter((item) => {
    const key = deviceKey(item);
    return !key || !realtimeKeys.has(key);
  });

  return { mergedRealtime, readingOnly };
}

function normalizeCursorToken(cursor) {
  if (cursor == null) return undefined;
  if (typeof cursor === "string" || typeof cursor === "number" || typeof cursor === "boolean") {
    const out = String(cursor);
    return out.length ? out : undefined;
  }
  try {
    const out = JSON.stringify(cursor);
    return out.length ? out : undefined;
  } catch {
    return undefined;
  }
}

function readingIdentity(item) {
  const deviceId = item?.deviceId != null ? String(item.deviceId) : "";
  const tsServer = pickEpochMs(
    item?.tsServerMs,
    item?.ts,
    item?.timestamp,
    item?.time
  );
  const tsDevice = pickEpochMs(
    item?.tsDeviceMs,
    item?.tsEpochMs,
    item?.ts_epoch_ms
  );
  const msgType = item?.msgType != null ? String(item.msgType) : "";
  const parameterCount = Array.isArray(item?.parameters) ? item.parameters.length : 0;
  return `${deviceId}|${tsServer ?? ""}|${tsDevice ?? ""}|${msgType}|${parameterCount}`;
}

function buildMergedBiotData({ RealTimeDataMonitor, IoTReadings }) {
  const { mergedRealtime, readingOnly } = mergeRealtimeAndReadings(RealTimeDataMonitor, IoTReadings);
  const filteredRealtime = mergedRealtime.filter((item) => item?._schemaValid);
  const filteredReadings = readingOnly.filter((item) => item?._schemaValid);
  if (filteredRealtime.length || filteredReadings.length) {
    return [...filteredRealtime, ...filteredReadings];
  }
  return [];
}

/**
 * Main function to fetch dashboard data.
 * Returns normalized object containing IoTReadings and RealTimeDataMonitor.
 */
export async function fetchDashboardData(options = {}) {
  const query = options?.query && typeof options.query === "object" ? options.query : {};
  const timeoutMs = normalizeTimeoutMs(options?.timeoutMs, DEFAULT_FETCH_TIMEOUT_MS);
  const url = buildApiUrl(DASHBOARD_PATH, query);
  const text = await fetchText(url, { timeoutMs });
  const outer = safeJsonParse(text);

  if (!outer) {
    throw new Error(`Response is not valid JSON. Raw: ${text.slice(0, 200)}`);
  }

  const json = normalizeLambdaResponse(outer);
  const ioTReadingsNextToken = extractIoTReadingsNextToken(json);
  const ioTReadingsHasMoreRaw = extractIoTReadingsHasMore(json);
  const ioTReadingsHasMore =
    typeof ioTReadingsHasMoreRaw === "boolean"
      ? ioTReadingsHasMoreRaw
      : ioTReadingsNextToken !== undefined;

  return {
    IoTReadings: normalizeArray(json?.IoTReadings),
    RealTimeDataMonitor: normalizeArray(json?.RealTimeDataMonitor),
    ESP32_Alarms: normalizeArray(json?.ESP32_Alarms),
    _meta: {
      ioTReadingsNextToken,
      ioTReadingsHasMore,
    },
  };
} 

/**
 * Fetches IoTReadings pages until exhaustion when backend provides pagination tokens.
 * Falls back gracefully to single-page behavior when pagination is not exposed.
 */
export async function fetchAllIoTReadings({
  deviceId,
  startTsEpochMs,
  endTsEpochMs,
  maxPages = 80,
} = {}) {
  const allRows = [];
  const seenRows = new Set();
  const seenCursors = new Set();
  let pagesFetched = 0;
  let stopReason = "no_more";
  let cursor = undefined;
  let firstPageRawCount = 0;

  while (pagesFetched < maxPages) {
    const query = {};
    query.iotReadingsOnly = "1";
    if (deviceId != null && String(deviceId).trim()) {
      query.deviceId = String(deviceId).trim();
    }

    const startMs = Number(startTsEpochMs);
    if (Number.isFinite(startMs)) {
      const v = Math.round(startMs);
      query.startTsEpochMs = v;
      query.startTs = v;
      query.fromTs = v;
    }

    const endMs = Number(endTsEpochMs);
    if (Number.isFinite(endMs)) {
      const v = Math.round(endMs);
      query.endTsEpochMs = v;
      query.endTs = v;
      query.toTs = v;
    }

    if (cursor !== undefined) {
      const cursorToken = normalizeCursorToken(cursor);
      if (!cursorToken) {
        stopReason = "invalid_cursor";
        break;
      }
      // Send common token aliases so existing backend implementations can pick one.
      query.cursor = cursorToken;
      query.nextToken = cursorToken;
      query.pageToken = cursorToken;
      query.continuationToken = cursorToken;
    }

    const page = await fetchDashboardData({ query });
    pagesFetched += 1;

    const pageRows = Array.isArray(page?.IoTReadings) ? page.IoTReadings : [];
    if (pagesFetched === 1) firstPageRawCount = pageRows.length;
    let addedThisPage = 0;
    pageRows.forEach((row) => {
      const key = readingIdentity(row);
      if (!seenRows.has(key)) {
        seenRows.add(key);
        allRows.push(row);
        addedThisPage += 1;
      }
    });

    const hasMore = page?._meta?.ioTReadingsHasMore === true;
    const nextCursor = page?._meta?.ioTReadingsNextToken;
    if (!hasMore && nextCursor === undefined) {
      stopReason = "no_more";
      break;
    }

    if (nextCursor === undefined) {
      stopReason = "missing_next_token";
      break;
    }

    const nextCursorKey = normalizeCursorToken(nextCursor);
    if (!nextCursorKey) {
      stopReason = "invalid_next_token";
      break;
    }

    if (seenCursors.has(nextCursorKey)) {
      stopReason = "repeated_next_token";
      break;
    }

    if (addedThisPage === 0) {
      stopReason = "no_new_rows";
      break;
    }

    seenCursors.add(nextCursorKey);
    cursor = nextCursor;
  }

  if (pagesFetched >= maxPages) {
    stopReason = "max_pages_reached";
  }

  const likelySinglePageCap = pagesFetched === 1 && firstPageRawCount >= 1500;
  const potentiallyIncomplete =
    stopReason === "max_pages_reached" ||
    stopReason === "missing_next_token" ||
    likelySinglePageCap;

  return {
    IoTReadings: allRows,
    _meta: {
      pagesFetched,
      stopReason,
      potentiallyIncomplete,
      likelySinglePageCap,
    },
  };
}

/**
 * Helper to get only RealTimeDataMonitor array.
 * This is the primary data source for the HomeScreen cards.
 */
export async function fetchRealTimeDataMonitor(options = {}) {
  const { RealTimeDataMonitor, IoTReadings } = await fetchDashboardData(options);
  const { mergedRealtime } = mergeRealtimeAndReadings(RealTimeDataMonitor, IoTReadings);
  return mergedRealtime.filter((item) => item?._schemaValid);
}

/**
 * Generic data fetcher used by list-style views (Home/Data screens).
 * Prefers real-time monitor data and falls back to IoTReadings if needed.
 */
export async function fetchData(options = {}) {
  const data = await fetchDashboardData(options);
  return buildMergedBiotData(data);
}

/**
 * Fast status fetch path for Home/Dashboard.
 * Tries lightweight backend query first with a short timeout and falls back to normal fetch on failure.
 */
export async function fetchFastDeviceStatus(options = {}) {
  const timeoutMs = normalizeTimeoutMs(options?.timeoutMs, FAST_STATUS_TIMEOUT_MS);
  try {
    const data = await fetchDashboardData({
      query: { statusOnly: "1" },
      timeoutMs,
    });
    const rows = buildMergedBiotData(data);
    setFastDeviceStatusCache(rows);
    return rows;
  } catch (error) {
    console.warn("[dataService] fast status fetch failed, falling back:", error?.message || error);
    const rows = await fetchData({ timeoutMs });
    setFastDeviceStatusCache(rows);
    return rows;
  }
}

export function prefetchFastDeviceStatus(options = {}) {
  if (fastDeviceStatusInFlight) {
    return fastDeviceStatusInFlight;
  }

  fastDeviceStatusInFlight = fetchFastDeviceStatus(options)
    .catch((error) => {
      console.warn("[dataService] prefetch status fetch failed:", error?.message || error);
      return null;
    })
    .finally(() => {
      fastDeviceStatusInFlight = null;
    });

  return fastDeviceStatusInFlight;
}

/**
 * Helper to get ESP32 alarm entries.
 * Each entry is already normalized (payload flattened, numbers coerced).
 * Alarm time uses tsEpochMs only.
 */
export async function fetchESP32Alarms(options = {}) {
  const { ESP32_Alarms } = await fetchDashboardData(options);
  const normalized = (ESP32_Alarms || []).map((item) => ({
    ...item,
    ts: pickEpochMs(item?.tsEpochMs, item?.ts_epoch_ms),
  }));

  return [...normalized].sort((a, b) => {
    const aTs = Number(a?.ts);
    const bTs = Number(b?.ts);
    const aHasTs = Number.isFinite(aTs);
    const bHasTs = Number.isFinite(bTs);
    if (aHasTs && bHasTs) return bTs - aTs;
    if (aHasTs) return -1;
    if (bHasTs) return 1;
    return 0;
  });
}
