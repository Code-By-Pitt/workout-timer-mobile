import type { TimerState } from "./timer";
import { computeTotalSeconds } from "./workoutSummary";

export interface WorkoutProgress {
  elapsedSeconds: number;
  remainingSeconds: number;
  totalSeconds: number;
}

export function computeWorkoutProgress(state: TimerState): WorkoutProgress | null {
  if (state.phase === "idle") return null;

  const { config, currentSectionIndex, currentRoundIndex, phase, secondsRemaining } = state;
  const totalSeconds = computeTotalSeconds(config);

  let completed = 0;

  const prep = config.prepareSeconds ?? 5;
  if (phase !== "prepare") completed += prep;

  for (let s = 0; s < currentSectionIndex; s++) {
    const section = config.sections[s];
    for (const round of section.rounds) {
      completed += round.workoutSeconds + round.restSeconds;
    }
    completed += section.restBetweenSections;
  }

  const currentSection = config.sections[currentSectionIndex];

  if (currentSection) {
    for (let r = 0; r < currentRoundIndex; r++) {
      const round = currentSection.rounds[r];
      completed += round.workoutSeconds + round.restSeconds;
    }
  }

  const currentRound = currentSection?.rounds[currentRoundIndex];
  if (phase === "rest" && currentRound) {
    completed += currentRound.workoutSeconds;
  }

  let currentPhaseDuration = 0;
  if (phase === "prepare") currentPhaseDuration = prep;
  else if (phase === "workout") currentPhaseDuration = currentRound?.workoutSeconds ?? 0;
  else if (phase === "rest") currentPhaseDuration = currentRound?.restSeconds ?? 0;
  else if (phase === "section_rest")
    currentPhaseDuration = currentSection?.restBetweenSections ?? 0;

  const currentPhaseElapsed = Math.max(
    0,
    currentPhaseDuration - secondsRemaining
  );

  const elapsedSeconds = completed + currentPhaseElapsed;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  return { elapsedSeconds, remainingSeconds, totalSeconds };
}
