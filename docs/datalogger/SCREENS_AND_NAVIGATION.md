# Screens and Navigation

## 1. Route Map

### Root (`AppNavigator`)

- `Animation` (initial)
- `Auth` (`AuthStack`)
- `Main` (`MainStack`)

### `AuthStack` routes

- `Login`
- `SignUp`
- `PageFirst`
- `Home` (`TabNavigator`)
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
- `FactorySettings`
- `Device`
- `Profile`
- `EditProfile`

### `MainStack` routes

- `Home` (`TabNavigator`)
- `Graph`
- `Data`
- `Alarm`
- `Export`
- `Sidebar`
- `More`
- `GraphShow`
- `Notifications`
- `AboutApp`
- `HelpSupport`
- `Profile`
- `EditProfile`
- `Settings`
- `FactorySettings`

### `TabNavigator` routes

- `Dashboard`
- `Home`
- `Data`
- `Graph`
- `Alarm`
- `More`

Native tab bar is hidden. Screen UIs render custom bottom wave navigation.

## 2. Screen Behavior

## AnimationScreen

- Runs startup animation.
- Starts fast status prefetch.
- Session check:
  - session found -> `replace("Main")`
  - no session -> `replace("Auth")`
- Tap on shield also triggers route decision.

## LoginScreen

- Requires `email` and `password`.
- Uses `authenticate(...)`:
  - hardcoded factory credentials or saved local user.
- On success:
  - saves session and `replace("Home")`.
- Forgot password opens `mailto:` support link.

## SignUpScreen

- Captures name/userId/password/confirm.
- If userId and password valid/matching:
  - saves local user/session.
- Always navigates to Home tab route after button click.

## DashboardScreen

- Polls fast status every 5 seconds.
- Uses health summary (`total`, `online`, `good`, `issue`).
- Card tap routes to Home with filter:
  - `all`, `good`, `issue`.
- Top-left icon opens sidebar.

## HomeScreen

- Polls fast status every 5 seconds.
- Uses warm cache on first render.
- Filter chips:
  - All, Good, Issue.
- Device card actions:
  - Graph icon -> `GraphShow`
  - Export icon -> `Export`
  - Share icon -> native share text payload
- Top-left icon opens sidebar.

## GraphScreen

- Start/end date inputs and picker (`DD-MM-YYYY`) with optional device ID filter.
- Mode toggle:
  - `Live`: polls every 5 seconds using realtime monitor API.
  - `History`: date-range history query via `fetchAllIoTReadings` (start-of-day to end-of-day, inclusive).
- History fallback:
  - If all-device history query returns zero matches, retries with device-scoped queries for discovered device IDs.
- Supports env or press-metric multi-series charts.
- Displays notices for no data/offline conditions.

## GraphShowScreen

- Device-specific graph view (from Home card).
- Back behavior:
  - parent-aware `goBack`
  - fallback reset to `Home`.
- Modes:
  - `Live`: selected-device polling every 5 seconds.
  - `History`: date-range query via `fetchAllIoTReadings`.
- Download button routes to `Export` with device/date params.

## ExportScreen

- Date-range inputs with picker.
- Uses `fetchAllIoTReadings` with optional `deviceId`.
- Builds CSV with dynamic parameter columns.
- Shows in-screen preview of latest rows.
- Export action opens system share/save flow.

## AlarmScreen

- Refreshes every 1 second while focused.
- Data source order:
  1. `ESP32_Alarms`
  2. synthesized alarms from telemetry
  3. local storage alarms
- Tabular horizontal-scroll layout.

## MoreScreen

- Menu items:
  - Profile
  - Settings
  - Factory Settings
  - Notifications
  - Help & Support
  - About App
  - Logout
- Logout clears session and routes to `Auth`.

## SidebarScreen

- Menu entries:
  - Home
  - Settings
  - Profile
  - Logout
- Logout clears session and routes to `Auth`.

## NotificationScreen

- Toggle persisted in AsyncStorage key:
  - `@notification_enabled_v1`
- Back button uses `goBack`.

## ProfileScreen / EditProfileScreen

- Profile shows local state values.
- Edit screen updates parent state via callback and routes to Profile.
- No backend profile API integration.

## SettingsScreen (BLE runtime)

- BLE scan/connect/disconnect.
- Read all params snapshot.
- Write single param or all params.
- Set time (Param 1 epoch from mobile clock).
- Live BLE telemetry and status history panel.

## FactorySettingsScreen (BLE protected)

- Requires unlock password `blackstar`.
- BLE scan/connect/disconnect.
- Read and update device ID.
- Send Wi-Fi SSID/password.

## HelpSupportScreen

- Opens website, phone dialer links, and support mailto link.

## AboutAppScreen

- Parent-aware back navigation with fallback to `More` tab.
- Static app description text.

## DataScreen

- One-time fetch on mount via `fetchData`.
- Simple list/debug display of normalized metrics.

## DeviceInformationScreen

- Mock/static UI (not integrated with live API data).

## SplashScreen

- Exists in codebase but not used by current root navigator entry.

## 3. Navigation Utilities

- `navigateToTabRoute(navigation, routeName)`
  - robust tab route resolution across nested stacks.
- `logoutToAuthRoot(navigation)`
  - attempts reset to `Auth` from current/parent/grandparent stacks.

## 4. Non-Primary Code

- `src/screens_1/` contains older duplicate screens and is not used in active route trees.
