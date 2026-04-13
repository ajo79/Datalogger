# Theming and UI System

Last reviewed: 2026-04-13

## 1. Runtime Theme Architecture

- Root provider:
  - `AppThemeProvider` in `App.tsx`
- Context API from `src/theme/ThemeContext.js`:
  - `themeId`
  - `theme`
  - `setTheme(themeId)`
  - `themeOptions`
  - `hydrated`
- Theme storage key:
  - `@app_theme_v1`
- Default theme:
  - `lightIndustrial`

Theme changes are visual only. They do not change routes, BLE flows, API calls, polling cadence, or storage contracts outside theme preference persistence.

## 2. Built-In Themes

- `lightIndustrial`
  - blue-slate surfaces with amber action accents
- `darkIndustrial`
  - navy-charcoal surfaces with amber highlights
- `highContrast`
  - black/white contrast with strong action emphasis
- `softNeutral`
  - low-fatigue neutral canvas with restrained accents

These are defined in `src/theme/themes.js` and exposed through `THEME_OPTIONS`.

## 3. Theme Contract

Each theme definition provides semantic colors such as:

- `canvas`
- `surface`
- `surfaceElevated`
- `surfaceAlt`
- `textPrimary`
- `textSecondary`
- `border`
- `brand`
- `accent`
- `navActive`
- `navInactive`
- `navIndicator`
- `buttonPrimary`
- `buttonSecondary`
- `buttonGhost`
- `cardBackground`
- `cardBorder`
- `inputBackground`
- `inputBorder`
- `chipBackground`
- `chipActiveBackground`
- `overlaySoft`

Global non-color token families are composed in the provider:

- `spacing`
- `radius`
- `shadows`
- `typography`
- `motion`

## 4. Shared UI Components

The visual system should be changed through shared components first:

- `ModernTopHeader`
- `ModernBottomNav`
- `SurfaceCard`
- `ThemedButton`
- `ThemedInput`
- `ScreenContainer`
- `NoticeBanner`
- `StatusChip`

`BottomWaveNav` should be treated as a compatibility wrapper around `ModernBottomNav`.

## 5. Theme Selection Flow

- User path:
  - `More` -> `Settings` -> `Themes`
- `SettingsScreen` exposes the `Appearance` panel.
- `ThemesScreen` renders from `themeOptions`.
- Selecting an option calls `setTheme(option.id)`.
- Selection is applied immediately and persisted for relaunch.

## 6. Adding a New Custom Theme

To add a new theme without breaking functionality:

1. Add a new semantic color object in `src/theme/themes.js`.
2. Add the new theme to the `themes` map with a stable `id`, `name`, and `description`.
3. Add a matching option entry to `THEME_OPTIONS` with preview swatches.
4. Keep the theme shape identical to the existing theme objects.
5. If you introduce a new semantic token, add it to every existing theme before using it anywhere.
6. Do not hardcode route-specific colors in screens; consume `theme.colors.<token>` instead.
7. Prefer updating shared UI primitives first so the new theme applies globally.

Minimal example:

```js
const midnightGlass = Object.freeze({
  canvas: "#0C1624",
  canvasSoft: "#101C2B",
  surface: "#142033",
  surfaceElevated: "#1A2940",
  surfaceAlt: "#20314A",
  surfaceStrong: "#2A3E59",
  textPrimary: "#EAF2FB",
  textSecondary: "#B6C6D8",
  textMuted: "#91A6BE",
  textInverse: "#08111B",
  border: "#31465E",
  borderStrong: "#4D6685",
  borderFocus: "#7AB6E8",
  brand: "#5B95C8",
  brandDark: "#82B0D6",
  brandSoft: "#1B3249",
  accent: "#F0B24F",
  accentSoft: "#3D2C14",
  info: "#59B4E5",
  success: "#35B779",
  warning: "#DEA04A",
  danger: "#E06A6A",
  focusRing: "#7AB6E8",
  white: "#FFFFFF",
  black: "#000000",
  navActive: "#F0B24F",
  navInactive: "#9DB2C8",
  navIndicator: "#F0B24F",
  buttonPrimary: "#5B95C8",
  buttonPrimaryText: "#08111B",
  buttonSecondary: "#2A3E59",
  buttonSecondaryText: "#EAF2FB",
  buttonGhost: "#1A2940",
  buttonGhostText: "#EAF2FB",
  cardBackground: "#142033",
  cardBorder: "#31465E",
  cardHeader: "#20314A",
  inputBackground: "#1A2940",
  inputBorder: "#4D6685",
  inputText: "#EAF2FB",
  inputPlaceholder: "#91A6BE",
  tableRow: "#16253A",
  tableRowAlt: "#1D2F46",
  chipBackground: "#223650",
  chipActiveBackground: "#5A431B",
  chipText: "#DAE6F4",
  chipActiveText: "#FFD48D",
  overlaySoft: "#000000",
});
```

## 7. Standard Rules for Future Visual Changes

- Keep existing route names, menu items, and button actions unchanged.
- Use semantic tokens, not feature-local color constants.
- Put broad style changes into shared primitives before editing screen-specific styles.
- Preserve back-button behavior through `goBackWithFallback`.
- Preserve tab switching through `navigateToTabRoute`.

## 8. Glass-Look Extension Path

If you want a glass-like redesign later, the safest path is:

1. Add glass-specific semantic tokens such as:
   - `glassSurface`
   - `glassBorder`
   - `glassGlow`
2. Implement those tokens in shared components first:
   - `ModernTopHeader`
   - `ModernBottomNav`
   - `SurfaceCard`
   - `ThemedButton`
   - `ThemedInput`
3. Use alpha surfaces, borders, highlights, and shadows before introducing native blur dependencies.
4. Keep all route names and interaction handlers unchanged.
