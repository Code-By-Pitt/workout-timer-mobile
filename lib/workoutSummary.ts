import type { WorkoutConfig } from "./timer";

/**
 * Total seconds for a workout: prepare + sum of (work + rest) per round +
 * section rest between sections (no rest after the final section).
 */
export function computeTotalSeconds(config: WorkoutConfig): number {
  const prepare = config.prepareSeconds ?? 5;
  let total = prepare;
  for (let i = 0; i < config.sections.length; i++) {
    const section = config.sections[i];
    for (const round of section.rounds) {
      total += round.workoutSeconds + round.restSeconds;
    }
    if (i < config.sections.length - 1) {
      total += section.restBetweenSections;
    }
  }
  return total;
}
