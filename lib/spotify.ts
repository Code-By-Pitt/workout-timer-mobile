export type SpotifyResourceType =
  | "playlist"
  | "album"
  | "track"
  | "artist"
  | "show"
  | "episode";

export interface SpotifyLink {
  type: SpotifyResourceType;
  id: string;
  appUri: string;
  webUrl: string;
}

const TYPES: SpotifyResourceType[] = [
  "playlist",
  "album",
  "track",
  "artist",
  "show",
  "episode",
];

export function parseSpotifyLink(input: string): SpotifyLink | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // URI form: spotify:playlist:ID
  const uriMatch = trimmed.match(/^spotify:([a-z]+):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    const type = uriMatch[1] as SpotifyResourceType;
    const id = uriMatch[2];
    if (TYPES.includes(type)) {
      return {
        type,
        id,
        appUri: `spotify:${type}:${id}`,
        webUrl: `https://open.spotify.com/${type}/${id}`,
      };
    }
    return null;
  }

  // URL form: https://open.spotify.com/playlist/ID or /intl-xx/playlist/ID
  const urlMatch = trimmed.match(
    /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?([a-z]+)\/([a-zA-Z0-9]+)/
  );
  if (urlMatch) {
    const type = urlMatch[1] as SpotifyResourceType;
    const id = urlMatch[2];
    if (TYPES.includes(type)) {
      return {
        type,
        id,
        appUri: `spotify:${type}:${id}`,
        webUrl: `https://open.spotify.com/${type}/${id}`,
      };
    }
  }

  return null;
}
