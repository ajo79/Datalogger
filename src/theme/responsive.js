import { PixelRatio, useWindowDimensions } from "react-native";
import { useMemo } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

export function getResponsiveProfile(width, fontScale = 1) {
  const safeWidth = Number(width) || 0;
  const safeFontScale = Number(fontScale) || 1;

  const isVeryCompact = safeWidth <= 340 || safeFontScale >= 1.25;
  const isCompact = safeWidth <= 360 || safeFontScale > 1.1;
  const isLarge = safeWidth >= 411 && safeFontScale <= 1.1;

  const viewportFontFactor = isVeryCompact ? 0.86 : isCompact ? 0.93 : isLarge ? 1.04 : 1;
  const fontScaleDamp = safeFontScale > 1 ? Math.max(0.82, 1 - (safeFontScale - 1) * 0.35) : 1;
  const fontFactor = viewportFontFactor * fontScaleDamp;
  const sizeFactor = isVeryCompact ? 0.9 : isCompact ? 0.95 : isLarge ? 1.05 : 1;

  const font = (base, options = {}) => {
    const min = options?.min ?? Math.max(10, Math.floor(base * 0.82));
    const max = options?.max ?? Math.ceil(base * 1.25);
    return clamp(roundToHalf(base * fontFactor), min, max);
  };

  const size = (base, options = {}) => {
    const min = options?.min ?? Math.floor(base * 0.82);
    const max = options?.max ?? Math.ceil(base * 1.2);
    return clamp(roundToHalf(base * sizeFactor), min, max);
  };

  const space = (base, options = {}) => {
    const min = options?.min ?? Math.floor(base * 0.75);
    const max = options?.max ?? Math.ceil(base * 1.15);
    return clamp(roundToHalf(base * sizeFactor), min, max);
  };

  return {
    width: safeWidth,
    fontScale: safeFontScale,
    isVeryCompact,
    isCompact,
    isLarge,
    maxFontSizeMultiplier: isVeryCompact ? 1.05 : isCompact ? 1.1 : 1.2,
    navIconSize: isVeryCompact ? 24 : isCompact ? 27 : 30,
    navTextSize: isVeryCompact ? 10.5 : isCompact ? 11.5 : 12,
    contentHorizontalPadding: isVeryCompact ? 10 : isCompact ? 12 : 14,
    font,
    size,
    space,
  };
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  return useMemo(() => {
    const profile = getResponsiveProfile(width, fontScale);
    return {
      ...profile,
      height,
    };
  }, [width, height, fontScale]);
}

