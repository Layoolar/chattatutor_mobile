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
import { ArrowLeft, Award, Stamp } from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/lib/toast";
import { getUserStudyPlans, type PassportCourse } from "@/lib/api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

type Tier = "platinum" | "gold" | "silver" | "bronze";

interface TierConfig {
  label: string;
  from: string;
  to: string;
  text: string;
}

const TIERS: Record<Tier, TierConfig> = {
  platinum: { label: "Platinum", from: "#a78bfa", to: "#8b5cf6", text: "#ffffff" },
  gold: { label: "Gold", from: "#fbbf24", to: "#f59e0b", text: "#ffffff" },
  silver: { label: "Silver", from: "#cbd5e1", to: "#94a3b8", text: "#ffffff" },
  bronze: { label: "Bronze", from: "#fb923c", to: "#d97706", text: "#ffffff" },
};

function getTier(masteryAvg: number): Tier {
  if (masteryAvg >= 850) return "platinum";
  if (masteryAvg >= 700) return "gold";
  if (masteryAvg >= 400) return "silver";
  return "bronze";
}

function getCourseEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.match(/math|calcul|algebra/)) return "🔢";
  if (t.match(/science|physics|chem/)) return "⚗️";
  if (t.match(/bio|anatomy/)) return "🧬";
  if (t.match(/history|world war/)) return "📜";
  if (t.match(/programming|code|software/)) return "💻";
  if (t.match(/english|literature|writing/)) return "📖";
  if (t.match(/econom|finance|business/)) return "📊";
  if (t.match(/psychology|mental/)) return "🧠";
  if (t.match(/art|design/)) return "🎨";
  if (t.match(/music/)) return "🎵";
  if (t.match(/law|legal/)) return "⚖️";
  if (t.match(/medicine|health/)) return "🏥";
  return "📚";
}

interface StampProps {
  course: PassportCourse;
  onPress?: () => void;
}

function PassportStamp({ course, onPress }: StampProps) {
  const emoji = getCourseEmoji(course.title);
  const isArchived = !!course.archivedAt;
  const completionPct =
    course.totalDays > 0 ? Math.round((course.currentDay / course.totalDays) * 100) : 0;
  const tier = course.isComplete && course.masteryAvg > 0 ? getTier(course.masteryAvg) : null;

  if (tier && !isArchived) {
    const cfg = TIERS[tier];
    return (
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <View
          className="rounded-2xl p-4 items-center"
          style={{
            backgroundColor: cfg.from,
            shadowColor: cfg.from,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
            minHeight: 140,
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
              borderRadius: 16,
              backgroundColor: cfg.to,
              opacity: 0.45,
            }}
          />
          <View
            className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
          >
            <Text className="text-[10px] font-black text-white">✓</Text>
          </View>
          <Text className="text-3xl mb-2">{emoji}</Text>
          <Text className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">
            {cfg.label}
          </Text>
          <Text
            className="text-sm font-bold leading-tight text-white text-center"
            numberOfLines={2}
          >
            {course.title}
          </Text>
          <Text className="text-[10px] font-semibold text-white/70 mt-1.5">
            {Math.round(course.masteryAvg)} avg mastery
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        className={`rounded-2xl p-4 items-center border-2 ${
          isArchived ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"
        }`}
        style={{ minHeight: 140 }}
      >
        <Text className="text-3xl mb-2 opacity-70">{emoji}</Text>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
          {isArchived ? "Archived" : `${completionPct}%`}
        </Text>
        <Text
          className="text-sm font-bold leading-tight text-slate-700 text-center"
          numberOfLines={2}
        >
          {course.title}
        </Text>
        {!isArchived && course.totalDays > 0 ? (
          <View className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <View
              className="h-full bg-indigo-400 rounded-full"
              style={{ width: `${completionPct}%` }}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PassportScreen() {
  const router = useRouter();
  const toast = useToast();
  const [plans, setPlans] = useState<PassportCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void markFeatureDiscovered("passport-visit");
  }, []);

  const load = useCallback(async () => {
    try {
      setPlans(await getUserStudyPlans());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load passport");
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

  const { active, completed, archived, tierTotals } = useMemo(() => {
    let activeList: PassportCourse[] = [];
    let completedList: PassportCourse[] = [];
    let archivedList: PassportCourse[] = [];
    const tierTotalsLocal: Record<Tier, number> = {
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
    };

    for (const plan of plans) {
      if (plan.archivedAt) {
        archivedList.push(plan);
      } else if (plan.isComplete) {
        completedList.push(plan);
        if (plan.masteryAvg > 0) tierTotalsLocal[getTier(plan.masteryAvg)] += 1;
      } else {
        activeList.push(plan);
      }
    }

    completedList.sort((a, b) => b.masteryAvg - a.masteryAvg);
    return {
      active: activeList,
      completed: completedList,
      archived: archivedList,
      tierTotals: tierTotalsLocal,
    };
  }, [plans]);

  const renderRows = (list: PassportCourse[]) => {
    const rows: PassportCourse[][] = [];
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
    return rows.map((row, i) => (
      <View key={i} className="flex-row gap-3">
        {row.map((c) => (
          <PassportStamp
            key={c.pdfId}
            course={c}
            onPress={() =>
              router.push({
                pathname: "/course/[pdfId]",
                params: { pdfId: c.pdfId },
              })
            }
          />
        ))}
        {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    ));
  };

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
          <Text className="text-xs text-slate-500">Knowledge passport</Text>
          <Text className="text-base font-bold text-slate-900">
            Your mastery collection
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
        {loading ? (
          <View className="gap-3">
            <Skeleton.Card height={120} />
            <View className="flex-row gap-3">
              <Skeleton.Card height={140} />
              <Skeleton.Card height={140} />
            </View>
            <View className="flex-row gap-3">
              <Skeleton.Card height={140} />
              <Skeleton.Card height={140} />
            </View>
          </View>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Stamp}
            title="No stamps yet"
            message="Complete a course and your first passport stamp appears here. Mastery decides the tier."
            action={{
              label: "Upload a PDF",
              onPress: () => router.push("/upload"),
            }}
            gradient={{ from: "#a78bfa", to: "#7c3aed" }}
          />
        ) : (
          <View className="gap-6">
            {/* Tier summary header */}
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
                className="absolute -left-8 -bottom-12 w-44 h-44 rounded-full bg-amber-400/25"
              />
              <View className="flex-row items-start gap-3">
                <GradientIcon size={48} radius={14} from="#a78bfa" to="#8b5cf6">
                  <Award size={22} color="#ffffff" />
                </GradientIcon>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-wider font-semibold text-white/60">
                    Your collection
                  </Text>
                  <Text className="text-2xl font-extrabold text-white mt-1">
                    {completed.length}{" "}
                    {completed.length === 1 ? "stamp" : "stamps"}
                  </Text>
                  <Text className="text-xs text-white/70 mt-1">
                    {active.length} in progress · {archived.length} archived
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row gap-2 flex-wrap">
                {(["platinum", "gold", "silver", "bronze"] as Tier[]).map(
                  (tier) => {
                    const count = tierTotals[tier];
                    if (count === 0) return null;
                    const cfg = TIERS[tier];
                    return (
                      <View
                        key={tier}
                        className="rounded-full px-3 py-1.5"
                        style={{ backgroundColor: cfg.from }}
                      >
                        <Text className="text-xs font-bold text-white">
                          {count} {cfg.label}
                        </Text>
                      </View>
                    );
                  },
                )}
              </View>
            </View>

            {completed.length > 0 ? (
              <View className="gap-3">
                <Text className="text-sm font-bold text-slate-900">
                  Mastered ({completed.length})
                </Text>
                {renderRows(completed)}
              </View>
            ) : null}

            {active.length > 0 ? (
              <View className="gap-3">
                <Text className="text-sm font-bold text-slate-900">
                  In progress ({active.length})
                </Text>
                {renderRows(active)}
              </View>
            ) : null}

            {archived.length > 0 ? (
              <View className="gap-3">
                <Text className="text-sm font-bold text-slate-900">
                  Archived ({archived.length})
                </Text>
                {renderRows(archived)}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
