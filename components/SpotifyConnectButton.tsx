import { View, Text, Pressable } from "react-native";
import { useSpotify } from "@/hooks/useSpotify";

export function SpotifyConnectButton() {
  const { loggedIn, user, loading, connect, logout } = useSpotify();

  if (loading) {
    return (
      <View className="rounded-xl bg-white/10 px-4 py-2">
        <Text className="text-xs text-white/60">Checking Spotify…</Text>
      </View>
    );
  }

  if (loggedIn && user) {
    return (
      <View className="flex-row items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-2">
        <Text className="flex-1 text-xs text-white/70">
          Spotify:{" "}
          <Text className="text-white">{user.display_name ?? user.id}</Text>
          {user.product === "free" && (
            <Text className="ml-2 text-amber-300"> Free</Text>
          )}
        </Text>
        <Pressable onPress={logout}>
          <Text className="text-xs text-white/50">Disconnect</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={connect}
      className="flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 active:bg-emerald-700"
    >
      <Text className="text-sm font-semibold text-white">
        🎵 Connect Spotify
      </Text>
    </Pressable>
  );
}
