# Testing Checklist

Last reviewed: 2026-04-13

## 1. Smoke Tests

1. Launch app from a fresh install.
2. Animation screen routes correctly:
   - with session -> `Main`
   - without session -> `Auth` / `Login`
3. Login success and failure behavior works.
4. App remains stable after theme hydration on first launch.

## 2. Navigation Tests

1. All primary bottom-nav buttons work on tab screens:
   - `Dashboard`
   - `Home`
   - `Graph`
   - `Alarm`
   - `More`
2. `Data` route remains reachable where currently wired.
3. Sidebar opens and all menu items navigate correctly.
4. `More` menu items navigate correctly:
   - `Profile`
   - `Settings`
   - `Factory Settings`
   - `Notifications`
   - `Help & Support`
   - `About App`
   - `Logout`
5. Back buttons work with fallback behavior on:
   - `Profile`
   - `EditProfile`
   - `Notifications`
   - `HelpSupport`
   - `AboutApp`
   - `Themes`
   - `FactorySettings`
6. `GraphShow` and `Export` back paths still work from nested stack flows.

## 3. Theme Tests

1. Open `More` -> `Settings` -> `Themes`.
2. Select each built-in theme:
   - `Light Industrial`
   - `Dark Industrial`
   - `High Contrast`
   - `Soft Neutral`
3. Confirm the following update globally:
   - buttons
   - cards
   - headers
   - chips
   - inputs
   - bottom navigation
4. Force close and relaunch the app; the selected theme should persist.
5. If theme storage is missing or invalid, app should fall back to `Light Industrial`.

## 4. Data and Refresh Tests

1. Home auto-refresh updates every 5 seconds.
2. Dashboard auto-refresh updates every 5 seconds.
3. Alarm list auto-refresh updates every 1 second while focused.
4. Fast status warm cache hydrates Home and Dashboard on startup when recent data exists.
5. Online/offline status changes with timestamp staleness and dynamic publish-interval thresholding.

## 5. Graph Tests

1. Graph screen live mode shows incoming values.
2. Graph screen history mode returns selected date-range data, including same-day ranges.
3. GraphShow live mode tracks the selected device only.
4. GraphShow history mode applies start and end date correctly.
5. History filtering is based on normalized device timestamps and applies optional `deviceId` filter when entered.
6. Graph screen all-device history can recover through device-scoped fallback when broad query has zero matches.

## 6. Export Tests

1. Export data for a date range and optional device ID.
2. CSV contains latest rows first.
3. CSV includes dynamic parameter columns.
4. Export warning appears if pagination completeness is uncertain.
5. Download/share works on Android and iOS paths.

## 7. Alarm Tests

1. `ESP32_Alarms` rows display correctly.
2. Fallback synthesized alarms from telemetry work.
3. Local storage fallback works when API alarm data is empty.

## 8. BLE Tests

1. Scan BLE device list.
2. Connect and disconnect workflow.
3. Read and write parameter workflow in `Settings`.
4. Read and write device name and receiver email in `Settings`.
5. Factory unlock plus device ID, Wi-Fi, and sender-email updates in `FactorySettings`.
6. BLE state cleanup works on screen exit and unmount.

## 9. Regression and Quality

1. `npm run lint` passes.
2. `npm run test` passes, or known failures are documented.
3. No unhandled Promise warnings during key flows.
4. No route-not-found errors from menu or back-button paths.
5. Notification toggle persists across relaunch (`@notification_enabled_v1`).
6. Theme selection persists across relaunch (`@app_theme_v1`).
