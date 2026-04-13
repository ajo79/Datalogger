# Datalogger Documentation

Last reviewed: 2026-04-13

This folder contains maintained technical documentation for the React Native `Datalogger` mobile application.

## Documents

1. `ARCHITECTURE.md`
   - Runtime structure, providers, navigation, data flow, BLE flow, and storage behavior.
2. `THEMING_AND_UI_SYSTEM.md`
   - Runtime theme system, shared UI primitives, semantic tokens, theme selection flow, and how to add a new custom theme.
3. `TECHNICAL_REQUIREMENTS.md`
   - Platform/toolchain requirements, native build baseline, runtime permissions, and backend expectations.
4. `DEVELOPER_INSTRUCTIONS.md`
   - Setup, emulator/device run commands, useful debug commands, and theme/navigation development guidance.
5. `CODING_STANDARDS.md`
   - Code conventions, navigation rules, theming standards, and review checklist.
6. `API_AND_DATA_CONTRACT.md`
   - API endpoint contract, payload normalization, pagination behavior, and timestamp rules.
7. `SCREENS_AND_NAVIGATION.md`
   - Route map, screen-by-screen behavior, bottom-nav rules, back-navigation behavior, and menu structure.
8. `FEATURE_INVENTORY.md`
   - End-to-end inventory of implemented features across UI, navigation, API, BLE, storage, and platform integration.
9. `OPERATIONS_TROUBLESHOOTING.md`
   - Operational runbook and troubleshooting for common runtime issues.
10. `TESTING_CHECKLIST.md`
   - Functional, navigation, BLE, export, and theme-regression checks before release.

## Scope

- Scope is the active React Native app in `Datalogger/`.
- `src/screens_1/` is legacy and excluded from primary runtime descriptions.

## Source of Truth

When docs conflict with code, use these as runtime truth:

- Navigation:
  - `src/navigation/`
- Data/API normalization:
  - `src/api/dataService.js`
- Device health:
  - `src/utils/deviceHealth.js`
- BLE behavior:
  - `src/screens/SettingsScreen.js`
  - `src/screens/FactorySettingsScreen.js`
  - `src/ble/`
- Theme system:
  - `src/theme/themes.js`
  - `src/theme/ThemeContext.js`
  - `src/theme/index.js`
- Reusable UI primitives:
  - `src/components/ui/`
