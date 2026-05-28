import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Bell,
  CalendarCheck,
  Check,
  Clock3,
  Flame,
  LogOut,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Volume2,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { GradientIcon } from "@/components/GradientIcon";
import { RankProgressCard } from "@/components/RankProgressCard";
import { useAuth } from "@/lib/auth-context";
import { changePassword, updateUsername } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import {
  getUserActivity,
  getUserRank,
  getUserTokens,
  type PushPreferences,
  type TokenUsageData,
  type UserActivity,
  type UserRank,
} from "@/lib/api";
import {
  DEFAULT_PUSH_PREFERENCES,
  hasAnyPushPreference,
  registerForPushNotificationsAsync,
  unregisterStoredPushDeviceAsync,
} from "@/lib/push-notifications";
import { openWebAppFlow } from "@/lib/web-links";

const PROFILE_SETTINGS_KEY = "profile_settings_v1";

type VoiceSpeed = "normal" | "slow";
type ActiveSheet = "password" | "pricing" | null;

interface ProfileSettings {
  learningReminders: boolean;
  socialAlerts: boolean;
  accountAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  voiceEnabled: boolean;
  voiceSpeed: VoiceSpeed;
}

const DEFAULT_SETTINGS: ProfileSettings = {
  learningReminders: DEFAULT_PUSH_PREFERENCES.learningReminders,
  socialAlerts: DEFAULT_PUSH_PREFERENCES.socialAlerts,
  accountAlerts: DEFAULT_PUSH_PREFERENCES.accountAlerts,
  quietHoursEnabled: DEFAULT_PUSH_PREFERENCES.quietHoursEnabled,
  quietHoursStart: DEFAULT_PUSH_PREFERENCES.quietHoursStart,
  quietHoursEnd: DEFAULT_PUSH_PREFERENCES.quietHoursEnd,
  voiceEnabled: true,
  voiceSpeed: "normal",
};

const QUIET_START_OPTIONS = ["20:00", "21:00", "22:00", "23:00"];
const QUIET_END_OPTIONS = ["06:00", "07:00", "08:00", "09:00"];

const PLAN_FEATURES: Record<"free" | "premium", string[]> = {
  free: [
    "1 PDF and up to 100 pages per file",
    "One AI course generation every 24 hours",
    "Streak tracking, certificates, and lesson receipts",
    "Core drills, quizzes, and revision flow",
  ],
  premium: [
    "10 PDFs with richer AI course generation",
    "Interactive diagrams and deeper learning preferences",
    "Hives, 1v1 challenges, and community competition",
    "AI coach, weak-concept targeting, and premium practice modes",
  ],
};

function formatNumber(value?: number | null): string {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusTone(status?: string | null): { bg: string; text: string; label: string } {
  switch (status) {
    case "active":
      return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" };
    case "trialing":
      return { bg: "bg-indigo-100", text: "text-indigo-700", label: "Trial" };
    case "canceled":
      return { bg: "bg-amber-100", text: "text-amber-700", label: "Canceled" };
    case "past_due":
      return { bg: "bg-rose-100", text: "text-rose-700", label: "Past due" };
    case "expired":
      return { bg: "bg-slate-200", text: "text-slate-700", label: "Expired" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", label: "Free" };
  }
}

function getPushPreferences(settings: ProfileSettings): PushPreferences {
  return {
    learningReminders: settings.learningReminders,
    socialAlerts: settings.socialAlerts,
    accountAlerts: settings.accountAlerts,
    quietHoursEnabled: settings.quietHoursEnabled,
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
    timezone: DEFAULT_PUSH_PREFERENCES.timezone,
  };
}

function Field({
  label,
  value,
  accent,
}: {
  label: string;
  value?: string | null;
  accent?: string;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-1">
      <Text className="text-xs uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className={`text-base font-medium ${accent || "text-slate-900"}`}>
        {value ?? "-"}
      </Text>
    </View>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-extrabold text-slate-900">{value}</Text>
    </View>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const Icon = icon;

  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
        <Icon size={18} color="#334155" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900">{title}</Text>
        <Text className="mt-1 text-sm leading-6 text-slate-500">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#cbd5e1", true: "#818cf8" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/35">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="rounded-t-3xl bg-slate-50 px-5 pb-8 pt-4" style={{ maxHeight: "88%" }}>
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-slate-300" />
            </View>
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xl font-extrabold text-slate-900">{title}</Text>
                {subtitle ? (
                  <Text className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-white"
              >
                <X size={18} color="#334155" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [pushSyncing, setPushSyncing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [usernameEditing, setUsernameEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadAccountData = useCallback(async () => {
    const [activityResult, rankResult, tokenResult] = await Promise.allSettled([
      getUserActivity(),
      getUserRank(),
      getUserTokens(),
    ]);

    if (activityResult.status === "fulfilled") setActivity(activityResult.value);
    if (rankResult.status === "fulfilled") setRank(rankResult.value);
    if (tokenResult.status === "fulfilled") setTokenUsage(tokenResult.value);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_SETTINGS_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<ProfileSettings> & { dailyReminders?: boolean };
      setSettings({
        learningReminders:
          typeof parsed.learningReminders === "boolean"
            ? parsed.learningReminders
            : typeof parsed.dailyReminders === "boolean"
              ? parsed.dailyReminders
              : DEFAULT_SETTINGS.learningReminders,
        socialAlerts:
          typeof parsed.socialAlerts === "boolean"
            ? parsed.socialAlerts
            : DEFAULT_SETTINGS.socialAlerts,
        accountAlerts:
          typeof parsed.accountAlerts === "boolean"
            ? parsed.accountAlerts
            : DEFAULT_SETTINGS.accountAlerts,
        quietHoursEnabled:
          typeof parsed.quietHoursEnabled === "boolean"
            ? parsed.quietHoursEnabled
            : DEFAULT_SETTINGS.quietHoursEnabled,
        quietHoursStart:
          typeof parsed.quietHoursStart === "string"
            ? parsed.quietHoursStart
            : DEFAULT_SETTINGS.quietHoursStart,
        quietHoursEnd:
          typeof parsed.quietHoursEnd === "string"
            ? parsed.quietHoursEnd
            : DEFAULT_SETTINGS.quietHoursEnd,
        voiceEnabled:
          typeof parsed.voiceEnabled === "boolean"
            ? parsed.voiceEnabled
            : DEFAULT_SETTINGS.voiceEnabled,
        voiceSpeed:
          parsed.voiceSpeed === "slow" || parsed.voiceSpeed === "normal"
            ? parsed.voiceSpeed
            : DEFAULT_SETTINGS.voiceSpeed,
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<ProfileSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updatePushSettings = useCallback(
    async (patch: Partial<ProfileSettings>) => {
      const next = { ...settings, ...patch };
      const preferences = getPushPreferences(next);

      setSettings(next);
      await AsyncStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      setPushSyncing(true);
      setPushStatus(null);

      try {
        if (!hasAnyPushPreference(preferences)) {
          await unregisterStoredPushDeviceAsync();
          setPushStatus("Push notifications paused on this device.");
          toast.info("Push notifications paused.");
          return;
        }

        const result = await registerForPushNotificationsAsync(preferences);
        if (result.status === "registered") {
          setPushStatus("This device is ready for push reminders.");
          toast.success("Notification preferences saved.");
        } else if (result.status === "denied") {
          setPushStatus(result.message);
          toast.error(result.message);
        } else {
          setPushStatus(result.message);
          toast.info(result.message);
        }
      } finally {
        setPushSyncing(false);
      }
    },
    [settings, toast],
  );

  useEffect(() => {
    (async () => {
      await Promise.all([loadAccountData(), loadSettings()]);
      setLoading(false);
    })();
  }, [loadAccountData, loadSettings]);

  useEffect(() => {
    if (!usernameEditing) {
      setUsernameInput(user?.username ?? "");
    }
  }, [user?.username, usernameEditing]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadAccountData(), loadSettings()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't refresh profile");
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadAccountData, loadSettings, toast]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.replace("/landing");
  };

  const handleUsernameSave = async () => {
    const trimmed = usernameInput.trim();
    setUsernameError(null);

    if (!trimmed) {
      setUsernameError("Username cannot be empty");
      return;
    }

    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    if (!/^[a-z0-9_-]+$/i.test(trimmed)) {
      setUsernameError("Only letters, numbers, underscores, and hyphens are allowed");
      return;
    }

    if (trimmed.toLowerCase() === (user?.username ?? "").toLowerCase()) {
      setUsernameEditing(false);
      return;
    }

    try {
      setUsernameSaving(true);
      await updateUsername(trimmed);
      await refresh();
      setUsernameEditing(false);
      toast.success("Username updated");
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "Couldn't update username");
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Fill in all password fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      toast.error("Choose a new password that is different from the old one");
      return;
    }

    try {
      setPasswordSaving(true);
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveSheet(null);
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleOpenBillingOnWeb = async () => {
    try {
      setPaymentLoading(true);
      setActiveSheet(null);
      await openWebAppFlow("/pricing");
      toast.info("Finish billing in your browser, then return here and pull to refresh.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open billing page");
    } finally {
      setPaymentLoading(false);
      setCancelLoading(false);
    }
  };

  const planName: "free" | "premium" =
    (user?.plan ?? tokenUsage?.plan ?? "free").toLowerCase() === "premium"
      ? "premium"
      : "free";
  const statusTone = getStatusTone(
    user?.subscriptionStatus ?? (planName === "premium" ? "active" : null),
  );
  const usagePercent = Math.max(0, Math.min(tokenUsage?.usagePercentage ?? 0, 100));
  const heroInitial = (user?.username || user?.email || "U").slice(0, 1).toUpperCase();
  const voiceDescription = useMemo(
    () =>
      settings.voiceEnabled
        ? settings.voiceSpeed === "slow"
          ? "Narration stays slower and easier to follow when available."
          : "Narration stays balanced when available."
        : "Voice narration is off until you turn it back on.",
    [settings.voiceEnabled, settings.voiceSpeed],
  );
  const pushEnabled = hasAnyPushPreference(getPushPreferences(settings));
  const pushDescription = pushEnabled
    ? settings.quietHoursEnabled
      ? `Enabled. Quiet hours ${settings.quietHoursStart}-${settings.quietHoursEnd}.`
      : "Enabled. Quiet hours are off."
    : "Paused on this device.";

  if (loading) {
    return (
      <ScreenContainer scroll>
        <View className="gap-4 pb-8 pt-6">
          <Skeleton.Card height={150} />
          <Skeleton.Card height={220} />
          <Skeleton.Card height={180} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
        <View className="gap-5 pb-8 pt-6">
          <View className="overflow-hidden rounded-3xl border border-indigo-100 bg-white p-5">
            <View
              pointerEvents="none"
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-100/70"
            />
            <View className="flex-row items-start gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-slate-900">
                <Text className="text-2xl font-extrabold text-white">{heroInitial}</Text>
              </View>
              <View className="flex-1 gap-2">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-2xl font-extrabold text-slate-900">
                    {user?.username || "Profile"}
                  </Text>
                  <View className={`rounded-full px-3 py-1.5 ${statusTone.bg}`}>
                    <Text className={`text-xs font-semibold ${statusTone.text}`}>
                      {statusTone.label}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-slate-500">{user?.email}</Text>
                <Text className="text-sm leading-6 text-slate-600">
                  Keep your account, learning preferences, and premium access in one place.
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="rounded-full bg-slate-100 px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-600">
                  Plan {planName === "premium" ? "Premium" : "Free"}
                </Text>
              </View>
              <View className="rounded-full bg-slate-100 px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-600">
                  Email {user?.emailVerified ? "verified" : "not verified"}
                </Text>
              </View>
              {user?.subscriptionEndsAt ? (
                <View className="rounded-full bg-slate-100 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-slate-600">
                    Renews {formatDate(user.subscriptionEndsAt)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <GradientIcon size={40} radius={12} from="#6366f1" to="#7c3aed">
                <UserRound size={18} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Account</Text>
                <Text className="text-xs text-slate-500">Your identity, plan, and access status.</Text>
              </View>
            </View>

            {usernameEditing ? (
              <View className="rounded-3xl border border-slate-200 bg-white p-4 gap-3">
                <Input
                  label="Username"
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Choose a username"
                  error={usernameError ?? undefined}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => {
                        setUsernameEditing(false);
                        setUsernameError(null);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Button title="Save username" loading={usernameSaving} onPress={handleUsernameSave} />
                  </View>
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <Field label="Username" value={user?.username} />
                <Field label="Email" value={user?.email} />
                <Field label="Plan" value={planName === "premium" ? "Premium" : "Free"} />
                <Field
                  label="Email verified"
                  value={user?.emailVerified ? "Yes" : "No"}
                  accent={user?.emailVerified ? "text-emerald-600" : "text-amber-700"}
                />
                <Button title="Edit username" variant="secondary" onPress={() => setUsernameEditing(true)} />
              </View>
            )}
          </View>

          {rank ? (
            <View>
              <RankProgressCard rank={rank} />
            </View>
          ) : null}

          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <GradientIcon size={40} radius={12} from="#14b8a6" to="#06b6d4">
                <Sparkles size={18} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Usage and plan</Text>
                <Text className="text-xs text-slate-500">Track tokens, reset timing, and plan benefits.</Text>
              </View>
            </View>

            <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Token usage
                  </Text>
                  <Text className="mt-1 text-2xl font-extrabold text-slate-900">
                    {formatNumber(tokenUsage?.tokensRemaining)} left
                  </Text>
                  <Text className="mt-1 text-sm leading-6 text-slate-500">
                    Resets on {formatDate(tokenUsage?.resetDate)}.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveSheet("pricing")}
                  className="rounded-full bg-slate-900 px-4 py-3"
                >
                  <Text className="text-sm font-semibold text-white">
                    {planName === "premium" ? "Manage" : "Upgrade"}
                  </Text>
                </Pressable>
              </View>

              <View className="gap-2">
                <View className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <View
                    className={`h-full rounded-full ${
                      usagePercent >= 90
                        ? "bg-rose-500"
                        : usagePercent >= 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </View>
                <Text className="text-xs font-medium text-slate-500">
                  {usagePercent}% of your monthly budget used
                </Text>
              </View>

              <View className="flex-row gap-3">
                <UsageStat label="Used" value={formatNumber(tokenUsage?.tokensUsed)} />
                <UsageStat label="Monthly limit" value={formatNumber(tokenUsage?.tokenLimit)} />
              </View>

              <View className="rounded-2xl bg-slate-50 p-4">
                <Text className="text-sm font-bold text-slate-900">
                  {planName === "premium" ? "Premium unlocks" : "Free includes"}
                </Text>
                <View className="mt-3 gap-2">
                  {PLAN_FEATURES[planName].map((feature) => (
                    <View key={feature} className="flex-row items-start gap-2">
                      <Check size={16} color="#0f766e" style={{ marginTop: 2 }} />
                      <Text className="flex-1 text-sm leading-6 text-slate-600">{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <GradientIcon size={40} radius={12} from="#f59e0b" to="#f97316">
                <CalendarCheck size={18} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Activity</Text>
                <Text className="text-xs text-slate-500">Last 12 weeks of drill and lesson days.</Text>
              </View>
              {activity ? (
                <View className="flex-row items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5">
                  <Flame size={12} color="#dc2626" />
                  <Text className="text-xs font-semibold text-rose-700">
                    {activity.currentStreak}-day streak
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              {activity ? (
                <ActivityHeatmap activityDates={activity.activityDates ?? []} />
              ) : (
                <Text className="text-sm leading-6 text-slate-500">
                  Your activity history will appear here as you keep learning.
                </Text>
              )}
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <GradientIcon size={40} radius={12} from="#0f172a" to="#334155">
                <Settings2 size={18} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Settings</Text>
                <Text className="text-xs text-slate-500">Push reminders, voice preferences, and security.</Text>
              </View>
            </View>

            <View className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 gap-3">
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
                  <Bell size={18} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-indigo-950">Push notifications</Text>
                  <Text className="mt-1 text-sm leading-6 text-indigo-700">{pushDescription}</Text>
                  {pushStatus ? (
                    <Text className="mt-1 text-xs font-semibold text-indigo-600">{pushStatus}</Text>
                  ) : null}
                </View>
                {pushSyncing ? <ActivityIndicator size="small" color="#4f46e5" /> : null}
              </View>
              <Pressable
                onPress={() => updatePushSettings({})}
                disabled={pushSyncing}
                accessibilityRole="button"
                accessibilityLabel="Sync push notification preferences"
                className={`self-start rounded-full px-4 py-2 ${pushSyncing ? "bg-indigo-300" : "bg-indigo-600"}`}
              >
                <Text className="text-xs font-bold text-white">Sync this device</Text>
              </Pressable>
            </View>

            <SettingToggle
              icon={CalendarCheck}
              title="Learning reminders"
              description="Daily drill, streak risk, weak-concept review, and next-session nudges."
              value={settings.learningReminders}
              onValueChange={(value) => updatePushSettings({ learningReminders: value })}
            />
            <SettingToggle
              icon={Bell}
              title="Social + competition alerts"
              description="Challenge invites, challenge results, hive updates, and league summaries."
              value={settings.socialAlerts}
              onValueChange={(value) => updatePushSettings({ socialAlerts: value })}
            />
            <SettingToggle
              icon={ShieldCheck}
              title="Account alerts"
              description="Billing, trial, security, and subscription notices."
              value={settings.accountAlerts}
              onValueChange={(value) => updatePushSettings({ accountAlerts: value })}
            />

            <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-3">
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                  <Clock3 size={18} color="#334155" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900">Quiet hours</Text>
                  <Text className="mt-1 text-sm leading-6 text-slate-500">
                    Hold non-urgent learning and social nudges during your rest window.
                  </Text>
                </View>
                <Switch
                  value={settings.quietHoursEnabled}
                  onValueChange={(value) => updatePushSettings({ quietHoursEnabled: value })}
                  trackColor={{ false: "#cbd5e1", true: "#818cf8" }}
                  thumbColor="#ffffff"
                />
              </View>
              <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wide text-slate-400">Starts</Text>
                <View className="flex-row flex-wrap gap-2">
                  {QUIET_START_OPTIONS.map((time) => (
                    <Pressable
                      key={time}
                      disabled={!settings.quietHoursEnabled}
                      onPress={() => updatePushSettings({ quietHoursStart: time })}
                      className={`rounded-full px-3 py-2 ${
                        settings.quietHoursStart === time ? "bg-slate-900" : "bg-slate-100"
                      } ${settings.quietHoursEnabled ? "" : "opacity-50"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          settings.quietHoursStart === time ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wide text-slate-400">Ends</Text>
                <View className="flex-row flex-wrap gap-2">
                  {QUIET_END_OPTIONS.map((time) => (
                    <Pressable
                      key={time}
                      disabled={!settings.quietHoursEnabled}
                      onPress={() => updatePushSettings({ quietHoursEnd: time })}
                      className={`rounded-full px-3 py-2 ${
                        settings.quietHoursEnd === time ? "bg-slate-900" : "bg-slate-100"
                      } ${settings.quietHoursEnabled ? "" : "opacity-50"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          settings.quietHoursEnd === time ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <SettingToggle
              icon={Volume2}
              title="Voice narration"
              description="Use these preferences whenever narrated lessons or voice explanations are available."
              value={settings.voiceEnabled}
              onValueChange={(value) => updateSettings({ voiceEnabled: value })}
            />

            <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-3">
              <Text className="text-sm font-bold text-slate-900">Voice pace</Text>
              <Text className="text-sm leading-6 text-slate-500">{voiceDescription}</Text>
              <View className="flex-row gap-2">
                {(["normal", "slow"] as const).map((speed) => (
                  <Pressable
                    key={speed}
                    disabled={!settings.voiceEnabled}
                    onPress={() => updateSettings({ voiceSpeed: speed })}
                    className={`rounded-full px-4 py-2 ${
                      settings.voiceSpeed === speed ? "bg-slate-900" : "bg-slate-100"
                    } ${settings.voiceEnabled ? "" : "opacity-50"}`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        settings.voiceSpeed === speed ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {speed === "normal" ? "Balanced" : "Slow and clear"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-3">
              <Text className="text-sm font-bold text-slate-900">Security</Text>
              <Text className="text-sm leading-6 text-slate-500">
                {user?.authProvider === "google"
                  ? "This account signs in with Google, so password changes stay off here."
                  : "Change your password without leaving the app."}
              </Text>
              <Button
                title={user?.authProvider === "google" ? "Google sign-in account" : "Change password"}
                variant="secondary"
                disabled={user?.authProvider === "google"}
                onPress={() => setActiveSheet("password")}
              />
            </View>
          </View>

          <View className="gap-3 pb-4">
            <Button title="Sign out" variant="secondary" onPress={handleSignOut} />
            <View className="mt-1 flex-row items-center justify-center gap-2 opacity-60">
              <LogOut size={14} color="#94a3b8" />
              <Text className="text-xs text-slate-400">
                You will be returned to the landing screen.
              </Text>
            </View>
          </View>
        </View>
      </ScreenContainer>

      <BottomSheet
        visible={activeSheet === "password"}
        title="Change password"
        subtitle="Use a new password you have not used on this account before."
        onClose={() => {
          if (!passwordSaving) {
            setActiveSheet(null);
          }
        }}
      >
        <View className="gap-4 pb-4">
          <Input
            label="Current password"
            value={oldPassword}
            onChangeText={setOldPassword}
            secureToggle
            secureTextEntry
            placeholder="Enter current password"
          />
          <Input
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureToggle
            secureTextEntry
            placeholder="Choose a new password"
          />
          <Input
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureToggle
            secureTextEntry
            placeholder="Confirm new password"
          />
          <Button title="Update password" loading={passwordSaving} onPress={handleChangePassword} />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === "pricing"}
        title="Plans and billing"
        subtitle="Track what your current plan includes and upgrade when you need more room."
        onClose={() => {
          if (!paymentLoading && !cancelLoading) {
            setActiveSheet(null);
          }
        }}
      >
        <View className="gap-4 pb-4">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-slate-900">Free</Text>
                <Text className="mt-1 text-sm leading-6 text-slate-500">Build a daily study habit.</Text>
              </View>
              <View className="rounded-full bg-slate-100 px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-700">$0</Text>
              </View>
            </View>
            <View className="gap-2">
              {PLAN_FEATURES.free.map((feature) => (
                <View key={feature} className="flex-row items-start gap-2">
                  <Check size={16} color="#0f766e" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm leading-6 text-slate-600">{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="rounded-3xl border border-violet-200 bg-violet-50/70 p-5 gap-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-slate-900">Premium</Text>
                <Text className="mt-1 text-sm leading-6 text-slate-600">Unlock the full memory engine.</Text>
              </View>
              <View className="rounded-full bg-white px-3 py-1.5">
                <Text className="text-xs font-semibold text-violet-700">$9.99 / month</Text>
              </View>
            </View>
            <View className="gap-2">
              {PLAN_FEATURES.premium.map((feature) => (
                <View key={feature} className="flex-row items-start gap-2">
                  <Check size={16} color="#6d28d9" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm leading-6 text-slate-600">{feature}</Text>
                </View>
              ))}
            </View>
            <View className="rounded-2xl bg-white/90 p-4">
              <Text className="text-sm font-bold text-slate-900">Billing status</Text>
              <Text className="mt-1 text-sm leading-6 text-slate-500">
                {planName === "premium"
                  ? `Your account is on ${statusTone.label.toLowerCase()} premium${user?.subscriptionEndsAt ? ` until ${formatDate(user.subscriptionEndsAt)}` : ""}.`
                  : "You are currently on the free plan."}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-slate-500">
                Upgrades and subscription changes are handled on chattatutor.com. When you are done, return to the app and refresh your profile.
              </Text>
            </View>

            <Button
              title={planName === "premium" ? "Manage subscription on web" : "Upgrade on web"}
              loading={paymentLoading || cancelLoading}
              onPress={handleOpenBillingOnWeb}
            />
          </View>
        </View>
      </BottomSheet>
    </>
  );
}