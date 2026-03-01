# Datalogger Mobile App – Architecture

_Last reviewed: 2026-02-04_

## 1) Tech Stack
- **Platform**: React Native 0.83 (React 19), targeting iOS and Android.
- **Navigation**: `@react-navigation/native` with native stacks and a hidden bottom-tab navigator.
- **UI / Charts**: `react-native-chart-kit`, `react-native-svg`, custom image-based headers/footers.
- **Storage**: AsyncStorage (`@react-native-async-storage/async-storage`) for lightweight persistence.
- **File/Share**: `react-native-fs` for CSV generation and `react-native-share` for exports / “Save or Open With”.
- **Animations**: React Native `Animated`.
- **Testing**: Jest + react-test-renderer (single smoke test).

## 2) Runtime Entry & Navigation
1. **App.tsx** → wraps the app in `SafeAreaProvider` and mounts `AppNavigator`.
2. **AppNavigator (navigation/AppNavigator.js)**  
   - Root native stack with routes: `Animation` (initial), `Auth` (AuthStack), `Main` (MainStack).  
3. **AnimationScreen**  
   - Animated splash; after ~2s checks `userStorage` for saved credentials.  
   - Routes to `Main` when a user exists; otherwise to `Auth`.
4. **AuthStack**  
   - Starts at `Login`. Despite the name, it also contains the full app routes (Home tab + detail screens) so login can push directly into the app.
5. **MainStack**  
   - Mirrors AuthStack for already-authenticated sessions (initialRoute `Home`).
6. **TabNavigator**  
   - Bottom tab routes: `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`.  
   - **Default tab bar is hidden** (`tabBar={() => null}`); each screen draws its own wave-styled bottom nav.

## 3) Data Layer
- **Endpoint**: `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod` (AWS API Gateway → Lambda).
- **Service (src/api/dataService.js)**  
  - Fetch with 15s timeout via `AbortController`.  
  - Tolerates Lambda proxy shape `{ statusCode, body }` and plain JSON.  
  - Unmarshals DynamoDB AttributeValues (S/N/BOOL/NULL/M/L).  
  - Normalizes readings: flattens `payload`, coerces aliases for `temperature`, `humidity`, `ts`, and stringifies `deviceId`.
  - Exposes helpers:  
    - `fetchDashboardData()` → `{ IoTReadings, RealTimeDataMonitor, ESP32_Alarms }` normalized.  
    - `fetchRealTimeDataMonitor()` → real-time list.  
    - `fetchData()` → prefers RealTimeDataMonitor, falls back to IoTReadings.  
    - `fetchESP32Alarms()` → alarm entries.
- **Device Health Utils (src/utils/deviceHealth.js)**  
  - A device is **online** if `Date.now - ts <= 10s`.  
  - **Issue** if offline _or_ a “common issue/alarm” flag is present (case-insensitive, numeric/non-numeric). Payload is flattened for the check, so `Common Alarm` inside `payload` is honored.  
  - `buildHealthSummary` returns `{ total, online, good, issue }`.

## 4) Persistence
- **userStorage (src/storage/userStorage.js)**  
  - Stores `{ userId, password, name }` in AsyncStorage under `@user_credentials_v1`.  
  - Used by AnimationScreen to auto-route and by `authService` for credential checks.
- **authService (src/api/authService.js)**  
  - Factory backdoor credentials: `Company_A / 1234`.  
  - Otherwise validates against saved user; returns `{ userId, token }` or throws.
- **alarmStorage (src/storage/alarmStorage.js)**  
  - Local log buffer (max 500 entries) at `@alarm_logs_v1`.  
  - Normalizes payloads, formats timestamps to IST (`GMT+5:30`), and persists alarm details for offline use.  
  - Used as fallback when the API alarm feed is empty/unreachable.

## 5) UI Composition & State Patterns
- Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) throughout; no Redux or context.
- Polling intervals (5s) on: **Home**, **Dashboard**, **Alarm** (focus-based), **Graph** live mode. Cleanup on unmount via `clearInterval`.
- Lists use `FlatList` with pull-to-refresh where appropriate.
- Wifi/status/health chips computed per item; “press” devices detected by regex on keys like `Press 1 Amps`.

## 6) Feature Surfaces
- **DashboardScreen**  
  - Uses `fetchData` + `buildHealthSummary`.  
  - Shows circular stats and pie chart of Good vs Issue; tap cards deep-link to Home with filters.
- **HomeScreen**  
  - Primary device list (cards).  
  - Filters: all/good/issue (using deviceHealth).  
  - Actions per device: Graph detail (`GraphShow`), Export, OS Share.  
  - Computes wifi strength, online/offline, and supports both env sensors and “press” devices.  
  - Status chip shows **Alarm** (red) when any common alarm/issue is present; press amps shown with 1 decimal; share action flattens payload and includes press/env values.
- **GraphScreen**  
  - Two modes: **live** (polls `fetchRealTimeDataMonitor` every 5s) and **history** (single-date filter over `IoTReadings`, no point cap).  
  - Live view skips offline/stale devices and shows notices (live unavailable, offline list).  
  - History view shows an inline notice when no data exists for the selected date (no pop-up).  
  - Handles multi-device line charts (env or multiple press channels) with horizontal scroll sizing.  
  - Date picker via `react-native-modal-datetime-picker`.
- **GraphShowScreen**  
  - Per-device historical chart (up to 15 latest points in range).  
  - Accepts `deviceId` params from Home; filters `IoTReadings` by date range; supports env or press series.
- **AlarmScreen**  
  - Polls `ESP32_Alarms`; falls back to local `alarmStorage`.  
  - Table view (FlatList inside horizontal ScrollView) with status, ack fields, and timestamp formatting.
- **ExportScreen**  
  - Date range → filters `IoTReadings` (optionally by `deviceId`).  
  - Builds CSV headers dynamically (env + press metrics), writes once to cache, then opens the system “Save / Open With…” sheet (share with `saveToFiles` / app picker).  
  - Android WRITE permission requested only when attempting a direct Downloads copy (kept as fallback path). Shows preview of last 50 rows.
- **DataScreen**  
  - Minimal list of deviceId/temperature/humidity for connectivity sanity checks.
- **MoreScreen / SidebarScreen**  
  - Menu access to Profile, Notifications, Help, About, Settings; logout triggers `BackHandler.exitApp`.
- **Profile / EditProfile**  
  - Local-only profile data; Edit passes changes back via navigation params callback.
- **Settings / Notification**  
  - Toggle UI only; not persisted.
- **HelpSupport / AboutApp / DeviceInformation / PageFirst / SignUp**  
  - Static or demo content; DeviceInformation hosts mock tab switcher; SignUp stores credentials locally then routes to Main.
- **Components**  
  - `BottomWaveNav` renders the custom wave-styled bottom nav when screens choose to use it (TabNavigator’s native bar stays hidden).
- **Legacy Folder**: `src/screens_1` contains older versions of most screens and is currently unused by navigation.

## 7) Styling & Assets
- Centralized image registry at `src/constants/images.js` to avoid require typos.
- Visual identity uses wave PNGs for header/footer and icon-based custom nav; colors hard-coded per screen.  
- Theme tokens (`src/theme/colors.js`, `spacing.js`) exist but are placeholders (not consumed).

## 8) Data & Domain Model Notes
- Device reading shape after normalization:  
  - `deviceId` (string), `ts` (number, ms), optional `payload` flattened, env fields (`temperature`, `humidity` with alias detection), optional press metrics (`Press {n} Amps` / `Press {n} Alarm`), wifi strength (`wifi_strength` variants), `Common Issue` flags.
- Health categories: _good_ vs _issue_; online/offline derived from ts age.  
- Real-time vs historical: `RealTimeDataMonitor` preferred for live cards; `IoTReadings` for history/export/graphs.
- Issue detection uses payload-flattened fields (`Common Alarm` etc.), affecting Dashboard/Home status chips and filtering.

## 9) Error Handling & Resilience
- Network: fetch timeouts at 15s; errors surface as user-visible strings on Home/Dashboard.  
- Share/FS: guarded with try/catch; Android storage permission prompts before writing CSV.  
- Alarm feed falls back to locally cached alarms when API fails.

## 10) Testing & Tooling
- Jest smoke test (`__tests__/App.test.tsx`) renders `<App />`.  
- No lint/test automation configured beyond scripts in `package.json`.

## 11) Notable Gaps / Risks
- Credentials and tokens stored in plain AsyncStorage; no real authentication backend.  
- Polling does not pause on app backgrounding; could waste battery/data.  
- Settings/notification toggles are non-persistent and do not integrate with OS push.  
- Legacy `screens_1` may cause confusion; confirm deletion or routing.  
- No type safety (JS) despite TypeScript config present.
