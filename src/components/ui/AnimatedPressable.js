import React, { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import motion from "../../theme/motion";

export default function AnimatedPressable({
  children,
  onPress,
  style,
  contentStyle,
  disabled = false,
  pressInScale = motion.scale.pressIn,
  pressOutScale = motion.scale.pressOut,
  duration = motion.duration.fast,
  ...rest
}) {
  const scale = useRef(new Animated.Value(pressOutScale)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!disabled) return;
    Animated.timing(opacity, {
      toValue: 0.6,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacity]);

  const animateTo = (toScale, toOpacity = 1) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: toScale,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !disabled && animateTo(pressInScale, 0.92)}
      onPressOut={() => animateTo(pressOutScale, disabled ? 0.6 : 1)}
      style={style}
    >
      <Animated.View style={[contentStyle, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
