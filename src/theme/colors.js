import { hexWithAlpha } from "./colorUtils";
import { DEFAULT_THEME_ID, getThemeColors } from "./themes";

const colors = Object.freeze(getThemeColors(DEFAULT_THEME_ID));

export const statusColors = Object.freeze({
  online: colors.success,
  warning: colors.warning,
  alarm: colors.danger,
  offline: colors.textMuted,
  info: colors.info,
});
export default colors;
export { hexWithAlpha };
