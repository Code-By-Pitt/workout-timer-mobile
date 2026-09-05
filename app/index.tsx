import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorkoutStorage } from "@/hooks/useWorkoutStorage";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrientationLock } from "@/hooks/useOrientationLock";
import { WorkoutListItem } from "@/components/WorkoutListItem";
import { createDefaultWorkout, type SavedWorkout } from "@/lib/timer";

export default function LibraryScreen() {
  useOrientationLock("portrait");
  const router = useRouter();
  const { workouts, remove, loaded, loadError, reload } = useWorkoutStorage();
  const { setEditing, setRunningConfig } = useWorkoutContext();
  const { user } = useAuth();

  function handleNew() {
    setEditing(createDefaultWorkout(), undefined);
    router.push("/editor");
  }

  function handleSelect(saved: SavedWorkout) {
    setEditing(saved.config, saved.id);
    router.push("/editor");
  }

  function handleQuickStart(saved: SavedWorkout) {
    setRunningConfig(saved.config);
    router.push("/timer");
  }

  function handleDelete(saved: SavedWorkout) {
    Alert.alert(
      "Delete workout?",
      `"${saved.config.name || "Untitled"}" will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            remove(saved.id).catch((e: unknown) =>
              Alert.alert(
                "Delete failed",
                e instanceof Error ? e.message : "Please try again."
              )
            );
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-800" edges={["top", "bottom"]}>
      <View className="flex-1 px-4 py-4">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-white">My Workouts</Text>
            <Text className="text-xs text-white/40">{user?.email}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/account")}
            className="rounded-lg px-3 py-1.5 active:bg-white/10"
          >
            <Text className="text-sm text-white/50">Account</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleNew}
          className="mb-4 rounded-2xl bg-emerald-600 py-4 active:bg-emerald-700"
        >
          <Text className="text-center text-lg font-bold text-white">
            + Create New Workout
          </Text>
        </Pressable>

        {loadError ? (
          <View className="mt-8 items-center gap-3">
            <Text className="text-center text-sm text-red-300">{loadError}</Text>
            <Pressable
              onPress={() => reload()}
              className="rounded-lg border border-white/20 px-4 py-2 active:bg-white/10"
            >
              <Text className="text-sm text-white/70">Retry</Text>
            </Pressable>
          </View>
        ) : (
          loaded &&
          workouts.length === 0 && (
            <Text className="mt-8 text-center text-sm text-white/40">
              No saved workouts yet. Create one to get started.
            </Text>
          )
        )}

        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <WorkoutListItem
              workout={item}
              onSelect={() => handleSelect(item)}
              onQuickStart={() => handleQuickStart(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}
