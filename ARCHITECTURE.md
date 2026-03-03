# Datalogger Mobile App Architecture

Last reviewed: 2026-03-03

## 1. Tech Stack

- React Native `0.83.1`, React `19.2.0`
- Navigation:
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `@react-navigation/bottom-tabs`
- Data visualization:
  - `react-native-chart-kit`
  - `react-native-svg`
- Storage:
  - `@react-native-async-storage/async-storage`
- BLE:
  - `react-native-ble-plx`
- Export/share:
  - `react-native-fs`
  - `react-native-share`

## 2. Runtime Entry and Navigation

1. `App.tsx` wraps app with `SafeAreaProvider` and mounts `AppNavigator`.
2. `AppNavigator` routes:
   - `Animation` (initial)
   - `Auth` (`AuthStack`)
   - `Main` (`MainStack`)
3. `AnimationScreen`:
   - runs splash animation
   - prefetches fast device status (`prefetchFastDeviceStatus`)
   - checks `getSession()`
   - routes to `Main` if session exists, else `Auth`

### Stack and tab structure

- `AuthStack` starts at `Login` and includes full app routes.
- `MainStack` starts at `Home` (which points to `TabNavigator`) and includes full app routes.
- `TabNavigator` routes:
  - `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`
- Native tab bar is hidden (`tabBar={() => null}`), each screen renders custom bottom wave nav UI.

### Navigation helper behavior

- `navigateToTabRoute` resolves tab routes across nested navigators.
- `logoutToAuthRoot` attempts stack reset to `Auth`; falls back to navigate `Auth`.

## 3. API and Data Layer

Implemented in `src/api/dataService.js`.

### Endpoint

- Base: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com`
- Path: `/prod`
- Full: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

### Timeouts and cache

- Default request timeout: `60000` ms
- Fast status timeout: `5000` ms
- Fast status in-memory cache max age: `30000` ms

### Key service functions

- `fetchDashboardData(options)`:
  - GET request with optional query
  - parses Lambda proxy or direct JSON
  - normalizes arrays for `IoTReadings`, `RealTimeDataMonitor`, `ESP32_Alarms`
  - exposes pagination metadata (`ioTReadingsNextToken`, `ioTReadingsHasMore`)
- `fetchAllIoTReadings({ deviceId, startTsEpochMs, endTsEpochMs, maxPages })`:
  - paged history retrieval
  - deduplicates rows by identity
  - returns completeness metadata (`stopReason`, `potentiallyIncomplete`)
- `fetchRealTimeDataMonitor(options)`:
  - merges realtime rows with IoT fallback by `deviceId`
  - returns BIOT-valid rows only
- `fetchData(options)`:
  - combined BIOT rows for list/card views
- `fetchFastDeviceStatus(options)`:
  - tries `statusOnly=1` query first, falls back to `fetchData`
  - updates in-memory warm cache
- `prefetchFastDeviceStatus(options)`:
  - dedupes concurrent prefetch calls during startup
- `fetchESP32Alarms(options)`:
  - returns normalized `ESP32_Alarms`

### Normalization strategy

- Supports Lambda proxy body string and direct object responses.
- Unmarshals DynamoDB attribute-value format (`S`, `N`, `BOOL`, `NULL`, `M`, `L`).
- Flattens `payload` onto root record.
- Normalizes `parameters[]` with `alarm`, `order`, `unit`, `showOnCard`.
- Derives canonical fields:
  - `temperature`
  - `humidity`
  - `wifi_strength`
  - `Common Alarm`
  - `tsServerMs`, `tsDeviceMs`, `ts`
- Filters BIOT telemetry via `_schemaValid`.

## 4. Device Health Classification

Implemented in `src/utils/deviceHealth.js`.

- Base threshold: `OFFLINE_AFTER_MS = 30000`
- Dynamic threshold selection:
  - explicit `offlineAfterMs` if present
  - else publish/report interval x5
  - clamp range `30000..180000` ms
- `computeIsOnline`:
  - prefers timestamp freshness (`tsServerMs`, `ts`, `tsDeviceMs`, `tsEpochMs`)
  - falls back to explicit `online` only if timestamp missing
- `hasCommonIssue`:
  - checks `status.overallAlarm` aliases and legacy common-alarm fields
- `classifyDeviceHealth`:
  - `good` = online and no common issue
  - `issue` = offline or common issue

## 5. Screen-Level Functional Architecture

### Dashboard

- Uses fast status API path with warm cache.
- Poll interval: 1 second.
- Health summary cards and pie chart.
- Card press routes to `Home` with filters.

### Home

- Uses fast status API path with warm cache.
- Poll interval: 1 second.
- Device filters: all/good/issue.
- Card action buttons:
  - `GraphShow`
  - `Export`
  - native share payload
- Supports generic BIOT parameters, press amps, and env fallback.

### Graph

- Mode toggle: `live` / `history`.
- Live:
  - polls every 1 second via `fetchRealTimeDataMonitor`
  - tracks per-device trend series, capped to 100 points
- History:
  - date-based query via `fetchAllIoTReadings`
  - filters with `tsEpochMs` range boundaries
  - per-device trend series, capped to 100 points

### GraphShow

- Device-specific trend view.
- Live mode:
  - polls every 1 second
  - appends new points only when timestamp changes
  - caps points to 100
- History mode:
  - date-range query via `fetchAllIoTReadings`
  - filters by selected `deviceId` and `tsEpochMs` range

### Export

- Date-range export, optional `deviceId` filter.
- Uses `fetchAllIoTReadings`.
- Builds dynamic CSV columns from BIOT `parameters`.
- Includes `OverallAlarm`, `WifiStrength`, `Timestamp`, `Date Time`.
- Writes CSV to cache and opens share/save sheet.
- Android direct copy to Downloads attempted; fallback to share flow.

### Alarm

- Refresh while focused every 1 second.
- Source priority:
  1. `fetchESP32Alarms()`
  2. synthesized alarms from `IoTReadings`
  3. local AsyncStorage alarms (`alarmStorage`)

### Settings (BLE runtime config)

- Scan/connect/disconnect BLE devices.
- Read all params snapshot.
- Write:
  - Param 1 epoch (u64)
  - Param 2-5 threshold pairs (u16 lower/upper)
  - Param 6-9 multipliers (float32)
- Monitors:
  - status characteristic
  - all-params snapshot characteristic
  - live telemetry characteristic

### FactorySettings (BLE protected config)

- Unlock password: `blackstar`.
- Scan/connect/disconnect BLE device.
- Read/update Device ID characteristic.
- Send Wi-Fi SSID/password characteristics.

### Other screens

- `Login`: local/factory auth then save session.
- `SignUp`: stores local user/session only when password confirmed; navigates to Home either way.
- `Notification`: toggle persisted to AsyncStorage key `@notification_enabled_v1`.
- `Profile`/`EditProfile`: local in-memory profile edit callback.
- `HelpSupport`: external links (phone, web, mail).
- `AboutApp`: static text.
- `DeviceInformation`: mock/static screen.
- `SplashScreen`: present but not used as entry route.

## 6. Persistence and Auth

- `userStorage.js`:
  - user key: `@user_credentials_v1`
  - session key: `@user_session_v1`
- `authService.js`:
  - factory credentials: `Company_A / 1234`
  - fallback to locally saved user
- `alarmStorage.js`:
  - key: `@alarm_logs_v1`
  - max 500 rows
  - IST timestamp formatting helper

## 7. BLE Contract

Defined in `src/ble/bleContract.js`.

- Device name: `BIOT`
- Service UUID root: `8d4d3c10-2a4c-4d1f-9b3a-6f0012340000`
- Characteristics:
  - params `0001..0009`
  - deviceId `00f9`
  - wifiPassword `00fa`
  - wifiSsid `00fb`
  - liveTelemetry `00fd`
  - status `00fe`
  - allParams `00ff`

Codec in `src/ble/bleCodec.js` handles base64 and binary payload encoding/decoding.

## 8. Native Platform Configuration

### Android

- Min SDK: 24, Target/Compile SDK: 36
- Hermes: enabled
- New Architecture: enabled
- Permissions in manifest:
  - `INTERNET`
  - legacy Bluetooth + location (`maxSdkVersion=30`)
  - `BLUETOOTH_SCAN`
  - `BLUETOOTH_CONNECT`

### iOS

- Deployment target: 15.1
- Info.plist includes:
  - `NSBluetoothAlwaysUsageDescription`
  - `NSBluetoothPeripheralUsageDescription`
  - `NSLocationWhenInUseUsageDescription`
  - ATS with `NSAllowsArbitraryLoads=false`, `NSAllowsLocalNetworking=true`

## 9. Legacy and Non-Primary Code

- `src/screens_1/` is legacy UI code and not part of active navigators.
- Root docs should treat `src/screens/` as runtime source of truth.

## 10. Current Risks / Gaps

- Local auth and plain AsyncStorage are not production-grade security.
- API URL is hardcoded in app code.
- High-frequency polling (1s on multiple screens) can impact battery/data.
- `SignUp` currently navigates to Home even when data is invalid.
- Mixed static/demo screens remain in runtime stacks (`DeviceInformation`, `PageFirst`).
