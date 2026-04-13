import colors from "./colors";
import spacing, { componentSpacing, screenPadding } from "./spacing";
import radius from "./radius";
import shadows from "./shadows";
import typography from "./typography";
import motion from "./motion";
import { AppThemeProvider, useAppTheme } from "./ThemeContext";
import {
  DEFAULT_THEME_ID,
  getThemeDefinition,
  getThemeColors,
  isThemeId,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "./themes";
import { hexWithAlpha } from "./colorUtils";

const theme = Object.freeze({
  colors,
  spacing,
  screenPadding,
  componentSpacing,
  radius,
  shadows,
  typography,
  motion,
  id: DEFAULT_THEME_ID,
});

export {
  AppThemeProvider,
  useAppTheme,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  THEME_OPTIONS,
  isThemeId,
  getThemeDefinition,
  getThemeColors,
  hexWithAlpha,
  colors,
  spacing,
  screenPadding,
  componentSpacing,
  radius,
  shadows,
  typography,
  motion,
};

export default theme;
