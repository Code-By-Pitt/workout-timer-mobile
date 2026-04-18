import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";

export default function LoginScreen() {
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (isSignUp) {
      const err = await signUp(email, password);
      if (err) {
        setError(err);
      } else {
        setMessage("Check your email to confirm your account");
      }
    } else {
      const err = await signIn(email, password);
      if (err) {
        setError(err);
      }
    }
    setSubmitting(false);
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-slate-800 px-6">
      <View className="w-full max-w-sm gap-6">
        <Text className="text-center text-3xl font-bold text-white">
          Workout Timer
        </Text>
        <Text className="text-center text-sm text-white/50">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </Text>

        {/* Google sign-in */}
        <Pressable
          onPress={signInWithGoogle}
          className="flex-row items-center justify-center gap-3 rounded-xl bg-white py-3 active:bg-white/90"
        >
          <Text className="text-base font-semibold text-slate-800">
            Continue with Google
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-white/20" />
          <Text className="text-xs text-white/40">or</Text>
          <View className="h-px flex-1 bg-white/20" />
        </View>

        {/* Email/password */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />

        {error && <Text className="text-sm text-red-400">{error}</Text>}
        {message && (
          <Text className="text-sm text-emerald-400">{message}</Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-emerald-600 py-3 active:bg-emerald-700"
          style={submitting ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-center text-base font-semibold text-white">
            {submitting ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setMessage(null);
          }}
        >
          <Text className="text-center text-sm text-white/50">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text className="font-medium text-white underline">
              {isSignUp ? "Sign In" : "Sign Up"}
            </Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
