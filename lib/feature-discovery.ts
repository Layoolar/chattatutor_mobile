import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDiscoveredFeatures as fetchDiscoveredFeatures,
  mergeDiscoveredFeatures as saveDiscoveredFeatures,
} from "./api";

const STORAGE_KEY = "chattatutor_discovered_features";

let cachedFeatures: string[] = [];
let hasLoaded = false;
let pendingLoad: Promise<string[]> | null = null;
const listeners = new Set<(features: string[]) => void>();

function notify() {
  for (const listener of listeners) {
    try {
      listener(cachedFeatures);
    } catch {
      // listeners must not throw
    }
  }
}

function setCachedFeatures(features: string[]) {
  cachedFeatures = Array.from(new Set(features));
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedFeatures)).catch(() => {});
  notify();
}

function subscribe(listener: (features: string[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readLocalFeatures(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

async function loadFeatures(): Promise<string[]> {
  if (hasLoaded) return cachedFeatures;
  if (pendingLoad) return pendingLoad;

  pendingLoad = (async () => {
    let remote: string[] = [];
    let remoteOk = false;
    try {
      remote = await fetchDiscoveredFeatures();
      remoteOk = true;
    } catch {
      // offline or 401 — fall back to local
    }

    const local = await readLocalFeatures();

    if (remoteOk) {
      const missing = local.filter((feature) => !remote.includes(feature));
      const merged =
        missing.length > 0
          ? await saveDiscoveredFeatures(missing).catch(() => remote)
          : remote;
      hasLoaded = true;
      setCachedFeatures(merged);
      pendingLoad = null;
      return merged;
    }

    hasLoaded = true;
    setCachedFeatures(local);
    pendingLoad = null;
    return local;
  })();

  return pendingLoad;
}

export async function markFeatureDiscovered(featureKey: string): Promise<string[]> {
  const normalized = featureKey.trim();
  if (!normalized) return cachedFeatures;

  if (!hasLoaded) {
    try {
      await loadFeatures();
    } catch {
      const local = await readLocalFeatures();
      const next = Array.from(new Set([...local, normalized]));
      setCachedFeatures(next);
      return next;
    }
  }

  if (cachedFeatures.includes(normalized)) return cachedFeatures;

  const optimistic = [...cachedFeatures, normalized];
  setCachedFeatures(optimistic);

  try {
    const merged = await saveDiscoveredFeatures([normalized]);
    setCachedFeatures(merged);
    return merged;
  } catch {
    return optimistic;
  }
}

export function useDiscoveredFeatures(): string[] {
  const [features, setFeatures] = useState<string[]>(cachedFeatures);

  useEffect(() => {
    let active = true;

    loadFeatures()
      .then((loaded) => {
        if (active) setFeatures(loaded);
      })
      .catch(() => {
        // already handled via cache
      });

    const unsubscribe = subscribe((next) => {
      if (active) setFeatures(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return features;
}

export function useFeatureDiscovery(
  featureKey: string,
): [boolean, () => void] {
  const features = useDiscoveredFeatures();
  const isNew = !features.includes(featureKey);
  const markSeen = useCallback(() => {
    void markFeatureDiscovered(featureKey);
  }, [featureKey]);
  return [isNew, markSeen];
}
