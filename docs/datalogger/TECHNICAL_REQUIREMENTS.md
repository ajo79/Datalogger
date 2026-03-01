# Technical Requirements

## 1. Application Stack

- React Native: `0.83.1`
- React: `19.2.0`
- Node.js: `>=20` (from `package.json`)
- Navigation:
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `@react-navigation/bottom-tabs`
- Charts:
  - `react-native-chart-kit`
  - `react-native-svg`
- Storage:
  - `@react-native-async-storage/async-storage`
- File export/share:
  - `react-native-fs`
  - `react-native-share`
- BLE:
  - `react-native-ble-plx`

## 2. Development Environment

- OS: Windows/macOS/Linux (React Native capable)
- Java + Android SDK for Android builds
- Xcode + CocoaPods for iOS builds
- Watchman recommended on macOS

## 3. Runtime Permissions

### Android

- BLE (Android 12+):
  - `BLUETOOTH_SCAN`
  - `BLUETOOTH_CONNECT`
- BLE (older Android):
  - `ACCESS_FINE_LOCATION`
- CSV export fallback for older Android:
  - `WRITE_EXTERNAL_STORAGE` (< Android 13 path)

### iOS

- Bluetooth and file access usage descriptions must exist in `Info.plist` for BLE and file sharing behavior.

## 4. Backend/API Requirements

App expects a reachable API endpoint:

- `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

Expected top-level response keys:

- `IoTReadings` (array)
- `RealTimeDataMonitor` (array)
- `ESP32_Alarms` (array)

Optional pagination metadata:

- `pagination.IoTReadings.nextToken`
- `pagination.IoTReadings.hasMore`

## 5. Data Contract Requirements (BIOT Focus)

For normal telemetry rendering, records should include BIOT envelope:

- `schemaVersion >= 1`
- `msgType = telemetry`
- `deviceId`
- `tsEpochMs`
- `parameters[]` with metric values
- `status` (e.g. `wifiStrength`, `overallAlarm`)

History and export depend on valid numeric `tsEpochMs`.

## 6. Performance/Operational Requirements

- Polling cadence currently 1 second on key screens.
- API request timeout currently 60 seconds.
- CSV export requires backend pagination for large datasets to avoid partial exports.
- Mobile must handle large response payloads without app crash (filtering and capping are implemented in UI).

## 7. Security Status (Current)

- Authentication is local/factory fallback and not enterprise-grade.
- Credentials/toggles are stored locally in AsyncStorage.
- API call currently does not enforce token header from app side.

Production hardening is required before external deployment.
