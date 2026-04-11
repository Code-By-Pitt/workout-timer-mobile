import { View, Text } from "react-native";
import type { Phase } from "@/lib/timer";
import { formatTime } from "@/lib/formatTime";

interface TimerDisplayProps {
  secondsRemaining: number;
  phase: Phase;
}

const phaseLabel: Record<Phase, string> = {
  workout: "WORK",
  rest: "REST",
  section_rest: "SECTION REST",
  idle: "READY",
};

export function TimerDisplay({ secondsRemaining, phase }: TimerDisplayProps) {
  return (
    <View className="items-center gap-2">
      <Text
        className="text-3xl font-bold uppercase tracking-widest text-white opacity-80"
        accessibilityLiveRegion="assertive"
      >
        {phaseLabel[phase]}
      </Text>
      <Text
        className="font-mono text-9xl font-bold leading-none text-white"
        style={{ fontVariant: ["tabular-nums"] }}
        accessibilityLabel={`${secondsRemaining} seconds remaining, ${phase} phase`}
      >
        {formatTime(secondsRemaining)}
      </Text>
    </View>
  );
}
