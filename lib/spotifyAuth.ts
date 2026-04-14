import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

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

const KEYS = {
  accessToken: "spotify_access_token",
  refreshToken: "spotify_refresh_token",
  expiresAt: "spotify_expires_at",
} as const;

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

  // Exchange code for tokens
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
  await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken);
  }
  await SecureStore.setItemAsync(
    KEYS.expiresAt,
    String(Date.now() + expiresIn * 1000)
  );
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(KEYS.accessToken);
  const refresh = await SecureStore.getItemAsync(KEYS.refreshToken);
  return Boolean(token && refresh);
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.accessToken);
  await SecureStore.deleteItemAsync(KEYS.refreshToken);
  await SecureStore.deleteItemAsync(KEYS.expiresAt);
}

let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(KEYS.accessToken);
  const expiresAtRaw = await SecureStore.getItemAsync(KEYS.expiresAt);
  const expiresAt = Number(expiresAtRaw ?? 0);

  if (token && Date.now() < expiresAt - 30_000) {
    return token;
  }

  const refreshToken = await SecureStore.getItemAsync(KEYS.refreshToken);
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
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
