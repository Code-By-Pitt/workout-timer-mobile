import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useOrientationLock } from "@/hooks/useOrientationLock";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen() {
  useOrientationLock("portrait");
  const router = useRouter();
  const { updatePassword, clearPendingPasswordReset } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    const err = await updatePassword(password);
    setSubmitting(false);
    if (err) setError(err);
    else router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-slate-800 px-6">
      <View className="w-full max-w-sm gap-6">
        <Text className="text-center text-3xl font-bold text-white">
          Set a new password
        </Text>
        <Text className="text-center text-sm text-white/50">
          Choose a new password for your account.
        </Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry
          autoCapitalize="none"
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirm new password"
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry
          autoCapitalize="none"
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />

        {error && <Text className="text-sm text-red-400">{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-emerald-600 py-3 active:bg-emerald-700"
          style={submitting ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-center text-base font-semibold text-white">
            {submitting ? "..." : "Update Password"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            clearPendingPasswordReset();
            router.replace("/");
          }}
        >
          <Text className="text-center text-sm text-white/50">Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
