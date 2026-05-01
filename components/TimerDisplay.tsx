import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import type { Phase } from "@/lib/timer";
import { formatTime } from "@/lib/formatTime";

interface TimerDisplayProps {
  secondsRemaining: number;
  phase: Phase;
  /** When true, digits gently pulse (final 5 seconds of work) */
  pulse?: boolean;
}

const phaseLabel: Record<Phase, string> = {
  workout: "WORK",
  rest: "REST",
  section_rest: "SECTION REST",
  idle: "READY",
};

export function TimerDisplay({
  secondsRemaining,
  phase,
  pulse = false,
}: TimerDisplayProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      scale.setValue(1);
    }
  }, [pulse, scale]);

  return (
    <View className="items-center gap-1">
      <Text
        className="text-2xl font-bold uppercase tracking-widest text-white opacity-80"
        accessibilityLiveRegion="assertive"
      >
        {phaseLabel[phase]}
      </Text>
      <Animated.Text
        className="font-mono font-bold leading-none text-white"
        style={{
          fontSize: 72,
          fontVariant: ["tabular-nums"],
          transform: [{ scale }],
        }}
        accessibilityLabel={`${secondsRemaining} seconds remaining, ${phase} phase`}
      >
        {formatTime(secondsRemaining)}
      </Animated.Text>
    </View>
  );
}
