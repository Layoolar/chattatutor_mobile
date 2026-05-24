import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { Pause, Play, Volume2, VolumeX } from "lucide-react-native";
import {
  VoiceUnavailableError,
  generateLessonBriefNarration,
  getNarrationMap,
  type NarrationMapEntry,
  type NarrationResult,
} from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/lib/toast";
import {
  useVoicePrefs,
  VOICE_PLAYBACK_RATES,
  type VoicePlaybackRate,
} from "@/lib/voice-prefs";

interface LectureAudioPlayerProps {
  pdfId: string;
  lessonIndex: number;
}

const LESSON_BRIEF_SECTION_ID = "lesson-brief";
// Presigned URLs are minted with ~1h TTL on the backend; refresh before that.
const URL_REUSE_WINDOW_MS = 55 * 60 * 1000;

type PlayerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string };

type CachedEntry = NarrationMapEntry & { urlIssuedAtMs?: number };

function isPresignedFresh(urlIssuedAtMs?: number) {
  return typeof urlIssuedAtMs === "number" && Date.now() - urlIssuedAtMs < URL_REUSE_WINDOW_MS;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function reasonFromError(err: VoiceUnavailableError): string {
  if (err.code === "PAID_PLAN_REQUIRED" || err.code === "VOICE_PREMIUM_REQUIRED") {
    return "Premium subscription required";
  }
  if (err.status === 403) return "Voice is restricted on your plan";
  if (err.status === 404) return "Audio not generated for this lesson yet";
  return err.message || "Voice unavailable";
}

export function LectureAudioPlayer({ pdfId, lessonIndex }: LectureAudioPlayerProps) {
  const toast = useToast();
  const { prefs, update: updatePrefs, hydrated } = useVoicePrefs();

  const soundRef = useRef<Audio.Sound | null>(null);
  const seekingRef = useRef(false);

  const [state, setState] = useState<PlayerState>({ status: "idle" });
  const [narration, setNarration] = useState<CachedEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Configure audio session once.
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  // Pre-fetch the narration map for this lesson so the play button can fire
  // an existing presigned URL without a roundtrip.
  useEffect(() => {
    if (!pdfId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getNarrationMap(pdfId);
        if (cancelled) return;
        const entry = res.sections.find(
          (item) => item.lessonIndex === lessonIndex && item.target === "lessonBrief",
        );
        if (entry) {
          setNarration({
            ...entry,
            urlIssuedAtMs: entry.url ? Date.now() : undefined,
          });
        } else {
          setNarration(null);
        }
      } catch {
        // Entitlement / no audio yet — handled on explicit play.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfId, lessonIndex]);

  // Tear down on unmount or lesson change.
  useEffect(() => {
    return () => {
      void unloadSound();
    };
    // We intentionally rebuild the cleanup closure on lesson change.
  }, [pdfId, lessonIndex]);

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setIsPlaying(false);
    if (!sound) return;
    try {
      await sound.unloadAsync();
    } catch {
      // Sound may already be unloaded; ignore.
    }
  }, []);

  const onPlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if ("error" in status && status.error) {
          setState({ status: "error", message: "Audio could not load. Try again." });
          setIsPlaying(false);
        }
        return;
      }
      if (!seekingRef.current) {
        setPositionSec((status.positionMillis ?? 0) / 1000);
      }
      if (typeof status.durationMillis === "number") {
        setDurationSec(status.durationMillis / 1000);
      }
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionSec(0);
        seekingRef.current = false;
        sound()?.setPositionAsync(0).catch(() => {});
      }
    },
    [],
  );

  const sound = () => soundRef.current;

  const loadAndPlay = useCallback(
    async (url: string) => {
      await unloadSound();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        {
          shouldPlay: true,
          rate: prefs.playbackRate,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 250,
        },
        onPlaybackStatus,
      );
      soundRef.current = newSound;
      if (!prefs.hasEverPlayed) updatePrefs({ hasEverPlayed: true });
    },
    [onPlaybackStatus, prefs.hasEverPlayed, prefs.playbackRate, unloadSound, updatePrefs],
  );

  const applyResult = useCallback(
    async (result: NarrationResult) => {
      if (result.outcome === "cost_capped" || result.outcome === "user_capped") {
        setState({
          status: "unavailable",
          reason: result.reason?.message || "Voice limit reached",
        });
        return;
      }
      if (!result.narration?.url) {
        setState({
          status: "error",
          message:
            result.warning?.message ||
            "Audio is ready, but the playback link could not be issued. Try again.",
        });
        return;
      }
      setNarration({
        lessonIndex,
        sectionId: LESSON_BRIEF_SECTION_ID,
        target: "lessonBrief",
        url: result.narration.url,
        audioKey: result.narration.audioKey,
        scriptHash: result.narration.scriptHash,
        voiceId: result.narration.voiceId,
        generatedAt: result.narration.generatedAt,
        urlIssuedAtMs: Date.now(),
      });
      setState({ status: "ready", url: result.narration.url });
      try {
        haptics.tap();
        await loadAndPlay(result.narration.url);
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not start playback",
        });
      }
    },
    [lessonIndex, loadAndPlay],
  );

  const fetchAndPlay = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const result = await generateLessonBriefNarration(pdfId, lessonIndex);
      await applyResult(result);
    } catch (err) {
      if (err instanceof VoiceUnavailableError) {
        setState({ status: "unavailable", reason: reasonFromError(err) });
        return;
      }
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Could not load audio",
      });
    }
  }, [applyResult, lessonIndex, pdfId]);

  const handlePlay = useCallback(async () => {
    if (!prefs.voiceOn) return;
    // If we already have a Sound loaded and it's just paused, resume.
    if (soundRef.current) {
      try {
        await soundRef.current.playAsync();
        haptics.tap();
        return;
      } catch {
        // Fall through to refetch below.
      }
    }
    // Cached presigned URL still fresh — load straight from it.
    if (narration?.url && isPresignedFresh(narration.urlIssuedAtMs)) {
      try {
        setState({ status: "ready", url: narration.url });
        haptics.tap();
        await loadAndPlay(narration.url);
        return;
      } catch {
        // Presigned URL may have rotated server-side; fall through.
      }
    }
    await fetchAndPlay();
  }, [fetchAndPlay, loadAndPlay, narration, prefs.voiceOn]);

  const handlePause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
    } catch {
      // ignore
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) void handlePause();
    else void handlePlay();
  }, [isPlaying, handlePause, handlePlay]);

  // Reflect playback rate changes onto the loaded sound.
  useEffect(() => {
    const s = soundRef.current;
    if (!s) return;
    s.setRateAsync(prefs.playbackRate, true).catch(() => {});
  }, [prefs.playbackRate]);

  // Stop audio when the user flips the master voice toggle off.
  useEffect(() => {
    if (!prefs.voiceOn && soundRef.current) {
      void unloadSound();
      setPositionSec(0);
    }
  }, [prefs.voiceOn, unloadSound]);

  const cycleSpeed = useCallback(() => {
    const idx = VOICE_PLAYBACK_RATES.indexOf(prefs.playbackRate);
    const next = VOICE_PLAYBACK_RATES[(idx + 1) % VOICE_PLAYBACK_RATES.length] as VoicePlaybackRate;
    haptics.tick();
    updatePrefs({ playbackRate: next });
  }, [prefs.playbackRate, updatePrefs]);

  const onSlidingStart = () => {
    seekingRef.current = true;
  };

  const onSlidingComplete = async (value: number) => {
    if (!soundRef.current) {
      seekingRef.current = false;
      return;
    }
    try {
      await soundRef.current.setPositionAsync(value * 1000);
    } finally {
      seekingRef.current = false;
    }
  };

  const onValueChange = (value: number) => {
    // Show the scrubbed position while dragging — actual seek fires on
    // slidingComplete to avoid hammering setPosition.
    if (seekingRef.current) setPositionSec(value);
  };

  if (!hydrated) return null;
  if (!prefs.voiceOn && state.status === "idle" && !narration) {
    // No prior audio for this lesson and voice is off — render a thin off pill.
    return (
      <View className="border-b border-slate-100 bg-slate-50 px-4 py-2">
        <Pressable
          onPress={() => {
            haptics.tick();
            updatePrefs({ voiceOn: true });
          }}
          className="flex-row items-center gap-2"
        >
          <VolumeX size={14} color="#94a3b8" />
          <Text className="text-xs font-semibold text-slate-500">
            Tutor brief off · tap to enable
          </Text>
        </Pressable>
      </View>
    );
  }

  const isLoading = state.status === "loading";
  const isUnavailable = state.status === "unavailable";
  const isError = state.status === "error";
  const speedLabel = `${prefs.playbackRate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}x`;
  const sliderMax = Math.max(0.1, durationSec || 0);
  const sliderValue = Math.min(positionSec, sliderMax);

  return (
    <View className="border-b border-slate-100 bg-white">
      <View className="flex-row items-center gap-3 px-4 py-2.5">
        <Pressable
          onPress={togglePlayPause}
          disabled={!prefs.voiceOn || isLoading || isUnavailable}
          className={`h-9 w-9 items-center justify-center rounded-full ${
            !prefs.voiceOn || isUnavailable
              ? "bg-slate-200"
              : "bg-slate-900 active:bg-slate-800"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : isPlaying ? (
            <Pause size={16} color="#ffffff" />
          ) : (
            <Play size={16} color="#ffffff" />
          )}
        </Pressable>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-slate-800" numberOfLines={1}>
              {isUnavailable
                ? state.reason
                : isError
                ? state.message
                : isLoading
                ? "Preparing tutor brief"
                : "Tutor brief"}
            </Text>
            <Text className="ml-2 text-[10px] font-medium tabular-nums text-slate-500">
              {formatTime(sliderValue)} / {formatTime(durationSec)}
            </Text>
          </View>
          <Slider
            style={{ width: "100%", height: 16, marginTop: 2 }}
            minimumValue={0}
            maximumValue={sliderMax}
            value={sliderValue}
            onSlidingStart={onSlidingStart}
            onSlidingComplete={onSlidingComplete}
            onValueChange={onValueChange}
            minimumTrackTintColor="#0f172a"
            maximumTrackTintColor="#e2e8f0"
            thumbTintColor="#0f172a"
            disabled={state.status !== "ready" || !durationSec}
          />
        </View>

        <Pressable
          onPress={cycleSpeed}
          className="rounded-md border border-slate-200 px-2 py-1 active:bg-slate-50"
        >
          <Text className="text-[11px] font-bold text-slate-700">{speedLabel}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            haptics.tick();
            setMenuOpen((value) => !value);
          }}
          className="rounded-md p-1.5 active:bg-slate-100"
        >
          {prefs.voiceOn ? (
            <Volume2 size={16} color="#475569" />
          ) : (
            <VolumeX size={16} color="#94a3b8" />
          )}
        </Pressable>
      </View>

      {menuOpen ? (
        <View className="border-t border-slate-100 bg-slate-50 px-4 py-2">
          <Pressable
            onPress={() => {
              const next = !prefs.voiceOn;
              haptics.tick();
              updatePrefs({ voiceOn: next });
              if (!next) toast.info("Tutor brief muted");
              setMenuOpen(false);
            }}
            className="flex-row items-center justify-between rounded-lg px-3 py-2 active:bg-white"
          >
            <Text className="text-sm font-semibold text-slate-800">
              {prefs.voiceOn ? "Turn tutor brief off" : "Turn tutor brief on"}
            </Text>
            <Text className="text-xs text-slate-500">
              {prefs.voiceOn ? "Stops audio for every lesson" : "Audio resumes on play"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isError ? (
        <View className="flex-row items-center justify-between border-t border-rose-100 bg-rose-50 px-4 py-1.5">
          <Text className="flex-1 pr-2 text-xs text-rose-700">{state.message}</Text>
          <Pressable
            onPress={() => setState({ status: "idle" })}
            className="rounded bg-rose-100 px-2 py-0.5"
          >
            <Text className="text-[11px] font-bold text-rose-700">Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
