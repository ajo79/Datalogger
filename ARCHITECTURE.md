# Datalogger Mobile App Architecture

Last reviewed: 2026-04-13

## 1. Overview

`Datalogger` is a React Native app for BIOT telemetry monitoring with:

- live and history charts
- device health dashboard
- alarm table
- CSV export
- BLE runtime and factory configuration
- a runtime theme system with four selectable themes
- shared themed UI primitives in `src/components/ui/`

## 2. Runtime Entry and Providers

1. `App.tsx` wraps the app with:
   - `SafeAreaProvider`
   - `AppThemeProvider`
   - `AppNavigator`
2. `AppNavigator` is the root stack and starts at `Animation`.
3. `AnimationScreen`:
   - runs the startup animation
   - prefetches fast device status
   - checks `getSession()`
   - routes to `Main` when a session exists, otherwise `Auth`

## 3. Navigation Structure

- Root routes:
  - `Animation`
  - `Auth`
  - `Main`
- `AuthStack` starts at `Login` and includes auth plus app routes.
- `MainStack` starts at `Home` and includes app routes for existing sessions.
- Both stacks include:
  - `Graph`
  - `Alarm`
  - `More`
  - `GraphShow`
  - `Export`
  - `Notifications`
  - `AboutApp`
  - `HelpSupport`
  - `Sidebar`
  - `Settings`
  - `Themes`
  - `FactorySettings`
  - `Profile`
  - `EditProfile`
- `TabNavigator` contains the logical tab routes:
  - `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`
- Native tab UI is hidden with `tabBar={() => null}`.
- Runtime screens render `ModernBottomNav` as the visible bottom navigation.
- `BottomWaveNav` remains as a compatibility wrapper that delegates to `ModernBottomNav`.

## 4. Theme and UI Architecture

- Theme provider:
  - `src/theme/ThemeContext.js`
- Theme definition source:
  - `src/theme/themes.js`
- Persisted theme key:
  - `@app_theme_v1`
- Built-in theme IDs:
  - `lightIndustrial`
  - `darkIndustrial`
  - `highContrast`
  - `softNeutral`
- Shared global tokens:
  - `colors`
  - `spacing`
  - `radius`
  - `shadows`
  - `typography`
  - `motion`
- Shared UI primitives:
  - `ModernTopHeader`
  - `ModernBottomNav`
  - `SurfaceCard`
  - `ThemedButton`
  - `ThemedInput`
  - `ScreenContainer`
  - `NoticeBanner`
  - `StatusChip`
- Settings exposes appearance through:
  - `More` -> `Settings` -> `Themes`

## 5. Data Layer

All AWS API logic is centralized in `src/api/dataService.js`.

- Endpoint:
  - `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`
- Request timeout:
  - default `60000` ms
  - fast status path `5000` ms
- Fast status cache:
  - in-memory, max age `30000` ms
- Reads only:
  - no mobile write API calls to AWS

Core service functions:

- `fetchDashboardData`
- `fetchData`
- `fetchRealTimeDataMonitor`
- `fetchFastDeviceStatus`
- `prefetchFastDeviceStatus`
- `fetchAllIoTReadings`
- `fetchESP32Alarms`

Normalization behavior:

- supports Lambda proxy `body` and direct JSON
- unmarshals DynamoDB typed attributes
- flattens `payload`
- normalizes BIOT `parameters[]`
- derives `tsServerMs`, `tsDeviceMs`, and `ts`
- marks BIOT-valid rows with `_schemaValid`

## 6. Polling Model

- Home: `5000` ms
- Dashboard: `5000` ms
- Graph live mode: `5000` ms
- GraphShow live mode: `5000` ms
- Alarm while focused: `1000` ms
- Settings mobile clock display: `1000` ms

## 7. BLE Architecture

Runtime settings in `SettingsScreen`:

- scan/connect/disconnect BLE devices
- read all-parameter snapshot
- write param `1..9`
- set device time from mobile clock
- read/write device name
- read/write recipient email
- monitor status, snapshot updates, and live telemetry

Protected factory settings in `FactorySettingsScreen`:

- unlock password gate: `blackstar`
- scan/connect/disconnect BLE devices
- read/update device ID
- write Wi-Fi SSID/password
- read/write factory sender email and app password

## 8. Storage and Auth

- `userStorage.js`
  - `@user_credentials_v1`
  - `@user_session_v1`
- `alarmStorage.js`
  - `@alarm_logs_v1`
- `NotificationScreen`
  - `@notification_enabled_v1`
- `ThemeContext`
  - `@app_theme_v1`
- `authService.js`
  - factory credentials `Company_A / 1234`
  - fallback local user validation

## 9. Current Runtime Notes

- `DataScreen` is still part of active navigation, but it is not one of the five primary bottom-nav buttons.
- `DeviceInformationScreen` exists and is currently mock/static.
- `SplashScreen.js` exists, but the active startup entry route is `AnimationScreen`.
- `src/screens_1/` is legacy and excluded from active runtime behavior.
