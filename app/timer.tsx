import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useTimer } from "@/hooks/useTimer";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { useSpotify } from "@/hooks/useSpotify";
import { TimerDisplay } from "@/components/TimerDisplay";
import { TimerControls } from "@/components/TimerControls";
import { RepetitionCounter } from "@/components/RepetitionCounter";
import { playSound, preloadSounds } from "@/lib/playSound";
import { parseSpotifyLink } from "@/lib/spotify";
import * as spotifyApi from "@/lib/spotifyApi";
import type { Phase, WorkoutConfig } from "@/lib/timer";

const COUNTDOWN_SECONDS = 10;

const bgColor: Record<Phase, string> = {
  workout: "bg-emerald-600",
  rest: "bg-amber-500",
  section_rest: "bg-blue-600",
  idle: "bg-slate-800",
};

export default function TimerScreen() {
  const router = useRouter();
  const { runningConfig } = useWorkoutContext();
  const {
    state,
    start,
    pause,
    reset,
    restartSection,
    setConfig,
    phaseChanged,
    previousPhase,
  } = useTimer(runningConfig ?? undefined);
  const audioPrewarmed = useRef(false);
  const initRef = useRef(false);
  const { loggedIn, isPremium } = useSpotify();
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  // Keep screen awake while timer is running
  useKeepAwake();

  // Initialize the timer with the running config on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (runningConfig) {
      setConfig(runningConfig);
    }
  }, [runningConfig, setConfig]);

  const currentSection = state.config.sections[state.currentSectionIndex];
  const currentRound = currentSection?.rounds[state.currentRoundIndex];
  const transitionSound = currentSection?.transitionSound ?? "beep";

  async function openSpotifyForConfig(config: WorkoutConfig) {
    // Prefer picked playlist via Connect API (Premium users)
    if (config.spotifyPlaylist && loggedIn && isPremium) {
      try {
        const devices = await spotifyApi.getDevices();
        const active = devices.find((d) => d.is_active) ?? devices[0];
        if (!active) {
          showToast("Open Spotify on a device to enable playback");
        } else {
          await spotifyApi.playPlaylist(
            config.spotifyPlaylist.uri,
            active.id
          );
        }
      } catch {
        showToast("Spotify playback failed — starting timer anyway");
      }
      return;
    }
    // Fallback: legacy pasted URL (free users or no playlist picked)
    if (config.spotifyUrl) {
      const link = parseSpotifyLink(config.spotifyUrl);
      if (link) {
        try {
          await Linking.openURL(link.appUri);
        } catch {
          try {
            await Linking.openURL(link.webUrl);
          } catch {
            // swallow — don't block the timer
          }
        }
      }
    }
  }

  function isSpotifyControlled(config: WorkoutConfig) {
    return Boolean(config.spotifyPlaylist) && loggedIn && isPremium;
  }

  async function handleStart() {
    if (!audioPrewarmed.current) {
      await preloadSounds();
      audioPrewarmed.current = true;
    }
    if (state.phase === "idle") {
      // First start: begin playback from the picked playlist
      await openSpotifyForConfig(state.config);
    } else if (isSpotifyControlled(state.config)) {
      // Resume existing playback without restarting the playlist
      try {
        await spotifyApi.resumePlayback();
      } catch {
        // ignore
      }
    }
    start();
  }

  async function handlePause() {
    pause();
    if (isSpotifyControlled(state.config)) {
      try {
        await spotifyApi.pausePlayback();
      } catch {
        // ignore
      }
    }
  }

  async function handleReset() {
    reset();
    if (isSpotifyControlled(state.config)) {
      try {
        await spotifyApi.pausePlayback();
      } catch {
        // ignore
      }
    }
  }

  // Play sounds on phase transitions
  useEffect(() => {
    if (!phaseChanged) return;
    if (state.phase === "workout" && previousPhase !== "idle") {
      playSound(transitionSound);
    } else if (state.phase === "rest") {
      playSound(transitionSound);
    } else if (state.phase === "section_rest") {
      playSound(transitionSound);
    } else if (state.phase === "idle" && previousPhase !== "idle") {
      playSound("alarm");
      // Workout complete — stop Spotify playback
      if (isSpotifyControlled(state.config)) {
        spotifyApi.pausePlayback().catch(() => {});
      }
    }
  }, [state.phase, phaseChanged, previousPhase, transitionSound]);

  // Clap at 10 seconds remaining in work phase
  useEffect(() => {
    if (
      state.phase === "workout" &&
      state.isRunning &&
      state.secondsRemaining === COUNTDOWN_SECONDS
    ) {
      playSound("clap");
    }
  }, [state.phase, state.isRunning, state.secondsRemaining]);

  const isIdle = state.phase === "idle";
  const totalSections = state.config.sections.length;
  const totalRoundsInSection = currentSection?.rounds.length ?? 0;
  const headerName = state.config.name || "WORKOUT TIMER";

  return (
    <SafeAreaView
      className={`flex-1 ${bgColor[state.phase]}`}
      edges={["top", "bottom"]}
    >
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <Text className="text-xl font-semibold uppercase tracking-wider text-white opacity-70">
          {headerName}
        </Text>

        {/* Section rest — show upcoming section name */}
        {state.phase === "section_rest" && (() => {
          const nextSection = state.config.sections[state.currentSectionIndex + 1];
          return nextSection?.name ? (
            <Text className="text-lg font-medium text-white opacity-70">
              Up next: {nextSection.name}
            </Text>
          ) : null;
        })()}

        {/* Section name when running */}
        {!isIdle && state.phase !== "section_rest" && currentSection?.name && (
          <Text className="text-lg font-medium text-white opacity-60">
            {currentSection.name}
            {totalSections > 1 && (
              <Text className="text-sm opacity-60">
                {`  (Section ${state.currentSectionIndex + 1}/${totalSections})`}
              </Text>
            )}
          </Text>
        )}

        {/* Round label / exercise name */}
        {!isIdle && state.phase !== "section_rest" && currentRound?.label && (
          <Text className="text-3xl font-bold text-white">{currentRound.label}</Text>
        )}

        <TimerDisplay
          secondsRemaining={state.secondsRemaining}
          phase={state.phase}
        />

        {!isIdle && (
          <RepetitionCounter
            currentRound={state.currentRoundIndex + 1}
            totalRounds={totalRoundsInSection}
          />
        )}

        <TimerControls
          isRunning={state.isRunning}
          isIdle={isIdle}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          onRestartSection={restartSection}
        />

        {isIdle && (
          <Pressable
            onPress={() => {
              reset();
              if (isSpotifyControlled(state.config)) {
                spotifyApi.pausePlayback().catch(() => {});
              }
              router.back();
            }}
            className="mt-4"
          >
            <Text className="text-sm text-white/50">← Back to Workouts</Text>
          </Pressable>
        )}
      </View>

      {toast && (
        <View className="absolute bottom-10 left-4 right-4 items-center">
          <View className="rounded-full bg-black/80 px-4 py-2">
            <Text className="text-sm text-white">{toast}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
