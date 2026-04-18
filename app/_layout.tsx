import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text } from "react-native";
import { WorkoutProvider } from "@/lib/WorkoutContext";
import { WorkoutStorageProvider } from "@/hooks/useWorkoutStorage";
import { SpotifyProvider } from "@/hooks/useSpotify";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import LoginScreen from "./login";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-800">
        <Text className="text-white/50">Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SpotifyProvider>
      <WorkoutStorageProvider>
        <WorkoutProvider>
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

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppContent />
    </AuthProvider>
  );
}
