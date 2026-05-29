import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Award,
  ChevronRight,
  Crown,
  Flame,
  Sparkles,
  Swords,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { GradientIcon } from "@/components/GradientIcon";
import { KnowmadRankBadge } from "@/components/KnowmadRankBadge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { hasPremiumFeatureAccess } from "@/lib/premium-access";
import {
  getLeague,
  getUserActivity,
  getUserRank,
  getUserStudyPlans,
  type LeagueData,
  type LeagueMember,
  type LeagueTier,
  type PassportCourse,
  type UserActivity,
  type UserRank,
} from "@/lib/api";

interface HubRowProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: { label: string; tone: "amber" | "emerald" | "indigo" | "rose" };
  onPress: () => void;
  locked?: boolean;
}

type LeaguePreviewTone = "leader" | "user" | "danger";

const TONE: Record<NonNullable<HubRowProps["badge"]>["tone"], string> = {
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  indigo: "bg-indigo-100 text-indigo-700",
  rose: "bg-rose-100 text-rose-700",
};

const LEAGUE_LABELS: Record<LeagueTier, string> = {
  bronze: "Bronze League",
  silver: "Silver League",
  gold: "Gold League",
};

function toLocalKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatLeagueRules(
  memberCount: number,
  promotion: number,
  relegation: number,
): string {
  const memberLabel = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
  if (promotion === 0 && relegation === 0) return `${memberLabel} · Resets Monday`;
  if (relegation === 0) return `${memberLabel} · Top ${promotion} promote`;
  return `${memberLabel} · Top ${promotion} promote · Bottom ${relegation} relegate`;
}

function HubRow({ icon, title, subtitle, badge, onPress, locked }: HubRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50 ${
        locked ? "opacity-90" : ""
      }`}
    >
      {icon}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-slate-900">{title}</Text>
          {locked ? (
            <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5">
              <Crown size={10} color="#b45309" />
              <Text className="text-[10px] font-bold text-amber-700">
                Premium
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
      </View>
      {badge ? (
        <View className={`rounded-full px-3 py-1 ${TONE[badge.tone].split(" ")[0]}`}>
          <Text className={`text-xs font-bold ${TONE[badge.tone].split(" ")[1]}`}>
            {badge.label}
          </Text>
        </View>
      ) : null}
      <ChevronRight size={18} color="#94a3b8" />
    </Pressable>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-extrabold text-slate-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LeaguePreviewRow({
  member,
  tone,
}: {
  member: LeagueMember;
  tone: LeaguePreviewTone;
}) {
  const cardTone =
    tone === "leader"
      ? "border-amber-100 bg-amber-50"
      : tone === "danger"
        ? "border-rose-100 bg-rose-50"
        : "border-indigo-200 bg-indigo-50";

  const badgeTone =
    tone === "leader"
      ? "bg-amber-500 text-white"
      : tone === "danger"
        ? "bg-rose-500 text-white"
        : "bg-indigo-600 text-white";

  return (
    <View className={`flex-row items-center gap-3 rounded-2xl border px-3 py-3 ${cardTone}`}>
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${badgeTone}`}>
        <Text className="text-xs font-extrabold">{member.rank}</Text>
      </View>
      <View className="flex-1 flex-row items-center gap-2">
        <Text className="flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
          {member.isUser ? "You" : member.name}
        </Text>
        {tone === "leader" ? <TrendingUp size={14} color="#b45309" /> : null}
        {tone === "danger" ? <TrendingDown size={14} color="#dc2626" /> : null}
        {member.isUser ? <Crown size={14} color="#4f46e5" /> : null}
      </View>
      <Text className="text-sm font-extrabold text-slate-900">{member.weeklyMastery}</Text>
    </View>
  );
}

export default function CompeteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const isPremium = hasPremiumFeatureAccess(user);

  const [plans, setPlans] = useState<PassportCourse[]>([]);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [rankResult, plansResult, activityResult, leagueResult] = await Promise.allSettled([
      getUserRank(),
      getUserStudyPlans(),
      getUserActivity(),
      isPremium ? getLeague() : Promise.resolve<LeagueData | null>(null),
    ] as const);

    if (rankResult.status === "fulfilled") setRank(rankResult.value);
    if (plansResult.status === "fulfilled") setPlans(plansResult.value);
    if (activityResult.status === "fulfilled") setActivity(activityResult.value);
    if (!isPremium) {
      setLeague(null);
    } else if (leagueResult.status === "fulfilled") {
      setLeague(leagueResult.value);
    }

    if (
      rankResult.status === "rejected" &&
      plansResult.status === "rejected" &&
      activityResult.status === "rejected" &&
      (!isPremium || leagueResult.status === "rejected")
    ) {
      toast.error("Couldn't load compete stats");
    }
  }, [isPremium, toast]);

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

  const stampCount = plans.filter(
    (p) => p.isComplete && !p.archivedAt,
  ).length;

  const lastSevenDays = useMemo(() => {
    const activitySet = new Set(activity?.activityDates ?? []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = toLocalKey(date);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
        dayNumber: date.getDate(),
        active: activitySet.has(key),
        isToday: key === toLocalKey(today),
      };
    });
  }, [activity?.activityDates]);

  const activeDayCount = lastSevenDays.filter((day) => day.active).length;

  const topLeagueMembers = useMemo(
    () => league?.members.slice(0, Math.min(3, league.members.length)) ?? [],
    [league],
  );

  const userLeagueMember = useMemo(
    () => league?.members.find((member) => member.isUser) ?? null,
    [league],
  );

  const pressureMember = useMemo(() => {
    if (!league || league.relegationCount <= 0) return null;

    const relegationStartRank = league.members.length - league.relegationCount + 1;
    const lastMember = league.members[league.members.length - 1] ?? null;
    const cutoffMember = league.members[league.members.length - league.relegationCount] ?? null;

    if (league.userRank >= relegationStartRank) return lastMember;
    if (league.userRank === relegationStartRank - 1) return cutoffMember;
    return null;
  }, [league]);

  const topLeagueRanks = new Set(topLeagueMembers.map((member) => member.rank));
  const showUserLeagueRow = userLeagueMember && !topLeagueRanks.has(userLeagueMember.rank);
  const showPressureRow =
    pressureMember &&
    !topLeagueRanks.has(pressureMember.rank) &&
    pressureMember.rank !== userLeagueMember?.rank;

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-3">
        <View className="self-start flex-row items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5">
          <Sparkles size={14} color="#7c3aed" />
          <Text className="text-xs font-semibold text-violet-700">Compete</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900">Compete</Text>
        <Text className="text-sm text-slate-500 leading-6">
          League, passport, and challenges — everything ranked.
        </Text>
      </View>

      {loading ? (
        <View className="gap-3">
          <Skeleton.Card height={130} />
          <Skeleton.Card height={220} />
          <Skeleton.Card height={210} />
          <Skeleton.Card height={88} />
          <Skeleton.Card height={88} />
        </View>
      ) : (
        <View className="gap-3 pb-8">
          <View
            className="overflow-hidden rounded-3xl bg-slate-900 p-5"
            style={{
              shadowColor: "#312e81",
              shadowOpacity: 0.2,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}
          >
            <View
              pointerEvents="none"
              className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-violet-500/30"
            />
            <View
              pointerEvents="none"
              className="absolute -left-10 bottom-[-30px] h-36 w-36 rounded-full bg-amber-400/20"
            />
            <View className="flex-row items-start gap-3">
              <KnowmadRankBadge level={rank?.level ?? 1} size={48} />
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-wider font-semibold text-white/60">
                  Knowmad Level{typeof rank?.level === "number" ? ` ${rank.level}` : ""}
                </Text>
                <Text className="text-2xl font-extrabold text-white mt-1" numberOfLines={1}>
                  {rank?.title ?? "Unranked"}
                </Text>
                <Text className="text-sm text-white/70 mt-1">
                  {(rank?.lifetimeMastery ?? rank?.totalMastery ?? 0).toLocaleString()} lifetime mastery · {stampCount}{" "}
                  passport {stampCount === 1 ? "stamp" : "stamps"}
                </Text>
              </View>
            </View>
            {rank?.nextTitle && (rank.masteryToNext ?? rank.pointsToNext) != null && (rank.masteryToNext ?? rank.pointsToNext ?? 0) > 0 ? (
              <Text className="text-xs text-white/60 mt-3">
                {(rank.masteryToNext ?? rank.pointsToNext)?.toLocaleString()} mastery to {rank.nextTitle}
              </Text>
            ) : null}

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="flex-row items-center gap-1 rounded-full bg-white/12 px-3 py-1.5">
                <Flame size={12} color="#fda4af" />
                <Text className="text-xs font-semibold text-white">
                  {activity?.currentStreak ?? 0}-day streak
                </Text>
              </View>
              {league ? (
                <View className="flex-row items-center gap-1 rounded-full bg-white/12 px-3 py-1.5">
                  <Crown size={12} color="#fbbf24" />
                  <Text className="text-xs font-semibold text-white">
                    {LEAGUE_LABELS[league.tier]} · #{league.userRank}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {isPremium && league ? (
            <View className="rounded-3xl border border-slate-200 bg-white p-4 gap-4">
              <View className="flex-row items-start gap-3">
                <GradientIcon size={44} radius={14} from="#fbbf24" to="#f59e0b">
                  <Crown size={20} color="#ffffff" />
                </GradientIcon>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">Weekly League</Text>
                  <Text className="mt-0.5 text-xs leading-5 text-slate-500">
                    {LEAGUE_LABELS[league.tier]} · {formatLeagueRules(
                      league.members.length,
                      league.promotionCount,
                      league.relegationCount,
                    )}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/league")}
                  className="rounded-full bg-slate-100 px-3 py-2 active:bg-slate-200"
                >
                  <Text className="text-xs font-semibold text-slate-700">View all</Text>
                </Pressable>
              </View>

              <View className="gap-2">
                {topLeagueMembers.map((member) => (
                  <LeaguePreviewRow key={`top-${member.rank}`} member={member} tone="leader" />
                ))}

                {showUserLeagueRow ? (
                  <View className="pt-1 gap-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                      Your position
                    </Text>
                    <LeaguePreviewRow member={userLeagueMember} tone="user" />
                  </View>
                ) : null}

                {showPressureRow ? (
                  <View className="pt-1 gap-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">
                      Bottom pressure
                    </Text>
                    <LeaguePreviewRow member={pressureMember} tone="danger" />
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <HubRow
              icon={
                <GradientIcon size={44} radius={14} from="#fbbf24" to="#f59e0b">
                  <Crown size={20} color="#ffffff" />
                </GradientIcon>
              }
              title="Weekly League"
              subtitle="Compete with learners at your tier. Promote, relegate, repeat."
              locked={!isPremium}
              onPress={() => router.push("/league")}
            />
          )}

          <View className="rounded-3xl border border-slate-200 bg-white p-4 gap-4">
            <View className="flex-row items-start gap-3">
              <GradientIcon size={44} radius={14} from="#fb7185" to="#ef4444">
                <Flame size={20} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Last 7 days</Text>
                <Text className="mt-0.5 text-xs leading-5 text-slate-500">
                  Keep your streak alive to protect your spot and keep climbing.
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/profile")}
                className="rounded-full bg-slate-100 px-3 py-2 active:bg-slate-200"
              >
                <Text className="text-xs font-semibold text-slate-700">View all</Text>
              </Pressable>
            </View>

            <View className="flex-row gap-3">
              <SummaryStat label="Streak" value={`${activity?.currentStreak ?? 0} days`} />
              <SummaryStat label="Rank" value={rank?.title ?? "Unranked"} />
            </View>

            <View className="flex-row justify-between gap-2">
              {lastSevenDays.map((day) => (
                <View key={day.key} className="flex-1 items-center gap-2">
                  <Text
                    className={`text-[11px] font-semibold ${
                      day.isToday ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {day.label}
                  </Text>
                  <View
                    className={day.active ? "w-full rounded-2xl bg-indigo-500" : "w-full rounded-2xl bg-slate-100"}
                    style={{
                      height: 48,
                      borderWidth: day.isToday ? 1.5 : 1,
                      borderColor: day.isToday
                        ? "#0f172a"
                        : day.active
                          ? "#c7d2fe"
                          : "#e2e8f0",
                    }}
                  />
                  <Text
                    className={`text-[11px] ${day.isToday ? "font-bold text-slate-800" : "text-slate-400"}`}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="text-xs text-slate-500">
              {activeDayCount} of 7 days active this week
            </Text>
          </View>

          <HubRow
            icon={
              <GradientIcon size={44} radius={14} from="#a78bfa" to="#8b5cf6">
                <Award size={20} color="#ffffff" />
              </GradientIcon>
            }
            title="Knowledge Passport"
            subtitle="Collect tiered stamps for every course you master."
            badge={
              stampCount > 0
                ? { label: `${stampCount} stamp${stampCount === 1 ? "" : "s"}`, tone: "indigo" }
                : undefined
            }
            onPress={() => router.push("/passport")}
          />

          <HubRow
            icon={
              <GradientIcon size={44} radius={14} from="#f43f5e" to="#ec4899">
                <Swords size={20} color="#ffffff" />
              </GradientIcon>
            }
            title="1v1 Challenges"
            subtitle="Race a friend through a timed quiz on any lesson."
            onPress={() => router.push("/challenges")}
          />
        </View>
      )}
    </ScreenContainer>
  );
}
