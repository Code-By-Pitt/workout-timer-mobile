import { useReducer, useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import type { TimerState, TimerAction, WorkoutConfig, Phase } from "@/lib/timer";
import { createDefaultWorkout } from "@/lib/timer";

/** Seconds remaining in a work phase at which the countdown cue fires. */
const COUNTDOWN_SECONDS = 10;

/**
 * Emitted by the ticker for every boundary the clock crosses — including ones
 * crossed while the app was backgrounded and catching up. Consumers use these
 * to play cues; a React effect cannot, because catch-up collapses many
 * intermediate states into a single render.
 */
export type TimerTransition =
  | { kind: "phase"; from: Phase; to: Phase; sectionIndex: number }
  | { kind: "countdown" }
  | { kind: "complete" };

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
    phaseEndsAt: null,
  };
}

/**
 * Anchor the current phase to an absolute wall-clock deadline. Everything the
 * UI shows is derived from this, so the timer cannot drift and survives the JS
 * thread being suspended.
 */
function withDeadline(state: TimerState, now: number): TimerState {
  return {
    ...state,
    phaseEndsAt: state.isRunning ? now + state.secondsRemaining * 1000 : null,
  };
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    // Result of the ticker's catch-up computation, already fully resolved.
    case "SYNC":
      return action.state;

    case "START": {
      if (state.phase === "idle") {
        const round = getCurrentRound(state);
        if (!round) return state;
        const prepSeconds = state.config.prepareSeconds ?? 5;
        return withDeadline(
          {
            ...state,
            phase: prepSeconds > 0 ? "prepare" : "workout",
            secondsRemaining: prepSeconds > 0 ? prepSeconds : round.workoutSeconds,
            currentSectionIndex: 0,
            currentRoundIndex: 0,
            isRunning: true,
          },
          action.now
        );
      }
      return withDeadline({ ...state, isRunning: true }, action.now);
    }

    case "PAUSE":
      // Freeze on the already-derived secondsRemaining; dropping the deadline
      // is what stops the clock.
      return { ...state, isRunning: false, phaseEndsAt: null };

    case "RESET":
      return createInitialState(state.config);

    case "RESTART_SECTION": {
      const section = state.config.sections[state.currentSectionIndex];
      const firstRound = section?.rounds[0];
      if (!firstRound) return state;
      return withDeadline(
        {
          ...state,
          phase: "workout",
          secondsRemaining: firstRound.workoutSeconds,
          currentRoundIndex: 0,
          isRunning: true,
        },
        action.now
      );
    }

    case "NEXT_ROUND": {
      const { config, currentSectionIndex, currentRoundIndex } = state;
      const section = config.sections[currentSectionIndex];
      if (!section) return state;
      if (currentRoundIndex + 1 < section.rounds.length) {
        const nextRound = section.rounds[currentRoundIndex + 1];
        return withDeadline(
          {
            ...state,
            phase: "workout",
            secondsRemaining: nextRound.workoutSeconds,
            currentRoundIndex: currentRoundIndex + 1,
          },
          action.now
        );
      }
      if (currentSectionIndex + 1 < config.sections.length) {
        const nextSection = config.sections[currentSectionIndex + 1];
        const nextRound = nextSection.rounds[0];
        if (!nextRound) return state;
        return withDeadline(
          {
            ...state,
            phase: "workout",
            secondsRemaining: nextRound.workoutSeconds,
            currentSectionIndex: currentSectionIndex + 1,
            currentRoundIndex: 0,
          },
          action.now
        );
      }
      return createInitialState(state.config);
    }

    case "PREVIOUS_ROUND": {
      const { config, currentSectionIndex, currentRoundIndex } = state;
      const section = config.sections[currentSectionIndex];
      if (!section) return state;
      if (currentRoundIndex > 0) {
        const prevRound = section.rounds[currentRoundIndex - 1];
        return withDeadline(
          {
            ...state,
            phase: "workout",
            secondsRemaining: prevRound.workoutSeconds,
            currentRoundIndex: currentRoundIndex - 1,
          },
          action.now
        );
      }
      if (currentSectionIndex > 0) {
        const prevSection = config.sections[currentSectionIndex - 1];
        const prevRound = prevSection.rounds[prevSection.rounds.length - 1];
        if (!prevRound) return state;
        return withDeadline(
          {
            ...state,
            phase: "workout",
            secondsRemaining: prevRound.workoutSeconds,
            currentSectionIndex: currentSectionIndex - 1,
            currentRoundIndex: prevSection.rounds.length - 1,
          },
          action.now
        );
      }
      const firstRound = section.rounds[0];
      if (!firstRound) return state;
      return withDeadline(
        { ...state, phase: "workout", secondsRemaining: firstRound.workoutSeconds },
        action.now
      );
    }

    case "SET_CONFIG":
      return createInitialState(action.payload);

    default:
      return state;
  }
}

/** The state the timer moves into once the current phase's time is up. */
function nextPhaseState(state: TimerState): TimerState {
  const round = getCurrentRound(state);
  if (!round) return createInitialState(state.config);

  if (state.phase === "prepare") {
    return { ...state, phase: "workout", secondsRemaining: round.workoutSeconds };
  }

  if (state.phase === "workout") {
    if (round.restSeconds > 0) {
      return { ...state, phase: "rest", secondsRemaining: round.restSeconds };
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

  return createInitialState(state.config);
}

/** Runaway guard for pathological configs (e.g. every duration zero). */
const MAX_CATCHUP_STEPS = 10000;

/**
 * Pure catch-up: walk the state forward to `now`, collecting every boundary
 * crossed on the way. Each new phase's deadline chains off the *previous*
 * deadline rather than `now`, so no rounding error accumulates.
 */
export function advance(
  state: TimerState,
  now: number
): { next: TimerState; transitions: TimerTransition[] } {
  const transitions: TimerTransition[] = [];
  if (!state.isRunning || state.phaseEndsAt == null) {
    return { next: state, transitions };
  }

  let cur = state;
  let steps = 0;

  while (cur.phaseEndsAt != null && now >= cur.phaseEndsAt && steps++ < MAX_CATCHUP_STEPS) {
    const from = cur.phase;
    const deadline = cur.phaseEndsAt;
    const stepped = nextPhaseState(cur);

    if (stepped.phase === "idle") {
      transitions.push({ kind: "complete" });
      cur = { ...stepped, isRunning: false, phaseEndsAt: null };
      break;
    }

    transitions.push({
      kind: "phase",
      from,
      to: stepped.phase,
      sectionIndex: stepped.currentSectionIndex,
    });
    cur = { ...stepped, phaseEndsAt: deadline + stepped.secondsRemaining * 1000 };
  }

  if (cur.phaseEndsAt != null) {
    const remaining = Math.max(0, Math.ceil((cur.phaseEndsAt - now) / 1000));
    // Fire the countdown cue when we cross the threshold from above, so a
    // catch-up that jumps straight past it still gets one.
    if (
      cur.phase === "workout" &&
      state.phase === "workout" &&
      cur.currentRoundIndex === state.currentRoundIndex &&
      cur.currentSectionIndex === state.currentSectionIndex &&
      state.secondsRemaining > COUNTDOWN_SECONDS &&
      remaining <= COUNTDOWN_SECONDS &&
      remaining > 0
    ) {
      transitions.push({ kind: "countdown" });
    }
    cur = { ...cur, secondsRemaining: remaining };
  }

  return { next: cur, transitions };
}

export function useTimer(
  initialConfig?: WorkoutConfig,
  onTransition?: (transition: TimerTransition) => void
) {
  const config = initialConfig ?? createDefaultWorkout();
  const [state, dispatch] = useReducer(timerReducer, config, createInitialState);

  // Held in a ref so an inline callback doesn't restart the ticker each render.
  const onTransitionRef = useRef(onTransition);
  useEffect(() => {
    onTransitionRef.current = onTransition;
  }, [onTransition]);

  // The ticker reads state through a ref so the interval is created once per
  // run/pause rather than being torn down and rebuilt every second.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const sync = useCallback(() => {
    const { next, transitions } = advance(stateRef.current, Date.now());
    if (transitions.length > 0) {
      for (const t of transitions) onTransitionRef.current?.(t);
    }
    if (next !== stateRef.current) {
      stateRef.current = next;
      dispatch({ type: "SYNC", state: next });
    }
  }, []);

  useEffect(() => {
    if (!state.isRunning) return;
    // 250ms keeps the displayed second in step with wall time; the work per
    // tick is a subtraction unless a boundary is actually crossed.
    const id = setInterval(sync, 250);
    return () => clearInterval(id);
  }, [state.isRunning, sync]);

  // Reconcile immediately on foreground instead of waiting for the next tick.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") sync();
    });
    return () => sub.remove();
  }, [sync]);

  const start = useCallback(() => dispatch({ type: "START", now: Date.now() }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const restartSection = useCallback(
    () => dispatch({ type: "RESTART_SECTION", now: Date.now() }),
    []
  );
  const nextRound = useCallback(
    () => dispatch({ type: "NEXT_ROUND", now: Date.now() }),
    []
  );
  const previousRound = useCallback(
    () => dispatch({ type: "PREVIOUS_ROUND", now: Date.now() }),
    []
  );
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
    nextRound,
    previousRound,
    setConfig,
  };
}
