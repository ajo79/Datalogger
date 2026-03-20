# Technical Requirements

## 1. Framework and Package Baseline

- React Native: `0.83.1`
- React: `19.2.0`
- Node.js: `>=20`
- Navigation:
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `@react-navigation/bottom-tabs`
- Data/chart:
  - `react-native-chart-kit`
  - `react-native-svg`
- BLE:
  - `react-native-ble-plx`
- Storage:
  - `@react-native-async-storage/async-storage`
- Export/share:
  - `react-native-fs`
  - `react-native-share`

## 2. Native Build Baseline

### Android

- `minSdkVersion = 24`
- `targetSdkVersion = 36`
- `compileSdkVersion = 36`
- Hermes enabled
- New architecture enabled

### iOS

- deployment target: `15.1` (Xcode project setting)
- CocoaPods required for native dependency installation

## 3. Runtime Permissions

### Android manifest permissions

- `android.permission.INTERNET`
- `android.permission.BLUETOOTH` (`maxSdkVersion=30`)
- `android.permission.BLUETOOTH_ADMIN` (`maxSdkVersion=30`)
- `android.permission.ACCESS_FINE_LOCATION` (`maxSdkVersion=30`)
- `android.permission.BLUETOOTH_SCAN`
- `android.permission.BLUETOOTH_CONNECT`

### Android runtime requests in code

- API 31+:
  - `BLUETOOTH_SCAN`
  - `BLUETOOTH_CONNECT`
- API <= 30:
  - `ACCESS_FINE_LOCATION`
- Export screen may request `WRITE_EXTERNAL_STORAGE` for older Android direct-download fallback path.

### iOS Info.plist usage strings

- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`
- `NSLocationWhenInUseUsageDescription`

## 4. API Contract Expectations

The app requires reachable endpoint:

- `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

Expected arrays in response:

- `IoTReadings`
- `RealTimeDataMonitor`
- `ESP32_Alarms`

Optional pagination keys can appear under multiple aliases and nested objects.

## 5. Data Contract Requirements (for full feature support)

Preferred BIOT telemetry fields:

- `schemaVersion`
- `msgType = telemetry`
- `deviceId`
- `tsEpochMs` (or alias)
- `parameters[]`
- `status` (wifi/alarm state)

History/graph/export accuracy depends on valid numeric device timestamps.

## 6. Performance/Runtime Assumptions

- Polling cadence:
  - Home/Dashboard/Graph/GraphShow: 5 seconds.
  - Alarm (focused): 1 second.
  - Settings local mobile epoch display timer: 1 second (UI-only).
- Default API timeout: 60 seconds.
- Fast status timeout: 5 seconds.
- Fast status cache max age: 30 seconds.

## 7. Security Status (Current)

- Auth is local/factory fallback and not production-grade.
- Credentials/session are stored in AsyncStorage.
- Mobile API calls currently do not attach auth headers.

Production hardening is required before public deployment.
