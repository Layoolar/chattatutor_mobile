import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  registerPushDevice,
  unregisterPushDevice,
  updatePushPreferences,
  type PushPreferences,
} from "./api";

const PUSH_TOKEN_KEY = "push_expo_token_v1";
const PUSH_DEVICE_ID_KEY = "push_device_id_v1";
// Stored on registration so the token-rotation listener can re-register with
// the user's current preferences instead of clobbering them with defaults.
const PUSH_PREFS_KEY = "push_preferences_v1";

type RouterLike = {
  push: (href: any) => void;
};

export type PushRegistrationResult =
  | { status: "registered"; expoPushToken: string }
  | { status: "denied"; message: string }
  | { status: "unsupported"; message: string }
  | { status: "error"; message: string };

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  learningReminders: true,
  socialAlerts: true,
  accountAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: "21:00",
  quietHoursEnd: "07:00",
  timezone: "UTC",
};

export function withLocalTimezone(preferences: PushPreferences): PushPreferences {
  let timezone = "UTC";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    timezone = "UTC";
  }

  return { ...preferences, timezone };
}

export function hasAnyPushPreference(preferences: PushPreferences): boolean {
  return preferences.learningReminders || preferences.socialAlerts || preferences.accountAlerts;
}

export function configureNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function getProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("learning-reminders", {
    name: "Learning reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#4f46e5",
  });
}

async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(PUSH_DEVICE_ID_KEY);
  if (existing) return existing;

  const next = Crypto.randomUUID();
  await AsyncStorage.setItem(PUSH_DEVICE_ID_KEY, next);
  return next;
}

async function getStoredExpoPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

async function saveExpoPushToken(token: string) {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

async function saveStoredPreferences(prefs: PushPreferences) {
  await AsyncStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(prefs));
}

async function getStoredPreferences(): Promise<PushPreferences | null> {
  const raw = await AsyncStorage.getItem(PUSH_PREFS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PushPreferences;
  } catch {
    return null;
  }
}

export async function registerForPushNotificationsAsync(
  preferences: PushPreferences,
): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    return { status: "unsupported", message: "Push notifications are not available on web." };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { status: "error", message: "Expo project id is missing from app config." };
  }

  try {
    await ensureAndroidChannel();

    const currentPermission = await Notifications.getPermissionsAsync();
    let finalStatus = currentPermission.status;
    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      return {
        status: "denied",
        message: "Notifications are blocked. Enable them in system settings to receive reminders.",
      };
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResult.data;
    const deviceId = await getDeviceId();
    const syncedPreferences = withLocalTimezone(preferences);

    await registerPushDevice({
      expoPushToken,
      deviceId,
      platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown",
      appVersion: Constants.expoConfig?.version ?? null,
      preferences: syncedPreferences,
    });
    await saveExpoPushToken(expoPushToken);
    await saveStoredPreferences(syncedPreferences);

    return { status: "registered", expoPushToken };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to register this device for push notifications.",
    };
  }
}

export async function syncStoredPushPreferencesAsync(
  preferences: PushPreferences,
): Promise<PushRegistrationResult> {
  const token = await getStoredExpoPushToken();
  if (!token) return registerForPushNotificationsAsync(preferences);

  try {
    const synced = withLocalTimezone(preferences);
    await updatePushPreferences(token, synced);
    await saveStoredPreferences(synced);
    return { status: "registered", expoPushToken: token };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to sync push preferences.",
    };
  }
}

export async function unregisterStoredPushDeviceAsync(): Promise<void> {
  const token = await getStoredExpoPushToken();
  if (!token) return;

  try {
    await unregisterPushDevice(token);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

function stringFromData(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeHref(rawHref: string): string | null {
  if (rawHref.startsWith("/")) return rawHref;

  if (rawHref.startsWith("chattatutor://")) {
    const path = rawHref.replace(/^chattatutor:\/\/?/, "");
    return path ? `/${path}` : "/(tabs)";
  }

  if (rawHref.startsWith("https://chattatutor.com")) {
    try {
      const url = new URL(rawHref);
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  return null;
}

function notificationHrefFromData(data: Record<string, unknown>): string | null {
  const directHref = stringFromData(data.href) ?? stringFromData(data.url) ?? stringFromData(data.deepLink);
  if (directHref) return normalizeHref(directHref);

  const type = stringFromData(data.type);
  if (!type) return null;

  if (type === "daily_drill" || type === "daily-drill") return "/daily-drill";
  if (type === "league") return "/league";
  if (type === "passport") return "/passport";
  if (type === "hive" || type === "team") {
    const teamId = stringFromData(data.teamId);
    return teamId ? `/hives/${teamId}` : "/(tabs)/hives";
  }
  if (type === "challenge") {
    const challengeId = stringFromData(data.challengeId);
    return challengeId ? `/challenges/${challengeId}` : "/challenges";
  }
  if (type === "community") {
    const postId = stringFromData(data.postId) ?? stringFromData(data.id);
    return postId ? `/community/${postId}` : "/community";
  }
  if (type === "lesson") {
    const pdfId = stringFromData(data.pdfId);
    const lessonIndex = stringFromData(data.lessonIndex);
    if (!pdfId || !lessonIndex) return "/(tabs)/lessons";
    // Optional `decay=1` arrives on weak-concept refresh pushes — opens the
    // lesson with the Knowledge Refresh overlay up front.
    const decay = stringFromData(data.decay);
    return decay === "1"
      ? `/lesson/${pdfId}/${lessonIndex}?decay=1`
      : `/lesson/${pdfId}/${lessonIndex}`;
  }
  if (type === "review_queue") {
    // Weak-concept queue nudge — drop the user on the home tab where the
    // decay panel lives. They pick which lesson to refresh.
    return "/(tabs)";
  }
  if (type === "boss_quiz") {
    const pdfId = stringFromData(data.pdfId);
    return pdfId ? `/course/${pdfId}/boss-quiz` : "/(tabs)/lessons";
  }
  if (type === "course") {
    const pdfId = stringFromData(data.pdfId);
    return pdfId ? `/course/${pdfId}` : "/(tabs)/lessons";
  }

  return null;
}

export function installNotificationResponseListener(router: RouterLike): () => void {
  const openFromResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    const href = notificationHrefFromData(data);
    if (href) router.push(href);
  };

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) openFromResponse(response);
    })
    .catch(() => {});

  const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
  return () => subscription.remove();
}

/**
 * Re-register the device when Expo rotates the push token. Token rotation
 * happens silently on app upgrades, reinstalls, and at Expo's discretion.
 * Without this listener, our backend record would point at a dead token
 * after rotation. Replays the user's stored preferences so we don't clobber
 * their toggles with defaults.
 */
export function installPushTokenRotationListener(): () => void {
  const subscription = Notifications.addPushTokenListener(async (event) => {
    try {
      const newToken = event.data;
      if (!newToken) return;
      const existing = await getStoredExpoPushToken();
      if (existing === newToken) return; // No-op, same token.

      const deviceId = await getDeviceId();
      const stored = await getStoredPreferences();
      const preferences = stored ? withLocalTimezone(stored) : withLocalTimezone(DEFAULT_PUSH_PREFERENCES);

      await registerPushDevice({
        expoPushToken: newToken,
        deviceId,
        platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown",
        appVersion: Constants.expoConfig?.version ?? null,
        preferences,
      });
      await saveExpoPushToken(newToken);
    } catch (err) {
      // Token rotation is silent — don't surface to the user. Next foreground
      // registration will reconcile if this listener failed.
      console.warn("[push] token rotation re-register failed:", err);
    }
  });
  return () => subscription.remove();
}