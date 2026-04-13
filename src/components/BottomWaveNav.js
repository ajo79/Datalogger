import React from "react";
import IMAGES from "../constants/images";
import { ModernBottomNav } from "./ui";

export default function BottomWaveNav({ navigation, active = "HOME" }) {
  return (
    <ModernBottomNav
      navigation={navigation}
      activeRoute={active}
      items={[
        { key: "HOME", label: "HOME", route: "Home", icon: IMAGES.HomeIcon },
        { key: "GRAPH", label: "GRAPH", route: "Graph", icon: IMAGES.GraphIcon },
        { key: "ALARM", label: "ALARM", route: "Alarm", icon: IMAGES.AlarmIcon },
        { key: "MORE", label: "MORE", route: "More", icon: IMAGES.MoreIcon },
      ]}
    />
  );
}
