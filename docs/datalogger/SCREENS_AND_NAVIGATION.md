# Screens and Navigation

Last reviewed: 2026-04-13

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
- `Themes`
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
- `Themes`
- `FactorySettings`

### `TabNavigator` routes

- `Dashboard`
- `Home`
- `Data`
- `Graph`
- `Alarm`
- `More`

### Visible primary bottom navigation

The native tab bar is hidden. Runtime screens render `ModernBottomNav`.

Default primary items:

- `Dashboard`
- `Home`
- `Graph`
- `Alarm`
- `More`

Notes:

- `Data` is still a real tab/stack route and must remain reachable where currently wired.
- `BottomWaveNav` now delegates to `ModernBottomNav` for compatibility.

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
- Uses `authenticate(...)`.
- On success:
  - saves session
  - routes to `Home`
- Forgot password opens support mail compose flow.

## SignUpScreen

- Captures name, userId, password, and confirm password.
- Saves local user/session when values are valid and matching.
- Uses tab-route navigation helper to reach `Home`.

## PageFirst

- Supports onboarding entry into `Login`.
- Supports guest/onboarding path into `Home`.

## DashboardScreen

- Polls fast status every 5 seconds.
- Uses health summary (`total`, `online`, `good`, `issue`).
- Card tap routes to `Home` with filter:
  - `all`
  - `good`
  - `issue`
- Top-left icon opens `Sidebar`.
- Bottom nav active route is `Dashboard`.

## HomeScreen

- Polls fast status every 5 seconds.
- Uses warm cache on first render.
- Filter chips:
  - All
  - Good
  - Issue
- Device card actions:
  - Graph icon -> `GraphShow`
  - Export icon -> `Export`
  - Share icon -> native share payload
- Top-left icon opens `Sidebar`.
- Bottom nav active route is `Home`.

## GraphScreen

- Start/end date inputs and picker (`DD-MM-YYYY`) with optional device ID filter.
- Mode toggle:
  - `Live`
  - `History`
- Live mode polls every 5 seconds using the realtime monitor API.
- History mode uses `fetchAllIoTReadings` with inclusive start/end-of-day filtering.
- If a broad history query returns zero matches, the screen can retry with device-scoped requests.
- Supports dynamic multi-series charts and pagination.
- Top-left icon opens `Sidebar`.
- Bottom nav active route is `Graph`.

## GraphShowScreen

- Device-specific graph view opened from Home.
- Back behavior:
  - parent-aware `goBack`
  - fallback reset to `Home`
- Modes:
  - `Live`
  - `History`
- Download button routes to `Export` with device/date params.

## ExportScreen

- Date-range inputs with picker.
- Uses `fetchAllIoTReadings` with optional `deviceId`.
- Builds CSV with dynamic parameter columns.
- Shows in-screen preview rows.
- Export action opens system share/save flow.

## AlarmScreen

- Refreshes every 1 second while focused.
- Data source order:
  1. `ESP32_Alarms`
  2. synthesized alarms from telemetry
  3. local storage alarms
- Top-left icon opens `Sidebar`.
- Bottom nav active route is `Alarm`.

## MoreScreen

- Menu items:
  - `Profile`
  - `Settings`
  - `Factory Settings`
  - `Notifications`
  - `Help & Support`
  - `About App`
  - `Logout`
- Logout clears session and routes to `Auth`.
- Top-left icon opens `Sidebar`.
- Bottom nav active route is `More`.

## SidebarScreen

- Menu entries:
  - `Home`
  - `Settings`
  - `Profile`
  - `Logout`
- Logout clears session and routes to `Auth`.
- Back button uses fallback to `Home`.

## NotificationScreen

- Toggle persisted in AsyncStorage key:
  - `@notification_enabled_v1`
- Back button uses fallback to `More`.

## ProfileScreen / EditProfileScreen

- `Profile` shows locally stored/in-memory profile values.
- `EditProfile` updates parent state via callback and returns to `Profile`.
- Back button fallbacks:
  - `Profile` -> `More`
  - `EditProfile` -> `Profile`

## AboutAppScreen

- Static app description screen.
- Uses safe tab fallback to `More`.

## HelpSupportScreen

- Opens website, dialer, and mail links.
- Back button uses fallback to `More`.

## SettingsScreen (BLE runtime)

- BLE scan/connect/disconnect.
- Read all params snapshot.
- Write single param or all params.
- Set time from mobile clock.
- Read/write device name.
- Read/write recipient email.
- Shows BLE status history and live telemetry.
- Contains `Appearance` panel with navigation to `Themes`.
- Uses a custom bottom-nav item set anchored to `More`.

## ThemesScreen

- Route name:
  - `Themes`
- Open path:
  - `More` -> `Settings` -> `Themes`
- Renders from `themeOptions`.
- Theme selection applies instantly through `setTheme(themeId)`.
- Current selection persists via `@app_theme_v1`.
- Back button uses fallback to `Settings`.

## FactorySettingsScreen (BLE protected)

- Requires unlock password `blackstar`.
- BLE scan/connect/disconnect.
- Read/update device ID.
- Read/write Wi-Fi credentials.
- Read/write factory sender email and app password.
- Back button uses fallback to `More`.

## DataScreen

- One-time fetch on mount via `fetchData`.
- Simple list/debug display of normalized metrics.
- Route remains active even though it is not shown in the default five-button bottom navigation.

## DeviceInformationScreen

- Mock/static screen.
- Exists in active stack routes where currently wired.

## SplashScreen

- Exists in codebase but is not used by the current root navigator entry.

## 3. Navigation Utilities

- `navigateToTabRoute(navigation, routeName)`
  - resolves tab routes across nested stacks and parent navigators
- `goBackWithFallback(navigation, fallbackRoute)`
  - walks current, parent, and grandparent navigators before falling back
- `logoutToAuthRoot(navigation)`
  - attempts stack reset or navigation to `Auth`

## 4. Non-Primary Code

- `src/screens_1/` contains older duplicate screens and is not used in active route trees.
