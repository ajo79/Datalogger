# Feature Inventory

Last reviewed: 2026-03-23

This document lists implemented application features from the active runtime code in `src/` and `src/navigation/`.

## 1. App Startup and Navigation

- Animated startup screen with rotating shield and staggered BIOT text animation.
- Startup fast-status prefetch while splash animation is running.
- Session-based route decision:
  - existing session -> `Main`
  - no session -> `Auth`
- Root flow uses `Animation`, `Auth`, and `Main` routes.
- Tab navigator exists for routing, while the native tab bar is hidden.
- Custom bottom-wave navigation is rendered by screens.

## 2. Authentication and Session

- Login requires user ID/email and password.
- Email format validation when input contains `@`.
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
  - BIOT parameter list (preferred)
  - Press-phase metrics (Phase-X amps)
  - Temp/Humidity fallback
- Per-device actions:
  - Graph detail (`GraphShow`)
  - Export (`Export`)
  - Native share payload
- Pull-to-refresh, loading, error retry, and empty-filter state.

## 5. Graph (Multi-Device)

- Live mode and History mode toggle.
- Start/end date filters in `DD-MM-YYYY`.
- Modal date picker and manual numeric date entry.
- Optional device ID filter for history search.
- Live mode polling every 5 seconds.
- Offline hysteresis handling to reduce false offline transitions.
- Live notices:
  - no live data
  - all devices offline
- Multi-device chart rendering.
- Dynamic datasets:
  - press devices (multi-phase lines)
  - env devices (temperature/humidity lines)
- Data-point tooltip with series/value/timestamp.
- Horizontal chart scrolling with left/right controls.
- History query with strict date-range validation.
- Paged history fetch through `fetchAllIoTReadings`.
- Fallback strategy:
  - if all-device history returns no matches, retry per-device queries
- History pagination inside screen (500 points/page).
- Max live trend window per device (100 points).

## 6. GraphShow (Single Device)

- Device-specific live trend view.
- Device-specific history trend view.
- Parent-aware back behavior with fallback reset path.
- Live polling every 5 seconds for selected device only.
- Duplicate timestamp suppression for live points.
- Offline/no-reading notices for selected device.
- History fetch by selected device + date range.
- History pagination (500 points/page).
- Tooltip on chart point press.
- Horizontal chart scrolling controls.
- "Download Data" action forwarding date/device context to Export.

## 7. Export

- Date-range export UI.
- Optional prefill of date range from graph routes.
- Optional device-scoped export when opened from device context.
- Uses paged history API fetch (`fetchAllIoTReadings`).
- Warns user when completeness is uncertain.
- Filters and sorts export rows client-side (newest first).
- Builds dynamic CSV columns from available metrics.
- Includes CSV base columns:
  - DeviceID, SiteID, DeviceType, DeviceName
  - OverallAlarm, WifiStrength, Timestamp, Date Time
- Writes CSV file to cache directory.
- Opens native share/save flow for CSV.
- Android path:
  - attempts direct copy to Downloads
  - requests legacy storage permission when required
  - falls back to share sheet on failure
- In-app preview table of latest rows (up to 50).

## 8. Alarm

- Refreshes alarm data every 1 second while focused.
- Pull-to-refresh support.
- Alarm source priority:
  1. `ESP32_Alarms` API array
  2. synthesized alarms from telemetry rows
  3. local AsyncStorage alarm history
- Alarm status normalization (`Active` / `Cleared`) from multiple fields.
- Message extraction with payload and fallback logic.
- Horizontally scrollable table layout.
- Displays:
  - Sr. No.
  - Device ID
  - Device Name
  - Message
  - Alarm Date Time
  - Status
  - Ack By
  - Ack Date Time

## 9. More, Sidebar, and Utility Pages

- More menu entries:
  - Profile
  - Settings
  - Factory Settings
  - Notifications
  - Help & Support
  - About App
  - Logout
- Logout confirmation flow from More and Sidebar.
- Sidebar quick links:
  - Home
  - Settings
  - Profile
  - Logout
- Notification enable switch persisted in AsyncStorage.
- Profile display page with editable fields.
- Edit profile page updates parent profile state through callback.
- Help & Support deep links:
  - manual URL
  - phone dialer links
  - support email compose
  - website link
- About App static information page with safe back fallback.

## 10. BLE Runtime Settings (Settings Screen)

- BLE device scan/connect/disconnect.
- Android BLE permission handling for API 31+ and <=30.
- Device dropdown with discovered devices and RSSI.
- Read full parameter snapshot from BLE.
- Write single parameter (`1..9`).
- Write all parameters (`1..9` sequentially).
- Parameter support:
  - Param 1: epoch time (`u64`)
  - Params 2-5: threshold lower/upper (`u16`)
  - Params 6-9: multipliers (`float32`)
- Validation for required values and numeric ranges.
- Date/time sync:
  - shows mobile current epoch time
  - shows device epoch time from snapshot
  - one-tap set-time writes Param 1 with mobile now
- BLE status monitoring via status characteristic.
- Recent BLE activity/status history panel.
- Live telemetry monitoring via telemetry characteristic.
- Telemetry key/value humanization for nested payloads.
- Receiver email configuration:
  - read recipient email from BLE
  - write recipient email to BLE

## 11. BLE Factory Settings (Protected Screen)

- Factory password gate (`blackstar`) to unlock actions.
- BLE scan/connect/disconnect flow.
- Device ID management:
  - read current device ID
  - update device ID over BLE
- Wi-Fi credentials write:
  - SSID characteristic
  - password characteristic
- Factory email settings:
  - read sender email and app password
  - write sender email
  - write app password
  - masked app password handling
- Status line showing latest factory action.

## 12. API and Data Engine

- Centralized API module with timeout and abort control.
- Supports Lambda proxy response shape and direct JSON.
- Unmarshals DynamoDB typed attributes.
- Flattens nested payload into root row.
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
- Returns completeness metadata for history/export consumers.

## 13. Local Persistence

- User credentials storage.
- User session storage.
- Alarm log storage with normalization and max-row cap (500).
- Notification toggle storage.

## 14. Device Health Model

- Online/offline computed using timestamp freshness.
- Dynamic offline threshold logic using publish/report interval hints.
- Common-issue detection via status and compatibility aliases.
- Health classification:
  - `good`: online and no common issue
  - `issue`: offline or common issue
- Summary aggregation used by Dashboard and Home.

## 15. Responsive and UI System

- Responsive helper for compact/very-compact/large layouts.
- Dynamic scaling for fonts, sizes, spacing, nav icon/text sizing.
- Shared design token modules (`colors`, `spacing`, `radius`, `shadows`, `typography`, `motion`).
- Shared UI primitive components available under `src/components/ui/`.

## 16. Platform-Level Runtime Support

- Android BLE permissions and legacy compatibility declarations.
- Android app includes BLE optional feature declaration.
- iOS Bluetooth and location usage descriptions configured.
- iOS ATS keeps arbitrary loads disabled (local networking allowed).
- React Native build targets Android and iOS with native configs.

## 17. Non-Primary / Legacy Code

- `SplashScreen.js` exists but active root entry is `AnimationScreen`.
- `AboutScreen.js` exists but is not part of active primary route flow.
- `src/screens_1/` contains legacy duplicate screens not used by active navigators.
- `DeviceInformationScreen` exists and is currently mock/static.
