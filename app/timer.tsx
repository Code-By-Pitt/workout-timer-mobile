import { useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useTimer } from "@/hooks/useTimer";
import { useWorkoutContext } from "@/lib/WorkoutContext";
import { TimerDisplay } from "@/components/TimerDisplay";
import { TimerControls } from "@/components/TimerControls";
import { RepetitionCounter } from "@/components/RepetitionCounter";
import { playSound, preloadSounds } from "@/lib/playSound";
import type { Phase } from "@/lib/timer";

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

  async function handleStart() {
    if (!audioPrewarmed.current) {
      await preloadSounds();
      audioPrewarmed.current = true;
    }
    start();
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
          onPause={pause}
          onReset={reset}
          onRestartSection={restartSection}
        />

        {isIdle && (
          <Pressable
            onPress={() => {
              reset();
              router.back();
            }}
            className="mt-4"
          >
            <Text className="text-sm text-white/50">← Back to Workouts</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
