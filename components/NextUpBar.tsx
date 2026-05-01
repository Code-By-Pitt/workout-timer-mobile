import { View, Text } from "react-native";
import { computeNext } from "@/lib/computeNext";
import { formatTime } from "@/lib/formatTime";
import type { TimerState } from "@/lib/timer";

const phaseLabel: Record<string, string> = {
  workout: "WORK",
  rest: "REST",
  section_rest: "SECTION REST",
};

interface NextUpBarProps {
  state: TimerState;
}

export function NextUpBar({ state }: NextUpBarProps) {
  const next = computeNext(state);

  if (!next) {
    if (state.phase !== "idle") {
      return (
        <View className="rounded-full bg-white/10 px-4 py-1.5">
          <Text className="text-xs font-medium uppercase tracking-wider text-white/80">
            Final interval
          </Text>
        </View>
      );
    }
    return null;
  }

  const parts: string[] = [phaseLabel[next.phase] ?? next.phase.toUpperCase()];
  if (next.label) parts.push(next.label);
  parts.push(formatTime(next.seconds));

  return (
    <View className="rounded-full bg-white/10 px-4 py-1.5">
      <Text className="text-xs font-medium uppercase tracking-wider text-white/80">
        Next: {parts.join(" · ")}
      </Text>
    </View>
  );
}
