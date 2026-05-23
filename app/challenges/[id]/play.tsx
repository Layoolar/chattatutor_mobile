import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  CheckCircle2,
  Flame,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import {
  completeChallenge,
  getChallengeDetails,
  getNextQuestion,
  reportTabSwitch,
  submitAnswer,
  type SubmitAnswerResponse,
  type TimedQuizQuestion,
} from "@/lib/challenge-api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

const DEFAULT_TIME_LIMIT = 30;
const FEEDBACK_HOLD_MS = 900;

interface Stat {
  correct: number;
  answered: number;
  total: number;
}

export default function ChallengePlayScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; sessionId: string }>();
  const challengeId = params.id;
  const sessionId = params.sessionId;

  const [timeLimit, setTimeLimit] = useState<number>(DEFAULT_TIME_LIMIT);
  const [question, setQuestion] = useState<TimedQuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<SubmitAnswerResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_TIME_LIMIT);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stat, setStat] = useState<Stat>({ correct: 0, answered: 0, total: 0 });
  const [finishing, setFinishing] = useState(false);

  // Timer ring animation
  const ringProgress = useRef(new Animated.Value(1)).current;

  // Keep latest handles in refs so the AppState listener / timer don't go stale.
  const sessionRef = useRef<string | undefined>(sessionId);
  sessionRef.current = sessionId;
  const submittingRef = useRef(false);
  const feedbackRef = useRef<SubmitAnswerResponse | null>(null);
  feedbackRef.current = feedback;
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;

  // Load initial question (and challenge details to get time limit) on mount
  useEffect(() => {
    if (!challengeId || !sessionId) return;
    (async () => {
      try {
        const [details, firstQ] = await Promise.all([
          getChallengeDetails(challengeId).catch(() => null),
          getNextQuestion(sessionId),
        ]);
        const limit =
          details?.challenge.questionTimeLimit ?? DEFAULT_TIME_LIMIT;
        setTimeLimit(limit);
        setTimeLeft(limit);
        setQuestion(firstQ.question);
        setStat((s) => ({ ...s, total: firstQ.question.total }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't start race");
        router.replace({
          pathname: "/challenges/[id]",
          params: { id: challengeId },
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [challengeId, sessionId, router, toast]);

  // Animated countdown ring tied to current question
  useEffect(() => {
    if (!question || feedback) return;
    ringProgress.setValue(1);
    Animated.timing(ringProgress, {
      toValue: 0,
      duration: timeLimit * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [question?.id, feedback, timeLimit, ringProgress]);

  // Per-second tick for the visible counter
  useEffect(() => {
    if (!question || feedback) return;
    setTimeLeft(timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [question?.id, feedback, timeLimit]);

  const finalize = useCallback(async () => {
    if (!challengeId) return;
    setFinishing(true);
    try {
      await completeChallenge(challengeId);
      void markFeatureDiscovered("1v1-completed");
    } catch {
      // server still has the answers; soft-fail
    } finally {
      router.replace({
        pathname: "/challenges/[id]",
        params: { id: challengeId },
      });
    }
  }, [challengeId, router]);

  const advance = useCallback(async () => {
    if (!sessionId) return;
    setFeedback(null);
    setSelected(null);
    try {
      const next = await getNextQuestion(sessionId);
      setQuestion(next.question);
      setStat((s) => ({ ...s, total: next.question.total }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load next question");
    }
  }, [sessionId, toast]);

  const send = useCallback(
    async (indexToSend: number) => {
      if (!sessionId || submittingRef.current || feedbackRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const result = await submitAnswer(sessionId, indexToSend);
        setFeedback(result);
        setStat((s) => ({
          correct: s.correct + (result.correct ? 1 : 0),
          answered: s.answered + 1,
          total: s.total,
        }));
        Haptics.notificationAsync(
          result.correct
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});

        // Hold the feedback briefly so the user sees correctness, then advance
        // (or finalize if isFinished).
        setTimeout(() => {
          if (result.isFinished) void finalize();
          else void advance();
        }, FEEDBACK_HOLD_MS);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't submit");
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [sessionId, finalize, advance, toast],
  );

  // Auto-submit on timeout
  useEffect(() => {
    if (loading || !question || feedback) return;
    if (timeLeft > 0) return;
    // Time's up — submit current selection or -1 for "no answer"
    void send(selectedRef.current ?? -1);
  }, [timeLeft, loading, question, feedback, send]);

  // Anti-cheat: report when app goes to background while a session is live
  useEffect(() => {
    if (!sessionId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        void reportTabSwitch(sessionId);
      }
    });
    return () => sub.remove();
  }, [sessionId]);

  // Block hardware back during a live race
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      toast.info("Finish the race or wait for it to end.");
      return true;
    });
    return () => sub.remove();
  }, [toast]);

  const handleSelect = (i: number) => {
    if (submitting || feedback) return;
    setSelected(i);
  };

  const handleSubmit = () => {
    if (selected == null) return;
    void send(selected);
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: "#0f172a" }}
      edges={["top", "bottom"]}
    >
      {/* Top status bar */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-rose-500/20 border border-rose-400/40 px-3 py-1.5 flex-row items-center gap-1.5">
            <Flame size={12} color="#fda4af" />
            <Text className="text-xs font-bold text-rose-100">
              {stat.correct} / {stat.answered} correct
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-white/10 px-3 py-1.5">
          <Text className="text-xs font-bold text-white">
            {question ? `${question.index + 1} / ${question.total}` : "—"}
          </Text>
        </View>
      </View>

      {/* Timer ring + count */}
      <View className="items-center pt-4 pb-5">
        <View className="w-24 h-24 rounded-full items-center justify-center border-4 border-white/10">
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderRadius: 9999,
              borderWidth: 4,
              borderColor: timeLeft <= 5 ? "#f43f5e" : "#a78bfa",
              opacity: ringProgress,
            }}
          />
          <Timer size={20} color="#ffffff" />
          <Text className="text-2xl font-extrabold text-white mt-1">
            {timeLeft}
          </Text>
        </View>
      </View>

      {/* Question card */}
      <View className="flex-1 px-6">
        {loading || finishing ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color="#ffffff" size="large" />
            <Text className="text-sm text-white/70">
              {finishing ? "Wrapping up…" : "Loading first question…"}
            </Text>
          </View>
        ) : !question ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-white/70">
              No question available.
            </Text>
          </View>
        ) : (
          <View className="flex-1 gap-4">
            <View className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <Text className="text-xs uppercase tracking-wider font-semibold text-white/50">
                Question
              </Text>
              <Text className="text-lg font-bold text-white leading-7 mt-2">
                {question.text}
              </Text>
            </View>

            <View className="gap-2">
              {question.options.map((option, i) => {
                const isSelected = selected === i;
                const showResult = feedback !== null;
                const isCorrect = showResult && i === selected && feedback?.correct;
                const isWrong =
                  showResult && i === selected && !feedback?.correct;

                return (
                  <Pressable
                    key={i}
                    onPress={() => handleSelect(i)}
                    disabled={submitting || showResult}
                    className={`rounded-2xl p-4 border-2 ${
                      isCorrect
                        ? "border-emerald-400 bg-emerald-500/20"
                        : isWrong
                          ? "border-rose-400 bg-rose-500/20"
                          : isSelected
                            ? "border-violet-400 bg-violet-500/20"
                            : "border-white/10 bg-white/5"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`w-8 h-8 rounded-lg items-center justify-center ${
                          isCorrect
                            ? "bg-emerald-500"
                            : isWrong
                              ? "bg-rose-500"
                              : isSelected
                                ? "bg-violet-500"
                                : "bg-white/10"
                        }`}
                      >
                        <Text className="text-xs font-bold text-white">
                          {String.fromCharCode(65 + i)}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm text-white leading-5">
                        {option}
                      </Text>
                      {isCorrect ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : isWrong ? (
                        <XCircle size={18} color="#f43f5e" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {feedback ? (
              <View
                className={`rounded-2xl border p-4 flex-row items-start gap-3 ${
                  feedback.correct
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-rose-400/40 bg-rose-500/10"
                }`}
              >
                <Sparkles
                  size={16}
                  color={feedback.correct ? "#34d399" : "#fda4af"}
                />
                <Text className="flex-1 text-xs leading-5 text-white/80">
                  {feedback.correct
                    ? feedback.isFinished
                      ? "Locked in. Finalizing your race…"
                      : "Locked in. Moving to the next."
                    : feedback.isFinished
                      ? "Race wrapped. Final results loading…"
                      : "Missed it. Next one's yours."}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Submit bar */}
      {!loading && !finishing && question && !feedback ? (
        <View className="px-5 pb-4">
          <Pressable
            onPress={handleSubmit}
            disabled={selected == null || submitting}
            className={`h-14 flex-row items-center justify-center gap-2 rounded-full ${
              selected != null && !submitting
                ? "bg-white"
                : "bg-white/15"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <>
                <Trophy
                  size={16}
                  color={selected != null ? "#0f172a" : "#94a3b8"}
                />
                <Text
                  className={`text-base font-semibold ${
                    selected != null ? "text-slate-900" : "text-white/40"
                  }`}
                >
                  Lock in answer
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
