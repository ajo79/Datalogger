# Coding Standards

Last reviewed: 2026-04-13

## 1. General Principles

- Keep behavior aligned with the BIOT telemetry schema and current route contracts.
- Prefer small helpers for parsing, normalization, and navigation fallback logic.
- Avoid duplicating route, theme, or fetch logic across screens.
- Fail safely on malformed payloads and incomplete BLE reads.

## 2. JavaScript and React Rules

- Use functional components and hooks.
- Keep side effects in `useEffect` or `useFocusEffect`.
- Guard async effects with mounted flags, cleanup, or cancellation patterns.
- Use `useMemo` and `useCallback` only where they are already consistent with the surrounding screen style or where recalculation cost is meaningful.

## 3. API and Data Handling

- All AWS API access must go through `src/api/dataService.js`.
- Do not parse raw API payloads directly in screens when a service helper already normalizes them.
- For history and export range filtering, use normalized device timestamps.
- For online/offline freshness, rely on normalized server/device timestamp helpers and `deviceHealth.js`.
- Do not add telemetry upload calls from screens; the mobile app is still read-only against AWS.

## 4. Navigation Standards

- Keep existing route names intact:
  - root: `Animation`, `Auth`, `Main`
  - tabs: `Dashboard`, `Home`, `Data`, `Graph`, `Alarm`, `More`
- Use `navigateToTabRoute` for tab navigation from nested stacks.
- Use `goBackWithFallback` for back buttons on nested screens.
- Use `logoutToAuthRoot` for logout flows.
- If a screen exists in both `AuthStack` and `MainStack`, changes must preserve both paths.

## 5. Theme and UI Standards

- Prefer semantic theme tokens over hardcoded colors.
- Keep theme definitions centralized in `src/theme/themes.js`.
- If a new token is added, add it to every theme definition before using it in UI.
- Prefer shared primitives in `src/components/ui/`:
  - `ModernTopHeader`
  - `ModernBottomNav`
  - `SurfaceCard`
  - `ThemedButton`
  - `ThemedInput`
- Keep bottom navigation visuals consistent with the modern curved bottom-bar system.
- `BottomWaveNav` should be treated as a compatibility wrapper, not a separate design system.

## 6. Polling and Timers

- Always clear intervals and timeouts in cleanup.
- Prevent overlapping network calls with in-flight guards where polling exists.
- Avoid duplicate polling loops after focus changes or rerenders.
- Prefer `5000` ms cadence for network polling unless the feature explicitly needs faster refresh.
- Keep `1000` ms loops only where already required:
  - focused alarm refresh
  - local UI clock/timer display

## 7. Error Handling

- Use guarded JSON parsing.
- Show user-facing alerts/messages for failures that block workflows.
- Keep developer-facing console output for non-fatal parse and BLE issues.
- BLE writes must be blocked while disconnected or during teardown.

## 8. Storage Standards

- Use versioned AsyncStorage keys in `@..._v1` form.
- Keep storage responsibilities localized by feature.
- Do not reuse the theme key or notification key for unrelated UI preferences.
- Do not store production secrets in plain AsyncStorage.

## 9. Review Checklist

- Every modified button or menu item still reaches the correct route or function.
- No back button regresses from nested stack paths.
- No polling interval leaks were introduced.
- History and export still honor the normalized timestamp path.
- CSV ordering remains newest first.
- Themed screens do not contain stray hardcoded colors where semantic tokens should be used.
