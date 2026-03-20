# Developer Instructions

## 1. Install and Run

From `Datalogger/`:

```bash
npm install
npm run start
npm run android
# or
npm run ios
```

## 2. iOS Setup

```bash
bundle install
cd ios
bundle exec pod install
cd ..
```

## 3. Useful Commands

```bash
npm run lint
npm run test
```

## 4. Configuration Hotspots

### API endpoint

- File: `src/api/dataService.js`
- Constants:
  - `API_URL`
  - `DASHBOARD_PATH`

### Timeout tuning

- File: `src/api/dataService.js`
- Constants:
  - `DEFAULT_FETCH_TIMEOUT_MS = 60000`
  - `FAST_STATUS_TIMEOUT_MS = 5000`

### Fast status cache

- File: `src/api/dataService.js`
- Constant:
  - `FAST_STATUS_CACHE_DEFAULT_MAX_AGE_MS = 30000`

### Poll intervals

- `DashboardScreen`: `AUTO_REFRESH_MS = 5000`
- `HomeScreen`: `AUTO_REFRESH_MS = 5000`
- `GraphScreen`: `LIVE_POLL_MS = 5000`
- `GraphShowScreen`: `LIVE_POLL_MS = 5000`
- `AlarmScreen`: focused interval `1000`
- `SettingsScreen`: local mobile epoch display timer `1000` (UI clock only)

### Offline threshold

- File: `src/utils/deviceHealth.js`
- Base value: `OFFLINE_AFTER_MS = 30000`
- Effective threshold can change per device from status publish interval.

## 5. Navigation Rules

- Default tab bar is hidden; screens render custom bottom nav.
- Use `navigateToTabRoute(...)` for cross-stack tab switches.
- Use `logoutToAuthRoot(...)` for logout route reset behavior.

## 6. Data and Export Rules

- History/export should use `fetchAllIoTReadings(...)`.
- Filter window is based on normalized device timestamp aliases (`tsEpochMs` path).
- `GraphScreen` history uses date range (`startDate` + `endDate`) with optional `deviceId` filter.
- `GraphScreen` may retry history fetch with device-scoped queries when all-device query returns no matches.
- CSV output is sorted newest first.

## 7. BLE Workflows

### Runtime settings (`SettingsScreen`)

- scan/connect/disconnect BLE
- read snapshot
- write param 1..9 (single/all)
- monitor status, snapshot updates, live telemetry

### Factory settings (`FactorySettingsScreen`)

- unlock password currently `blackstar`
- update device ID over BLE
- send Wi-Fi SSID/password over BLE

## 8. Source of Truth by Area

- API/normalization: `src/api/dataService.js`
- Health logic: `src/utils/deviceHealth.js`
- Navigation: `src/navigation/`
- BLE contract/codec: `src/ble/`
- Runtime screens: `src/screens/`

## 9. Legacy Note

- `src/screens_1/` contains older, non-runtime screen implementations.
