import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getPlaylists,
  getPlaylistTrackCount,
  searchPublicPlaylists,
  type SpotifyPlaylist,
} from "@/lib/spotifyApi";
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
  const [searchResults, setSearchResults] = useState<SpotifyPlaylist[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    getPlaylists()
      .then(setPlaylists)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSearchResults([]);
      setSearching(false);
    }
  }, [visible]);

  // Debounced public-playlist search
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchPublicPlaylists(q)
        .then((items) => setSearchResults(items))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filteredOwn = useMemo(() => {
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
      trackCount: getPlaylistTrackCount(p),
    };
    onSelect(ref);
  }

  function PlaylistRow({ p }: { p: SpotifyPlaylist }) {
    return (
      <Pressable
        onPress={() => handlePick(p)}
        className="flex-row items-center gap-3 rounded-xl bg-white/5 p-2 active:bg-white/10"
      >
        {p.images?.[0]?.url ? (
          <Image
            source={{ uri: p.images[0].url }}
            style={{ width: 48, height: 48, borderRadius: 4 }}
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded bg-white/10">
            <Text className="text-lg">🎵</Text>
          </View>
        )}
        <View className="flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-white">
            {p.name}
          </Text>
          <Text className="text-xs text-white/50">
            {getPlaylistTrackCount(p)} tracks
          </Text>
        </View>
      </Pressable>
    );
  }

  const showPublicSection = search.trim().length >= 2;

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
            placeholder="Search your playlists or all of Spotify"
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
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Your Playlists */}
              <View className="gap-2">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Your Playlists
                </Text>
                {filteredOwn.length === 0 ? (
                  <Text className="py-2 text-xs text-white/50">
                    {playlists.length === 0
                      ? "No playlists in your account"
                      : "No matches"}
                  </Text>
                ) : (
                  filteredOwn.map((p) => <PlaylistRow key={p.id} p={p} />)
                )}
              </View>

              {/* Other Public Playlists */}
              {showPublicSection && (
                <View className="gap-2">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Other Public Playlists
                  </Text>
                  {searching ? (
                    <Text className="py-2 text-xs text-white/50">
                      Searching…
                    </Text>
                  ) : searchResults.length === 0 ? (
                    <Text className="py-2 text-xs text-white/50">
                      No results
                    </Text>
                  ) : (
                    searchResults.map((p) => (
                      <PlaylistRow key={`pub-${p.id}`} p={p} />
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
