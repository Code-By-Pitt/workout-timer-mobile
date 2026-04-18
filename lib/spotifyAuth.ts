// Spotify OAuth — tokens stored in Supabase spotify_tokens table
// Access token cached in memory + SecureStore for offline resilience

import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { supabase } from "./supabase";

const CLIENT_ID =
  (Constants.expoConfig?.extra?.spotifyClientId as string | undefined) ?? "";

const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-playback-state",
  "user-modify-playback-state",
];

// In-memory cache
let cachedAccessToken: string | null = null;
let cachedExpiresAt = 0;

function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: "workouttimer",
    path: "callback",
  });
}

export async function startLoginInteractive(): Promise<boolean> {
  const redirectUri = getRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  await request.makeAuthUrlAsync(SPOTIFY_DISCOVERY);
  const result = await request.promptAsync(SPOTIFY_DISCOVERY);

  if (result.type !== "success" || !result.params.code) {
    return false;
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? "",
      },
    },
    SPOTIFY_DISCOVERY
  );

  await storeTokens(
    tokenResult.accessToken,
    tokenResult.refreshToken ?? "",
    tokenResult.expiresIn ?? 3600
  );
  return true;
}

async function storeTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const expiresAt = Date.now() + expiresIn * 1000;

  // Memory cache
  cachedAccessToken = accessToken;
  cachedExpiresAt = expiresAt;

  // SecureStore cache (for quick offline access)
  try {
    await SecureStore.setItemAsync("spotify_access_token", accessToken);
    await SecureStore.setItemAsync("spotify_expires_at", String(expiresAt));
  } catch {
    // ignore
  }

  // Persist to Supabase (source of truth, cross-device)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("spotify_tokens").upsert(
    {
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function isLoggedIn(): Promise<boolean> {
  if (cachedAccessToken) return true;
  const tokens = await loadTokensFromSupabase();
  return tokens !== null;
}

export async function logout(): Promise<void> {
  cachedAccessToken = null;
  cachedExpiresAt = 0;

  try {
    await SecureStore.deleteItemAsync("spotify_access_token");
    await SecureStore.deleteItemAsync("spotify_expires_at");
  } catch {
    // ignore
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("spotify_tokens").delete().eq("user_id", user.id);
  }
}

let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  // Return cached if valid
  if (cachedAccessToken && Date.now() < cachedExpiresAt - 30_000) {
    return cachedAccessToken;
  }

  // Try Supabase
  const tokens = await loadTokensFromSupabase();
  if (!tokens) return null;

  if (Date.now() < tokens.expires_at - 30_000) {
    cachedAccessToken = tokens.access_token;
    cachedExpiresAt = tokens.expires_at;
    return tokens.access_token;
  }

  // Refresh
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(tokens.refresh_token).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function loadTokensFromSupabase(): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("spotify_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .single();

  return data ?? null;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  try {
    const tokenResult = await AuthSession.refreshAsync(
      {
        clientId: CLIENT_ID,
        refreshToken,
      },
      SPOTIFY_DISCOVERY
    );
    await storeTokens(
      tokenResult.accessToken,
      tokenResult.refreshToken ?? refreshToken,
      tokenResult.expiresIn ?? 3600
    );
    return tokenResult.accessToken;
  } catch {
    await logout();
    return null;
  }
}
