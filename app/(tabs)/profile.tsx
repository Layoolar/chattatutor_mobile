import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { CalendarCheck, Flame, LogOut } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { GradientIcon } from "@/components/GradientIcon";
import { RankProgressCard } from "@/components/RankProgressCard";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import {
  getUserActivity,
  getUserRank,
  type UserActivity,
  type UserRank,
} from "@/lib/api";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 gap-1">
      <Text className="text-xs text-slate-500 uppercase tracking-wide">{label}</Text>
      <Text className="text-base text-slate-900 font-medium">{value || "—"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    const [a, r] = await Promise.allSettled([getUserActivity(), getUserRank()]);
    if (a.status === "fulfilled") setActivity(a.value);
    if (r.status === "fulfilled") setRank(r.value);
  }, []);

  useEffect(() => {
    (async () => {
      await loadActivity();
      setActivityLoading(false);
    })();
  }, [loadActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadActivity()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't refresh profile");
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadActivity, toast]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.replace("/landing");
  };

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>
        <Text className="text-sm text-slate-500">Account details and preferences.</Text>
      </View>

      <View className="gap-3">
        <Field label="Username" value={user?.username} />
        <Field label="Email" value={user?.email} />
        <Field label="Plan" value={user?.plan ?? "free"} />
        <Field
          label="Email verified"
          value={user?.emailVerified ? "Yes" : "No"}
        />
      </View>

      {rank ? (
        <View className="mt-6">
          <RankProgressCard rank={rank} />
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        <View className="flex-row items-center gap-3">
          <GradientIcon size={40} radius={12} from="#6366f1" to="#7c3aed">
            <CalendarCheck size={18} color="#ffffff" />
          </GradientIcon>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900">
              Activity
            </Text>
            <Text className="text-xs text-slate-500">
              Last 12 weeks of drill + lesson days.
            </Text>
          </View>
          {activity ? (
            <View className="flex-row items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5">
              <Flame size={12} color="#dc2626" />
              <Text className="text-xs font-semibold text-rose-700">
                {activity.currentStreak}-day
              </Text>
            </View>
          ) : null}
        </View>
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          {activityLoading ? (
            <Skeleton.Line width="100%" height={92} />
          ) : (
            <ActivityHeatmap activityDates={activity?.activityDates ?? []} />
          )}
        </View>
      </View>

      <View className="mt-8">
        <Button
          title="Sign out"
          variant="secondary"
          onPress={handleSignOut}
        />
      </View>

      <View className="flex-row items-center justify-center gap-2 mt-4 opacity-60">
        <LogOut size={14} color="#94a3b8" />
        <Text className="text-xs text-slate-400">You'll be returned to the landing screen.</Text>
      </View>
    </ScreenContainer>
  );
}
