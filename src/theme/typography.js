import { Platform } from "react-native";

const headingFamily = Platform.select({
  ios: "AvenirNext-DemiBold",
  android: "sans-serif-medium",
  default: undefined,
});

const bodyFamily = Platform.select({
  ios: "AvenirNext-Regular",
  android: "sans-serif",
  default: undefined,
});

const typography = Object.freeze({
  display: {
    fontFamily: headingFamily,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily: headingFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  h2: {
    fontFamily: headingFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  h3: {
    fontFamily: headingFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  body: {
    fontFamily: bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  bodyStrong: {
    fontFamily: bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  label: {
    fontFamily: bodyFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  caption: {
    fontFamily: bodyFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  metric: {
    fontFamily: headingFamily,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
  },
  button: {
    fontFamily: headingFamily,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default typography;
