# Coding Standards

## 1. General Principles

- Keep behavior aligned with BIOT telemetry schema.
- Prefer small pure helpers for parsing/normalization.
- Avoid duplicating route and fetch logic across screens.
- Fail safely: never crash on malformed payloads.

## 2. JavaScript/React Rules

- Use functional components and hooks.
- Keep side effects in `useEffect`/`useFocusEffect`.
- Use `useCallback`/`useMemo` where repeated calculations are expensive.
- Protect async effects with unmount guards/cancellation flags.

## 3. API and Data Handling

- All AWS API access must go through `src/api/dataService.js`.
- Do not parse raw response directly in screens when a service helper exists.
- For history/export date ranges, use `tsEpochMs` only.
- For online/offline freshness, rely on normalized `tsServerMs`/`ts`.
- Do not add direct telemetry upload calls from screens; mobile app is currently read-only for AWS API.

## 4. Navigation Standards

- Use named routes from existing stacks only.
- For tab switches from nested stacks, use `navigateToTabRoute`.
- Back handling in nested flows should use parent-aware fallback, not one-level `goBack` only.

## 5. UI and Screen Standards

- Keep custom bottom navigation consistent across tab screens.
- Ensure every button has:
  - clear action
  - reachable route/function
  - disabled/loading behavior where relevant
- Show loading and empty states for data-dependent screens.

## 6. Polling and Timers

- Always clear intervals/timeouts in cleanup.
- Prevent overlapping network calls with in-flight guards.
- Avoid creating duplicate polling loops on re-renders.
- Keep high-frequency polling (`1000` ms) only where UX requires it.

## 7. Error Handling

- Use guarded JSON parsing.
- Show user-friendly alerts/messages for failures.
- Keep console warnings for developer visibility on non-critical failures.

## 8. Storage Standards

- Use AsyncStorage keys centralized per feature (`@..._v1` naming).
- Do not store sensitive secrets in plain text for production builds.

## 9. BLE Code Standards

- Request runtime permissions before scan/connect.
- Clear subscriptions/listeners on disconnect/unmount.
- Avoid writes when disconnected or during teardown.

## 10. Review Checklist (Before Merge)

- Navigation path verified from every modified button.
- No polling interval leaks.
- No unhandled Promise rejection in modified code.
- History/export still honor `tsEpochMs` rule.
- CSV order remains latest-first.
