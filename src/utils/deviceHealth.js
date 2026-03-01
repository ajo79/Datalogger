/**
 * Shared device health helpers used across Dashboard and Home screens.
 *
 * Business rules (requested):
 * - Good devices: online AND have zero "common issue"/"common alarm".
 * - Bad/Issue devices: offline OR have a common issue.
 * - Total devices: all items received.
 */

// If a reading is older than this, mark device offline.
// Reduced to improve online/offline detection responsiveness.
export const OFFLINE_AFTER_MS = 60000; // 60 seconds
const MIN_OFFLINE_AFTER_MS = 30000;
const MAX_OFFLINE_AFTER_MS = 180000;

// Merge payload onto the item (without mutating) for defensive checks.
function withPayload(item) {
  if (!item || typeof item !== "object") return item;

  if (item.payload && typeof item.payload === "object") {
    return { ...item, ...item.payload };
  }

  if (typeof item.payload === "string") {
    try {
      const parsed = JSON.parse(item.payload);
      if (parsed && typeof parsed === "object") {
        return { ...item, ...parsed };
      }
    } catch {
      // Ignore payload parse errors and use root item
    }
  }

  return item;
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

function resolveOfflineAfterMs(item, fallbackMs) {
  const merged = withPayload(item);
  const statusObj = merged?.status && typeof merged.status === "object" ? merged.status : {};

  const explicitMs = Number(
    statusObj.offlineAfterMs ??
      statusObj.offline_after_ms ??
      merged?.offlineAfterMs ??
      merged?.offline_after_ms
  );
  if (Number.isFinite(explicitMs) && explicitMs > 0) return explicitMs;

  const intervalMs = Number(
    statusObj.publishIntervalMs ??
      statusObj.reportingIntervalMs ??
      statusObj.reportIntervalMs ??
      merged?.publishIntervalMs ??
      merged?.reportingIntervalMs
  );
  if (Number.isFinite(intervalMs) && intervalMs > 0) {
    return Math.min(MAX_OFFLINE_AFTER_MS, Math.max(MIN_OFFLINE_AFTER_MS, intervalMs * 3));
  }

  const intervalSec = Number(
    statusObj.publishIntervalSec ??
      statusObj.reportingIntervalSec ??
      statusObj.reportIntervalSec ??
      merged?.publishIntervalSec ??
      merged?.reportingIntervalSec
  );
  if (Number.isFinite(intervalSec) && intervalSec > 0) {
    return Math.min(MAX_OFFLINE_AFTER_MS, Math.max(MIN_OFFLINE_AFTER_MS, intervalSec * 3000));
  }

  return Math.min(MAX_OFFLINE_AFTER_MS, Math.max(MIN_OFFLINE_AFTER_MS, fallbackMs));
}

/**
 * Determines if a device is online based on timestamp freshness.
 */
export function computeIsOnline(item, offlineAfterMs = OFFLINE_AFTER_MS) {
  const merged = withPayload(item);
  const statusObj = merged?.status && typeof merged.status === "object" ? merged.status : null;
  const explicitOnline = parseBoolean(statusObj?.online ?? merged?.online);

  const ts = Number(
    merged?.tsServerMs ??
      merged?.ts ??
      merged?.tsDeviceMs ??
      merged?.tsEpochMs ??
      merged?.ts_epoch_ms
  );
  if (Number.isFinite(ts)) {
    const thresholdMs = resolveOfflineAfterMs(merged, offlineAfterMs);
    return Date.now() - ts <= thresholdMs;
  }

  if (typeof explicitOnline === "boolean") {
    return explicitOnline;
  }

  // Missing timestamp cannot prove freshness; treat as offline.
  return false;
}

function pickCaseInsensitive(obj, keys = []) {
  if (!obj || typeof obj !== "object") return undefined;
  const lowerMap = {};
  Object.entries(obj).forEach(([k, v]) => {
    lowerMap[String(k).toLowerCase()] = v;
  });
  for (const key of keys) {
    const lk = String(key).toLowerCase();
    if (lk in lowerMap) return lowerMap[lk];
  }
  return undefined;
}

/**
 * Extracts the "common issue" flag/value from a device.
 * Coerces to boolean:
 * - numeric: >0 => true (issue), 0 => false
 * - boolean/truthy/falsy otherwise
 */
export function hasCommonIssue(item) {
  const merged = withPayload(item);

  const statusObj = merged?.status && typeof merged.status === "object" ? merged.status : null;
  const statusAlarmVal = pickCaseInsensitive(statusObj, [
    "overallAlarm",
    "overall_alarm",
    "commonAlarm",
    "common_alarm",
  ]);
  if (statusAlarmVal !== undefined) {
    const parsed = parseBoolean(statusAlarmVal);
    if (typeof parsed === "boolean") return parsed;
    const num = Number(statusAlarmVal);
    if (Number.isFinite(num)) return num !== 0;
    return false;
  }

  const val = pickCaseInsensitive(merged, [
    "Common Issue",
    "Common Issues",
    "Common Alarm",
    "CommonAlarm",
    "Common_Issue",
    "Common_Alarm",
    "common_issue",
    "common alarm",
    "common issue",
    "commonAlarm",
    "commonIssue",
  ]);

  if (val === undefined) return false;
  const parsed = parseBoolean(val);
  if (typeof parsed === "boolean") return parsed;

  const num = Number(val);
  if (Number.isFinite(num)) return num !== 0;

  return false;
}

/**
 * Classifies device as "good" or "issue" using the business rule.
 */
export function classifyDeviceHealth(item, { offlineAfterMs = OFFLINE_AFTER_MS } = {}) {
  const online = computeIsOnline(item, offlineAfterMs);
  const commonIssue = hasCommonIssue(item);
  const category = !online || commonIssue ? "issue" : "good";
  return { category, online, commonIssue };
}

/**
 * Utility to compute summary counts for dashboard tiles.
 */
export function buildHealthSummary(items = [], thresholds) {
  const total = items.length;
  let online = 0;
  let good = 0;
  let issue = 0;

  items.forEach((item) => {
    const { category, online: isOnline } = classifyDeviceHealth(item, thresholds);
    if (isOnline) online += 1;
    if (category === "good") good += 1;
    else issue += 1;
  });

  return { total, online, good, issue };
}
