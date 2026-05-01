import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { useWorkoutStorage } from "@/hooks/useWorkoutStorage";
import { SectionEditor } from "@/components/SectionEditor";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { SpotifyPlaylistPicker } from "@/components/SpotifyPlaylistPicker";
import { useSpotify } from "@/hooks/useSpotify";
import {
  createDefaultSection,
  type WorkoutConfig,
  type Section,
  type SpotifyPlaylistRef,
} from "@/lib/timer";
import { parseSpotifyLink } from "@/lib/spotify";

export default function EditorScreen() {
  const router = useRouter();
  const { editingConfig, editingId, setRunningConfig } = useWorkoutContext();
  const { save } = useWorkoutStorage();
  const { loggedIn, isPremium } = useSpotify();
  const [workout, setWorkout] = useState<WorkoutConfig>(editingConfig);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(
    new Set()
  );
  const canPickPlaylist = loggedIn && isPremium;
  const showCollapseToggle = workout.sections.length > 1;

  function toggleCollapsed(index: number) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function pickPlaylist(ref: SpotifyPlaylistRef) {
    setWorkout({ ...workout, spotifyPlaylist: ref, spotifyUrl: undefined });
    setPickerVisible(false);
  }

  function clearPlaylist() {
    setWorkout({ ...workout, spotifyPlaylist: undefined });
  }

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
    setCollapsedSections((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
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
      {/* Sticky header */}
      <View className="flex-row items-center justify-between border-b border-white/10 px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm text-white/60">← Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-white">
          {editingId ? "Edit Workout" : "New Workout"}
        </Text>
        <Pressable
          onPress={handleSave}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 active:bg-emerald-700"
        >
          <Text className="text-sm font-semibold text-white">Save</Text>
        </Pressable>
      </View>

      {/* Scrollable form */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={workout.name}
          onChangeText={(text) => setWorkout({ ...workout, name: text })}
          placeholder="Workout name (e.g. Upper Body)"
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />

        {/* Prep time */}
        <View className="rounded-xl bg-white/10 p-3">
          <Text className="mb-1 text-xs font-medium text-white/60">Prep time</Text>
          <Text className="mb-2 text-[10px] text-white/40">
            Yellow countdown before workout starts
          </Text>
          <View className="flex-row gap-1.5">
            {[0, 5, 10, 15, 20, 30].map((s) => {
              const current = workout.prepareSeconds ?? 5;
              const active = current === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setWorkout({ ...workout, prepareSeconds: s })}
                  className={`flex-1 rounded-md py-1.5 ${
                    active ? "bg-white" : "bg-white/10"
                  }`}
                >
                  <Text
                    className={`text-center text-xs font-medium ${
                      active ? "text-slate-800" : "text-white/70"
                    }`}
                  >
                    {s === 0 ? "Off" : `${s}s`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Music / Spotify */}
        <View className="gap-2">
          <Text className="text-xs font-medium text-white/60">
            Music (optional)
          </Text>
          <SpotifyConnectButton />

          {canPickPlaylist && workout.spotifyPlaylist && (
            <View className="flex-row items-center gap-3 rounded-xl bg-white/10 p-2">
              {workout.spotifyPlaylist.imageUrl ? (
                <Image
                  source={{ uri: workout.spotifyPlaylist.imageUrl }}
                  style={{ width: 48, height: 48, borderRadius: 4 }}
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded bg-white/10">
                  <Text className="text-lg">🎵</Text>
                </View>
              )}
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-medium text-white"
                >
                  {workout.spotifyPlaylist.name}
                </Text>
                {typeof workout.spotifyPlaylist.trackCount === "number" && (
                  <Text className="text-xs text-white/50">
                    {workout.spotifyPlaylist.trackCount} tracks
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => setPickerVisible(true)}
                className="rounded-lg px-2 py-1"
              >
                <Text className="text-xs text-white/60">Change</Text>
              </Pressable>
              <Pressable
                onPress={clearPlaylist}
                className="rounded-lg px-2 py-1"
              >
                <Text className="text-xs text-white/40">Clear</Text>
              </Pressable>
            </View>
          )}

          {canPickPlaylist && !workout.spotifyPlaylist && (
            <Pressable
              onPress={() => setPickerVisible(true)}
              className="rounded-xl bg-white/10 px-4 py-3 active:bg-white/20"
            >
              <Text className="text-center text-sm font-medium text-white">
                🎵 Select a Spotify Playlist
              </Text>
            </Pressable>
          )}

          {!workout.spotifyPlaylist && (
            <>
              {canPickPlaylist && (
                <Text className="text-center text-[10px] uppercase tracking-wider text-white/30">
                  or paste a link
                </Text>
              )}
              <TextInput
                value={workout.spotifyUrl ?? ""}
                onChangeText={(text) =>
                  setWorkout({ ...workout, spotifyUrl: text })
                }
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
            </>
          )}
        </View>

        <SpotifyPlaylistPicker
          visible={pickerVisible}
          onSelect={pickPlaylist}
          onClose={() => setPickerVisible(false)}
        />

        <View className="gap-4">
          {workout.sections.map((section, i) => (
            <SectionEditor
              key={i}
              index={i}
              section={section}
              onChange={(s) => updateSection(i, s)}
              onRemove={
                workout.sections.length > 1 ? () => removeSection(i) : null
              }
              collapsed={collapsedSections.has(i)}
              onToggleCollapse={
                showCollapseToggle ? () => toggleCollapsed(i) : null
              }
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
      </ScrollView>

      {/* Sticky Start Workout */}
      <View className="border-t border-white/10 px-4 py-3">
        <Pressable
          onPress={handleStart}
          className="rounded-2xl bg-white py-4 active:bg-white/90"
        >
          <Text className="text-center text-xl font-bold text-slate-800">
            Start Workout
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
