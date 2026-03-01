# Architecture

## 1. Overview

`Datalogger` is a React Native app that consumes IoT telemetry through a single AWS API Gateway endpoint and renders:

- dashboard and card views
- live/history graphs
- alarm history
- CSV export
- BLE-based settings/factory configuration

The app currently targets the BIOT telemetry envelope (`schemaVersion=1`, `msgType=telemetry`) and filters out non-matching formats in most core views.

## 2. High-Level Data Flow

1. ESP32 firmware publishes MQTT payloads to AWS IoT.
2. AWS IoT Rules write records into DynamoDB tables (handled server-side).
3. Mobile app calls API Gateway endpoint:
   - `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`
4. Lambda response is normalized in `src/api/dataService.js`.
5. UI screens consume normalized model via `fetchData`, `fetchRealTimeDataMonitor`, `fetchAllIoTReadings`, and `fetchESP32Alarms`.

Important: the mobile app does not read DynamoDB directly.

## 3. App Structure

- Entry:
  - `App.tsx` -> `SafeAreaProvider` -> `AppNavigator`
- Root navigation:
  - `src/navigation/AppNavigator.js`
  - Route tree: `Animation` -> (`Auth` or `Main`)
- Stack/navigation layers:
  - `AuthStack`: login + app routes
  - `MainStack`: app routes (for already-signed-in flow)
  - `TabNavigator`: logical tabs; default tab bar hidden
- Data services:
  - `src/api/dataService.js`
- Health classification:
  - `src/utils/deviceHealth.js`
- Storage:
  - `src/storage/userStorage.js`, `src/storage/alarmStorage.js`

## 4. Navigation Architecture

The tab bar is intentionally hidden (`tabBar={() => null}`) and each screen draws a custom bottom wave nav UI.

Cross-navigator tab routing is centralized by:

- `navigateToTabRoute` in `src/navigation/navHelpers.js`

This helper attempts route resolution through current navigator, parent, and grandparent stacks to avoid broken tab navigation.

## 5. Data Service Architecture

`src/api/dataService.js` responsibilities:

- build query URLs
- execute GET with `AbortController` timeout (60 seconds)
- parse Lambda proxy or direct JSON format
- unmarshal DynamoDB attribute maps when required
- flatten legacy `payload` object/string
- normalize BIOT parameters
- derive canonical fields:
  - `tsServerMs`, `tsDeviceMs`, `ts`
  - `temperature`, `humidity`, `wifi_strength`, `Common Alarm`
- apply schema validation (`_schemaValid`) for BIOT telemetry
- merge `RealTimeDataMonitor` records with IoT fallback by `deviceId`
- paginate IoT history through cursor tokens (`fetchAllIoTReadings`)

## 6. Timestamp Strategy

- Online/offline freshness: primarily server ingestion `tsServerMs` (fallback to device time).
- History/export filters: strict `tsEpochMs`/`ts_epoch_ms`.
- CSV sort order: newest first (`desc` by `tsEpochMs`).

## 7. Refresh and Polling

Current polling intervals:

- Home: 1 second
- Dashboard: 1 second
- Graph live mode: 1 second
- GraphShow live mode: 1 second
- Alarm: 1 second

API timeout for each request:

- 60 seconds (`fetchText` timeout)

## 8. Device Health Logic

`src/utils/deviceHealth.js`:

- `OFFLINE_AFTER_MS = 60000`
- Device is offline when timestamp age exceeds threshold.
- Common alarm extracted from `status.overallAlarm` aliases and legacy fields.
- Classification:
  - `good`: online + no common issue
  - `issue`: offline or common issue

## 9. BLE Subsystem

Screens:

- `SettingsScreen`: runtime BLE parameter read/write + telemetry monitor
- `FactorySettingsScreen`: protected BLE config for device ID and Wi-Fi credentials

Services:

- `react-native-ble-plx`
- Contract/codec:
  - `src/ble/bleContract.js`
  - `src/ble/bleCodec.js`

## 10. Current Known Architectural Risks

- API base URL is hardcoded in app code.
- Dashboard mode can still be heavy if backend returns full scans.
- Local auth/session is not production-grade security.
- Some screens are legacy/demo (`DeviceInformationScreen`, `src/screens_1`).
