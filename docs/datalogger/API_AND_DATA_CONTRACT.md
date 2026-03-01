# API and Data Contract

## 1. API Endpoint

- Base URL in app: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com`
- Path in app: `/prod`
- Full endpoint used by app: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

## 2. Request Pattern

All app calls are `GET` requests from `src/api/dataService.js`.

### Generic dashboard call

- Query: optional
- Used by:
  - `fetchDashboardData`
  - `fetchData`
  - `fetchRealTimeDataMonitor`
  - `fetchESP32Alarms`

### IoT history/export call (paged)

- Implemented by `fetchAllIoTReadings`
- Typical query fields:
  - `iotReadingsOnly=1`
  - `deviceId` (optional)
  - `startTsEpochMs` / `endTsEpochMs`
  - cursor aliases:
    - `cursor`
    - `nextToken`
    - `pageToken`
    - `continuationToken`

## 3. Response Shape (Expected)

```json
{
  "IoTReadings": [],
  "RealTimeDataMonitor": [],
  "ESP32_Alarms": [],
  "pagination": {
    "IoTReadings": {
      "nextToken": "...",
      "hasMore": true
    }
  }
}
```

Lambda proxy responses with stringified `body` are supported and normalized.

## 4. Normalization Rules in App

`normalizeReading` in `dataService.js`:

- unwraps/merges `payload`
- normalizes `parameters[]`
- derives:
  - `tsServerMs` from `ts`/`timestamp`/`time`
  - `tsDeviceMs` from `tsEpochMs`
  - `ts` as server-first fallback
- maps status/compat fields:
  - wifi aliases to `wifi_strength`
  - overall alarm to `Common Alarm`
- computes `_schemaValid` using BIOT rules

## 5. BIOT Schema Expectations

Preferred record format:

- `schemaVersion = 1`
- `msgType = telemetry`
- `deviceId`
- `siteId`, `deviceType`, `deviceName`
- `tsEpochMs`
- `status`:
  - `wifiStrength`
  - `overallAlarm`
- `parameters[]`:
  - `key`, `label`, `value`, `unit`, `order`, `showOnCard`, `alarm`

## 6. Timestamp Policy

- History and export filters use `tsEpochMs` only.
- CSV timestamp column uses `tsEpochMs` and a local date-time representation.
- For online/offline status, app uses server-ingestion-oriented timestamp (`ts` via normalized `tsServerMs`) with fallback.

## 7. Pagination and Completeness

`fetchAllIoTReadings` loops pages until one of these stop conditions:

- `no_more`
- `missing_next_token`
- `invalid_next_token`
- `repeated_next_token`
- `no_new_rows`
- `max_pages_reached`

It returns metadata:

- `pagesFetched`
- `stopReason`
- `potentiallyIncomplete`
- `likelySinglePageCap`

Export/graph screens warn when completeness is uncertain.

## 8. Sort Order and CSV

- Export rows are sorted by `tsEpochMs` descending.
- Output CSV order is latest data first, older data later.

## 9. Device Filtering

- Device-specific export/history pass `deviceId`.
- GraphShow live mode filters selected device by normalized `deviceId`.

## 10. Alarms Contract

- Primary source: `ESP32_Alarms`
- Fallback source: synthesize from IoT telemetry where parameter/status alarm flags are active.
