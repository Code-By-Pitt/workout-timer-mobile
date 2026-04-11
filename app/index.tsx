import { View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorkoutStorage } from "@/hooks/useWorkoutStorage";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { WorkoutListItem } from "@/components/WorkoutListItem";
import { createDefaultWorkout, type SavedWorkout } from "@/lib/timer";

export default function LibraryScreen() {
  const router = useRouter();
  const { workouts, remove, loaded } = useWorkoutStorage();
  const { setEditing } = useWorkoutContext();

  function handleNew() {
    setEditing(createDefaultWorkout(), undefined);
    router.push("/editor");
  }

  function handleSelect(saved: SavedWorkout) {
    setEditing(saved.config, saved.id);
    router.push("/editor");
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-800" edges={["top", "bottom"]}>
      <View className="flex-1 px-4 py-4">
        <Text className="mb-2 text-center text-3xl font-bold text-white">
          My Workouts
        </Text>
        <Text className="mb-6 text-center text-sm text-white/50">
          Select a workout or create a new one
        </Text>

        <Pressable
          onPress={handleNew}
          className="mb-4 rounded-2xl bg-emerald-600 py-4 active:bg-emerald-700"
        >
          <Text className="text-center text-lg font-bold text-white">
            + Create New Workout
          </Text>
        </Pressable>

        {loaded && workouts.length === 0 && (
          <Text className="mt-8 text-center text-sm text-white/40">
            No saved workouts yet. Create one to get started.
          </Text>
        )}

        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <WorkoutListItem
              workout={item}
              onSelect={() => handleSelect(item)}
              onDelete={() => remove(item.id)}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}
