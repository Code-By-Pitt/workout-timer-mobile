export type Phase = "prepare" | "workout" | "rest" | "section_rest" | "idle";

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

export interface SpotifyPlaylistRef {
  id: string;
  uri: string;
  name: string;
  imageUrl?: string;
  trackCount?: number;
}

export interface WorkoutConfig {
  name: string;
  sections: Section[];
  prepareSeconds?: number;
  spotifyUrl?: string;
  spotifyPlaylist?: SpotifyPlaylistRef;
}

export interface TimerState {
  phase: Phase;
  secondsRemaining: number;
  currentSectionIndex: number;
  currentRoundIndex: number;
  isRunning: boolean;
  config: WorkoutConfig;
  /**
   * Absolute epoch-ms deadline for the current phase, or null when paused/idle.
   * This is the source of truth for elapsed time — `secondsRemaining` is
   * derived from it — so the timer stays correct across suspension.
   */
  phaseEndsAt: number | null;
}

export type TimerAction =
  | { type: "SYNC"; state: TimerState }
  | { type: "START"; now: number }
  | { type: "PAUSE" }
  | { type: "RESET" }
  | { type: "RESTART_SECTION"; now: number }
  | { type: "NEXT_ROUND"; now: number }
  | { type: "PREVIOUS_ROUND"; now: number }
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
    prepareSeconds: 5,
  };
}
