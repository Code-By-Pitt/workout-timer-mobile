import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { secureStorageAdapter } from "@/lib/secureStorageAdapter";

const supabaseUrl =
  (Constants.expoConfig?.extra?.supabaseUrl as string) ?? "";
const supabaseAnonKey =
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// On native, autoRefreshToken alone is unreliable: its timer doesn't survive
// the app being backgrounded, which surfaces as spurious sign-outs. Supabase
// requires driving it from AppState.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
