# Operations and Troubleshooting

## 1. Runtime Observability

Primary places to inspect:

- React Native metro logs / device logs
- API Gateway invoke logs
- Lambda logs
- DynamoDB table data validity (server-side)

App-level indicators:

- Home/Dashboard counts and status labels
- Graph live notices (`No live data`, `offline`, etc.)
- Export warnings from `_meta.potentiallyIncomplete`

## 2. Common Issues

## A. Device shows online initially, then offline

Checks:

1. Verify fresh timestamps are arriving in API response (`ts` / `tsEpochMs`).
2. Confirm `OFFLINE_AFTER_MS` in `deviceHealth.js` (currently `60000`).
3. Confirm backend ingestion latency is not exceeding threshold.

## B. CSV export missing records

Checks:

1. Confirm API pagination returns `pagination.IoTReadings.nextToken` and `hasMore`.
2. Confirm app used `fetchAllIoTReadings` path (not single page).
3. Check export warning popup for partial data.
4. Validate date range and device filter.

Notes:

- App sorts CSV latest-first by `tsEpochMs`.
- Missing backend tokens can still cause partial data even with app pagination logic.

## C. Graph history empty but table has data

Checks:

1. Ensure table records contain numeric `tsEpochMs`.
2. Verify selected date range includes those timestamps.
3. Confirm records are BIOT schema-valid (`schemaVersion/msgType/shape`).

## D. About App back issue

Current behavior:

- Uses parent-aware back traversal.
- Falls back to `More` tab if stack cannot go back.

## E. BLE scan/connect not working

Checks:

1. Android permissions granted.
2. Device Bluetooth and location enabled (older Android).
3. BLE device advertising and in range.
4. Correct service/characteristic UUIDs in `bleContract.js`.

## 3. Safe Operational Changes

### Change API timeout

- File: `src/api/dataService.js`
- `setTimeout(() => controller.abort(), 60000)`

### Change polling intervals

- Update constants in:
  - `HomeScreen`
  - `DashboardScreen`
  - `GraphScreen`
  - `GraphShowScreen`
  - `AlarmScreen`

### Change offline threshold

- File: `src/utils/deviceHealth.js`
- `OFFLINE_AFTER_MS`

## 4. Incident Quick Checks

1. API reachable with GET `/prod`.
2. `IoTReadings` non-empty in response.
3. `tsEpochMs` present in returned readings.
4. `pagination` fields present for large-range export/history.
5. App device time and timezone not heavily skewed.

## 5. Recommended Hardening Backlog

1. Move API URL to environment-based config.
2. Add server-enforced auth for API access.
3. Add explicit API schema versioning and contract tests.
4. Add telemetry/error reporting integration.
5. Remove unused legacy screens and duplicate screen folder.
