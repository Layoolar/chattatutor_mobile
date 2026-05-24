import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const VOICE_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
export type VoicePlaybackRate = (typeof VOICE_PLAYBACK_RATES)[number];

export interface VoicePrefs {
  voiceOn: boolean;
  playbackRate: VoicePlaybackRate;
  hasEverPlayed: boolean;
}

const STORAGE_KEY = "voice-prefs:v1";

const DEFAULTS: VoicePrefs = {
  voiceOn: true,
  playbackRate: 1,
  hasEverPlayed: false,
};

function sanitize(raw: Partial<VoicePrefs> | null | undefined): VoicePrefs {
  if (!raw) return DEFAULTS;
  const rate = (VOICE_PLAYBACK_RATES as readonly number[]).includes(raw.playbackRate as number)
    ? (raw.playbackRate as VoicePlaybackRate)
    : DEFAULTS.playbackRate;
  return {
    voiceOn: typeof raw.voiceOn === "boolean" ? raw.voiceOn : DEFAULTS.voiceOn,
    playbackRate: rate,
    hasEverPlayed: !!raw.hasEverPlayed,
  };
}

export function useVoicePrefs() {
  const [prefs, setPrefs] = useState<VoicePrefs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setPrefs(sanitize(JSON.parse(stored) as Partial<VoicePrefs>));
      } catch {
        // Fall back to defaults — bad/missing JSON shouldn't break the player.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const update = useCallback((patch: Partial<VoicePrefs>) => {
    setPrefs((current) => {
      const next = sanitize({ ...current, ...patch });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, update, hydrated };
}
