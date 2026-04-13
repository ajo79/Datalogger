# Architecture

Last reviewed: 2026-04-13

## 1. Overview

`Datalogger` is a React Native app for BIOT telemetry monitoring with:

- dashboard health summaries
- live and history graphing
- alarm monitoring
- CSV export
- BLE runtime and factory configuration
- a runtime theme system with shared modern UI primitives

## 2. Runtime Flow

1. `App.tsx` wraps the app with `SafeAreaProvider`, `AppThemeProvider`, and `AppNavigator`.
2. `AppNavigator` starts at `Animation`.
3. `AnimationScreen`:
   - runs startup animation
   - starts fast-status prefetch
   - checks `getSession`
   - routes to `Main` or `Auth`
4. `AuthStack` and `MainStack` both contain the runtime routes needed after startup.
5. `TabNavigator` holds the logical tab routes:
   - `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`

## 3. Navigation Architecture

- Root routes:
  - `Animation`
  - `Auth`
  - `Main`
- Visible primary bottom navigation uses `ModernBottomNav` inside screens.
- The logical tab structure still lives in `TabNavigator`; native tab UI is hidden.
- The default five-button bottom bar exposes:
  - `Dashboard`, `Home`, `Graph`, `Alarm`, `More`
- `Data` remains a real route in the tab and stack navigators, but it is not shown in that default five-button bar.
- `BottomWaveNav` now forwards to `ModernBottomNav` for backward compatibility.

Navigation helpers in `src/navigation/navHelpers.js`:

- `navigateToTabRoute`
- `goBackWithFallback`
- `logoutToAuthRoot`

## 4. Theme Architecture

- Theme provider:
  - `AppThemeProvider`
- Theme context API:
  - `themeId`
  - `theme`
  - `setTheme(themeId)`
  - `themeOptions`
  - `hydrated`
- Theme storage key:
  - `@app_theme_v1`
- Built-in themes:
  - `lightIndustrial`
  - `darkIndustrial`
  - `highContrast`
  - `softNeutral`
- Shared token families:
  - colors
  - spacing
  - radius
  - shadows
  - typography
  - motion

## 5. Shared UI Layer

The UI layer is centered around reusable themed components in `src/components/ui/`:

- `ModernTopHeader`
- `ModernBottomNav`
- `SurfaceCard`
- `ThemedButton`
- `ThemedInput`
- `ScreenContainer`
- `NoticeBanner`
- `StatusChip`

These components consume semantic theme tokens so visual changes can be made without changing route names or feature logic.

## 6. Data Layer

All AWS API access goes through `src/api/dataService.js`.

- Base endpoint:
  - `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`
- Timeouts:
  - default `60000` ms
  - fast status `5000` ms
- Fast status cache:
  - in-memory, max age `30000` ms

Key service functions:

- `fetchDashboardData`
- `fetchData`
- `fetchRealTimeDataMonitor`
- `fetchFastDeviceStatus`
- `fetchAllIoTReadings`
- `fetchESP32Alarms`

## 7. BLE Architecture

### Runtime settings (`SettingsScreen`)

- scan/connect/disconnect
- read snapshot
- write params `1..9`
- set time
- read/write device name
- read/write receiver email
- monitor BLE status and live telemetry

### Factory settings (`FactorySettingsScreen`)

- unlock gate password: `blackstar`
- scan/connect/disconnect
- read/update device ID
- write Wi-Fi credentials
- read/write factory email sender credentials

## 8. Storage and Persistence

- `@user_credentials_v1`
- `@user_session_v1`
- `@alarm_logs_v1`
- `@notification_enabled_v1`
- `@app_theme_v1`

## 9. Non-Primary Code

- `src/screens_1/` is legacy and not used in active runtime routes.
- `SplashScreen.js` exists but the active startup entry is `AnimationScreen`.
