# Datalogger Mobile App

React Native app for BIOT telemetry monitoring, alarms, charting, CSV export, and BLE device configuration.

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

## Runtime Summary

- Entry: `App.tsx` -> `AppNavigator`
- Root flow: `Animation` -> `Auth` or `Main`
- Main tabs (hidden native tab bar, custom wave nav in screens):
  - `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`
- AWS API endpoint used by app:
  - `https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod`
- Fast status path:
  - `statusOnly=1`, 5s timeout, in-memory 30s cache

## Important Folders

- `src/screens/`: runtime UI screens
- `src/navigation/`: stack/tab routing and helpers
- `src/api/`: API and normalization logic
- `src/storage/`: AsyncStorage wrappers
- `src/ble/`: BLE UUID contract and payload codec
- `docs/datalogger/`: maintained technical docs

## Documentation

- Root architecture: `ARCHITECTURE.md`
- Detailed docs bundle:
  - `docs/datalogger/README.md`
  - `docs/datalogger/ARCHITECTURE.md`
  - `docs/datalogger/API_AND_DATA_CONTRACT.md`
  - `docs/datalogger/SCREENS_AND_NAVIGATION.md`
  - `docs/datalogger/TECHNICAL_REQUIREMENTS.md`
  - `docs/datalogger/DEVELOPER_INSTRUCTIONS.md`
  - `docs/datalogger/OPERATIONS_TROUBLESHOOTING.md`
  - `docs/datalogger/CODING_STANDARDS.md`
  - `docs/datalogger/TESTING_CHECKLIST.md`

## Notes

- `src/screens_1/` is legacy and not used by active navigators.
- `SplashScreen.js` exists but current entry route is `AnimationScreen`.
