import { Audio, type AVPlaybackSource } from "expo-av";
import { Platform } from "react-native";

// Sound effect IDs used across the app. Add new ones here as the catalog grows.
export type SfxId =
  | "flip"        // flashcard reveal
  | "tap"         // generic light interaction
  | "select"      // picking a quiz option
  | "correct"     // right answer / pass
  | "wrong"       // wrong answer
  | "complete"    // deck or quiz finished
  | "celebrate";  // big win — lesson passed, league rank up, etc.

// Drop matching files into `assets/sounds/` and uncomment the require() lines below.
// Files must exist at bundle time — Metro can't resolve them dynamically.
// Recommended format: 16-bit mono WAV or 128kbps MP3, ≤500ms for taps, ≤2s for celebrations.
const SOURCES: Partial<Record<SfxId, AVPlaybackSource>> = {
  // flip: require("../assets/sounds/flip.mp3"),
  // tap: require("../assets/sounds/tap.mp3"),
  // select: require("../assets/sounds/select.mp3"),
  // correct: require("../assets/sounds/correct.mp3"),
  // wrong: require("../assets/sounds/wrong.mp3"),
  // complete: require("../assets/sounds/complete.mp3"),
  // celebrate: require("../assets/sounds/celebrate.mp3"),
};

const cache: Partial<Record<SfxId, Audio.Sound>> = {};
let audioModeReady = false;
let muted = false;

async function ensureAudioMode() {
  if (audioModeReady || Platform.OS === "web") return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioModeReady = true;
  } catch {
    // setAudioModeAsync can fail on simulators — swallow and move on.
  }
}

async function getOrLoad(id: SfxId): Promise<Audio.Sound | null> {
  const source = SOURCES[id];
  if (!source) return null;
  if (cache[id]) return cache[id] ?? null;
  try {
    const { sound } = await Audio.Sound.createAsync(source, { volume: 0.7 });
    cache[id] = sound;
    return sound;
  } catch {
    return null;
  }
}

async function play(id: SfxId) {
  if (muted) return;
  await ensureAudioMode();
  const sound = await getOrLoad(id);
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Sound got unloaded between calls — drop the cache entry so the next call reloads.
    delete cache[id];
  }
}

export const sfx = {
  flip: () => void play("flip"),
  tap: () => void play("tap"),
  select: () => void play("select"),
  correct: () => void play("correct"),
  wrong: () => void play("wrong"),
  complete: () => void play("complete"),
  celebrate: () => void play("celebrate"),
  setMuted: (value: boolean) => {
    muted = value;
  },
  isMuted: () => muted,
};
