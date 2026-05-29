import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Hourglass,
  Share2,
  Swords,
  Trophy,
  X,
  XCircle,
} from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import {
  cancelChallenge,
  getChallengeAnalytics,
  getChallengeDetails,
  startChallengeQuiz,
  type ChallengeAnalytics,
  type ChallengeDetails,
} from "@/lib/challenge-api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; code?: string }>();
  const id = params.id;
  const inviteCode = params.code;

  const [details, setDetails] = useState<ChallengeDetails | null>(null);
  const [analytics, setAnalytics] = useState<ChallengeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getChallengeDetails(id);
      setDetails(data);
      if (data.challenge.status === "completed") {
        const a = await getChallengeAnalytics(id).catch(() => null);
        setAnalytics(a);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load challenge");
    }
  }, [id, toast]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const status = details?.challenge.status;
  const isWinner =
    details?.challenge.winnerId &&
    user?.id &&
    details.challenge.winnerId === user.id;
  const youParticipant = details?.participants.find(
    (p) => p.userId === user?.id,
  );

  const copyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    toast.success("Invite code copied");
  };

  const shareCode = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join my ChattaTutor challenge — invite code: ${inviteCode}`,
      });
    } catch {
      // share dismissed
    }
  };

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    try {
      const session = await startChallengeQuiz(id);
      void markFeatureDiscovered("challenge-play");
      router.push({
        pathname: "/challenges/[id]/play",
        params: { id, sessionId: session.sessionId },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start quiz");
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await cancelChallenge(id);
      toast.success("Challenge cancelled");
      router.replace("/challenges");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-2 border-b border-slate-100">
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/challenges")
          }
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center bg-white border border-slate-200"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-slate-500">Challenge</Text>
          <Text className="text-base font-bold text-slate-900">
            {status === "completed"
              ? "Results"
              : status === "active"
                ? "Ready to race"
                : "Waiting room"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="gap-3">
            <Skeleton.Card height={160} />
            <Skeleton.Card />
            <Skeleton.Card />
          </View>
        ) : !details ? (
          <Text className="text-center text-sm text-slate-600 mt-8">
            Couldn't load challenge.
          </Text>
        ) : (
          <View className="gap-5">
            {/* Hero state card */}
            {status === "pending" ? (
              <View className="rounded-3xl bg-amber-500 p-5 overflow-hidden">
                <View
                  pointerEvents="none"
                  className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-300/50"
                />
                <View className="flex-row items-start gap-3">
                  <GradientIcon size={48} radius={14} from="#fde047" to="#fbbf24">
                    <Hourglass size={22} color="#7c2d12" />
                  </GradientIcon>
                  <View className="flex-1">
                    <Text className="text-xs uppercase tracking-wider font-semibold text-amber-100">
                      Waiting on opponent
                    </Text>
                    <Text className="text-2xl font-extrabold text-white mt-1">
                      Share to start
                    </Text>
                    <Text className="text-sm text-amber-50 mt-1">
                      The race kicks off once someone accepts your invite.
                    </Text>
                  </View>
                </View>
              </View>
            ) : status === "active" ? (
              <View className="rounded-3xl bg-rose-600 p-5 overflow-hidden">
                <View
                  pointerEvents="none"
                  className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-rose-400/50"
                />
                <View
                  pointerEvents="none"
                  className="absolute -left-8 -bottom-12 w-44 h-44 rounded-full bg-pink-500/30"
                />
                <View className="flex-row items-start gap-3">
                  <GradientIcon size={48} radius={14} from="#fca5a5" to="#f43f5e">
                    <Swords size={22} color="#ffffff" />
                  </GradientIcon>
                  <View className="flex-1">
                    <Text className="text-xs uppercase tracking-wider font-semibold text-rose-100">
                      Both in
                    </Text>
                    <Text className="text-2xl font-extrabold text-white mt-1">
                      Time to race
                    </Text>
                    <Text className="text-sm text-rose-50 mt-1">
                      {youParticipant?.isCompleted
                        ? "You're done. Waiting on your opponent."
                        : "Each question is timed. Highest score wins."}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View
                className={`rounded-3xl ${
                  isWinner ? "bg-emerald-600" : "bg-slate-900"
                } p-5 overflow-hidden`}
              >
                <View
                  pointerEvents="none"
                  className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-violet-500/30"
                />
                <View className="flex-row items-start gap-3">
                  <GradientIcon
                    size={48}
                    radius={14}
                    from={isWinner ? "#86efac" : "#a78bfa"}
                    to={isWinner ? "#10b981" : "#6366f1"}
                  >
                    {isWinner ? (
                      <Crown size={22} color="#ffffff" />
                    ) : (
                      <Trophy size={22} color="#ffffff" />
                    )}
                  </GradientIcon>
                  <View className="flex-1">
                    <Text className="text-xs uppercase tracking-wider font-semibold text-white/70">
                      Final standings
                    </Text>
                    <Text className="text-2xl font-extrabold text-white mt-1">
                      {isWinner
                        ? "You won"
                        : details.challenge.winnerId
                          ? "You came up short"
                          : "Tied result"}
                    </Text>
                    <Text className="text-sm text-white/80 mt-1">
                      {youParticipant?.score != null
                        ? `Your score: ${youParticipant.score}`
                        : "Score unavailable"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Invite code panel — only when pending + we have a code from create flow */}
            {status === "pending" && inviteCode ? (
              <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-3">
                <Text className="text-xs uppercase tracking-wider font-bold text-slate-500">
                  Invite code
                </Text>
                <View className="rounded-xl bg-slate-100 p-4 items-center">
                  <Text
                    selectable
                    className="text-2xl font-black tracking-widest text-slate-900"
                  >
                    {inviteCode}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={copyCode}
                    className="flex-1 h-11 flex-row items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white active:bg-slate-50"
                  >
                    <Copy size={14} color="#475569" />
                    <Text className="text-sm font-semibold text-slate-900">
                      Copy
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={shareCode}
                    className="flex-1 h-11 flex-row items-center justify-center gap-2 rounded-full bg-slate-900 active:bg-slate-800"
                  >
                    <Share2 size={14} color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">
                      Share
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Participants */}
            <View className="gap-2">
              <Text className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Players ({details.participants.length})
              </Text>
              {details.participants.map((p) => {
                const isYou = p.userId === user?.id;
                const wonThis =
                  status === "completed" &&
                  details.challenge.winnerId === p.userId;
                return (
                  <View
                    key={p.userId}
                    className={`flex-row items-center gap-3 rounded-2xl border-2 p-4 ${
                      isYou
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        wonThis
                          ? "bg-emerald-600"
                          : isYou
                            ? "bg-indigo-600"
                            : "bg-slate-200"
                      }`}
                    >
                      {wonThis ? (
                        <Crown size={18} color="#ffffff" />
                      ) : p.isCompleted ? (
                        <CheckCircle2 size={18} color={isYou ? "#ffffff" : "#475569"} />
                      ) : (
                        <Clock size={18} color={isYou ? "#ffffff" : "#475569"} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-bold ${
                          isYou ? "text-indigo-900" : "text-slate-900"
                        }`}
                      >
                        {isYou ? "You" : `Player ${p.userId.slice(-6)}`}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        {p.isCompleted
                          ? p.score != null
                            ? `Score ${p.score}${p.accuracy != null ? ` · ${Math.round(p.accuracy)}%` : ""}`
                            : "Done"
                          : status === "pending"
                            ? "Not joined"
                            : "Racing…"}
                      </Text>
                    </View>
                    {wonThis ? (
                      <View className="rounded-full bg-emerald-100 px-3 py-1">
                        <Text className="text-[10px] font-bold text-emerald-700">
                          Winner
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Per-question breakdown for completed challenges */}
            {status === "completed" && analytics ? (
              <View className="gap-2">
                <Text className="text-xs uppercase tracking-wider font-bold text-slate-500">
                  Question breakdown
                </Text>
                {analytics.participants.map((p) => {
                  const isYou = p.userId === user?.id;
                  return (
                    <View
                      key={`a-${p.userId}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 gap-2"
                    >
                      <Text className="text-sm font-bold text-slate-900">
                        {isYou ? "You" : p.username}
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {p.answers.map((a) => {
                          const correct = a.selectedIndex === a.correctIndex;
                          return (
                            <View
                              key={a.questionId}
                              className={`w-7 h-7 rounded-md items-center justify-center ${
                                correct ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            >
                              {correct ? (
                                <CheckCircle2 size={14} color="#ffffff" />
                              ) : (
                                <XCircle size={14} color="#ffffff" />
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      {!loading && details ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white px-4 py-3">
          {status === "active" && !youParticipant?.isCompleted ? (
            <Pressable
              onPress={handleStart}
              disabled={starting}
              className={`h-12 flex-row items-center justify-center gap-2 rounded-full ${
                starting ? "bg-slate-300" : "bg-slate-900 active:bg-slate-800"
              }`}
            >
              {starting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Swords size={16} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">
                    Start your race
                  </Text>
                </>
              )}
            </Pressable>
          ) : status === "pending" ? (
            <Pressable
              onPress={handleCancel}
              disabled={cancelling}
              className="h-12 flex-row items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white active:bg-slate-50"
            >
              <X size={14} color="#475569" />
              <Text className="text-sm font-semibold text-slate-900">
                {cancelling ? "Cancelling…" : "Cancel challenge"}
              </Text>
            </Pressable>
          ) : status === "completed" ? (
            <Pressable
              onPress={() => router.replace("/challenges")}
              className="h-12 flex-row items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
            >
              <Text className="text-sm font-semibold text-white">
                Back to challenges
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
