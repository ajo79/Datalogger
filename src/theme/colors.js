const palette = Object.freeze({
  slate950: "#0F1720",
  slate900: "#1E293B",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate300: "#CBD5E1",
  slate200: "#CFD8E3",
  slate100: "#EDF1F4",
  slate50: "#F4F6F8",
  white: "#FFFFFF",
  steelBlue700: "#163A5A",
  steelBlue600: "#1F4E79",
  steelBlue500: "#2C679B",
  amber500: "#F59E0B",
  green600: "#16A34A",
  red600: "#DC2626",
  cyan500: "#0EA5E9",
});

const colors = Object.freeze({
  canvas: palette.slate50,
  canvasSoft: "#F7F9FB",
  surface: palette.white,
  surfaceAlt: palette.slate100,
  surfaceStrong: "#E2E8F0",
  textPrimary: palette.slate950,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  border: palette.slate200,
  borderStrong: palette.slate400,
  brand: palette.steelBlue600,
  brandDark: palette.steelBlue700,
  brandSoft: "#EAF1F7",
  info: palette.cyan500,
  success: palette.green600,
  warning: palette.amber500,
  danger: palette.red600,
  focusRing: "#38BDF8",
  white: palette.white,
  black: "#000000",
});

export const statusColors = Object.freeze({
  online: colors.success,
  warning: colors.warning,
  alarm: colors.danger,
  offline: colors.textMuted,
  info: colors.info,
});

export function hexWithAlpha(hex, alpha = 1) {
  const normalized = String(hex || "").replace("#", "");
  if (!(normalized.length === 3 || normalized.length === 6)) return hex;
  const raw = normalized.length === 3
    ? normalized.split("").map((c) => `${c}${c}`).join("")
    : normalized;
  const bounded = Math.max(0, Math.min(1, Number(alpha) || 0));
  const alphaHex = Math.round(bounded * 255).toString(16).padStart(2, "0");
  return `#${raw}${alphaHex}`;
}

export { palette };
export default colors;
