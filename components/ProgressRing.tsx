import { useEffect, useRef, type ReactNode } from "react";
import { View, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0 to 1 */
  progress: number;
  /** Diameter in px */
  size: number;
  strokeWidth?: number;
  /** Hex color for the active arc */
  activeColor?: string;
  trackColor?: string;
  children: ReactNode;
}

export function ProgressRing({
  progress,
  size,
  strokeWidth = 12,
  activeColor = "#ffffff",
  trackColor = "rgba(255,255,255,0.2)",
  children,
}: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const offsetAnim = useRef(
    new Animated.Value(circumference * (1 - clamped))
  ).current;

  useEffect(() => {
    Animated.timing(offsetAnim, {
      toValue: circumference * (1 - clamped),
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [clamped, circumference, offsetAnim]);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
        }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={offsetAnim}
        />
      </Svg>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
}
