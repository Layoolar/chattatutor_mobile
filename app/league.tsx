import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Crown,
  Info,
  Medal,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { hasPremiumFeatureAccess } from "@/lib/premium-access";
import { getLeague, type LeagueData, type LeagueMember, type LeagueTier } from "@/lib/api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

const TIER_CONFIG: Record<
  LeagueTier,
  { label: string; emoji: string; from: string; to: string }
> = {
  gold: { label: "Gold League", emoji: "🥇", from: "#fbbf24", to: "#f59e0b" },
  silver: { label: "Silver League", emoji: "🥈", from: "#cbd5e1", to: "#94a3b8" },
  bronze: { label: "Bronze League", emoji: "🥉", from: "#fb923c", to: "#d97706" },
};

function formatLeagueRules(
  memberCount: number,
  promotion: number,
  relegation: number,
): string {
  const m = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
  if (promotion === 0 && relegation === 0) return `${m} · Resets Monday`;
  if (relegation === 0) {
    return `${m} · Top ${promotion} promote · No relegation yet`;
  }
  return `${m} · Top ${promotion} promote · Bottom ${relegation} relegate`;
}

interface RowProps {
  member: LeagueMember;
  zone: "promotion" | "safe" | "relegation";
}

function MemberRow({ member, zone }: RowProps) {
  const zoneStyle =
    zone === "promotion"
      ? "border-emerald-100 bg-emerald-50"
      : zone === "relegation"
        ? "border-rose-100 bg-rose-50"
        : "border-slate-200 bg-white";

  const indicator =
    zone === "promotion" ? (
      <TrendingUp size={14} color="#059669" />
    ) : zone === "relegation" ? (
      <TrendingDown size={14} color="#dc2626" />
    ) : null;

  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border-2 p-3 ${
        member.isUser ? "border-indigo-300 bg-indigo-50" : zoneStyle
      }`}
    >
      <View
        className={`w-9 h-9 rounded-lg items-center justify-center ${
          member.isUser ? "bg-indigo-600" : "bg-white"
        }`}
        style={{
          borderWidth: member.isUser ? 0 : 1,
          borderColor: "#e2e8f0",
        }}
      >
        <Text
          className={`text-xs font-extrabold ${
            member.isUser ? "text-white" : "text-slate-700"
          }`}
        >
          {member.rank}
        </Text>
      </View>
      <View className="flex-1 flex-row items-center gap-2">
        <Text
          className={`text-sm font-bold ${
            member.isUser ? "text-indigo-900" : "text-slate-900"
          }`}
          numberOfLines={1}
        >
          {member.isUser ? "You" : member.name}
        </Text>
        {member.isUser ? <Crown size={14} color="#4f46e5" /> : null}
        {indicator}
      </View>
      <Text className="text-sm font-extrabold text-slate-900">
        {member.weeklyMastery}
      </Text>
    </View>
  );
}

export default function LeagueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const isPremium = hasPremiumFeatureAccess(user);

  const [league, setLeague] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(isPremium);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isPremium) return;
    try {
      const data = await getLeague();
      setLeague(data);
      void markFeatureDiscovered("league-visit");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load league");
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

  const zones = useMemo(() => {
    if (!league) return { promo: [], safe: [], releg: [] };
    const promo = league.members.slice(0, league.promotionCount);
    const releg =
      league.relegationCount > 0
        ? league.members.slice(league.members.length - league.relegationCount)
        : [];
    const safe = league.members.slice(
      league.promotionCount,
      league.relegationCount > 0
        ? league.members.length - league.relegationCount
        : league.members.length,
    );
    return { promo, safe, releg };
  }, [league]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-2 border-b border-slate-100">
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center bg-white border border-slate-200"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-slate-500">Weekly league</Text>
          <Text className="text-base font-bold text-slate-900">
            {league ? TIER_CONFIG[league.tier].label : "Standings"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-12 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
            colors={["#4f46e5"]}
          />
        }
      >
        {!isPremium ? (
          <View className="items-center gap-4 pt-8">
            <GradientIcon size={88} radius={26} from="#fbbf24" to="#f59e0b">
              <Crown size={40} color="#ffffff" />
            </GradientIcon>
            <View className="rounded-full bg-amber-100 px-3 py-1.5">
              <Text className="text-xs font-bold text-amber-700">
                Premium feature
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-slate-900 text-center">
              Weekly Leagues
            </Text>
            <Text className="text-sm leading-6 text-slate-600 text-center max-w-xs">
              Compete in your tier against learners with similar mastery. Top
              promote, bottom relegate, weekly reset.
            </Text>
            <Pressable
              onPress={() => router.push("/profile")}
              className="h-12 px-8 rounded-full bg-slate-900 active:bg-slate-800 flex-row items-center"
            >
              <Crown size={16} color="#ffffff" />
              <Text className="ml-2 text-sm font-semibold text-white">
                See plans in Profile
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(tabs)")
              }
              className="h-11 px-6 rounded-full"
            >
              <Text className="text-sm font-medium text-slate-500">Maybe later</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View className="gap-3">
            <Skeleton.Card height={120} />
            <Skeleton.Card height={56} />
            <Skeleton.Card height={56} />
            <Skeleton.Card height={56} />
            <Skeleton.Card height={56} />
          </View>
        ) : !league ? (
          <View className="items-center gap-3 pt-12">
            <Text className="text-sm text-slate-600 text-center">
              League data unavailable. Pull down to retry.
            </Text>
          </View>
        ) : (
          <View className="gap-5">
            <View
              className="overflow-hidden rounded-3xl p-5"
              style={{
                backgroundColor: TIER_CONFIG[league.tier].from,
                shadowColor: TIER_CONFIG[league.tier].to,
                shadowOpacity: 0.25,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: TIER_CONFIG[league.tier].to,
                  opacity: 0.35,
                }}
              />
              <View className="flex-row items-start gap-3">
                <View className="w-12 h-12 rounded-2xl bg-white/30 items-center justify-center">
                  <Text className="text-2xl">{TIER_CONFIG[league.tier].emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-wider font-semibold text-white/80">
                    {TIER_CONFIG[league.tier].label}
                  </Text>
                  <Text className="text-2xl font-extrabold text-white mt-1">
                    Rank {league.userRank}
                  </Text>
                  <Text className="text-xs text-white/80 mt-1">
                    {formatLeagueRules(
                      league.members.length,
                      league.promotionCount,
                      league.relegationCount,
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
              <Info size={14} color="#4f46e5" />
              <Text className="flex-1 text-xs leading-5 text-slate-700">
                Earn weekly mastery by completing lessons, drills, and quizzes.
                Standings refresh on Monday.
              </Text>
            </View>

            {zones.promo.length > 0 ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <TrendingUp size={14} color="#059669" />
                  <Text className="text-xs uppercase tracking-wider font-bold text-emerald-700">
                    Promotion zone
                  </Text>
                </View>
                {zones.promo.map((m) => (
                  <MemberRow key={m.rank} member={m} zone="promotion" />
                ))}
              </View>
            ) : null}

            {zones.safe.length > 0 ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Medal size={14} color="#475569" />
                  <Text className="text-xs uppercase tracking-wider font-bold text-slate-600">
                    Safe zone
                  </Text>
                </View>
                {zones.safe.map((m) => (
                  <MemberRow key={m.rank} member={m} zone="safe" />
                ))}
              </View>
            ) : null}

            {zones.releg.length > 0 ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <TrendingDown size={14} color="#dc2626" />
                  <Text className="text-xs uppercase tracking-wider font-bold text-rose-700">
                    Relegation zone
                  </Text>
                </View>
                {zones.releg.map((m) => (
                  <MemberRow key={m.rank} member={m} zone="relegation" />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
