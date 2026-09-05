import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { View, Text } from "react-native";
import { WorkoutProvider } from "@/lib/WorkoutContext";
import { WorkoutStorageProvider } from "@/hooks/useWorkoutStorage";
import { SpotifyProvider } from "@/hooks/useSpotify";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user, loading, pendingPasswordReset } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // A recovery link signs the user in; send them straight to setting a new
  // password rather than dropping them in the library.
  useEffect(() => {
    if (user && pendingPasswordReset) router.replace("/reset-password");
  }, [user, pendingPasswordReset, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-800">
        <Text className="text-white/50">Loading...</Text>
      </View>
    );
  }

  // The navigator stays mounted signed-in or not, so an auth deep link always
  // has somewhere to land.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#1e293b" },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" />
        <Stack.Screen name="editor" />
        <Stack.Screen name="timer" />
        <Stack.Screen name="account" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <SpotifyProvider>
        <WorkoutStorageProvider>
          <WorkoutProvider>
            <AppContent />
          </WorkoutProvider>
        </WorkoutStorageProvider>
      </SpotifyProvider>
    </AuthProvider>
  );
}
