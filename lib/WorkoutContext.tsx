import { createContext, useContext, useState, type ReactNode } from "react";
import type { WorkoutConfig } from "./timer";
import { createDefaultWorkout } from "./timer";

interface WorkoutContextValue {
  editingConfig: WorkoutConfig;
  editingId: string | undefined;
  setEditing: (config: WorkoutConfig, id?: string) => void;
  runningConfig: WorkoutConfig | null;
  setRunningConfig: (config: WorkoutConfig | null) => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [editingConfig, setEditingConfig] = useState<WorkoutConfig>(createDefaultWorkout);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [runningConfig, setRunningConfig] = useState<WorkoutConfig | null>(null);

  function setEditing(config: WorkoutConfig, id?: string) {
    setEditingConfig(config);
    setEditingId(id);
  }

  return (
    <WorkoutContext.Provider
      value={{
        editingConfig,
        editingId,
        setEditing,
        runningConfig,
        setRunningConfig,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkoutContext() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error("useWorkoutContext must be used within WorkoutProvider");
  }
  return ctx;
}
