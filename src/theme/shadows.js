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
  card: makeShadow({ opacity: 0.08, radius: 8, offsetY: 2, elevation: 2 }),
  raised: makeShadow({ opacity: 0.12, radius: 12, offsetY: 4, elevation: 4 }),
  focus: makeShadow({ opacity: 0.2, radius: 14, offsetY: 5, elevation: 5 }),
});

export default shadows;
