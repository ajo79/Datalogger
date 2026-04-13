# Datalogger Mobile App

Last reviewed: 2026-04-13

React Native mobile app for BIOT telemetry monitoring, alarms, charting, CSV export, and BLE device configuration.

## Quick Start

From `Datalogger/`:

```bash
npm install
npm run start
npm run android
# or
npm run ios
```

For iOS:

```bash
bundle install
cd ios && bundle exec pod install && cd ..
```

## Android Emulator Quick Start

1. Start Metro:

```bash
npm run start
```

2. Start an emulator from Android Studio Device Manager, or use:

```bash
emulator -list-avds
emulator -avd <YourAvdName>
```

3. Confirm the emulator is visible:

```bash
adb devices
```

4. Install and run the app:

```bash
npm run android
```

## Runtime Summary

- Entry: `App.tsx` -> `SafeAreaProvider` -> `AppThemeProvider` -> `AppNavigator`
- Root flow: `Animation` -> `Auth` or `Main`
- Logical tab routes:
  - `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`
- Primary bottom navigation UI:
  - `Dashboard`, `Home`, `Graph`, `Alarm`, `More`
- `Data` still exists in `TabNavigator` and stack routes, but it is not part of the default five-button bottom bar.
- Theme selection path:
  - `More` -> `Settings` -> `Themes`
- Built-in runtime themes:
  - `Light Industrial`
  - `Dark Industrial`
  - `High Contrast`
  - `Soft Neutral`
- Theme persistence key:
  - `@app_theme_v1`
- Notification toggle persistence key:
  - `@notification_enabled_v1`
- Session persistence key:
  - `@user_session_v1`
- AWS API endpoint used by app:
  - `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`

## Important Folders

- `src/screens/`: runtime UI screens
- `src/navigation/`: stack/tab routing and helpers
- `src/api/`: API and normalization logic
- `src/storage/`: AsyncStorage wrappers
- `src/ble/`: BLE UUID contract and payload codec
- `src/theme/`: theme definitions, provider, tokens, motion, responsive helpers
- `src/components/ui/`: reusable themed UI primitives
- `docs/datalogger/`: maintained technical docs

## Documentation

- Root architecture summary:
  - `ARCHITECTURE.md`
- Detailed docs bundle:
  - `docs/datalogger/README.md`
  - `docs/datalogger/ARCHITECTURE.md`
  - `docs/datalogger/THEMING_AND_UI_SYSTEM.md`
  - `docs/datalogger/API_AND_DATA_CONTRACT.md`
  - `docs/datalogger/SCREENS_AND_NAVIGATION.md`
  - `docs/datalogger/FEATURE_INVENTORY.md`
  - `docs/datalogger/TECHNICAL_REQUIREMENTS.md`
  - `docs/datalogger/DEVELOPER_INSTRUCTIONS.md`
  - `docs/datalogger/OPERATIONS_TROUBLESHOOTING.md`
  - `docs/datalogger/CODING_STANDARDS.md`
  - `docs/datalogger/TESTING_CHECKLIST.md`

## Notes

- `src/screens_1/` is legacy and not used by active navigators.
- `src/components/BottomWaveNav.js` is now a compatibility wrapper over `ModernBottomNav`.
- `SplashScreen.js` exists in the codebase, but the active entry route is `AnimationScreen`.
