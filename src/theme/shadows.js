import { Platform } from "react-native";

function makeShadow({ opacity = 0.1, radius = 6, offsetY = 2, elevation = 2 } = {}) {
  if (Platform.OS === "android") {
    return { elevation };
  }
  return {
    shadowColor: "#0F1720",
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
  };
}

const shadows = Object.freeze({
  card: makeShadow({ opacity: 0.08, radius: 12, offsetY: 3, elevation: 3 }),
  raised: makeShadow({ opacity: 0.12, radius: 16, offsetY: 6, elevation: 5 }),
  focus: makeShadow({ opacity: 0.2, radius: 16, offsetY: 6, elevation: 6 }),
});

export default shadows;
