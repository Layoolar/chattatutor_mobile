import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ListChecks,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react-native";
import { Skeleton } from "@/components/Skeleton";
import {
  QUIZ_PASS_MARK,
  getStudyPlan,
  getQuizQuestions,
  submitQuiz,
  type QuizQuestion,
  type QuizResultDetail,
  type QuizSubmissionResult,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

type QuizAnswer = number | null;

function formatMissedQuestions(
  questions: QuizQuestion[],
  details: QuizResultDetail[],
) {
  return details
    .filter((detail) => !detail.correct)
    .map((detail) => ({
      detail,
      question: questions[detail.questionIndex],
    }))
    .filter(
      (
        item,
      ): item is { detail: QuizResultDetail; question: QuizQuestion } =>
        Boolean(item.question),
    );
}

export default function LessonQuizScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pdfId, lessonIndex, flashcardsReady } = useLocalSearchParams<{
    pdfId: string;
    lessonIndex: string;
    flashcardsReady?: string;
  }>();

  const index = Number(lessonIndex ?? 0);
  const hasFlashcards = flashcardsReady === "1";
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [totalLessons, setTotalLessons] = useState<number | null>(null);

  useEffect(() => {
    if (!pdfId || Number.isNaN(index)) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const [quizData, planData] = await Promise.all([
          getQuizQuestions(pdfId, index),
          getStudyPlan(pdfId),
        ]);
        if (!isMounted) return;
        setQuestions(quizData.quizQuestions);
        setAnswers(quizData.quizQuestions.map(() => null));
        setPersonalBest(quizData.personalBest?.score ?? null);
        setTotalLessons(planData.totalDays ?? planData.lessons?.length ?? 0);
      } catch (err) {
        if (!isMounted) return;
        toast.error(err instanceof Error ? err.message : "Couldn't load quiz");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [pdfId, index, toast]);

  const answeredCount = useMemo(
    () => answers.filter((answer): answer is number => typeof answer === "number").length,
    [answers],
  );
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentIndex];
  const canSubmit = questions.length > 0 && answeredCount === questions.length && !submitting;
  const passed = (result?.score ?? 0) >= QUIZ_PASS_MARK;
  const missedQuestions = useMemo(
    () => (result ? formatMissedQuestions(questions, result.details) : []),
    [questions, result],
  );
  const newPersonalBest = result && (personalBest == null || result.score > personalBest);
  const nextLessonIndex = index + 1;
  const hasNextLesson = totalLessons != null && nextLessonIndex < totalLessons;

  const goBackToLesson = () => {
    router.replace({
      pathname: "/lesson/[pdfId]/[lessonIndex]",
      params: { pdfId: String(pdfId), lessonIndex: String(index) },
    });
  };

  const reviewWeakest = () => {
    if (hasFlashcards) {
      router.replace({
        pathname: "/lesson/[pdfId]/[lessonIndex]/flashcards",
        params: { pdfId: String(pdfId), lessonIndex: String(index) },
      });
      return;
    }

    goBackToLesson();
  };

  const openNextLesson = () => {
    if (!pdfId || !hasNextLesson) {
      return;
    }

    router.replace({
      pathname: "/lesson/[pdfId]/[lessonIndex]",
      params: { pdfId: String(pdfId), lessonIndex: String(nextLessonIndex) },
    });
  };

  const resetQuiz = () => {
    setResult(null);
    setCurrentIndex(0);
    setAnswers(questions.map(() => null));
  };

  const handleSelectAnswer = (optionIndex: number) => {
    setAnswers((currentAnswers) => {
      const nextAnswers = [...currentAnswers];
      nextAnswers[currentIndex] = optionIndex;
      return nextAnswers;
    });
  };

  const handleSubmit = async () => {
    if (!pdfId || Number.isNaN(index) || !canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      const submission = await submitQuiz(
        pdfId,
        index,
        answers.map((answer) => ({ selectedIndex: answer ?? -1 })),
      );
      setResult(submission);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <Pressable
          onPress={() => (result ? resetQuiz() : goBackToLesson())}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Lesson {Number.isNaN(index) ? "?" : index + 1}
          </Text>
          <Text className="text-base font-bold text-slate-900">
            Quiz checkpoint
          </Text>
        </View>
        {personalBest != null && !result ? (
          <View className="rounded-full bg-indigo-50 px-3 py-1.5">
            <Text className="text-xs font-semibold text-indigo-600">
              Best {personalBest}%
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="gap-4">
            <Skeleton.Card height={120} />
            <Skeleton.Card height={260} />
            <Skeleton.Card height={80} />
          </View>
        ) : result ? (
          <View className="gap-5">
            <View
              className={`overflow-hidden rounded-3xl px-5 py-5 ${
                passed ? "bg-slate-900" : "bg-white border border-rose-100"
              }`}
              style={{
                shadowColor: passed ? "#312e81" : "#fb7185",
                shadowOpacity: passed ? 0.18 : 0.08,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 5,
              }}
            >
              {passed ? (
                <View
                  pointerEvents="none"
                  className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/30"
                />
              ) : null}
              <View className="flex-row items-start gap-4">
                <View
                  className={`h-14 w-14 items-center justify-center rounded-2xl ${
                    passed ? "bg-white/10" : "bg-rose-50"
                  }`}
                >
                  {passed ? (
                    <CheckCircle2 size={28} color="#ffffff" />
                  ) : (
                    <CircleAlert size={28} color="#e11d48" />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs font-semibold uppercase tracking-[1.5px] ${
                      passed ? "text-indigo-100" : "text-rose-500"
                    }`}
                  >
                    {passed ? "Lesson cleared" : "Keep drilling"}
                  </Text>
                  <Text
                    className={`mt-2 text-3xl font-extrabold ${
                      passed ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {result.score}%
                  </Text>
                  <Text
                    className={`mt-2 text-sm leading-6 ${
                      passed ? "text-white/75" : "text-slate-600"
                    }`}
                  >
                    {passed
                      ? `You passed the ${QUIZ_PASS_MARK}% mark. Course progress updates automatically from quiz performance.`
                      : `You need ${QUIZ_PASS_MARK}% to clear this lesson. Review the misses, tighten recall, and take it again.`}
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row gap-3">
                <View className={`flex-1 rounded-2xl px-4 py-3 ${passed ? "bg-white/10" : "bg-slate-50"}`}>
                  <Text className={`text-xs font-semibold ${passed ? "text-white/70" : "text-slate-500"}`}>
                    Correct answers
                  </Text>
                  <Text className={`mt-1 text-xl font-extrabold ${passed ? "text-white" : "text-slate-900"}`}>
                    {result.correctCount}/{result.total}
                  </Text>
                </View>
                <View className={`flex-1 rounded-2xl px-4 py-3 ${passed ? "bg-white/10" : "bg-slate-50"}`}>
                  <Text className={`text-xs font-semibold ${passed ? "text-white/70" : "text-slate-500"}`}>
                    Personal best
                  </Text>
                  <Text className={`mt-1 text-xl font-extrabold ${passed ? "text-white" : "text-slate-900"}`}>
                    {result.score}%
                  </Text>
                  {newPersonalBest ? (
                    <Text className={`mt-1 text-xs font-semibold ${passed ? "text-emerald-200" : "text-emerald-600"}`}>
                      New best run
                    </Text>
                  ) : personalBest != null ? (
                    <Text className={`mt-1 text-xs ${passed ? "text-white/60" : "text-slate-500"}`}>
                      Prior best {personalBest}%
                    </Text>
                  ) : null}
                </View>
              </View>

              {result.personalizedHook ? (
                <View className={`mt-4 rounded-2xl px-4 py-3 ${passed ? "bg-white/10" : "bg-indigo-50"}`}>
                  <Text className={`text-xs font-semibold uppercase tracking-wide ${passed ? "text-indigo-100" : "text-indigo-600"}`}>
                    Momentum note
                  </Text>
                  <Text className={`mt-2 text-sm leading-6 ${passed ? "text-white/80" : "text-indigo-900"}`}>
                    {result.personalizedHook}
                  </Text>
                </View>
              ) : null}
            </View>

            {missedQuestions.length > 0 ? (
              <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
                    <Target size={18} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">
                      Review weakest prompts
                    </Text>
                    <Text className="text-sm text-slate-500">
                      These are the questions that slipped on this attempt.
                    </Text>
                  </View>
                </View>

                <View className="gap-3">
                  {missedQuestions.slice(0, 3).map(({ detail, question }, missedIndex) => {
                    const pickedOption =
                      typeof detail.selectedIndex === "number"
                        ? question.options[detail.selectedIndex]
                        : null;

                    return (
                      <View
                        key={`${question.id}-${missedIndex}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Missed question {detail.questionIndex + 1}
                        </Text>
                        <Text className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                          {question.question}
                        </Text>
                        <Text className="mt-2 text-sm text-slate-600">
                          {pickedOption ? `You picked: ${pickedOption}` : "No answer selected"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {result.bossQuestion ? (
              <View className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
                    <Sparkles size={18} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">
                      Perfect score bonus
                    </Text>
                    <Text className="text-sm text-indigo-700">
                      You unlocked a synthesis question for deeper recall.
                    </Text>
                  </View>
                </View>
                <Text className="text-sm font-semibold leading-6 text-indigo-950">
                  {result.bossQuestion.question}
                </Text>
                {result.bossQuestion.explanation ? (
                  <Text className="text-sm leading-6 text-indigo-900">
                    {result.bossQuestion.explanation}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="gap-3">
              {passed && hasNextLesson ? (
                <Pressable
                  onPress={openNextLesson}
                  className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-indigo-600 active:bg-indigo-700"
                >
                  <ArrowRight size={16} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">
                    Next session
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={reviewWeakest}
                className={`h-12 flex-row items-center justify-center gap-2 rounded-full ${
                  passed && hasNextLesson
                    ? "border border-slate-200 bg-white active:bg-slate-50"
                    : "bg-slate-900 active:bg-slate-800"
                }`}
              >
                <Target size={16} color={passed && hasNextLesson ? "#0f172a" : "#ffffff"} />
                <Text className={`text-sm font-semibold ${passed && hasNextLesson ? "text-slate-900" : "text-white"}`}>
                  {hasFlashcards ? "Review weakest with flashcards" : "Review lesson"}
                </Text>
              </Pressable>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={resetQuiz}
                  className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white active:bg-slate-50"
                >
                  <RotateCcw size={16} color="#0f172a" />
                  <Text className="text-sm font-semibold text-slate-900">
                    Retake quiz
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.replace({
                      pathname: "/course/[pdfId]",
                      params: { pdfId: String(pdfId) },
                    })
                  }
                  className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 active:bg-indigo-100"
                >
                  <ListChecks size={16} color="#4f46e5" />
                  <Text className="text-sm font-semibold text-indigo-700">
                    Back to course
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : questions.length === 0 ? (
          <View className="rounded-3xl border border-slate-200 bg-white px-5 py-6 gap-3">
            <Text className="text-lg font-bold text-slate-900">No quiz yet</Text>
            <Text className="text-sm leading-6 text-slate-600">
              This lesson does not have quiz questions ready yet. Review the lesson and flashcards for now.
            </Text>
            <Pressable
              onPress={goBackToLesson}
              className="mt-2 h-11 items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
            >
              <Text className="text-sm font-semibold text-white">Back to lesson</Text>
            </Pressable>
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
                className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-indigo-500/30"
              />
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-indigo-100">
                Quiz checkpoint
              </Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">
                {answeredCount}/{questions.length} answered
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/75">
                Hit {QUIZ_PASS_MARK}% or higher to clear the lesson and move the course forward automatically.
              </Text>
              <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <View
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Question {currentIndex + 1} of {questions.length}
                  </Text>
                  <Text className="mt-2 text-xl font-bold leading-8 text-slate-900">
                    {currentQuestion.question}
                  </Text>
                </View>
                <View className="rounded-full bg-indigo-50 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-indigo-600">
                    {Math.round(((currentIndex + 1) / questions.length) * 100)}%
                  </Text>
                </View>
              </View>

              <View className="gap-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswer === optionIndex;

                  return (
                    <Pressable
                      key={`${currentQuestion.id}-${optionIndex}`}
                      onPress={() => handleSelectAnswer(optionIndex)}
                      className={`rounded-2xl border px-4 py-4 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-full border ${
                            isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white"
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

                {currentIndex < questions.length - 1 ? (
                  <Pressable
                    onPress={() => setCurrentIndex((current) => Math.min(current + 1, questions.length - 1))}
                    className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full bg-slate-900 active:bg-slate-800"
                  >
                    <Text className="text-sm font-semibold text-white">Next</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    className={`flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full ${
                      canSubmit
                        ? "bg-indigo-600 active:bg-indigo-700"
                        : "bg-slate-200"
                    }`}
                  >
                    <CheckCircle2 size={16} color={canSubmit ? "#ffffff" : "#64748b"} />
                    <Text className={`text-sm font-semibold ${canSubmit ? "text-white" : "text-slate-500"}`}>
                      {submitting ? "Submitting..." : "Submit quiz"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {!canSubmit ? (
                <Text className="text-center text-xs font-medium text-slate-500">
                  Answer every question before submitting.
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}