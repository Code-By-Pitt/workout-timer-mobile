import { getAccessToken, logout } from "./spotifyAuth";

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
  tracks: { total: number };
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

async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new SpotifyApiError(401, "Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    await logout();
    throw new SpotifyApiError(401, "Session expired");
  }

  if (!res.ok) {
    let msg = `Spotify API ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error?.message ?? msg;
    } catch {
      // ignore
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
