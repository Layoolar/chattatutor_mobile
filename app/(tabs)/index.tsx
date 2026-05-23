import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Flame, Sparkles, Trophy } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import {
  getUserActivity,
  getUserRank,
  getUserTokens,
  type TokenUsageData,
  type UserActivity,
  type UserRank,
} from "@/lib/api";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
}

function StatCard({ icon, label, value, tint }: StatCardProps) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 gap-2">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </View>
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="text-xl font-bold text-slate-900">{value}</Text>
    </View>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const toast = useToast();
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [tokens, setTokens] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [a, r, t] = await Promise.allSettled([
      getUserActivity(),
      getUserRank(),
      getUserTokens(),
    ]);
    if (a.status === "fulfilled") setActivity(a.value);
    if (r.status === "fulfilled") setRank(r.value);
    if (t.status === "fulfilled") setTokens(t.value);
    const firstFailure = [a, r, t].find((p) => p.status === "rejected");
    if (firstFailure && firstFailure.status === "rejected") {
      toast.error(
        firstFailure.reason instanceof Error
          ? firstFailure.reason.message
          : "Couldn't refresh your stats",
      );
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

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-sm text-slate-500">Welcome back</Text>
        <Text className="text-2xl font-bold text-slate-900">
          {user?.username ?? "Learner"}
        </Text>
      </View>

      {loading ? (
        <View className="gap-4">
          <View className="flex-row gap-3">
            <Skeleton.Card height={108} />
            <Skeleton.Card height={108} />
          </View>
          <Skeleton.Card height={120} />
        </View>
      ) : (
        <View className="gap-4">
          <View className="flex-row gap-3">
            <StatCard
              icon={<Flame size={20} color="#dc2626" />}
              tint="#fee2e2"
              label="Current streak"
              value={`${activity?.currentStreak ?? 0} days`}
            />
            <StatCard
              icon={<Trophy size={20} color="#ca8a04" />}
              tint="#fef9c3"
              label="Rank"
              value={rank?.title ?? "—"}
            />
          </View>

          <View className="bg-white rounded-2xl border border-slate-200 p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <Sparkles size={18} color="#4f46e5" />
              <Text className="font-semibold text-slate-900">Token usage</Text>
            </View>
            {tokens ? (
              <>
                <Text className="text-sm text-slate-600">
                  {tokens.tokensUsed.toLocaleString()} of{" "}
                  {tokens.tokenLimit.toLocaleString()} used
                </Text>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className="h-2 bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(tokens.usagePercentage, 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-slate-500">
                  Plan: {tokens.plan} · Resets{" "}
                  {new Date(tokens.resetDate).toLocaleDateString()}
                </Text>
              </>
            ) : (
              <Text className="text-sm text-slate-500">No usage data yet.</Text>
            )}
          </View>

          <View className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 gap-1">
            <Text className="font-semibold text-slate-900">Coming next</Text>
            <Text className="text-sm text-slate-600">
              Daily Drill, Quest Board, Echo questions, and your lesson queue will land here
              once the corresponding screens are ported.
            </Text>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
