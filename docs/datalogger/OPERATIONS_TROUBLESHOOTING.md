# Operations and Troubleshooting

## 1. Primary Observability Points

- Mobile logs (Metro/device logs)
- API Gateway/Lambda logs
- DynamoDB data quality and timestamp freshness (server side)
- In-app indicators:
  - Dashboard counts
  - Home status chips
  - Graph live/history notices
  - Export partial-data warning alerts

## 2. Common Issues

## A. Device marked offline unexpectedly

Checks:

1. Confirm row timestamps are fresh (`tsServerMs`/`ts` path).
2. Confirm base threshold in `deviceHealth.js` is `OFFLINE_AFTER_MS = 30000`.
3. Check if device status includes publish interval fields; dynamic threshold may be applied.
4. Validate backend ingestion latency.

## B. Export missing history rows

Checks:

1. Confirm export path used `fetchAllIoTReadings`.
2. Inspect `_meta.stopReason` and `_meta.potentiallyIncomplete`.
3. Reduce date range and retry.
4. Validate timestamp fields are present/valid for range filtering.

## C. Graph history shows no data

Checks:

1. Validate date format in UI (`DD-MM-YYYY`).
2. Confirm selected start/end range contains records (same-day search is valid and uses end-of-day inclusive timestamp).
3. If using GraphScreen with empty device field, retry with explicit device ID to isolate query behavior.
4. Confirm records pass BIOT schema validity (`_schemaValid`).
5. Confirm timestamp aliases normalize correctly (`tsEpochMs`/`ts_epoch_ms`).
6. Inspect logs for GraphScreen device-scoped fallback retry path when broad query returns zero matches.

## D. Alarm screen empty

Alarm source priority:

1. `ESP32_Alarms` API rows
2. synthesized alarms from telemetry
3. local AsyncStorage alarm log

If empty, validate all three paths and network status.

## E. BLE scan/connect failures

Checks:

1. Android runtime permissions granted (`SCAN`/`CONNECT` or legacy location).
2. Bluetooth is enabled.
3. Device is advertising and in range.
4. UUID mapping matches firmware (`src/ble/bleContract.js`).

## 3. Safe Runtime Tuning

## API timeout

- File: `src/api/dataService.js`
- `DEFAULT_FETCH_TIMEOUT_MS` and `FAST_STATUS_TIMEOUT_MS`

## Polling cadence

- File-level constants/intervals in:
  - `DashboardScreen`
  - `HomeScreen`
  - `GraphScreen`
  - `GraphShowScreen`
  - `AlarmScreen`
- Current baseline:
  - Home/Dashboard/Graph/GraphShow: `5000` ms
  - Alarm (focused): `1000` ms

## Offline classification

- File: `src/utils/deviceHealth.js`
- Base: `OFFLINE_AFTER_MS`
- Dynamic behavior from publish/report interval fields

## 4. Incident Quick Checklist

1. API `/prod` is reachable from device network.
2. Response includes expected arrays.
3. Recent timestamps are present in returned rows.
4. Pagination metadata is returned for large history windows.
5. No screen-level timer leaks after navigation/unmount.

## 5. Hardening Backlog

1. Move API base URL/stage to environment config.
2. Add production auth and secure token handling.
3. Add contract tests around normalization and pagination.
4. Add app telemetry/error reporting.
5. Remove or isolate legacy `src/screens_1`.
