import { View, Text, Pressable } from "react-native";
import type { SavedWorkout, WorkoutConfig } from "@/lib/timer";
import { formatTime } from "@/lib/formatTime";
import { computeTotalSeconds } from "@/lib/workoutSummary";

interface WorkoutListItemProps {
  workout: SavedWorkout;
  onSelect: () => void;
  onQuickStart: () => void;
  onDelete: () => void;
}

function summarize(config: WorkoutConfig): string {
  const totalSections = config.sections.length;
  const totalRounds = config.sections.reduce((sum, s) => sum + s.rounds.length, 0);
  const totalTime = computeTotalSeconds(config);
  return `${totalSections} section${totalSections !== 1 ? "s" : ""} · ${totalRounds} round${totalRounds !== 1 ? "s" : ""} · ${formatTime(totalTime)}`;
}

export function WorkoutListItem({
  workout,
  onSelect,
  onQuickStart,
  onDelete,
}: WorkoutListItemProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white/10 p-3">
      {/* Quick-start button */}
      <Pressable
        onPress={onQuickStart}
        accessibilityLabel="Start workout"
        className="h-12 w-12 items-center justify-center rounded-full bg-emerald-600 active:bg-emerald-700"
      >
        <Text className="text-lg font-bold text-white">▶</Text>
      </Pressable>

      {/* Card body opens editor */}
      <Pressable onPress={onSelect} className="flex-1 gap-1">
        <Text className="text-lg font-semibold text-white">
          {workout.config.name || "Untitled Workout"}
        </Text>
        <Text className="text-xs text-white/50">
          {summarize(workout.config)}
          {workout.config.spotifyPlaylist || workout.config.spotifyUrl ? (
            <Text className="text-emerald-400">{"  🎵"}</Text>
          ) : null}
        </Text>
        <Text className="text-xs text-white/30">
          Last edited {new Date(workout.updatedAt).toLocaleDateString()}
        </Text>
      </Pressable>

      <Pressable
        onPress={onDelete}
        accessibilityLabel="Delete workout"
        className="rounded-lg px-2.5 py-2 active:bg-white/10"
      >
        <Text className="text-xs text-white/40">Delete</Text>
      </Pressable>
    </View>
  );
}
