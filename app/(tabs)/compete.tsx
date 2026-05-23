import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Award,
  ChevronRight,
  Crown,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { GradientIcon } from "@/components/GradientIcon";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { hasPremiumFeatureAccess } from "@/lib/premium-access";
import {
  getUserRank,
  getUserStudyPlans,
  type PassportCourse,
  type UserRank,
} from "@/lib/api";

interface HubRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: { label: string; tone: "amber" | "emerald" | "indigo" | "rose" };
  onPress: () => void;
  locked?: boolean;
}

const TONE: Record<NonNullable<HubRowProps["badge"]>["tone"], string> = {
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  indigo: "bg-indigo-100 text-indigo-700",
  rose: "bg-rose-100 text-rose-700",
};

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

export default function CompeteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const isPremium = hasPremiumFeatureAccess(user);

  const [plans, setPlans] = useState<PassportCourse[]>([]);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [r, p] = await Promise.allSettled([getUserRank(), getUserStudyPlans()]);
    if (r.status === "fulfilled") setRank(r.value);
    if (p.status === "fulfilled") setPlans(p.value);
    if (r.status === "rejected" && p.status === "rejected") {
      toast.error("Couldn't load compete stats");
    }
  }, [toast]);

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
          <Skeleton.Card height={88} />
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
              <GradientIcon size={48} radius={14} from="#a78bfa" to="#6366f1">
                <Trophy size={22} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-wider font-semibold text-white/60">
                  Current rank
                </Text>
                <Text className="text-2xl font-extrabold text-white mt-1" numberOfLines={1}>
                  {rank?.title ?? "Unranked"}
                </Text>
                <Text className="text-sm text-white/70 mt-1">
                  {rank?.totalMastery ?? 0} mastery · {stampCount} passport{" "}
                  {stampCount === 1 ? "stamp" : "stamps"}
                </Text>
              </View>
            </View>
            {rank?.nextTitle && rank.pointsToNext != null && rank.pointsToNext > 0 ? (
              <Text className="text-xs text-white/60 mt-3">
                {rank.pointsToNext} mastery to {rank.nextTitle}
              </Text>
            ) : null}
          </View>

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
