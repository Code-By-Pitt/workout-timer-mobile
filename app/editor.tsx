import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { useWorkoutStorage } from "@/hooks/useWorkoutStorage";
import { SectionEditor } from "@/components/SectionEditor";
import {
  createDefaultSection,
  type WorkoutConfig,
  type Section,
} from "@/lib/timer";
import { parseSpotifyLink } from "@/lib/spotify";

export default function EditorScreen() {
  const router = useRouter();
  const { editingConfig, editingId, setRunningConfig } = useWorkoutContext();
  const { save } = useWorkoutStorage();
  const [workout, setWorkout] = useState<WorkoutConfig>(editingConfig);

  function updateSection(index: number, section: Section) {
    const sections = [...workout.sections];
    sections[index] = section;
    setWorkout({ ...workout, sections });
  }

  function removeSection(index: number) {
    setWorkout({
      ...workout,
      sections: workout.sections.filter((_, i) => i !== index),
    });
  }

  function addSection() {
    setWorkout({
      ...workout,
      sections: [...workout.sections, createDefaultSection()],
    });
  }

  async function handleSave() {
    await save(workout, editingId);
    router.back();
  }

  function handleStart() {
    setRunningConfig(workout);
    router.push("/timer");
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-800" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} className="self-start">
          <Text className="text-sm text-white/50">← Back to Workouts</Text>
        </Pressable>

        <Text className="text-center text-2xl font-bold text-white">
          {editingId ? "Edit Workout" : "New Workout"}
        </Text>

        <TextInput
          value={workout.name}
          onChangeText={(text) => setWorkout({ ...workout, name: text })}
          placeholder="Workout name (e.g. Upper Body)"
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />

        {/* Spotify URL */}
        <View className="gap-1.5">
          <Text className="text-xs font-medium text-white/60">
            Music (optional)
          </Text>
          <TextInput
            value={workout.spotifyUrl ?? ""}
            onChangeText={(text) => setWorkout({ ...workout, spotifyUrl: text })}
            placeholder="Paste Spotify link (playlist, album, track)"
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl bg-white/10 px-4 py-3 text-white"
          />
          {(() => {
            const value = workout.spotifyUrl?.trim() ?? "";
            if (!value) return null;
            const parsed = parseSpotifyLink(value);
            if (parsed) {
              return (
                <Text className="text-xs text-emerald-400">
                  ✓ Ready — opens when you start the workout
                </Text>
              );
            }
            return (
              <Text className="text-xs text-red-400">
                Not a valid Spotify link
              </Text>
            );
          })()}
        </View>

        <View className="gap-4">
          {workout.sections.map((section, i) => (
            <SectionEditor
              key={i}
              index={i}
              section={section}
              onChange={(s) => updateSection(i, s)}
              onRemove={workout.sections.length > 1 ? () => removeSection(i) : null}
            />
          ))}
        </View>

        <Pressable
          onPress={addSection}
          className="rounded-xl bg-white/10 py-3 active:bg-white/20"
        >
          <Text className="text-center text-sm font-medium text-white">
            + Add Section
          </Text>
        </Pressable>

        <Pressable
          onPress={handleStart}
          className="rounded-2xl bg-white py-4 active:bg-white/90"
        >
          <Text className="text-center text-xl font-bold text-slate-800">
            Start Workout
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          className="rounded-2xl bg-emerald-600 py-3 active:bg-emerald-700"
        >
          <Text className="text-center text-lg font-bold text-white">
            {editingId ? "Save Changes" : "Save Workout"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
