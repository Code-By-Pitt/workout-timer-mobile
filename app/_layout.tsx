import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WorkoutProvider } from "@/lib/WorkoutContext";
import { WorkoutStorageProvider } from "@/hooks/useWorkoutStorage";
import { SpotifyProvider } from "@/hooks/useSpotify";

export default function RootLayout() {
  return (
    <SpotifyProvider>
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
    </SpotifyProvider>
  );
}
