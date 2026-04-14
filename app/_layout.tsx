import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WorkoutProvider } from "@/lib/WorkoutContext";
import { WorkoutStorageProvider } from "@/hooks/useWorkoutStorage";

export default function RootLayout() {
  return (
    <WorkoutStorageProvider>
      <WorkoutProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#1e293b" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="editor" />
          <Stack.Screen name="timer" />
        </Stack>
      </WorkoutProvider>
    </WorkoutStorageProvider>
  );
}
