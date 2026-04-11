import { useReducer, useEffect, useRef, useCallback } from "react";
import type { TimerState, TimerAction, WorkoutConfig, Phase } from "@/lib/timer";
import { createDefaultWorkout } from "@/lib/timer";

function getCurrentRound(state: TimerState) {
  const section = state.config.sections[state.currentSectionIndex];
  return section?.rounds[state.currentRoundIndex];
}

function createInitialState(config: WorkoutConfig): TimerState {
  const firstRound = config.sections[0]?.rounds[0];
  return {
    phase: "idle",
    secondsRemaining: firstRound?.workoutSeconds ?? 0,
    currentSectionIndex: 0,
    currentRoundIndex: 0,
    isRunning: false,
    config,
  };
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "START": {
      if (state.phase === "idle") {
        const round = getCurrentRound(state);
        if (!round) return state;
        return {
          ...state,
          phase: "workout",
          secondsRemaining: round.workoutSeconds,
          currentSectionIndex: 0,
          currentRoundIndex: 0,
          isRunning: true,
        };
      }
      return { ...state, isRunning: true };
    }

    case "PAUSE":
      return { ...state, isRunning: false };

    case "RESET":
      return createInitialState(state.config);

    case "RESTART_SECTION": {
      const section = state.config.sections[state.currentSectionIndex];
      const firstRound = section?.rounds[0];
      if (!firstRound) return state;
      return {
        ...state,
        phase: "workout",
        secondsRemaining: firstRound.workoutSeconds,
        currentRoundIndex: 0,
        isRunning: true,
      };
    }

    case "SET_CONFIG":
      return createInitialState(action.payload);

    case "TICK": {
      if (!state.isRunning) return state;

      const next = state.secondsRemaining - 1;
      if (next > 0) {
        return { ...state, secondsRemaining: next };
      }

      const round = getCurrentRound(state);
      if (!round) return createInitialState(state.config);

      if (state.phase === "workout") {
        if (round.restSeconds > 0) {
          return {
            ...state,
            phase: "rest" as Phase,
            secondsRemaining: round.restSeconds,
          };
        }
        return advanceToNext(state);
      }

      if (state.phase === "rest") {
        return advanceToNext(state);
      }

      if (state.phase === "section_rest") {
        const nextSectionIndex = state.currentSectionIndex + 1;
        const nextSection = state.config.sections[nextSectionIndex];
        const nextRound = nextSection?.rounds[0];
        if (!nextRound) return createInitialState(state.config);
        return {
          ...state,
          phase: "workout",
          secondsRemaining: nextRound.workoutSeconds,
          currentSectionIndex: nextSectionIndex,
          currentRoundIndex: 0,
        };
      }

      return state;
    }

    default:
      return state;
  }
}

function advanceToNext(state: TimerState): TimerState {
  const { config, currentSectionIndex, currentRoundIndex } = state;
  const section = config.sections[currentSectionIndex];

  if (currentRoundIndex + 1 < section.rounds.length) {
    const nextRound = section.rounds[currentRoundIndex + 1];
    return {
      ...state,
      phase: "workout",
      secondsRemaining: nextRound.workoutSeconds,
      currentRoundIndex: currentRoundIndex + 1,
    };
  }

  if (currentSectionIndex + 1 < config.sections.length) {
    if (section.restBetweenSections > 0) {
      return {
        ...state,
        phase: "section_rest",
        secondsRemaining: section.restBetweenSections,
      };
    }
    const nextSection = config.sections[currentSectionIndex + 1];
    const nextRound = nextSection.rounds[0];
    return {
      ...state,
      phase: "workout",
      secondsRemaining: nextRound.workoutSeconds,
      currentSectionIndex: currentSectionIndex + 1,
      currentRoundIndex: 0,
    };
  }

  return { ...createInitialState(state.config), phase: "idle" };
}

export function useTimer(initialConfig?: WorkoutConfig) {
  const config = initialConfig ?? createDefaultWorkout();
  const [state, dispatch] = useReducer(timerReducer, config, createInitialState);
  const prevPhaseRef = useRef<Phase>(state.phase);
  const prevSectionRef = useRef(0);
  const prevRoundRef = useRef(0);

  const phaseChanged = prevPhaseRef.current !== state.phase;
  const previousPhase = prevPhaseRef.current;
  const sectionChanged = prevSectionRef.current !== state.currentSectionIndex;

  useEffect(() => {
    prevPhaseRef.current = state.phase;
    prevSectionRef.current = state.currentSectionIndex;
    prevRoundRef.current = state.currentRoundIndex;
  }, [state.phase, state.currentSectionIndex, state.currentRoundIndex]);

  // Interval-based tick with drift protection
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (state.isRunning) {
      lastTickRef.current = Date.now();
      tickRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        const ticks = Math.max(1, Math.floor(elapsed / 1000));
        lastTickRef.current = now;
        for (let i = 0; i < ticks; i++) {
          dispatch({ type: "TICK" });
        }
      }, 1000);
    }
    return () => {
      if (tickRef.current !== null) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [state.isRunning]);

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const restartSection = useCallback(() => dispatch({ type: "RESTART_SECTION" }), []);
  const setConfig = useCallback(
    (c: WorkoutConfig) => dispatch({ type: "SET_CONFIG", payload: c }),
    []
  );

  return {
    state,
    start,
    pause,
    reset,
    restartSection,
    setConfig,
    phaseChanged,
    previousPhase,
    sectionChanged,
  };
}
