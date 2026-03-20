# Testing Checklist

## 1. Smoke Tests

1. Launch app from fresh install.
2. Animation screen routes correctly:
   - with session -> Main
   - without session -> Auth/Login
3. Login success/failure behavior works.

## 2. Navigation Tests

1. All bottom nav buttons work on tab screens:
   - Dash, Home, Graph, Alarm, More
2. Sidebar opens and all menu items navigate correctly.
3. About App back button returns correctly from all entry paths.
4. GraphShow and Export back buttons work from nested stack paths.

## 3. Data and Refresh Tests

1. Home auto-refresh updates every 5 seconds.
2. Dashboard auto-refresh updates every 5 seconds.
3. Alarm list auto-refresh updates every 1 second.
4. Fast status warm cache hydrates Home/Dashboard on startup when recent data exists.
5. Online/offline status changes with timestamp staleness and publish-interval dynamic thresholding.

## 4. Graph Tests

1. Graph screen live mode shows incoming values.
2. Graph screen history mode returns selected date-range data (including same-day `startDate == endDate`).
3. GraphShow live mode tracks selected device only.
4. GraphShow history mode applies start/end date correctly.
5. History filtering is based on `tsEpochMs` and applies optional `deviceId` filter when entered.
6. Graph screen all-device history can recover via device-scoped fallback query path when broad query has zero matches.

## 5. Export Tests

1. Export data for date range and optional device ID.
2. CSV contains latest rows first (descending timestamp).
3. CSV includes dynamic parameter columns.
4. Export warning appears if pagination completeness uncertain.
5. Download/share works on Android and iOS paths.

## 6. Alarm Tests

1. `ESP32_Alarms` rows display correctly.
2. Fallback synthesized alarms from IoT telemetry work.
3. Local storage fallback works when API alarm data is empty.

## 7. BLE Tests

1. Scan BLE device list.
2. Connect/disconnect workflow.
3. Read/Write parameter workflow in Settings.
4. Factory unlock + device ID update + Wi-Fi credential update.
5. BLE state cleanup on screen exit/unmount.

## 8. Regression and Quality

1. `npm run lint` passes.
2. `npm run test` passes (or document known failing tests).
3. No unhandled Promise warnings during key flows.
4. No navigation path throws route-not-found errors.
5. Notification toggle persists across app relaunch (`@notification_enabled_v1`).
