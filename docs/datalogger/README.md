# Datalogger Documentation

This folder contains maintained technical documentation for the React Native `Datalogger` mobile application.

## Documents

1. `ARCHITECTURE.md`
   - System architecture, module layout, data flow, and runtime behavior.
2. `TECHNICAL_REQUIREMENTS.md`
   - Platform/toolchain requirements, runtime dependencies, permissions, and backend expectations.
3. `DEVELOPER_INSTRUCTIONS.md`
   - Setup, run, debug, build, and day-to-day development instructions.
4. `CODING_STANDARDS.md`
   - Code conventions, navigation rules, data-handling standards, and review checklist.
5. `API_AND_DATA_CONTRACT.md`
   - API endpoint contract, payload schema mapping, pagination, and timestamp rules.
6. `SCREENS_AND_NAVIGATION.md`
   - Page-wise behavior, route map, button actions, and navigation flows.
7. `OPERATIONS_TROUBLESHOOTING.md`
   - Operational runbook and troubleshooting for common production issues.
8. `TESTING_CHECKLIST.md`
   - Functional and regression test checklist before release.

## Scope

- Scope is only the React Native app in `Datalogger/`.
- Legacy code in `src/screens_1/` is documented as non-runtime and excluded from primary behavior descriptions.

## Source of Truth

When docs conflict with code, use these files as runtime truth:

- Navigation: `src/navigation/`
- Data/API normalization: `src/api/dataService.js`
- Health classification: `src/utils/deviceHealth.js`
- BLE behavior: `src/screens/SettingsScreen.js`, `src/screens/FactorySettingsScreen.js`, `src/ble/`
- UI tokens/responsive rules: `src/theme/`
- Reusable UI primitives: `src/components/ui/`
