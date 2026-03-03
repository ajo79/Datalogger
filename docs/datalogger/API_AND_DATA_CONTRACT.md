# API and Data Contract

## 1. Endpoint

- Base URL: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com`
- Path: `/prod`
- Full URL: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

All mobile API calls are HTTP `GET` and are implemented in `src/api/dataService.js`.

## 2. Request Modes

### Dashboard/default fetch

Used by `fetchDashboardData`, `fetchData`, `fetchRealTimeDataMonitor`, `fetchESP32Alarms`.

- Query: optional
- Timeout default: `60000` ms

### Fast status fetch

Used by `fetchFastDeviceStatus`.

- Query includes `statusOnly=1`
- Timeout default for this mode: `5000` ms
- Falls back to regular `fetchData` on failure

### IoT history/export paged fetch

Used by `fetchAllIoTReadings`.

Query fields sent by app:

- `iotReadingsOnly=1`
- `deviceId` (optional)
- range aliases:
  - `startTsEpochMs`, `startTs`, `fromTs`
  - `endTsEpochMs`, `endTs`, `toTs`
- cursor aliases:
  - `cursor`, `nextToken`, `pageToken`, `continuationToken`

## 3. Expected Response Keys

Top-level keys expected by app:

- `IoTReadings` (array)
- `RealTimeDataMonitor` (array)
- `ESP32_Alarms` (array)

Optional pagination hints may appear in multiple aliases, including nested `pagination`.

Lambda proxy shape with stringified `body` is supported.

## 4. Row Normalization Rules

Each reading is normalized with this behavior:

- parse/unmarshal DynamoDB typed values if present
- flatten `payload` object or JSON string onto root
- normalize `parameters[]` fields:
  - `key`, `label`, `value`, `unit`, `valueType`, `order`, `showOnCard`, `alarm`
- derive canonical values:
  - `temperature`
  - `humidity`
  - `wifi_strength`
  - `Common Alarm`
- derive timestamps:
  - `tsServerMs` from server ingestion aliases (`ts`, `timestamp`, `time`)
  - `tsDeviceMs` from device timestamp aliases (`tsEpochMs`, `ts_epoch_ms`)
  - `ts` chooses server-first fallback
- mark BIOT compatibility with `_schemaValid`

## 5. BIOT Compatibility Rule

Rows are treated as BIOT telemetry when either:

- envelope exists (`schemaVersion >= 1` and `msgType=telemetry`)
- or BIOT-shaped fields are present (`parameters[]` and status/site/device timing fields)

Most runtime views filter to `_schemaValid === true`.

## 6. Realtime + History Merge

For live card/list views, app merges realtime rows with IoT fallback by `deviceId`.

- realtime rows are primary
- missing fields can be filled from latest IoT row for same device
- reading-only rows not present in realtime are appended where needed

## 7. Pagination/Completeness Metadata

`fetchAllIoTReadings` returns `_meta`:

- `pagesFetched`
- `stopReason`
- `potentiallyIncomplete`
- `likelySinglePageCap`

Common stop reasons:

- `no_more`
- `missing_next_token`
- `invalid_next_token`
- `repeated_next_token`
- `no_new_rows`
- `max_pages_reached`

Export screen shows warning alert when completeness is uncertain.

## 8. Timestamp Policy by Feature

- Online/offline freshness:
  - uses normalized `ts` (server-first)
- History graph and export filtering:
  - use `tsEpochMs` aliases through normalized `tsDeviceMs`
- CSV:
  - sorted newest first by timestamp
  - includes numeric epoch and local date-time string

## 9. Alarm Data Contract

Alarm screen source priority:

1. `ESP32_Alarms`
2. synthesized from IoT rows with alarm-active flags
3. local AsyncStorage alarm log fallback

## 10. What Mobile Sends to AWS

The app sends only query parameters in GET requests (filters/pagination/status mode).

It does not upload telemetry payloads to AWS from mobile code.
