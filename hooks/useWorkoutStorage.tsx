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
  /** Set when the initial load failed, so the UI can distinguish that from an empty library. */
  loadError: string | null;
  reload: () => Promise<void>;
  /** Rejects on failure — callers must not treat a resolved promise as optional. */
  save: (config: WorkoutConfig, existingId?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const WorkoutStorageContext = createContext<WorkoutStorageValue | null>(null);

export function WorkoutStorageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      // Leave any previously loaded workouts on screen rather than implying
      // the library is empty.
      setLoadError("Couldn't load your workouts. Check your connection.");
    } else {
      setLoadError(null);
      setWorkouts(
        (data ?? []).map((row) => ({
          id: row.id,
          config: row.config as WorkoutConfig,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
        }))
      );
    }
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setLoaded(false);
      setLoadError(null);
      return;
    }
    (async () => {
      await migrateLocalWorkouts(user.id);
      await load();
    })();
  }, [user, load]);

  const save = useCallback(
    async (config: WorkoutConfig, existingId?: string): Promise<void> => {
      if (!user) throw new Error("You're signed out. Sign in and try again.");

      if (existingId) {
        const { error } = await supabase
          .from("workouts")
          .update({
            name: config.name,
            config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId)
          // Belt-and-braces alongside RLS: never let an id alone authorize a write.
          .eq("user_id", user.id);

        if (error) throw new Error("Couldn't save your changes. Please try again.");

        setWorkouts((prev) =>
          prev.map((w) =>
            w.id === existingId ? { ...w, config, updatedAt: Date.now() } : w
          )
        );
      } else {
        const { data, error } = await supabase
          .from("workouts")
          .insert({ user_id: user.id, name: config.name, config })
          .select()
          .single();

        if (error || !data) {
          throw new Error("Couldn't save your workout. Please try again.");
        }

        setWorkouts((prev) => [
          {
            id: data.id,
            config,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime(),
          },
          ...prev,
        ]);
      }
    },
    [user]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!user) throw new Error("You're signed out. Sign in and try again.");

      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error("Couldn't delete that workout. Please try again.");

      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    },
    [user]
  );

  return (
    <WorkoutStorageContext.Provider
      value={{ workouts, loaded, loadError, reload: load, save, remove }}
    >
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
