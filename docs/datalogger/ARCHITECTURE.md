# Architecture

## 1. Overview

`Datalogger` is a React Native app for BIOT telemetry monitoring with:

- live and history data views
- health dashboard
- alarm table
- CSV export
- BLE runtime and factory configuration
- UI design tokens/responsive helpers (`src/theme/`) and reusable UI primitives (`src/components/ui/`)

## 2. Runtime Flow

1. `App.tsx` -> `SafeAreaProvider` -> `AppNavigator`
2. `AppNavigator` initial route: `Animation`
3. `AnimationScreen`:
   - starts splash animation
   - prefetches fast status data
   - checks session (`getSession`)
   - routes to `Main` or `Auth`
4. `AuthStack` and `MainStack` both provide app routes.
5. `TabNavigator` logical tabs:
   - `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`
   - native tab bar hidden; custom wave nav is rendered by screens

## 3. Data Layer

All API logic is centralized in `src/api/dataService.js`.

- Endpoint:
  - `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`
- Request timeout:
  - default `60000` ms
  - fast status path `5000` ms
- Fast status cache:
  - in-memory, max age `30000` ms
- Reads only (GET); no write API calls in mobile app.

### Core service functions

- `fetchDashboardData`
- `fetchData`
- `fetchRealTimeDataMonitor`
- `fetchFastDeviceStatus`
- `fetchAllIoTReadings`
- `fetchESP32Alarms`

### Normalization

- handles Lambda proxy `body` and direct JSON
- unmarshals DynamoDB typed attributes
- flattens `payload`
- normalizes BIOT parameters and compat fields
- derives `tsServerMs`, `tsDeviceMs`, and `ts`
- marks BIOT-valid rows with `_schemaValid`

## 4. Health Model

In `src/utils/deviceHealth.js`:

- `OFFLINE_AFTER_MS = 30000`
- dynamic offline threshold may override this using device publish interval
- threshold clamp range: `30000..180000`
- classification:
  - `good`: online and no common issue/alarm
  - `issue`: offline or common issue/alarm

## 5. Polling Model

- Home: `5000` ms
- Dashboard: `5000` ms
- Graph live mode: `5000` ms
- GraphShow live mode: `5000` ms
- Alarm (focused): `1000` ms
- Settings screen also updates local mobile epoch display every `1000` ms

## 6. BLE Architecture

### Runtime settings (`SettingsScreen`)

- scan/connect/disconnect BLE
- read all parameters snapshot
- write param 1..9 (single and write-all)
- monitor:
  - status characteristic
  - all-params characteristic
  - live telemetry characteristic

### Factory settings (`FactorySettingsScreen`)

- unlock gate password: `blackstar`
- scan/connect/disconnect BLE
- read/update device ID characteristic
- write Wi-Fi SSID/password characteristics

### Contract/codec

- UUID map: `src/ble/bleContract.js`
- payload encoding/decoding: `src/ble/bleCodec.js`

## 7. Storage/Auth

- `userStorage.js`
  - `@user_credentials_v1`
  - `@user_session_v1`
- `authService.js`
  - hardcoded factory credentials `Company_A / 1234`
  - fallback local user validation
- `alarmStorage.js`
  - `@alarm_logs_v1`
  - max 500 rows

## 8. Native Layer

### Android

- `minSdkVersion=24`, `targetSdkVersion=36`, `compileSdkVersion=36`
- BLE permissions:
  - `BLUETOOTH_SCAN`
  - `BLUETOOTH_CONNECT`
  - legacy location/Bluetooth permissions for <= API 30

### iOS

- deployment target: 15.1
- Info.plist includes Bluetooth and location usage descriptions
- ATS keeps arbitrary loads disabled

## 9. Known Non-Primary Code

- `src/screens_1/` is legacy and not used by active navigator routes.
- `SplashScreen.js` exists but current entry route is `AnimationScreen`.
