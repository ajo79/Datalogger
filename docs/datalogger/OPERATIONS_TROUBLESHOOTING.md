# Operations and Troubleshooting

Last reviewed: 2026-04-13

## 1. Primary Observability Points

- Mobile logs from Metro and device logs
- API Gateway and Lambda logs
- DynamoDB data quality and timestamp freshness
- In-app indicators:
  - Dashboard counts
  - Home status chips
  - Graph live/history notices
  - Export partial-data warnings
  - BLE status history panels

## 2. Common Issues

## A. Device marked offline unexpectedly

Checks:

1. Confirm row timestamps are fresh (`tsServerMs` / `ts` path).
2. Confirm base threshold in `deviceHealth.js` is `OFFLINE_AFTER_MS = 30000`.
3. Check whether device status includes publish interval fields; dynamic threshold may be applied.
4. Validate backend ingestion latency.

## B. Export missing history rows

Checks:

1. Confirm export uses `fetchAllIoTReadings`.
2. Inspect `_meta.stopReason` and `_meta.potentiallyIncomplete`.
3. Reduce the date range and retry.
4. Validate timestamp fields are present and valid for range filtering.

## C. Graph history shows no data

Checks:

1. Validate date format in UI (`DD-MM-YYYY`).
2. Confirm selected start/end range contains records.
3. If using GraphScreen with an empty device field, retry with an explicit device ID.
4. Confirm records pass BIOT schema validity (`_schemaValid`).
5. Confirm timestamp aliases normalize correctly.
6. Inspect logs for the device-scoped fallback retry path.

## D. Alarm screen empty

Alarm source priority:

1. `ESP32_Alarms` API rows
2. synthesized alarms from telemetry
3. local AsyncStorage alarm log

If empty, validate all three paths and network status.

## E. BLE scan or connect failures

Checks:

1. Android runtime permissions granted (`SCAN` / `CONNECT` or legacy location).
2. Bluetooth is enabled.
3. Device is advertising and in range.
4. UUID mapping matches firmware (`src/ble/bleContract.js`).

## F. Theme does not persist or part of the UI stays on old colors

Checks:

1. Confirm `@app_theme_v1` is being read and written correctly.
2. Confirm the affected screen uses `useAppTheme()` instead of hardcoded colors.
3. Search for direct hex values in the affected screen or component.
4. If a new semantic token was introduced, confirm it exists in all theme definitions.
5. Prefer fixing shared UI primitives before patching individual screens one by one.

## 3. Safe Runtime Tuning

## API timeout

- File:
  - `src/api/dataService.js`
- Constants:
  - `DEFAULT_FETCH_TIMEOUT_MS`
  - `FAST_STATUS_TIMEOUT_MS`

## Polling cadence

- Files:
  - `DashboardScreen`
  - `HomeScreen`
  - `GraphScreen`
  - `GraphShowScreen`
  - `AlarmScreen`
- Current baseline:
  - Home, Dashboard, Graph, GraphShow: `5000` ms
  - Alarm while focused: `1000` ms

## Offline classification

- File:
  - `src/utils/deviceHealth.js`
- Base:
  - `OFFLINE_AFTER_MS`
- Dynamic behavior:
  - derived from publish/report interval hints when available

## Theme runtime

- Files:
  - `src/theme/ThemeContext.js`
  - `src/theme/themes.js`
- Key:
  - `@app_theme_v1`

## 4. Incident Quick Checklist

1. API `/prod` is reachable from the device network.
2. Response includes expected arrays.
3. Recent timestamps are present in returned rows.
4. Pagination metadata is present for large history windows.
5. No screen-level timer leaks remain after navigation or unmount.
6. The active theme loads correctly after app relaunch.

## 5. Hardening Backlog

1. Move API base URL and stage to environment config.
2. Add production auth and secure token handling.
3. Add contract tests around normalization and pagination.
4. Add app telemetry and error reporting.
5. Remove or isolate legacy `src/screens_1`.
