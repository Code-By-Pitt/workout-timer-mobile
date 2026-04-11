export type Phase = "workout" | "rest" | "section_rest" | "idle";

export type TransitionSound = "beep" | "bell" | "chime" | "buzzer";

export const TRANSITION_SOUNDS: { id: TransitionSound; label: string }[] = [
  { id: "beep", label: "Beep" },
  { id: "bell", label: "Bell" },
  { id: "chime", label: "Chime" },
  { id: "buzzer", label: "Buzzer" },
];

export interface Round {
  label: string;
  workoutSeconds: number;
  restSeconds: number;
}

export interface Section {
  name: string;
  transitionSound: TransitionSound;
  rounds: Round[];
  restBetweenSections: number;
}

export interface WorkoutConfig {
  name: string;
  sections: Section[];
}

export interface TimerState {
  phase: Phase;
  secondsRemaining: number;
  currentSectionIndex: number;
  currentRoundIndex: number;
  isRunning: boolean;
  config: WorkoutConfig;
}

export type TimerAction =
  | { type: "TICK" }
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESET" }
  | { type: "RESTART_SECTION" }
  | { type: "SET_CONFIG"; payload: WorkoutConfig };

export interface SavedWorkout {
  id: string;
  config: WorkoutConfig;
  createdAt: number;
  updatedAt: number;
}

// Helpers
export function createDefaultRound(workoutSeconds = 40, restSeconds = 20): Round {
  return { label: "", workoutSeconds, restSeconds };
}

export function createDefaultSection(): Section {
  return {
    name: "",
    transitionSound: "beep",
    rounds: [createDefaultRound()],
    restBetweenSections: 60,
  };
}

export function createDefaultWorkout(): WorkoutConfig {
  return {
    name: "",
    sections: [createDefaultSection()],
  };
}
