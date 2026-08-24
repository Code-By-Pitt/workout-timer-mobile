import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Linking, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useTimer } from "@/hooks/useTimer";
import type { TimerTransition } from "@/hooks/useTimer";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { useSpotify } from "@/hooks/useSpotify";
import { useOrientationLock } from "@/hooks/useOrientationLock";
import { TimerDisplay } from "@/components/TimerDisplay";
import { TimerControls } from "@/components/TimerControls";
import { RepetitionCounter } from "@/components/RepetitionCounter";
import { ProgressRing } from "@/components/ProgressRing";
import { NextUpBar } from "@/components/NextUpBar";
import { computeWorkoutProgress } from "@/lib/workoutProgress";
import { formatTime } from "@/lib/formatTime";
import {
  playSound,
  preloadSounds,
  startKeepAlive,
  stopKeepAlive,
} from "@/lib/playSound";
import { parseSpotifyLink } from "@/lib/spotify";
import * as spotifyApi from "@/lib/spotifyApi";
import type { Phase, WorkoutConfig } from "@/lib/timer";

const bgColor: Record<Phase, string> = {
  prepare: "bg-yellow-500",
  workout: "bg-emerald-600",
  rest: "bg-red-600",
  section_rest: "bg-blue-600",
  idle: "bg-slate-800",
};

const ringColor: Record<Phase, string> = {
  prepare: "#fef9c3",      // yellow-100
  workout: "#bbf7d0",       // emerald-200
  rest: "#fecaca",          // red-200
  section_rest: "#bfdbfe",  // blue-200
  idle: "rgba(255,255,255,0.4)",
};

export default function TimerScreen() {
  useOrientationLock("all");
  const router = useRouter();
  const { runningConfig } = useWorkoutContext();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const audioPrewarmed = useRef(false);
  const initRef = useRef(false);
  const { loggedIn, isPremium } = useSpotify();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const spotifyControlled =
    Boolean(runningConfig?.spotifyPlaylist) && loggedIn && isPremium;

  // Cues are driven by ticker transitions rather than a React effect: catching
  // up after the app was backgrounded collapses many phases into one render, so
  // an effect would see — and sound — at most one of them.
  function handleTransition(t: TimerTransition) {
    if (t.kind === "countdown") {
      playSound("clap");
      return;
    }
    if (t.kind === "complete") {
      playSound("alarm");
      stopKeepAlive().catch(() => {});
      if (spotifyControlled) spotifyApi.pausePlayback().catch(() => {});
      return;
    }
    const section = runningConfig?.sections[t.sectionIndex];
    playSound(section?.transitionSound ?? "beep");
  }

  const {
    state,
    start,
    pause,
    reset,
    restartSection,
    nextRound,
    previousRound,
    setConfig,
  } = useTimer(runningConfig ?? undefined, handleTransition);

  // Reaching /timer without a selection previously showed a phantom default
  // workout; send the user back to the library instead.
  useEffect(() => {
    if (!runningConfig) router.replace("/");
  }, [runningConfig, router]);

  // Initialize the timer with the running config on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (runningConfig) {
      setConfig(runningConfig);
    }
  }, [runningConfig, setConfig]);

  // Hold the audio session open (and the screen on) only while actually
  // running — otherwise an abandoned timer screen drains the battery.
  useEffect(() => {
    if (!state.isRunning) return;
    activateKeepAwakeAsync("timer").catch(() => {});
    startKeepAlive().catch(() => {});
    return () => {
      deactivateKeepAwake("timer").catch(() => {});
      stopKeepAlive().catch(() => {});
    };
  }, [state.isRunning]);

  const currentSection = state.config.sections[state.currentSectionIndex];
  const currentRound = currentSection?.rounds[state.currentRoundIndex];

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

  function handleStart() {
    if (!audioPrewarmed.current) {
      // Fire preload in parallel — don't block timer start
      preloadSounds().catch(() => {});
      audioPrewarmed.current = true;
    }
    if (state.phase === "idle") {
      // Fire Spotify in parallel — don't block timer
      openSpotifyForConfig(state.config).catch(() => {});
    } else if (spotifyControlled) {
      spotifyApi.resumePlayback().catch(() => {});
    }
    start();
  }

  function handlePause() {
    pause();
    if (spotifyControlled) {
      spotifyApi.pausePlayback().catch(() => {});
    }
  }

  function handleReset() {
    reset();
    if (spotifyControlled) {
      spotifyApi.pausePlayback().catch(() => {});
    }
  }

  const isIdle = state.phase === "idle";
  const totalSections = state.config.sections.length;
  const totalRoundsInSection = currentSection?.rounds.length ?? 0;
  const headerName = state.config.name || "WORKOUT TIMER";

  // Phase duration for ProgressRing fill
  let phaseDuration = currentRound?.workoutSeconds ?? 0;
  if (state.phase === "rest") phaseDuration = currentRound?.restSeconds ?? 0;
  else if (state.phase === "section_rest")
    phaseDuration = currentSection?.restBetweenSections ?? 0;
  else if (state.phase === "prepare")
    phaseDuration = state.config.prepareSeconds ?? 5;
  const progress =
    phaseDuration > 0
      ? Math.max(0, Math.min(1, 1 - state.secondsRemaining / phaseDuration))
      : 0;

  const shouldPulse =
    (state.phase === "workout" || state.phase === "prepare") &&
    state.isRunning &&
    state.secondsRemaining <= 5 &&
    state.secondsRemaining > 0;

  const progressInWorkout = computeWorkoutProgress(state);

  const ringSize = isLandscape
    ? Math.min(height * 0.78, width * 0.42)
    : Math.min(width * 0.82, 340);

  return (
    <SafeAreaView
      className={`flex-1 ${bgColor[state.phase]}`}
      edges={["top", "bottom"]}
    >
      <View
        className={`flex-1 ${
          isLandscape
            ? "flex-row items-center justify-around gap-6 px-6"
            : "items-center justify-center gap-6 px-4"
        }`}
      >
        {/* Ring slot */}
        <View
          className={
            isLandscape ? "shrink-0 items-center justify-center" : ""
          }
        >
          <ProgressRing
            progress={progress}
            size={ringSize}
            strokeWidth={12}
            activeColor={ringColor[state.phase]}
          >
            <TimerDisplay
              secondsRemaining={state.secondsRemaining}
              phase={state.phase}
              pulse={shouldPulse}
            />
          </ProgressRing>
        </View>

        {/* Info + controls slot */}
        <View
          className={
            isLandscape
              ? "flex-1 items-center gap-3 self-stretch py-4"
              : "items-center gap-3"
          }
          style={
            isLandscape
              ? { maxWidth: 380, justifyContent: "center" }
              : undefined
          }
        >
          <Text className="text-xl font-semibold uppercase tracking-wider text-white opacity-70">
            {headerName}
          </Text>

          {state.phase === "section_rest" && (() => {
            const nextSection =
              state.config.sections[state.currentSectionIndex + 1];
            return nextSection?.name ? (
              <Text className="text-lg font-medium text-white opacity-70">
                Up next: {nextSection.name}
              </Text>
            ) : null;
          })()}

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

          {!isIdle && state.phase !== "section_rest" && currentRound?.label && (
            <Text className="text-3xl font-bold text-white">
              {currentRound.label}
            </Text>
          )}

          {!isIdle && (
            <RepetitionCounter
              currentRound={state.currentRoundIndex + 1}
              totalRounds={totalRoundsInSection}
            />
          )}

          {!isIdle && progressInWorkout && (
            <Text
              className="text-xs font-medium text-white/60"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              Elapsed {formatTime(progressInWorkout.elapsedSeconds)} · Remaining{" "}
              {formatTime(progressInWorkout.remainingSeconds)}
            </Text>
          )}

          {!isIdle && <NextUpBar state={state} />}

          <TimerControls
            isRunning={state.isRunning}
            isIdle={isIdle}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onRestartSection={restartSection}
            onPreviousRound={previousRound}
            onNextRound={nextRound}
          />

          {isIdle && (
            <Pressable
              onPress={() => {
                reset();
                if (spotifyControlled) {
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
