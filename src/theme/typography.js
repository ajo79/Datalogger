import { Platform } from "react-native";

const headingFamily = Platform.select({
  ios: "AvenirNext-Bold",
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
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  h1: {
    fontFamily: headingFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: 0.08,
  },
  h2: {
    fontFamily: headingFamily,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: 0.06,
  },
  h3: {
    fontFamily: headingFamily,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "600",
  },
  body: {
    fontFamily: bodyFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  bodyStrong: {
    fontFamily: bodyFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  label: {
    fontFamily: bodyFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: 0.35,
  },
  caption: {
    fontFamily: bodyFamily,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
  },
  metric: {
    fontFamily: headingFamily,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
  },
  button: {
    fontFamily: headingFamily,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "700",
    letterSpacing: 0.24,
  },
});

export default typography;
