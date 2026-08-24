import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Supabase session storage backed by the iOS Keychain / Android Keystore.
 *
 * The session holds a long-lived refresh token, so it does not belong in
 * unencrypted AsyncStorage. SecureStore warns above 2048 bytes per value and a
 * session (access JWT + refresh token + user object) routinely exceeds that, so
 * values are split across numbered chunks with a separate count marker.
 */

const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}__chunks`;
const chunkKey = (key: string, i: number) => `${key}__${i}`;

// SecureStore is unavailable on web; the web build falls back to AsyncStorage.
const useSecureStore = Platform.OS !== "web";

async function getRaw(key: string): Promise<string | null> {
  return useSecureStore
    ? SecureStore.getItemAsync(key)
    : AsyncStorage.getItem(key);
}

async function setRaw(key: string, value: string): Promise<void> {
  if (useSecureStore) await SecureStore.setItemAsync(key, value);
  else await AsyncStorage.setItem(key, value);
}

async function delRaw(key: string): Promise<void> {
  if (useSecureStore) await SecureStore.deleteItemAsync(key);
  else await AsyncStorage.removeItem(key);
}

async function clearChunks(key: string, count: number): Promise<void> {
  const keys = [countKey(key)];
  for (let i = 0; i < count; i++) keys.push(chunkKey(key, i));
  await Promise.all(keys.map((k) => delRaw(k).catch(() => {})));
}

async function readChunkCount(key: string): Promise<number> {
  const raw = await getRaw(countKey(key)).catch(() => null);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const count = await readChunkCount(key);
      if (count === 0) return null;

      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) => getRaw(chunkKey(key, i)))
      );
      // A missing chunk means a torn write — treat the whole value as absent
      // rather than handing Supabase a truncated session to choke on.
      if (parts.some((p) => p == null)) {
        await clearChunks(key, count);
        return null;
      }
      return parts.join("");
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const previous = await readChunkCount(key);

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      await Promise.all(
        chunks.map((chunk, i) => setRaw(chunkKey(key, i), chunk))
      );
      await setRaw(countKey(key), String(chunks.length));

      // Drop any chunks left over from a longer previous value.
      for (let i = chunks.length; i < previous; i++) {
        await delRaw(chunkKey(key, i)).catch(() => {});
      }
    } catch {
      // Losing persistence degrades to a session that ends with the process;
      // failing the write loudly here would break sign-in entirely.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await clearChunks(key, await readChunkCount(key));
    } catch {
      // ignore
    }
  },
};
