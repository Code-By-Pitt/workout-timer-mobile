import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
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

interface WorkoutStorageValue {
  workouts: SavedWorkout[];
  loaded: boolean;
  save: (config: WorkoutConfig, existingId?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const WorkoutStorageContext = createContext<WorkoutStorageValue | null>(null);

export function WorkoutStorageProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadAll().then((items) => {
      setWorkouts(items);
      setLoaded(true);
    });
  }, []);

  const save = useCallback(
    async (config: WorkoutConfig, existingId?: string): Promise<void> => {
      // Use functional setState to avoid stale closures
      return new Promise((resolve) => {
        setWorkouts((current) => {
          const now = Date.now();
          let updated: SavedWorkout[];
          if (existingId) {
            updated = current.map((w) =>
              w.id === existingId ? { ...w, config, updatedAt: now } : w
            );
          } else {
            const newWorkout: SavedWorkout = {
              id: generateId(),
              config,
              createdAt: now,
              updatedAt: now,
            };
            updated = [newWorkout, ...current];
          }
          saveAll(updated).then(resolve);
          return updated;
        });
      });
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setWorkouts((current) => {
        const updated = current.filter((w) => w.id !== id);
        saveAll(updated).then(resolve);
        return updated;
      });
    });
  }, []);

  return (
    <WorkoutStorageContext.Provider value={{ workouts, loaded, save, remove }}>
      {children}
    </WorkoutStorageContext.Provider>
  );
}

export function useWorkoutStorage(): WorkoutStorageValue {
  const ctx = useContext(WorkoutStorageContext);
  if (!ctx) {
    throw new Error(
      "useWorkoutStorage must be used within WorkoutStorageProvider"
    );
  }
  return ctx;
}
