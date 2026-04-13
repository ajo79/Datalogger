# Feature Inventory

Last reviewed: 2026-04-13

This document lists implemented application features from the active runtime code in `src/` and `src/navigation/`.

## 1. App Startup and Navigation

- Animated startup screen with rotating shield and staggered BIOT text animation.
- Startup fast-status prefetch while animation is running.
- Session-based route decision:
  - existing session -> `Main`
  - no session -> `Auth`
- Root flow uses `Animation`, `Auth`, and `Main` routes.
- Tab navigator exists for logical routing while the native tab bar remains hidden.
- Runtime screens render the modern curved bottom navigation with `ModernBottomNav`.
- `BottomWaveNav` remains as a compatibility wrapper over the new bottom-nav component.

## 2. Authentication and Session

- Login requires user ID/email and password.
- Email format validation when the input contains `@`.
- Supports factory credentials (`Company_A / 1234`).
- Supports locally saved signup credentials.
- Session is persisted in AsyncStorage.
- Forgot password launches support mail compose flow.
- Signup captures name, userId, password, confirm password.
- Signup supports password visibility toggles.
- Signup saves local user/session when values are valid and matching.
- Guest access route is available from onboarding page.
- Logout clears session and routes to auth root.

## 3. Dashboard

- Polls fast status every 5 seconds.
- Uses warm in-memory status cache for quick first render.
- Pull-to-refresh support.
- Health summary aggregation:
  - total devices
  - online devices
  - good devices
  - issue devices
- Pie chart health breakdown.
- Circular stat cards for online/good/issue counts.
- Card tap navigates to Home with matching filter (`all`, `good`, `issue`).
- Sidebar entry from header.

## 4. Home Device Monitoring

- Polls fast status every 5 seconds.
- Uses warm status cache when available.
- Filter chips:
  - All
  - Good
  - Issue
- Sorts device cards by latest timestamp.
- Per-card status label and color:
  - Online
  - Alarm
  - Offline
- Wi-Fi strength icon mapping and label handling.
- Dynamic metric rendering:
  - BIOT parameter list
  - press-phase metrics
  - temperature/humidity fallback
- Per-device actions:
  - Graph detail (`GraphShow`)
  - Export (`Export`)
  - native share payload
- Pull-to-refresh, loading, error retry, and empty-filter state.

## 5. Graph (Multi-Device)

- Live mode and History mode toggle.
- Start/end date filters in `DD-MM-YYYY`.
- Modal date picker and manual numeric date entry.
- Optional device ID filter for history search.
- Live mode polling every 5 seconds.
- Offline hysteresis handling to reduce false offline transitions.
- Multi-device chart rendering for press or environment datasets.
- Data-point tooltip with series/value/timestamp.
- Horizontal chart scrolling with left/right controls.
- History query with strict date-range validation.
- Paged history fetch through `fetchAllIoTReadings`.
- Fallback strategy:
  - if all-device history returns no matches, retry per-device queries
- History pagination inside the screen.

## 6. GraphShow (Single Device)

- Device-specific live trend view.
- Device-specific history trend view.
- Parent-aware back behavior with fallback reset path.
- Live polling every 5 seconds for the selected device only.
- Duplicate timestamp suppression for live points.
- History fetch by selected device plus date range.
- History pagination.
- Tooltip on chart point press.
- Download action forwarding device/date context to Export.

## 7. Export

- Date-range export UI.
- Optional prefill of date range from graph routes.
- Optional device-scoped export when opened from a device context.
- Uses paged history API fetch.
- Warns user when completeness is uncertain.
- Filters and sorts export rows client-side, newest first.
- Builds dynamic CSV columns from available metrics.
- Writes CSV file to cache directory.
- Opens native share/save flow for CSV.
- Android direct-download fallback path when supported.
- In-app preview table of latest rows.

## 8. Alarm

- Refreshes alarm data every 1 second while focused.
- Pull-to-refresh support.
- Alarm source priority:
  1. `ESP32_Alarms` API array
  2. synthesized alarms from telemetry rows
  3. local AsyncStorage alarm history
- Alarm status normalization from multiple source fields.
- Horizontally scrollable table layout.

## 9. More, Sidebar, and Utility Pages

- More menu entries:
  - Profile
  - Settings
  - Factory Settings
  - Notifications
  - Help & Support
  - About App
  - Logout
- Sidebar quick links:
  - Home
  - Settings
  - Profile
  - Logout
- Logout confirmation flow from More and Sidebar.
- Notification enable switch persisted in AsyncStorage.
- Profile display page with editable fields.
- Edit profile page updates parent profile state through callback.
- Help & Support deep links:
  - manual URL
  - phone dialer links
  - support email compose
  - website link
- About App static information page with safe back fallback.

## 10. BLE Runtime Settings

- BLE device scan/connect/disconnect.
- Android BLE permission handling for API 31+ and <=30.
- Device dropdown with discovered devices and RSSI.
- Read full parameter snapshot from BLE.
- Write single parameter (`1..9`).
- Write all parameters sequentially.
- Date/time sync from mobile epoch.
- BLE status monitoring and recent status history panel.
- Live telemetry monitoring via telemetry characteristic.
- Receiver email configuration:
  - read
  - write
- Device name configuration:
  - read
  - write
- Appearance entry point:
  - `Settings` -> `Themes`

## 11. BLE Factory Settings

- Factory password gate (`blackstar`) to unlock actions.
- BLE scan/connect/disconnect flow.
- Device ID management:
  - read current device ID
  - update device ID over BLE
- Wi-Fi credentials write:
  - SSID
  - password
- Factory email settings:
  - read sender email
  - read app password
  - write sender email
  - write app password

## 12. Runtime Theme System

- App-wide theme provider mounted at the root.
- Four built-in themes:
  - `Light Industrial`
  - `Dark Industrial`
  - `High Contrast`
  - `Soft Neutral`
- Theme selection screen available at:
  - `More` -> `Settings` -> `Themes`
- Theme changes apply immediately without changing feature logic.
- Theme choice persists through AsyncStorage key `@app_theme_v1`.
- Invalid or missing stored theme falls back to `lightIndustrial`.

## 13. Shared UI System

- Theme-aware shared UI primitives under `src/components/ui/`.
- Modern top header with animated entry and themed action buttons.
- Modern curved bottom nav with animated active indicator.
- Shared themed buttons, inputs, cards, chips, banners, and containers.
- Shared motion, spacing, radius, shadow, and typography tokens from `src/theme/`.

## 14. API and Data Engine

- Centralized API module with timeout and abort control.
- Supports Lambda proxy response shape and direct JSON.
- Unmarshals DynamoDB typed attributes.
- Flattens nested payload into root rows.
- Normalizes BIOT `parameters[]`.
- Computes canonical compatibility fields:
  - temperature
  - humidity
  - wifi strength
  - common alarm
- Timestamp normalization across seconds/millis/micros/nanos.
- BIOT schema validation marker (`_schemaValid`).
- Merges realtime rows with IoT fallback rows by device.
- Fast status fetch path (`statusOnly=1`) with fallback behavior.
- In-memory fast status cache with max-age control.
- Startup prefetch in-flight dedupe.
- Paged history retrieval with cursor alias handling.
- Completeness metadata for history/export consumers.

## 15. Local Persistence

- User credentials storage.
- User session storage.
- Alarm log storage with normalization and max-row cap (500).
- Notification toggle storage.
- Theme selection storage.

## 16. Device Health Model

- Online/offline computed using timestamp freshness.
- Dynamic offline threshold logic using publish/report interval hints.
- Common-issue detection via status and compatibility aliases.
- Health classification:
  - `good`: online and no common issue
  - `issue`: offline or common issue
- Summary aggregation used by Dashboard and Home.

## 17. Platform-Level Runtime Support

- Android BLE permissions and legacy compatibility declarations.
- Android app includes BLE optional feature declaration.
- iOS Bluetooth and location usage descriptions configured.
- iOS ATS keeps arbitrary loads disabled while allowing local networking.
- React Native build targets Android and iOS with native configs.

## 18. Non-Primary and Legacy Code

- `SplashScreen.js` exists but the active root entry is `AnimationScreen`.
- `AboutScreen.js` exists but is not part of the primary runtime flow.
- `src/screens_1/` contains legacy duplicate screens not used by active navigators.
- `DeviceInformationScreen` exists and is currently mock/static.
