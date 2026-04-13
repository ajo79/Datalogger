# Developer Instructions

Last reviewed: 2026-04-13

## 1. Install and Run

From `Datalogger/`:

```bash
npm install
npm run start
npm run android
# or
npm run ios
```

## 2. Android Emulator Run

Recommended flow on Windows:

1. Start Metro:

```bash
npm run start
```

2. Start an emulator from Android Studio Device Manager, or use:

```bash
emulator -list-avds
emulator -avd <YourAvdName>
```

3. Verify device visibility:

```bash
adb devices
```

4. Install the app:

```bash
npm run android
```

If Gradle build artifacts are stale:

```bash
cd android
./gradlew clean
cd ..
```

## 3. iOS Setup

```bash
bundle install
cd ios
bundle exec pod install
cd ..
```

Then run:

```bash
npm run ios
```

## 4. Useful Commands

```bash
npm run lint
npm run test
```

## 5. Configuration Hotspots

### API endpoint

- File:
  - `src/api/dataService.js`
- Constants:
  - `API_URL`
  - `DASHBOARD_PATH`

### Timeout tuning

- File:
  - `src/api/dataService.js`
- Constants:
  - `DEFAULT_FETCH_TIMEOUT_MS = 60000`
  - `FAST_STATUS_TIMEOUT_MS = 5000`

### Fast status cache

- File:
  - `src/api/dataService.js`
- Constant:
  - `FAST_STATUS_CACHE_DEFAULT_MAX_AGE_MS = 30000`

### Poll intervals

- `DashboardScreen`: `AUTO_REFRESH_MS = 5000`
- `HomeScreen`: `AUTO_REFRESH_MS = 5000`
- `GraphScreen`: `LIVE_POLL_MS = 5000`
- `GraphShowScreen`: `LIVE_POLL_MS = 5000`
- `AlarmScreen`: focused interval `1000`
- `SettingsScreen`: local mobile epoch display timer `1000`

### Theme system

- Provider:
  - `src/theme/ThemeContext.js`
- Theme definitions:
  - `src/theme/themes.js`
- Theme selection screen:
  - `src/screens/ThemesScreen.js`
- Storage key:
  - `@app_theme_v1`

## 6. Navigation Rules

- The native tab bar is hidden; screens render custom bottom navigation with `ModernBottomNav`.
- Use `navigateToTabRoute(...)` for cross-stack tab switches.
- Use `goBackWithFallback(...)` for nested-screen back buttons.
- Use `logoutToAuthRoot(...)` for logout route reset behavior.
- Do not rename existing routes without updating both `AuthStack` and `MainStack`.

## 7. Theme Development Rules

- Do not hardcode new hex colors directly in screens when a semantic theme token should be used.
- Add or change theme tokens in `src/theme/themes.js` first.
- If a new semantic token is introduced, add it to all theme definitions.
- Prefer updating shared UI primitives before patching individual screens.
- `ThemesScreen` renders from `themeOptions`, so new theme options appear there automatically when `THEME_OPTIONS` is updated.

## 8. Data and Export Rules

- History and export paths must use `fetchAllIoTReadings(...)`.
- History filtering is based on normalized device timestamps (`tsDeviceMs` / `tsEpochMs` aliases).
- `GraphScreen` history uses `startDate` + `endDate` with optional `deviceId`.
- `GraphScreen` may retry history fetch with device-scoped queries when broad all-device history returns zero rows.
- CSV output is sorted newest first.

## 9. BLE Workflows

### Runtime settings (`SettingsScreen`)

- scan/connect/disconnect BLE
- read snapshot
- write param `1..9` single or all
- set mobile time to device
- read/write device name
- read/write receiver email
- monitor status, snapshot updates, and live telemetry

### Factory settings (`FactorySettingsScreen`)

- unlock password currently `blackstar`
- update device ID over BLE
- send Wi-Fi SSID/password over BLE
- read/write factory sender email and app password

## 10. Source of Truth by Area

- API/normalization:
  - `src/api/dataService.js`
- Health logic:
  - `src/utils/deviceHealth.js`
- Navigation:
  - `src/navigation/`
- Theme system:
  - `src/theme/`
- Shared UI:
  - `src/components/ui/`
- BLE contract/codec:
  - `src/ble/`
- Runtime screens:
  - `src/screens/`

## 11. Legacy Note

- `src/screens_1/` contains older, non-runtime screen implementations.
