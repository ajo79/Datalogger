const spacing = Object.freeze({
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
});

export const screenPadding = Object.freeze({
  horizontal: spacing.md,
  vertical: spacing.md,
});

export const componentSpacing = Object.freeze({
  sectionGap: spacing.lg,
  cardGap: spacing.md,
  inputGap: spacing.sm,
});

export default spacing;
