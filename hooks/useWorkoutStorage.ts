import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedWorkout, WorkoutConfig } from "@/lib/timer";

const STORAGE_KEY = "workout-timer-workouts";

function migrateConfig(config: WorkoutConfig): WorkoutConfig {
  return {
    ...config,
    sections: config.sections.map((s) => ({
      ...s,
      restBetweenSections: s.restBetweenSections ?? 60,
    })),
  };
}

async function loadAll(): Promise<SavedWorkout[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: SavedWorkout[] = JSON.parse(raw);
    return parsed.map((w) => ({ ...w, config: migrateConfig(w.config) }));
  } catch {
    return [];
  }
}

async function saveAll(workouts: SavedWorkout[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useWorkoutStorage() {
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadAll().then((items) => {
      setWorkouts(items);
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (config: WorkoutConfig, existingId?: string) => {
    const now = Date.now();
    let updated: SavedWorkout[];
    if (existingId) {
      updated = workouts.map((w) =>
        w.id === existingId ? { ...w, config, updatedAt: now } : w
      );
    } else {
      const newWorkout: SavedWorkout = {
        id: generateId(),
        config,
        createdAt: now,
        updatedAt: now,
      };
      updated = [newWorkout, ...workouts];
    }
    setWorkouts(updated);
    await saveAll(updated);
  }, [workouts]);

  const remove = useCallback(async (id: string) => {
    const updated = workouts.filter((w) => w.id !== id);
    setWorkouts(updated);
    await saveAll(updated);
  }, [workouts]);

  return { workouts, save, remove, loaded };
}
