import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Hourglass,
  Plus,
  Swords,
  Trophy,
  Ticket,
} from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/lib/toast";
import {
  acceptChallengeByCode,
  listChallenges,
  type ChallengeListItem,
  type ChallengeStatus,
} from "@/lib/challenge-api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

type Bucket = "active" | "pending" | "completed";

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  icon: (color: string) => React.ReactNode;
}

const STATUS_CONFIG: Record<ChallengeStatus, StatusConfig> = {
  pending: {
    label: "Waiting",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: (c) => <Hourglass size={12} color={c} />,
  },
  active: {
    label: "Live",
    bg: "bg-rose-50",
    text: "text-rose-700",
    icon: (c) => <Clock size={12} color={c} />,
  },
  completed: {
    label: "Done",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: (c) => <CheckCircle2 size={12} color={c} />,
  },
};

function bucketize(challenge: ChallengeListItem): Bucket {
  if (challenge.status === "completed") return "completed";
  if (challenge.status === "active") return "active";
  return "pending";
}

export default function ChallengesScreen() {
  const router = useRouter();
  const toast = useToast();

  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState("");
  const [acceptingCode, setAcceptingCode] = useState(false);

  useEffect(() => {
    void markFeatureDiscovered("challenge-visit");
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await listChallenges();
      setChallenges(res.challenges);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load challenges");
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

  const submitCode = useCallback(async () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      toast.error("That code looks too short");
      return;
    }
    setAcceptingCode(true);
    try {
      await acceptChallengeByCode(trimmed);
      toast.success("Challenge accepted");
      setCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid invite code");
    } finally {
      setAcceptingCode(false);
    }
  }, [code, load, toast]);

  const grouped = useMemo(() => {
    const buckets: Record<Bucket, ChallengeListItem[]> = {
      active: [],
      pending: [],
      completed: [],
    };
    for (const c of challenges) buckets[bucketize(c)].push(c);
    return buckets;
  }, [challenges]);

  const renderChallenge = (c: ChallengeListItem) => {
    const cfg = STATUS_CONFIG[c.status];
    const won =
      c.status === "completed" && c.winnerId && c.userStatus === "completed";
    return (
      <Pressable
        key={c.id}
        onPress={() =>
          router.push({
            pathname: "/challenges/[id]",
            params: { id: c.id },
          })
        }
        className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
      >
        <GradientIcon size={44} radius={14} from="#f43f5e" to="#ec4899">
          <Swords size={20} color="#ffffff" />
        </GradientIcon>
        <View className="flex-1 gap-1">
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {c.pdfName}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            Lesson {c.lessonIndex + 1} ·{" "}
            {c.participantCount ?? c.participants?.length ?? 0} players
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${cfg.bg}`}>
              {cfg.icon(
                c.status === "active"
                  ? "#be123c"
                  : c.status === "pending"
                    ? "#b45309"
                    : "#065f46",
              )}
              <Text className={`text-[10px] font-bold ${cfg.text}`}>
                {cfg.label}
              </Text>
            </View>
            {won ? (
              <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5">
                <Trophy size={10} color="#b45309" />
                <Text className="text-[10px] font-bold text-amber-700">Won</Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight size={18} color="#94a3b8" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
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
            <Text className="text-xs text-slate-500">1v1 challenges</Text>
            <Text className="text-base font-bold text-slate-900">
              Race a friend
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/challenges/create")}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center bg-slate-900 active:bg-slate-800"
          >
            <Plus size={18} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerClassName="px-6 pb-12 pt-6"
          keyboardShouldPersistTaps="handled"
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
          {/* Invite code panel */}
          <View
            className="overflow-hidden rounded-3xl bg-slate-900 p-5 mb-5"
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
              className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-rose-500/30"
            />
            <View
              pointerEvents="none"
              className="absolute -left-8 -bottom-12 w-44 h-44 rounded-full bg-indigo-500/30"
            />
            <View className="flex-row items-start gap-3">
              <GradientIcon size={48} radius={14} from="#f43f5e" to="#ec4899">
                <Ticket size={22} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-wider font-semibold text-white/60">
                  Got an invite?
                </Text>
                <Text className="text-2xl font-extrabold text-white mt-1">
                  Enter invite code
                </Text>
                <Text className="text-xs text-white/70 mt-1">
                  Codes come from your friend's challenge invite.
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row gap-2">
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                placeholder="ABCD-1234"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                autoCorrect={false}
                className="flex-1 h-12 rounded-full border-2 border-white/15 bg-white/10 px-4 text-white text-base"
              />
              <Pressable
                onPress={submitCode}
                disabled={acceptingCode || code.trim().length < 4}
                className={`h-12 px-5 rounded-full items-center justify-center ${
                  acceptingCode || code.trim().length < 4
                    ? "bg-white/20"
                    : "bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    acceptingCode || code.trim().length < 4
                      ? "text-white/60"
                      : "text-slate-900"
                  }`}
                >
                  {acceptingCode ? "Joining…" : "Join"}
                </Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View className="gap-3">
              <Skeleton.Card />
              <Skeleton.Card />
              <Skeleton.Card />
            </View>
          ) : challenges.length === 0 ? (
            <EmptyState
              icon={Swords}
              title="No challenges yet"
              message="Tap + to create one, or paste an invite code above to join a friend's race."
              action={{
                label: "Create a challenge",
                onPress: () => router.push("/challenges/create"),
              }}
              gradient={{ from: "#f43f5e", to: "#ec4899" }}
            />
          ) : (
            <View className="gap-6">
              {grouped.active.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider font-bold text-rose-700">
                    Live ({grouped.active.length})
                  </Text>
                  {grouped.active.map(renderChallenge)}
                </View>
              ) : null}
              {grouped.pending.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider font-bold text-amber-700">
                    Pending ({grouped.pending.length})
                  </Text>
                  {grouped.pending.map(renderChallenge)}
                </View>
              ) : null}
              {grouped.completed.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider font-bold text-emerald-700">
                    Completed ({grouped.completed.length})
                  </Text>
                  {grouped.completed.map(renderChallenge)}
                </View>
              ) : null}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
