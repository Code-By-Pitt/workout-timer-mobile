import { Audio } from "expo-av";
import type { TransitionSound } from "@/lib/timer";

export type SoundName = TransitionSound | "alarm" | "clap";

const sources: Record<SoundName, number> = {
  beep: require("../assets/sounds/beep.wav"),
  bell: require("../assets/sounds/bell.wav"),
  chime: require("../assets/sounds/chime.wav"),
  buzzer: require("../assets/sounds/buzzer.wav"),
  alarm: require("../assets/sounds/alarm.wav"),
  clap: require("../assets/sounds/clap.wav"),
};

const cache = new Map<SoundName, Audio.Sound>();
let initialized = false;

export async function initAudio() {
  if (initialized) return;
  initialized = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      // Backs the UIBackgroundModes:audio entitlement in app.json. Without this
      // iOS tears down the session — and the JS thread with it — on background.
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      // Default interruption mode is MixWithOthers, which is what we want:
      // cues layer over Spotify instead of pausing or ducking it.
    });
  } catch {
    // Ignore audio mode errors
  }
}

// iOS only keeps a backgrounded process alive while audio is actively playing.
// Our cues are short, so the app would suspend between them. Looping silence at
// volume 0 for the duration of the workout holds the session open.
let keepAlive: Audio.Sound | null = null;

export async function startKeepAlive() {
  await initAudio();
  if (keepAlive) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sounds/silence.wav"),
      { shouldPlay: true, isLooping: true, volume: 0 }
    );
    keepAlive = sound;
  } catch {
    // Keepalive is best-effort; the timer still works in the foreground.
  }
}

export async function stopKeepAlive() {
  const sound = keepAlive;
  if (!sound) return;
  keepAlive = null;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch {
    // ignore
  }
}

export async function preloadSounds() {
  await initAudio();
  const names: SoundName[] = ["beep", "bell", "chime", "buzzer", "alarm", "clap"];
  await Promise.all(
    names.map(async (name) => {
      if (cache.has(name)) return;
      try {
        const { sound } = await Audio.Sound.createAsync(sources[name], {
          shouldPlay: false,
        });
        cache.set(name, sound);
      } catch {
        // Ignore individual load failures
      }
    })
  );
}

export async function playSound(name: SoundName) {
  await initAudio();
  let sound = cache.get(name);
  if (!sound) {
    try {
      const created = await Audio.Sound.createAsync(sources[name], {
        shouldPlay: false,
      });
      sound = created.sound;
      cache.set(name, sound);
    } catch {
      return;
    }
  }
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Swallow play errors
  }
}

export async function unloadAllSounds() {
  await stopKeepAlive();
  for (const sound of cache.values()) {
    try {
      await sound.unloadAsync();
    } catch {
      // ignore
    }
  }
  cache.clear();
  initialized = false;
}
