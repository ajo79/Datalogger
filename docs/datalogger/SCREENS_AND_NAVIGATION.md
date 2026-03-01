# Screens and Navigation

## 1. Navigation Map

### Root

- `AppNavigator`
  - `Animation`
  - `Auth` (stack)
  - `Main` (stack)

### AuthStack routes

- `Login`
- `SignUp`
- `PageFirst`
- `Home` (TabNavigator)
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

### MainStack routes

- `Home` (TabNavigator)
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

### TabNavigator routes

- `Dashboard`
- `Home`
- `Data`
- `Graph`
- `Alarm`
- `More`

## 2. Page-Wise Behavior and Buttons

## AnimationScreen

- Auto checks session:
  - session found -> `replace("Main")`
  - no session -> `replace("Auth")`
- Tap shield logo also triggers session check.

## LoginScreen

- Login button:
  - validates input
  - `authenticate(...)`
  - save session
  - `replace("Home")`
- Forgot Password:
  - opens support email via `mailto:`

## DashboardScreen

- Auto-polls every 1 second.
- Sidebar top-left button -> `Sidebar`.
- Stat cards navigate to `Home` with filter params:
  - all / good / issue
- Bottom custom nav:
  - Dash/Home/Graph/Alarm/More (via `navigateToTabRoute`)

## HomeScreen

- Auto-polls every 1 second.
- Filter chips: All / Good / Issue.
- Each device card actions:
  - Graph icon -> `GraphShow` (device context)
  - Export icon -> `Export` (device context)
  - Share icon -> native share sheet
- Sidebar top-left button -> `Sidebar`.
- Bottom custom nav available.

## GraphScreen

- Modes:
  - Live: 1 second polling using `fetchRealTimeDataMonitor`
  - History: date-based fetch using paged `fetchAllIoTReadings`
- History filter uses selected date and strict `tsEpochMs`.
- Sidebar top-left button -> `Sidebar`.
- Bottom custom nav available.

## GraphShowScreen

- Per-device detailed chart.
- Back button:
  - tries nested parent `goBack`
  - fallback reset to `Home`
- Modes:
  - Live: polls every 1 second for selected device
  - History: date-range with `fetchAllIoTReadings` + `tsEpochMs` filter
- Download Data button -> `Export` with current device/date params.

## ExportScreen

- Back button:
  - tries nested parent `goBack`
  - fallback reset to `Home`
- Exports IoT readings by date range/device filter.
- Uses `fetchAllIoTReadings` pagination.
- CSV sort: newest first (`tsEpochMs` descending).
- Shows preview table (latest rows).

## AlarmScreen

- Refreshes every 1 second while focused.
- Data source priority:
  1. `ESP32_Alarms`
  2. synthesized alarm rows from `IoTReadings`
  3. local AsyncStorage alarms
- Sidebar top-left button -> `Sidebar`.
- Bottom custom nav available.

## MoreScreen

- Menu buttons:
  - Profile -> `Profile`
  - Settings -> `Settings`
  - Factory Settings -> `FactorySettings`
  - Notifications -> `Notifications`
  - Help & Support -> `HelpSupport`
  - About App -> `AboutApp`
  - Logout -> clear session + reset to `Auth`
- Sidebar top-left button -> `Sidebar`.
- Bottom custom nav available.

## AboutAppScreen

- Back button:
  - tries parent-aware `goBack`
  - fallback to tab route `More`
- Static app description content.

## HelpSupportScreen

- Back button -> `goBack`.
- Opens:
  - website URL
  - phone dialer links
  - support email composer

## NotificationScreen

- Back button -> `goBack`.
- Toggle persists in AsyncStorage key `@notification_enabled_v1`.

## ProfileScreen / EditProfileScreen

- Profile:
  - Back button -> `goBack`
  - Edit icon -> `EditProfile`
- EditProfile:
  - Back button -> `goBack`
  - Save button -> callback + navigate to `Profile`

## SidebarScreen

- Back button -> `goBack`
- Menu buttons:
  - Home
  - Settings
  - Profile
  - Logout (session clear + auth reset)

## SettingsScreen (BLE)

- Sidebar/menu top-left button.
- BLE actions:
  - Scan BLE
  - Select device
  - Connect / Disconnect
  - Read All / Write All params
  - Set Time
  - Set thresholds and multipliers
- Bottom nav buttons:
  - Home / Dash / Alarm / More

## FactorySettingsScreen (BLE protected)

- Back button -> `goBack`
- Unlock required (`blackstar` in current implementation).
- BLE actions:
  - Scan/Connect/Disconnect
  - Read/Update device ID
  - Send Wi-Fi credentials

## DataScreen

- One-time fetch on mount using `fetchData`.
- Shows raw/simple metric list.
- Does not include bottom nav controls.

## 3. Navigation Utilities

- `navigateToTabRoute(navigation, routeName)`
  - handles nested stack/tab routing robustly
- `logoutToAuthRoot(navigation)`
  - resets/navigates to `Auth` route when available

## 4. Non-Primary/Legacy Screens

- `DeviceInformationScreen` is mostly static/mock UI.
- `src/screens_1` contains older/duplicate screen set and is not the primary runtime path.
