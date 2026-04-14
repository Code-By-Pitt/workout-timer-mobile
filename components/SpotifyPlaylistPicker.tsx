import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPlaylists, type SpotifyPlaylist } from "@/lib/spotifyApi";
import type { SpotifyPlaylistRef } from "@/lib/timer";

interface Props {
  visible: boolean;
  onSelect: (playlist: SpotifyPlaylistRef) => void;
  onClose: () => void;
}

export function SpotifyPlaylistPicker({ visible, onSelect, onClose }: Props) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    getPlaylists()
      .then(setPlaylists)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, search]);

  function handlePick(p: SpotifyPlaylist) {
    const ref: SpotifyPlaylistRef = {
      id: p.id,
      uri: p.uri,
      name: p.name,
      imageUrl: p.images?.[0]?.url,
      trackCount: p.tracks?.total,
    };
    onSelect(ref);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-slate-900" edges={["top", "bottom"]}>
        <View className="flex-1 gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">Select Playlist</Text>
            <Pressable onPress={onClose} className="rounded-lg px-3 py-1.5">
              <Text className="text-sm text-white/60">Done</Text>
            </Pressable>
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your playlists"
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-white"
          />

          {loading && (
            <Text className="py-8 text-center text-sm text-white/50">
              Loading your playlists…
            </Text>
          )}
          {error && (
            <Text className="py-8 text-center text-sm text-red-400">
              {error}
            </Text>
          )}
          {!loading && !error && (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
              ListEmptyComponent={
                <Text className="py-8 text-center text-sm text-white/50">
                  {playlists.length === 0
                    ? "No playlists found in your account"
                    : "No playlists match your search"}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handlePick(item)}
                  className="flex-row items-center gap-3 rounded-xl bg-white/5 p-2 active:bg-white/10"
                >
                  {item.images?.[0]?.url ? (
                    <Image
                      source={{ uri: item.images[0].url }}
                      style={{ width: 48, height: 48, borderRadius: 4 }}
                    />
                  ) : (
                    <View className="h-12 w-12 items-center justify-center rounded bg-white/10">
                      <Text className="text-lg">🎵</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-medium text-white"
                    >
                      {item.name}
                    </Text>
                    <Text className="text-xs text-white/50">
                      {item.tracks?.total ?? 0} tracks
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
