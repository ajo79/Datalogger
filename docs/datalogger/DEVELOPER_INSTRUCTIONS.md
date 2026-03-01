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

## 2. Useful Commands

```bash
npm run lint
npm run test
```

## 3. Configuration Points

### API endpoint

- File: `src/api/dataService.js`
- Constants:
  - `API_URL`
  - `DASHBOARD_PATH`

### API timeout

- File: `src/api/dataService.js`
- `fetchText` timeout is currently set to `60000` ms.

### Polling interval

- Home, Dashboard, Graph, GraphShow, Alarm currently poll every `1000` ms.
- Change interval constants inside each screen if needed.

### Offline threshold

- File: `src/utils/deviceHealth.js`
- `OFFLINE_AFTER_MS` currently `60000`.

## 4. Build Notes

### Android

- Ensure emulator/device USB debugging is available.
- BLE testing requires physical device in most cases.

### iOS

```bash
cd ios
pod install
cd ..
npm run ios
```

## 5. Export and History Behavior

- Export and history queries use `tsEpochMs` filtering.
- Data fetch path is paginated through `fetchAllIoTReadings`.
- CSV generated as latest-first (descending timestamp).

## 6. Navigation Rules

- Tab UI is custom; default tab bar is hidden.
- Use `navigateToTabRoute` helper for bottom nav actions.
- For screen back actions that can be nested, use parent-aware `goBack` fallback pattern.

## 7. BLE Workflows

- `SettingsScreen`:
  - scan/connect BLE
  - read all parameters
  - write individual/all params
  - monitor telemetry
- `FactorySettingsScreen`:
  - unlock with factory password
  - update device ID
  - update Wi-Fi credentials

## 8. Source of Truth for App Logic

- API and normalization: `src/api/dataService.js`
- Health classification: `src/utils/deviceHealth.js`
- Navigation: `src/navigation/`
- Screens: `src/screens/`
