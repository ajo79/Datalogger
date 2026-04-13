export function hexWithAlpha(hex, alpha = 1) {
  const normalized = String(hex || "").replace("#", "");
  if (!(normalized.length === 3 || normalized.length === 6)) return hex;
  const raw =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : normalized;
  const bounded = Math.max(0, Math.min(1, Number(alpha) || 0));
  const alphaHex = Math.round(bounded * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${raw}${alphaHex}`;
}

