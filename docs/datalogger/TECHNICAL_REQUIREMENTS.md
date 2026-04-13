# Technical Requirements

Last reviewed: 2026-04-13

## 1. Framework and Package Baseline

- React Native: `0.83.1`
- React: `19.2.0`
- Node.js: `>=20`
- Navigation:
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `@react-navigation/bottom-tabs`
- Core UI/runtime:
  - `react-native-safe-area-context`
  - `react-native-vector-icons`
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

- deployment target: `15.1`
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
- Export screen may request `WRITE_EXTERNAL_STORAGE` for older Android direct-download fallback.

### iOS Info.plist usage strings

- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`
- `NSLocationWhenInUseUsageDescription`

## 4. API Contract Expectations

The app requires a reachable endpoint:

- `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

Expected response arrays:

- `IoTReadings`
- `RealTimeDataMonitor`
- `ESP32_Alarms`

Optional pagination keys can appear under multiple aliases and nested objects.

## 5. Data Contract Requirements

Preferred BIOT telemetry fields:

- `schemaVersion`
- `msgType = telemetry`
- `deviceId`
- `tsEpochMs` or an accepted alias
- `parameters[]`
- `status`

History, graph, and export accuracy depend on valid numeric device timestamps.

## 6. Performance and Runtime Assumptions

- Polling cadence:
  - Home, Dashboard, Graph, GraphShow: 5 seconds
  - Alarm while focused: 1 second
  - Settings mobile clock display: 1 second
- Default API timeout: 60 seconds
- Fast status timeout: 5 seconds
- Fast status cache max age: 30 seconds

## 7. Theme-System Requirements

- Theme switching is entirely JS-layer driven and does not require an app restart.
- Theme selection depends on AsyncStorage availability.
- The runtime expects the four built-in theme IDs to stay stable unless all consumers are updated:
  - `lightIndustrial`
  - `darkIndustrial`
  - `highContrast`
  - `softNeutral`
- Screens should consume semantic theme tokens instead of direct color literals for consistent switching.

## 8. Security Status

- Auth is local/factory fallback and is not production-grade.
- Credentials and session are stored in AsyncStorage.
- Mobile API calls do not attach auth headers.

Production hardening is required before public deployment.
