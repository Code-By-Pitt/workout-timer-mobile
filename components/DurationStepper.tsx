import { View, Text, Pressable } from "react-native";
import { formatTime } from "@/lib/formatTime";

interface DurationStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function DurationStepper({
  label,
  value,
  onChange,
  min = 5,
  max = 300,
  step = 5,
}: DurationStepperProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View className="flex-row items-center gap-2">
      {label !== undefined && label.length > 0 && (
        <Text className="w-12 text-xs text-white/60">{label}</Text>
      )}
      <Pressable
        onPress={decrement}
        disabled={value <= min}
        className="h-9 w-9 items-center justify-center rounded-lg bg-white/10 active:bg-white/20"
        style={value <= min ? { opacity: 0.3 } : undefined}
      >
        <Text className="text-lg font-bold text-white">−</Text>
      </Pressable>
      <Text className="w-14 text-center font-mono text-sm text-white">
        {formatTime(value)}
      </Text>
      <Pressable
        onPress={increment}
        disabled={value >= max}
        className="h-9 w-9 items-center justify-center rounded-lg bg-white/10 active:bg-white/20"
        style={value >= max ? { opacity: 0.3 } : undefined}
      >
        <Text className="text-lg font-bold text-white">+</Text>
      </Pressable>
    </View>
  );
}
