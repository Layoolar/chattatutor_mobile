import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Send,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
  X,
} from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { GradientIcon } from "@/components/GradientIcon";
import { Input } from "@/components/Input";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import {
  getTeamDetails,
  getTeamChallengeLeaderboard,
  getTeamLeaderboard,
  inviteTeamMember,
  leaveTeam,
  type LeaderboardEntry,
  type TeamChallengeLeaderboardEntry,
  type TeamDetails,
  type TeamMember,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

type HiveTab = "members" | "progress" | "challenges" | "analytics" | "chat";

const TAB_ORDER: HiveTab[] = ["members", "progress", "challenges", "analytics", "chat"];

const TAB_LABELS: Record<HiveTab, string> = {
  members: "Members",
  progress: "Progress",
  challenges: "Challenges",
  analytics: "Analytics",
  chat: "Chat",
};

function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

function TabIcon({ tab, color, size = 18 }: { tab: HiveTab; color: string; size?: number }) {
  if (tab === "members") return <UsersRound size={size} color={color} />;
  if (tab === "progress") return <Trophy size={size} color={color} />;
  if (tab === "challenges") return <Swords size={size} color={color} />;
  if (tab === "analytics") return <BarChart3 size={size} color={color} />;
  return <MessageSquare size={size} color={color} />;
}

// Icon-only tab bar — all 5 tabs fit without horizontal scroll. Each tab's
// label appears as the page heading inside the content area, so the bar
// stays compact while context stays clear.
function TabBar({
  active,
  onChange,
}: {
  active: HiveTab;
  onChange: (tab: HiveTab) => void;
}) {
  return (
    <View className="border-y border-slate-200 bg-white">
      <View className="flex-row px-3 py-2">
        {TAB_ORDER.map((tab) => {
          const isActive = active === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => {
                haptics.tick();
                onChange(tab);
              }}
              accessibilityRole="tab"
              accessibilityLabel={TAB_LABELS[tab]}
              accessibilityState={{ selected: isActive }}
              className="flex-1 items-center justify-center py-1"
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-2xl ${
                  isActive ? "bg-indigo-600" : "bg-slate-50"
                }`}
              >
                <TabIcon
                  tab={tab}
                  color={isActive ? "#ffffff" : "#64748b"}
                  size={18}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Header that sits at the top of each tab's content body. Replaces the
// inline section labels we used before — clearer hierarchy now that the
// tab bar is icon-only.
function TabHeader({
  title,
  subtitle,
  count,
  icon,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  icon: React.ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3 pb-1">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50">
        {icon}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-extrabold tracking-tight text-slate-900">
            {title}
          </Text>
          {typeof count === "number" ? (
            <View className="rounded-full bg-slate-100 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-slate-600">{count}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ───── Member row (rich version, with progress) ────────────────────────────

function MemberRow({
  member,
  rank,
}: {
  member: TeamMember;
  rank?: LeaderboardEntry;
}) {
  const label = member.username || member.user?.name || member.email || "Member";
  const isOwner = member.role === "owner";
  const isAdmin = member.role === "admin";
  const isArchived = member.status === "archived";

  return (
    <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            isOwner ? "bg-amber-100" : isAdmin ? "bg-indigo-100" : "bg-slate-100"
          }`}
        >
          <Text
            className={`text-sm font-extrabold ${
              isOwner ? "text-amber-700" : isAdmin ? "text-indigo-700" : "text-slate-600"
            }`}
          >
            {label.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
              {label}
            </Text>
            {isOwner ? (
              <View className="rounded-full bg-amber-50 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Owner
                </Text>
              </View>
            ) : null}
            {isAdmin ? (
              <View className="rounded-full bg-indigo-50 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                  Admin
                </Text>
              </View>
            ) : null}
            {isArchived ? (
              <View className="rounded-full bg-slate-100 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Archived
                </Text>
              </View>
            ) : null}
          </View>
          {rank ? (
            <Text className="mt-1 text-xs text-slate-500">
              {Math.round(rank.progressPercentage)}% progress · {rank.completedLessons} lessons done
            </Text>
          ) : (
            <Text className="mt-1 text-xs text-slate-400">No activity yet</Text>
          )}
        </View>
        {rank ? (
          <View className="items-end">
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Quiz avg
            </Text>
            <Text className="text-sm font-extrabold text-emerald-700">
              {Math.round(rank.averageQuizScore)}%
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ───── Leaderboard row ─────────────────────────────────────────────────────

function ProgressRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
        <Text className="text-sm font-extrabold text-indigo-600">
          {entry.badge || `#${entry.rank}`}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {entry.username}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">
          {Math.round(entry.progressPercentage)}% progress · {Math.round(entry.averageQuizScore)} avg quiz
        </Text>
      </View>
      <View className="rounded-full bg-emerald-50 px-3 py-1.5">
        <Text className="text-xs font-semibold text-emerald-700">
          {entry.completedLessons} done
        </Text>
      </View>
    </View>
  );
}

function ChallengeRow({ entry }: { entry: TeamChallengeLeaderboardEntry }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
        <Text className="text-sm font-extrabold text-amber-700">#{entry.rank}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {entry.username}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">
          {entry.wins}/{entry.played} wins · {Math.round(entry.winRate)}% win rate
        </Text>
      </View>
      <View className="rounded-full bg-rose-50 px-3 py-1.5">
        <Text className="text-xs font-semibold text-rose-700">
          {Math.round(entry.averageScore)} avg
        </Text>
      </View>
    </View>
  );
}

// ───── Analytics stat ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: "indigo" | "emerald" | "amber" | "rose";
  icon: React.ReactNode;
}) {
  const accentClasses = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
  }[accent];
  return (
    <View className={`flex-1 rounded-2xl border ${accentClasses.border} bg-white p-4`}>
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${accentClasses.bg}`}>
        {icon}
      </View>
      <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className={`mt-1 text-xl font-extrabold ${accentClasses.text}`}>{value}</Text>
    </View>
  );
}

// ───── Overflow sheet ──────────────────────────────────────────────────────

interface OverflowSheetProps {
  open: boolean;
  onClose: () => void;
  onLeave: () => void;
  canLeave: boolean;
  isOwner: boolean;
}

function OverflowSheet({ open, onClose, onLeave, canLeave, isOwner }: OverflowSheetProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-slate-950/40">
        <View className="rounded-t-3xl bg-white pb-6">
          <View className="px-5 pt-5 pb-2 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-slate-900">Hive actions</Text>
            <Pressable
              onPress={() => {
                haptics.tick();
                onClose();
              }}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          <View className="px-5 pt-2 gap-2">
            <Pressable
              onPress={() => {
                if (!canLeave) return;
                onClose();
                onLeave();
              }}
              disabled={!canLeave}
              className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                canLeave
                  ? "border-rose-200 bg-rose-50 active:bg-rose-100"
                  : "border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <LogOut size={18} color={canLeave ? "#e11d48" : "#94a3b8"} />
              <View className="flex-1">
                <Text
                  className={`text-sm font-bold ${
                    canLeave ? "text-rose-700" : "text-slate-500"
                  }`}
                >
                  Leave hive
                </Text>
                <Text
                  className={`mt-0.5 text-xs ${
                    canLeave ? "text-rose-600/80" : "text-slate-500"
                  }`}
                >
                  {isOwner
                    ? "Owners can't leave — transfer ownership first"
                    : "Removes you from the hive. Your progress on the shared plan stays in your account."}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ───── Screen ──────────────────────────────────────────────────────────────

export default function HiveDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState<TeamChallengeLeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<HiveTab>("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) {
      setError("Missing hive id");
      setDetails(null);
      setLeaderboard([]);
      return;
    }

    const [detailsResult, leaderboardResult, challengeResult] = await Promise.allSettled([
      getTeamDetails(teamId),
      getTeamLeaderboard(teamId),
      getTeamChallengeLeaderboard(teamId),
    ]);

    if (detailsResult.status === "fulfilled") {
      setDetails(detailsResult.value);
      setError(null);
    } else {
      setDetails(null);
      setError(
        detailsResult.reason instanceof Error
          ? detailsResult.reason.message
          : "Couldn't load hive",
      );
    }

    if (leaderboardResult.status === "fulfilled") {
      setLeaderboard(leaderboardResult.value.leaderboard ?? []);
    } else {
      setLeaderboard([]);
    }

    if (challengeResult.status === "fulfilled") {
      setChallengeLeaderboard(challengeResult.value.leaderboard ?? []);
    } else {
      setChallengeLeaderboard([]);
    }
  }, [teamId]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const currentMember = useMemo(
    () => details?.members.find((member) => member.userId === user?.id) ?? null,
    [details, user?.id],
  );

  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin";
  const isMember = currentMember?.status === "active";
  const isMemberArchived = currentMember?.status === "archived";
  const canInvite = Boolean(
    details && isMember && (isOwner || isAdmin || details.team.settings?.allowMemberInvites),
  );
  const canLeave = Boolean(isMember && !isOwner);

  const leaderboardByUserId = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    for (const entry of leaderboard) map.set(entry.userId, entry);
    return map;
  }, [leaderboard]);

  const activeMembers = useMemo(
    () => details?.members.filter((m) => m.status === "active") ?? [],
    [details],
  );
  const archivedMembers = useMemo(
    () => details?.members.filter((m) => m.status === "archived") ?? [],
    [details],
  );

  const totals = useMemo(() => {
    if (leaderboard.length === 0) {
      return {
        avgProgress: 0,
        avgQuiz: 0,
        totalCompleted: 0,
      };
    }
    const sumProgress = leaderboard.reduce((s, e) => s + e.progressPercentage, 0);
    const sumQuiz = leaderboard.reduce((s, e) => s + e.averageQuizScore, 0);
    const totalCompleted = leaderboard.reduce((s, e) => s + e.completedLessons, 0);
    return {
      avgProgress: Math.round(sumProgress / leaderboard.length),
      avgQuiz: Math.round(sumQuiz / leaderboard.length),
      totalCompleted,
    };
  }, [leaderboard]);

  const handleInvite = async () => {
    if (!teamId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }

    try {
      setInviteBusy(true);
      haptics.tap();
      const result = await inviteTeamMember(teamId, { email, expiresInDays: 7 });
      setLatestInviteLink(result.inviteLink);
      setInviteEmail("");
      toast.success(result.message || "Invite created");
      haptics.success();
    } catch (err) {
      haptics.error();
      toast.error(err instanceof Error ? err.message : "Couldn't create invite");
    } finally {
      setInviteBusy(false);
    }
  };

  const shareInviteLink = async () => {
    if (!latestInviteLink) return;
    try {
      haptics.tap();
      await Share.share({
        message: latestInviteLink,
        url: latestInviteLink,
      });
    } catch {
      toast.error("Couldn't open the share sheet");
    }
  };

  const handleLeave = () => {
    if (!teamId || !canLeave) return;
    Alert.alert(
      "Leave hive?",
      "You'll be removed from this hive's leaderboard, challenges, and chat. Your personal progress on the shared course stays in your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave hive",
          style: "destructive",
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveTeam(teamId);
              haptics.success();
              toast.success("You left the hive");
              router.replace("/(tabs)/hives");
            } catch (err) {
              haptics.error();
              toast.error(err instanceof Error ? err.message : "Couldn't leave hive");
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  const openLesson = () => {
    if (!details?.team.pdfId) {
      toast.info("This hive isn't linked to a course yet");
      return;
    }
    haptics.tap();
    router.push({
      pathname: "/course/[pdfId]",
      params: { pdfId: details.team.pdfId },
    });
  };

  const headerBack = () => {
    haptics.tick();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/hives");
  };

  // ───── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable
            onPress={headerBack}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <ChevronLeft size={18} color="#475569" />
          </Pressable>
        </View>
        <View className="gap-4 p-5">
          <Skeleton.Card height={180} />
          <Skeleton.Line width="50%" height={20} />
          <Skeleton.Card height={120} />
          <Skeleton.Card height={120} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !details) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable
            onPress={headerBack}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <ChevronLeft size={18} color="#475569" />
          </Pressable>
        </View>
        <View className="flex-1 p-5">
          <EmptyState
            icon={UsersRound}
            title="Hive unavailable"
            message={error || "This hive could not be loaded right now."}
            action={{
              label: "Back to Hives",
              onPress: () => router.replace("/(tabs)/hives"),
            }}
            secondary={{ label: "Retry", onPress: onRefresh }}
            gradient={{ from: "#f59e0b", to: "#f97316" }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-4 py-2">
          <Pressable
            onPress={headerBack}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <ChevronLeft size={18} color="#475569" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Hive</Text>
            <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
              {details.team.name}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.tick();
              setOverflowOpen(true);
            }}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <MoreHorizontal size={18} color="#475569" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          stickyHeaderIndices={[1]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4f46e5"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Index 0: hero + lesson CTA */}
          <View className="px-5 pt-5 pb-4 gap-4">
            <View
              className="overflow-hidden rounded-3xl bg-slate-900 p-5"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 5,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/25"
              />
              <View className="flex-row items-start gap-4">
                <GradientIcon size={54} radius={18} from="#f59e0b" to="#f97316">
                  <UsersRound size={24} color="#ffffff" />
                </GradientIcon>
                <View className="flex-1">
                  <View className="self-start rounded-full bg-white/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-white/80">
                      {isMemberArchived
                        ? "You left this hive"
                        : isOwner
                        ? "You own this hive"
                        : isAdmin
                        ? "You're an admin"
                        : "You're a member"}
                    </Text>
                  </View>
                  <Text className="mt-3 text-2xl font-extrabold text-white" numberOfLines={2}>
                    {details.team.name}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-white/75">
                    {details.team.description ||
                      "Shared pace, shared goals, shared accountability."}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-white/10 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-white/85">
                    {activeMembers.length} active
                  </Text>
                </View>
                <View className="rounded-full bg-white/10 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-white/85">
                    {details.team.settings?.isPublic ? "Public" : "Invite only"}
                  </Text>
                </View>
                {details.team.hiveLevel != null ? (
                  <View className="rounded-full bg-white/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white/85">
                      Lv {details.team.hiveLevel}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Big lesson CTA — the whole point of a hive is the shared study plan */}
            {details.team.pdfId ? (
              <Pressable
                onPress={openLesson}
                className="overflow-hidden rounded-3xl border border-indigo-200 bg-white p-4 active:bg-slate-50"
                style={{
                  shadowColor: "#4f46e5",
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <GradientIcon size={44} radius={14} from="#06b6d4" to="#4f46e5">
                    <BookOpen size={20} color="#ffffff" />
                  </GradientIcon>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                      Shared course
                    </Text>
                    <Text className="mt-1 text-base font-bold text-slate-900">
                      Continue the lesson
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Open the hive's study plan and pick up where you left off
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#475569" />
                </View>
              </Pressable>
            ) : null}
          </View>

          {/* Index 1: sticky tab bar */}
          <TabBar active={activeTab} onChange={setActiveTab} />

          {/* Index 2+: tab content */}
          <View className="flex-1 px-5 py-5 gap-4 pb-12">
            {activeTab === "members" ? (
              <View className="gap-4">
                <TabHeader
                  title="Members"
                  subtitle="Roles, progress, and quiz averages for everyone in the hive"
                  count={activeMembers.length}
                  icon={<UsersRound size={18} color="#4f46e5" />}
                />
                {canInvite ? (
                  <View className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-4 gap-3">
                    <View className="flex-row items-center gap-2">
                      <Sparkles size={14} color="#4f46e5" />
                      <Text className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                        Invite teammates
                      </Text>
                    </View>
                    <Input
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="teammate@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={handleInvite}
                        disabled={inviteBusy}
                        className={`flex-1 h-11 flex-row items-center justify-center gap-2 rounded-full ${
                          inviteBusy ? "bg-slate-200" : "bg-indigo-600 active:bg-indigo-700"
                        }`}
                      >
                        {inviteBusy ? (
                          <ActivityIndicator size="small" color="#475569" />
                        ) : (
                          <Send size={14} color="#ffffff" />
                        )}
                        <Text
                          className={`text-sm font-semibold ${
                            inviteBusy ? "text-slate-500" : "text-white"
                          }`}
                        >
                          {inviteBusy ? "Sending…" : "Send invite"}
                        </Text>
                      </Pressable>
                      {latestInviteLink ? (
                        <Pressable
                          onPress={shareInviteLink}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 active:bg-slate-50"
                        >
                          <Text className="text-sm font-semibold text-slate-700">Share link</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {archivedMembers.length > 0 ? (
                  <Text className="text-xs font-semibold text-slate-400">
                    {archivedMembers.length} archived members
                  </Text>
                ) : null}

                <View className="gap-3">
                  {activeMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      rank={leaderboardByUserId.get(member.userId)}
                    />
                  ))}
                  {archivedMembers.length > 0 ? (
                    <>
                      <Text className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Archived
                      </Text>
                      {archivedMembers.map((member) => (
                        <MemberRow
                          key={member.id}
                          member={member}
                          rank={leaderboardByUserId.get(member.userId)}
                        />
                      ))}
                    </>
                  ) : null}
                </View>
              </View>
            ) : activeTab === "progress" ? (
              <View className="gap-3">
                <TabHeader
                  title="Progress leaderboard"
                  subtitle="Ranked by lessons completed and average quiz score"
                  count={leaderboard.length}
                  icon={<Trophy size={18} color="#4f46e5" />}
                />
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => <ProgressRow key={entry.userId} entry={entry} />)
                ) : (
                  <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 items-center">
                    <Trophy size={28} color="#94a3b8" />
                    <Text className="mt-3 text-sm font-bold text-slate-900">
                      No progress yet
                    </Text>
                    <Text className="mt-1 text-center text-xs text-slate-500">
                      As members move through lessons and quizzes, they'll rank up here.
                    </Text>
                  </View>
                )}
              </View>
            ) : activeTab === "challenges" ? (
              <View className="gap-3">
                <TabHeader
                  title="Challenge leaderboard"
                  subtitle="Head-to-head wins, win rate, and average score"
                  count={challengeLeaderboard.length}
                  icon={<Swords size={18} color="#4f46e5" />}
                />
                {challengeLeaderboard.length > 0 ? (
                  challengeLeaderboard.map((entry) => (
                    <ChallengeRow key={entry.userId} entry={entry} />
                  ))
                ) : (
                  <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 items-center">
                    <Swords size={28} color="#94a3b8" />
                    <Text className="mt-3 text-sm font-bold text-slate-900">
                      No challenges yet
                    </Text>
                    <Text className="mt-1 text-center text-xs text-slate-500">
                      Once members start playing 1v1 challenges, win rates show up here.
                    </Text>
                  </View>
                )}
              </View>
            ) : activeTab === "analytics" ? (
              <View className="gap-3">
                <TabHeader
                  title="Analytics"
                  subtitle="Rolled-up stats across every active member"
                  icon={<BarChart3 size={18} color="#4f46e5" />}
                />
                <View className="flex-row gap-3">
                  <StatCard
                    label="Avg progress"
                    value={`${totals.avgProgress}%`}
                    accent="indigo"
                    icon={<Trophy size={16} color="#4f46e5" />}
                  />
                  <StatCard
                    label="Avg quiz"
                    value={`${totals.avgQuiz}%`}
                    accent="emerald"
                    icon={<BarChart3 size={16} color="#059669" />}
                  />
                </View>
                <View className="flex-row gap-3">
                  <StatCard
                    label="Lessons cleared"
                    value={totals.totalCompleted}
                    accent="amber"
                    icon={<BookOpen size={16} color="#b45309" />}
                  />
                  <StatCard
                    label="Active"
                    value={activeMembers.length}
                    accent="rose"
                    icon={<UsersRound size={16} color="#e11d48" />}
                  />
                </View>
                <View className="rounded-2xl border border-slate-200 bg-white p-4">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Roll-up
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-700">
                    These stats average across every active member of the hive. They refresh whenever you pull-to-refresh. Per-member breakdowns live on the Members tab.
                  </Text>
                </View>
              </View>
            ) : activeTab === "chat" ? (
              <View className="gap-3">
                <TabHeader
                  title="Chat"
                  subtitle="Realtime hive thread for coordinating studies"
                  icon={<MessageSquare size={18} color="#4f46e5" />}
                />
                <View className="rounded-3xl border border-dashed border-indigo-200 bg-white p-6 items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
                    <MessageSquare size={22} color="#4f46e5" />
                  </View>
                  <Text className="mt-4 text-base font-extrabold text-slate-900">
                    Hive chat is coming
                  </Text>
                  <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
                    The backend channel is ready — the mobile composer is the last piece. Until then, use Challenges and the leaderboards to stay coordinated.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OverflowSheet
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        onLeave={handleLeave}
        canLeave={canLeave && !leaving}
        isOwner={!!isOwner}
      />
    </SafeAreaView>
  );
}
