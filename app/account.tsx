import { useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useOrientationLock } from "@/hooks/useOrientationLock";
import { openPrivacyPolicy } from "@/lib/privacy";

export default function AccountScreen() {
  useOrientationLock("portrait");
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    // Two steps on purpose: this is irreversible and wipes saved workouts.
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, all saved workouts, and your Spotify connection. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Are you absolutely sure?",
              "There is no way to recover your data after this.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete my account",
                  style: "destructive",
                  onPress: runDelete,
                },
              ]
            ),
        },
      ]
    );
  }

  async function runDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      // signOut inside deleteAccount clears the session, which unmounts this
      // screen via the auth guard.
    } catch (e) {
      setDeleting(false);
      Alert.alert(
        "Delete failed",
        e instanceof Error ? e.message : "Please try again."
      );
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-800" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between border-b border-white/10 px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm text-white/60">← Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-white">Account</Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
        <View className="gap-1">
          <Text className="text-xs uppercase tracking-wider text-white/40">
            Signed in as
          </Text>
          <Text className="text-base text-white">{user?.email ?? "—"}</Text>
        </View>

        <View className="gap-3">
          <Pressable
            onPress={() => openPrivacyPolicy()}
            className="rounded-xl bg-white/10 px-4 py-3 active:bg-white/20"
          >
            <Text className="text-base text-white">Privacy Policy</Text>
          </Pressable>

          <Pressable
            onPress={signOut}
            className="rounded-xl bg-white/10 px-4 py-3 active:bg-white/20"
          >
            <Text className="text-base text-white">Sign Out</Text>
          </Pressable>
        </View>

        <View className="gap-2 border-t border-white/10 pt-6">
          <Text className="text-xs uppercase tracking-wider text-white/40">
            Danger zone
          </Text>
          <Text className="text-sm text-white/50">
            Deleting your account permanently removes your saved workouts and
            disconnects Spotify. This cannot be undone.
          </Text>
          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            className={`mt-2 rounded-xl px-4 py-3 ${
              deleting ? "bg-red-600/40" : "bg-red-600 active:bg-red-700"
            }`}
          >
            <Text className="text-center text-base font-semibold text-white">
              {deleting ? "Deleting…" : "Delete Account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
