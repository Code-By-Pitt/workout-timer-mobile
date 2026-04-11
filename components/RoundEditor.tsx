import { View, Text, TextInput, Pressable } from "react-native";
import type { Round } from "@/lib/timer";
import { DurationStepper } from "./DurationStepper";

interface RoundEditorProps {
  index: number;
  round: Round;
  onChange: (round: Round) => void;
  onRemove: (() => void) | null;
}

export function RoundEditor({ index, round, onChange, onRemove }: RoundEditorProps) {
  return (
    <View className="gap-2 rounded-xl bg-white/5 p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-white/50">Round {index + 1}</Text>
        {onRemove && (
          <Pressable onPress={onRemove}>
            <Text className="text-xs text-white/40">Remove</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        value={round.label}
        onChangeText={(text) => onChange({ ...round, label: text })}
        placeholder={`Round ${index + 1} exercise (optional)`}
        placeholderTextColor="rgba(255,255,255,0.3)"
        className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
      />

      <View className="flex-row flex-wrap items-center gap-4">
        <DurationStepper
          label="Work"
          value={round.workoutSeconds}
          onChange={(v) => onChange({ ...round, workoutSeconds: v })}
          min={5}
          max={300}
          step={5}
        />
        <DurationStepper
          label="Rest"
          value={round.restSeconds}
          onChange={(v) => onChange({ ...round, restSeconds: v })}
          min={0}
          max={300}
          step={5}
        />
      </View>
    </View>
  );
}
