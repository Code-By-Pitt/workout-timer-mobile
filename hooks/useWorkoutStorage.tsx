import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { SavedWorkout, WorkoutConfig } from "@/lib/timer";

const LOCAL_STORAGE_KEY = "workout-timer-workouts";

interface WorkoutStorageValue {
  workouts: SavedWorkout[];
  loaded: boolean;
  save: (config: WorkoutConfig, existingId?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const WorkoutStorageContext = createContext<WorkoutStorageValue | null>(null);

export function WorkoutStorageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadAndMigrate() {
      await migrateLocalWorkouts(user!.id);

      const { data } = await supabase
        .from("workouts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (data) {
        setWorkouts(
          data.map((row) => ({
            id: row.id,
            config: row.config as WorkoutConfig,
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime(),
          }))
        );
      }
      setLoaded(true);
    }

    loadAndMigrate();
  }, [user]);

  const save = useCallback(
    async (config: WorkoutConfig, existingId?: string): Promise<void> => {
      if (!user) return;

      if (existingId) {
        const { error } = await supabase
          .from("workouts")
          .update({
            name: config.name,
            config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);

        if (!error) {
          setWorkouts((prev) =>
            prev.map((w) =>
              w.id === existingId
                ? { ...w, config, updatedAt: Date.now() }
                : w
            )
          );
        }
      } else {
        const { data, error } = await supabase
          .from("workouts")
          .insert({
            user_id: user.id,
            name: config.name,
            config,
          })
          .select()
          .single();

        if (!error && data) {
          const newWorkout: SavedWorkout = {
            id: data.id,
            config,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime(),
          };
          setWorkouts((prev) => [newWorkout, ...prev]);
        }
      }
    },
    [user]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;

      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id);

      if (!error) {
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
      }
    },
    [user]
  );

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

async function migrateLocalWorkouts(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;

    const localWorkouts: SavedWorkout[] = JSON.parse(raw);
    if (!localWorkouts.length) {
      await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    const rows = localWorkouts.map((w) => ({
      user_id: userId,
      name: w.config.name,
      config: w.config,
      created_at: new Date(w.createdAt).toISOString(),
      updated_at: new Date(w.updatedAt).toISOString(),
    }));

    const { error } = await supabase.from("workouts").insert(rows);
    if (!error) {
      await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // Don't block on migration errors
  }
}
