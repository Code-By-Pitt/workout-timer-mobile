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
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // Ignore audio mode errors
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
