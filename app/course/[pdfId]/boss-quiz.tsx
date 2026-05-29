import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import { Skeleton } from "@/components/Skeleton";
import {
  getBossQuiz,
  submitBossQuiz,
  type BossQuizPayload,
  type BossQuizQuestion,
  type BossQuizResult,
  type BossQuizResultDetail,
  type BossQuizTier,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

type BossQuizAnswer = number | null;

const tierCopy: Record<BossQuizTier, { label: string; detail: string }> = {
  standard: {
    label: "Boss quiz",
    detail: "A full-course recall check built from every lesson.",
  },
  evolved: {
    label: "Evolved boss",
    detail: "The boss noticed your last run. Expect a sharper mix this time.",
  },
  apex: {
    label: "Apex boss",
    detail: "High-tier mode with a tighter clock. This run is meant to sting a little.",
  },
  true: {
    label: "True boss",
    detail: "Perfect-score mode. Fast timer, no hiding, full pressure.",
  },
};

function formatTimer(totalSeconds: number | null): string | null {
  if (typeof totalSeconds !== "number") {
    return null;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function collectMissedQuestions(
  questions: BossQuizQuestion[],
  details: BossQuizResultDetail[],
) {
  const detailsById = new Map(details.map((detail) => [detail.questionId, detail]));

  return questions
    .map((question) => ({
      question,
      detail: detailsById.get(question.id),
    }))
    .filter(
      (
        item,
      ): item is { question: BossQuizQuestion; detail: BossQuizResultDetail } =>
        item.detail !== undefined && !item.detail.correct,
    );
}

export default function BossQuizScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pdfId } = useLocalSearchParams<{ pdfId: string }>();

  const [quiz, setQuiz] = useState<BossQuizPayload | null>(null);
  const [answers, setAnswers] = useState<BossQuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<BossQuizResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!pdfId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const data = await getBossQuiz(pdfId);
        if (!isMounted) return;
        setQuiz(data);
        setAnswers(data.questions.map(() => null));
        setTimeRemaining(data.timeLimit);
      } catch (err) {
        if (!isMounted) return;
        toast.error(err instanceof Error ? err.message : "Couldn't load boss quiz");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [pdfId, toast]);

  const answeredCount = useMemo(
    () => answers.filter((answer): answer is number => typeof answer === "number").length,
    [answers],
  );
  const currentQuestion = quiz?.questions[currentIndex] ?? null;
  const selectedAnswer = answers[currentIndex];
  const timerLabel = formatTimer(timeRemaining);
  const missedQuestions = useMemo(
    () => (quiz && result ? collectMissedQuestions(quiz.questions, result.details) : []),
    [quiz, result],
  );

  const resetQuiz = () => {
    if (!quiz) return;
    setResult(null);
    setCurrentIndex(0);
    setAnswers(quiz.questions.map(() => null));
    setTimeRemaining(quiz.timeLimit);
  };

  const goBackToCourse = () => {
    router.replace({
      pathname: "/course/[pdfId]",
      params: { pdfId: String(pdfId) },
    });
  };

  const handleSubmit = useCallback(
    async (force = false) => {
      if (!pdfId || !quiz || submitting) {
        return;
      }

      if (!force && answeredCount !== quiz.questions.length) {
        return;
      }

      setSubmitting(true);
      try {
        const submission = await submitBossQuiz(
          pdfId,
          quiz.questions.map((question, questionIndex) => ({
            questionId: question.id,
            selectedIndex: answers[questionIndex] ?? -1,
          })),
        );
        setResult(submission);
        setTimeRemaining(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't grade boss quiz");
      } finally {
        setSubmitting(false);
      }
    },
    [answeredCount, answers, pdfId, quiz, submitting, toast],
  );

  useEffect(() => {
    if (!quiz?.timeLimit || result || loading || submitting) {
      return;
    }

    if ((timeRemaining ?? 0) <= 0) {
      void handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((current) => {
        if (current == null) return current;
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleSubmit, loading, quiz?.timeLimit, result, submitting, timeRemaining]);

  const handleSelectAnswer = (optionIndex: number) => {
    setAnswers((currentAnswers) => {
      const nextAnswers = [...currentAnswers];
      nextAnswers[currentIndex] = optionIndex;
      return nextAnswers;
    });
  };

  const resultHeadline = (() => {
    const score = result?.score ?? 0;
    if (score >= 90) return "Boss crushed";
    if (score >= 70) return "Solid run";
    if (score >= 50) return "Almost there";
    return "Needs another attempt";
  })();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <Pressable
          onPress={goBackToCourse}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Final assessment
          </Text>
          <Text className="text-base font-bold text-slate-900">Boss quiz</Text>
        </View>
        {timerLabel && !result ? (
          <View className="flex-row items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5">
            <Clock3 size={14} color="#e11d48" />
            <Text className="text-xs font-semibold text-rose-600">{timerLabel}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="gap-4">
            <Skeleton.Card height={140} />
            <Skeleton.Card height={280} />
            <Skeleton.Card height={80} />
          </View>
        ) : !quiz || quiz.questions.length === 0 ? (
          <View className="rounded-3xl border border-slate-200 bg-white px-5 py-6 gap-3">
            <Text className="text-lg font-bold text-slate-900">Boss quiz unavailable</Text>
            <Text className="text-sm leading-6 text-slate-600">
              Finish the course first, then come back for the final assessment.
            </Text>
            <Pressable
              onPress={goBackToCourse}
              className="mt-2 h-11 items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
            >
              <Text className="text-sm font-semibold text-white">Back to course</Text>
            </Pressable>
          </View>
        ) : result ? (
          <View className="gap-5">
            <View
              className="overflow-hidden rounded-3xl bg-slate-900 px-5 py-5"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 5,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-400/20"
              />
              <View className="flex-row items-start gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <Trophy size={28} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-amber-100">
                    {tierCopy[quiz.tier].label}
                  </Text>
                  <Text className="mt-2 text-3xl font-extrabold text-white">{result.score}%</Text>
                  <Text className="mt-2 text-sm leading-6 text-white/75">
                    {resultHeadline}. You landed {result.correctCount} out of {result.total}. Jump back in until full-course recall feels automatic.
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-white/10 px-4 py-3">
                  <Text className="text-xs font-semibold text-white/70">Tier</Text>
                  <Text className="mt-1 text-lg font-extrabold text-white">
                    {tierCopy[quiz.tier].label}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl bg-white/10 px-4 py-3">
                  <Text className="text-xs font-semibold text-white/70">Attempt</Text>
                  <Text className="mt-1 text-lg font-extrabold text-white">#{quiz.attempt}</Text>
                </View>
              </View>
            </View>

            {missedQuestions.length > 0 ? (
              <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-rose-50">
                    <CircleAlert size={18} color="#e11d48" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">Where the boss got you</Text>
                    <Text className="text-sm text-slate-500">Review the misses before the next attempt.</Text>
                  </View>
                </View>

                <View className="gap-3">
                  {missedQuestions.slice(0, 4).map(({ question, detail }) => {
                    const selectedOption =
                      typeof detail.selectedIndex === "number"
                        ? question.options[detail.selectedIndex]
                        : null;
                    const correctOption =
                      typeof detail.correctIndex === "number"
                        ? question.options[detail.correctIndex]
                        : null;

                    return (
                      <View
                        key={question.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <View className="flex-row items-center justify-between gap-3">
                          <Text className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {question.lessonTitle}
                          </Text>
                        </View>
                        <Text className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                          {question.question}
                        </Text>
                        <Text className="mt-2 text-sm text-slate-600">
                          {selectedOption ? `You picked: ${selectedOption}` : "No answer selected"}
                        </Text>
                        {correctOption ? (
                          <Text className="mt-1 text-sm font-medium text-emerald-700">
                            Correct answer: {correctOption}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View className="gap-3">
              <Pressable
                onPress={resetQuiz}
                className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-slate-900 active:bg-slate-800"
              >
                <RotateCcw size={16} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">Retake boss quiz</Text>
              </Pressable>

              <Pressable
                onPress={goBackToCourse}
                className="h-12 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white active:bg-slate-50"
              >
                <CheckCircle2 size={16} color="#0f172a" />
                <Text className="text-sm font-semibold text-slate-900">Back to course</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="gap-5">
            <View
              className="overflow-hidden rounded-3xl bg-slate-900 px-5 py-5"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 5,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-400/20"
              />
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-amber-100">
                {tierCopy[quiz.tier].label}
              </Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">
                {answeredCount}/{quiz.questions.length} answered
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/75">
                {tierCopy[quiz.tier].detail}
              </Text>

              <View className="mt-4 flex-row gap-3">
                <View className="rounded-2xl bg-white/10 px-4 py-3">
                  <Text className="text-xs font-semibold text-white/70">Attempt</Text>
                  <Text className="mt-1 text-lg font-extrabold text-white">#{quiz.attempt}</Text>
                </View>
                {timerLabel ? (
                  <View className="rounded-2xl bg-white/10 px-4 py-3">
                    <Text className="text-xs font-semibold text-white/70">Timer</Text>
                    <Text className="mt-1 text-lg font-extrabold text-white">{timerLabel}</Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <View
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {currentQuestion?.lessonTitle}
                  </Text>
                  <Text className="mt-2 text-xl font-bold leading-8 text-slate-900">
                    {currentQuestion?.question}
                  </Text>
                </View>
                <View className="rounded-full bg-amber-50 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-amber-600">
                    {currentIndex + 1}/{quiz.questions.length}
                  </Text>
                </View>
              </View>

              <View className="gap-3">
                {currentQuestion?.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswer === optionIndex;

                  return (
                    <Pressable
                      key={`${currentQuestion.id}-${optionIndex}`}
                      onPress={() => handleSelectAnswer(optionIndex)}
                      className={`rounded-2xl border px-4 py-4 ${
                        isSelected
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-full border ${
                            isSelected ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-white"
                          }`}
                        >
                          <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-500"}`}>
                            {String.fromCharCode(65 + optionIndex)}
                          </Text>
                        </View>
                        <Text className="flex-1 text-sm leading-6 text-slate-800">
                          {option}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-3">
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setCurrentIndex((current) => Math.max(current - 1, 0))}
                  disabled={currentIndex === 0}
                  className={`flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full border ${
                    currentIndex === 0
                      ? "border-slate-100 bg-slate-100 opacity-60"
                      : "border-slate-200 bg-white active:bg-slate-50"
                  }`}
                >
                  <ArrowLeft size={16} color="#0f172a" />
                  <Text className="text-sm font-semibold text-slate-900">Back</Text>
                </Pressable>

                {currentIndex < quiz.questions.length - 1 ? (
                  <Pressable
                    onPress={() => setCurrentIndex((current) => Math.min(current + 1, quiz.questions.length - 1))}
                    className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full bg-slate-900 active:bg-slate-800"
                  >
                    <Text className="text-sm font-semibold text-white">Next</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void handleSubmit()}
                    disabled={answeredCount !== quiz.questions.length || submitting}
                    className={`flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full ${
                      answeredCount === quiz.questions.length && !submitting
                        ? "bg-amber-500 active:bg-amber-600"
                        : "bg-slate-200"
                    }`}
                  >
                    <Sparkles size={16} color={answeredCount === quiz.questions.length && !submitting ? "#ffffff" : "#64748b"} />
                    <Text className={`text-sm font-semibold ${answeredCount === quiz.questions.length && !submitting ? "text-white" : "text-slate-500"}`}>
                      {submitting ? "Submitting..." : "Finish run"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {answeredCount !== quiz.questions.length ? (
                <Text className="text-center text-xs font-medium text-slate-500">
                  Answer every question before finishing. If the timer expires, unanswered questions count against the run.
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}