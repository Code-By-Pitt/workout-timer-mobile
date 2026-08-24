import { getAccessToken, invalidateAccessToken, logout } from "./spotifyAuth";

const API_BASE = "https://api.spotify.com/v1";

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email?: string;
  product: "free" | "premium" | "open";
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  images: { url: string; width?: number; height?: number }[];
  // Spotify renamed the simplified-playlist track-count field from `tracks`
  // to `items` on /me/playlists. Both have shape `{ href, total }`. Read
  // whichever is present.
  tracks?: { total: number };
  items?: { total: number };
}

export function getPlaylistTrackCount(p: SpotifyPlaylist): number {
  return p.items?.total ?? p.tracks?.total ?? 0;
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function send(path: string, init: RequestInit, token: string) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}

async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new SpotifyApiError(401, "Not authenticated");

  let res = await send(path, init, token);

  // A 401 on a token we thought was valid means it was revoked or our clock is
  // off. Refresh once and retry before giving up — this used to delete the
  // stored refresh token outright, forcing a full re-auth on any hiccup.
  if (res.status === 401) {
    await invalidateAccessToken();
    const retryToken = await getAccessToken();
    if (!retryToken) throw new SpotifyApiError(401, "Session expired");

    res = await send(path, init, retryToken);
    if (res.status === 401) {
      await logout();
      throw new SpotifyApiError(401, "Session expired");
    }
  }

  if (!res.ok) {
    let msg = `Spotify API ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error?.message ?? msg;
    } catch {
      // ignore
    }
    // 403 is not an auth failure — it's usually restricted device, region, or
    // an app still limited to Spotify's development-mode allowlist. Keep the
    // token; only the message changes.
    if (res.status === 403) {
      throw new SpotifyApiError(403, msg || "Spotify denied this request");
    }
    throw new SpotifyApiError(res.status, msg);
  }

  return res;
}

export async function getMe(): Promise<SpotifyUser> {
  const res = await apiFetch("/me");
  return res.json();
}

export async function getPlaylists(): Promise<SpotifyPlaylist[]> {
  const all: SpotifyPlaylist[] = [];
  let url: string | null = "/me/playlists?limit=50";
  while (url) {
    const res = await apiFetch(url);
    const data: { items: SpotifyPlaylist[]; next: string | null } =
      await res.json();
    all.push(...data.items.filter(Boolean));
    url = data.next ? data.next.replace(API_BASE, "") : null;
    if (all.length >= 500) break;
  }
  return all;
}

export async function searchPublicPlaylists(
  query: string
): Promise<SpotifyPlaylist[]> {
  if (!query.trim()) return [];
  // Spotify silently capped search `limit` at 10 for apps without Extended
  // Quota. Anything > 10 returns "Invalid limit" 400.
  const params = new URLSearchParams({
    q: query.trim(),
    type: "playlist",
    limit: "10",
  });
  const res = await apiFetch(`/search?${params.toString()}`);
  const data: {
    playlists?: { items: (SpotifyPlaylist | null)[] };
  } = await res.json();
  return (data.playlists?.items ?? []).filter(
    (p): p is SpotifyPlaylist => p !== null
  );
}

export async function getDevices(): Promise<SpotifyDevice[]> {
  const res = await apiFetch("/me/player/devices");
  const data: { devices: SpotifyDevice[] } = await res.json();
  return data.devices;
}

export async function playPlaylist(
  contextUri: string,
  deviceId?: string
): Promise<void> {
  const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  await apiFetch(`/me/player/play${qs}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context_uri: contextUri }),
  });
}

export async function pausePlayback(): Promise<void> {
  await apiFetch("/me/player/pause", { method: "PUT" });
}

// Resumes currently-queued playback without restarting the playlist
export async function resumePlayback(): Promise<void> {
  await apiFetch("/me/player/play", { method: "PUT" });
}
