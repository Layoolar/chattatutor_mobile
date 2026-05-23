import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Sparkles, Trophy, UsersRound } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { GradientIcon } from "@/components/GradientIcon";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import {
  getTeamDetails,
  getTeamLeaderboard,
  type LeaderboardEntry,
  type TeamDetails,
  type TeamMember,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

function MemberRow({ member }: { member: TeamMember }) {
  const label = member.username || member.user?.name || member.email || "Member";

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {label}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">
          {member.role} • {member.status}
        </Text>
      </View>
      <View className="rounded-full bg-slate-100 px-3 py-1.5">
        <Text className="text-xs font-semibold text-slate-600">
          {member.status === "archived" ? "Archived" : "In hive"}
        </Text>
      </View>
    </View>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
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
          {Math.round(entry.progressPercentage)}% progress • {Math.round(entry.averageQuizScore)} avg quiz
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

export default function HiveDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const router = useRouter();
  const toast = useToast();

  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teamId) {
      setError("Missing hive id");
      setDetails(null);
      setLeaderboard([]);
      return;
    }

    const [detailsResult, leaderboardResult] = await Promise.allSettled([
      getTeamDetails(teamId),
      getTeamLeaderboard(teamId),
    ]);

    if (detailsResult.status === "fulfilled") {
      setDetails(detailsResult.value);
      setError(null);
    } else {
      const message =
        detailsResult.reason instanceof Error
          ? detailsResult.reason.message
          : "Couldn't load hive";
      setDetails(null);
      setError(message);
    }

    if (leaderboardResult.status === "fulfilled") {
      setLeaderboard(leaderboardResult.value.leaderboard ?? []);
    } else {
      setLeaderboard([]);
      if (detailsResult.status === "fulfilled") {
        toast.error(
          leaderboardResult.reason instanceof Error
            ? leaderboardResult.reason.message
            : "Couldn't load leaderboard",
        );
      }
    }
  }, [teamId, toast]);

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

  const activeMembers = useMemo(
    () => details?.members.filter((member) => member.status === "active") ?? [],
    [details],
  );
  const archivedMembers = useMemo(
    () => details?.members.filter((member) => member.status === "archived") ?? [],
    [details],
  );
  const topLeaderboard = leaderboard.slice(0, 5);
  const averageProgress =
    leaderboard.length > 0
      ? Math.round(
          leaderboard.reduce((sum, entry) => sum + entry.progressPercentage, 0) /
            leaderboard.length,
        )
      : 0;

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-4">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/hives"))}
          className="self-start flex-row items-center gap-1 rounded-full bg-white px-3 py-2 border border-slate-200 active:bg-slate-50"
        >
          <ChevronLeft size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-900">Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="gap-4 pb-8">
          <Skeleton.Card height={180} />
          <Skeleton.Card height={120} />
          <Skeleton.Card height={220} />
        </View>
      ) : error || !details ? (
        <EmptyState
          icon={UsersRound}
          title="Hive unavailable"
          message={error || "This hive could not be loaded right now."}
          action={{
            label: "Back to Hives",
            onPress: () => router.replace("/(tabs)/hives"),
          }}
          secondary={{
            label: "Retry",
            onPress: onRefresh,
          }}
          gradient={{ from: "#f59e0b", to: "#f97316" }}
        />
      ) : (
        <View className="gap-5 pb-8">
          <View
            className="overflow-hidden rounded-3xl bg-slate-900 p-5"
            style={{
              shadowColor: "#312e81",
              shadowOpacity: 0.16,
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
                    {details.team.membershipStatus === "archived" ? "Archived hive" : "Hive room"}
                  </Text>
                </View>
                <Text className="mt-3 text-2xl font-extrabold text-white">
                  {details.team.name}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-white/75">
                  {details.team.description || "Shared pace, shared goals, shared accountability."}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-xs font-semibold text-white/85">
                  {details.members.length} members
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
                    Hive level {details.team.hiveLevel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <UsersRound size={18} color="#4f46e5" />
              </View>
              <Text className="mt-3 text-xs text-slate-500">Active members</Text>
              <Text className="mt-1 text-xl font-extrabold text-slate-900">
                {activeMembers.length}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Trophy size={18} color="#059669" />
              </View>
              <Text className="mt-3 text-xs text-slate-500">Avg progress</Text>
              <Text className="mt-1 text-xl font-extrabold text-slate-900">
                {averageProgress}%
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Leaderboard
              </Text>
              <Text className="text-xs font-semibold text-slate-400">
                {leaderboard.length} ranked
              </Text>
            </View>
            {topLeaderboard.length > 0 ? (
              <View className="gap-3">
                {topLeaderboard.map((entry) => (
                  <LeaderboardRow key={entry.userId} entry={entry} />
                ))}
              </View>
            ) : (
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text className="text-sm font-semibold text-slate-900">
                  No leaderboard data yet
                </Text>
                <Text className="mt-1 text-sm leading-6 text-slate-500">
                  Once members start moving through lessons and quizzes, the ranking shows up here.
                </Text>
              </View>
            )}
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Members
              </Text>
              <Text className="text-xs font-semibold text-slate-400">
                {archivedMembers.length > 0
                  ? `${activeMembers.length} active • ${archivedMembers.length} archived`
                  : `${activeMembers.length} active`}
              </Text>
            </View>
            <View className="gap-3">
              {details.members.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </View>
          </View>

          <Button title="Back to Hives" variant="secondary" onPress={() => router.replace("/(tabs)/hives")} />
        </View>
      )}
    </ScreenContainer>
  );
}