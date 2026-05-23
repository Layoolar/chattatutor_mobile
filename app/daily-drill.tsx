import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Flame,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/lib/toast";
import {
  getDailyDrill,
  gradeDrillQuestion,
  type DailyMode,
  type DrillGradeResult,
  type DrillQuestion,
} from "@/lib/api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

interface Answered {
  questionId: string;
  selectedIndex: number;
  result: DrillGradeResult;
}

const MODE_LABELS: Record<DailyMode, { title: string; subtitle: string }> = {
  "speed-run": {
    title: "Speed Run",
    subtitle: "Fast answers earn bonus mastery — gut feel only.",
  },
  "accuracy-only": {
    title: "Accuracy Only",
    subtitle: "Take your time. One miss costs you the perfect run.",
  },
  "dark-mode": {
    title: "Dark Mode",
    subtitle: "No hints, no streak shields. Pure recall.",
  },
  "double-or-nothing": {
    title: "Double or Nothing",
    subtitle: "All correct doubles your XP. One wrong zeroes it.",
  },
};

export default function DailyDrillScreen() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [mode, setMode] = useState<DailyMode | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [grading, setGrading] = useState(false);
  const [answered, setAnswered] = useState<Answered[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDailyDrill();
        setQuestions(data.questions);
        setMode(data.dailyMode);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't load today's drill",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const current = questions[activeIndex];
  const correctCount = answered.filter((a) => a.result.correct).length;
  const isDone = !loading && questions.length > 0 && activeIndex >= questions.length;

  const submit = useCallback(async () => {
    if (selected == null || !current || grading) return;
    setGrading(true);
    try {
      const result = await gradeDrillQuestion(
        current.pdfId,
        current.lessonIndex,
        current.id,
        selected,
      );

      Haptics.notificationAsync(
        result.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});

      setAnswered((prev) => [
        ...prev,
        { questionId: current.id, selectedIndex: selected, result },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't grade answer");
    } finally {
      setGrading(false);
    }
  }, [selected, current, grading, toast]);

  const advance = useCallback(() => {
    setSelected(null);
    setActiveIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (isDone) {
      void markFeatureDiscovered("daily-drill");
    }
  }, [isDone]);

  const justAnswered = useMemo(
    () => answered[answered.length - 1] ?? null,
    [answered],
  );
  const isCurrentAnswered = justAnswered?.questionId === current?.id;

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
          <Text className="text-xs text-slate-500">Daily Drill</Text>
          <Text className="text-base font-bold text-slate-900">
            {mode ? MODE_LABELS[mode].title : "Today's drill"}
          </Text>
        </View>
        {questions.length > 0 && !isDone ? (
          <View className="rounded-full bg-indigo-50 px-3 py-1.5">
            <Text className="text-xs font-semibold text-indigo-600">
              {Math.min(activeIndex + 1, questions.length)} / {questions.length}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-24 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="gap-4">
            <Skeleton.Line width="60%" height={26} />
            <Skeleton.Line width="100%" />
            <Skeleton.Card height={64} />
            <Skeleton.Card height={64} />
            <Skeleton.Card height={64} />
            <Skeleton.Card height={64} />
          </View>
        ) : questions.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No drill today"
            message="Finish a lesson and check back tomorrow — drills review your weakest concepts."
            action={{ label: "Back home", onPress: () => router.replace("/(tabs)") }}
            gradient={{ from: "#10b981", to: "#14b8a6" }}
          />
        ) : isDone ? (
          <View className="gap-5">
            <View className="items-center gap-4 pt-6">
              <GradientIcon
                size={88}
                radius={26}
                from={correctCount === questions.length ? "#10b981" : "#6366f1"}
                to={correctCount === questions.length ? "#14b8a6" : "#7c3aed"}
              >
                <Trophy size={40} color="#ffffff" />
              </GradientIcon>
              <Text className="text-3xl font-extrabold text-slate-900">
                {correctCount} / {questions.length}
              </Text>
              <Text className="text-sm text-slate-500 text-center max-w-xs">
                {correctCount === questions.length
                  ? "Perfect run. Mastery banked."
                  : correctCount >= questions.length / 2
                    ? "Solid drill — streak is safe."
                    : "Bring it back tomorrow. The weakest cards rise again."}
              </Text>
            </View>

            <View className="gap-2">
              {answered.map((a, i) => {
                const q = questions[i];
                return (
                  <View
                    key={a.questionId}
                    className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
                      a.result.correct
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    {a.result.correct ? (
                      <CheckCircle2 size={20} color="#059669" />
                    ) : (
                      <XCircle size={20} color="#dc2626" />
                    )}
                    <View className="flex-1">
                      <Text
                        className="text-xs font-medium text-slate-500"
                        numberOfLines={1}
                      >
                        {q.lessonTitle}
                      </Text>
                      <Text
                        className="text-sm font-semibold text-slate-900"
                        numberOfLines={2}
                      >
                        {q.question}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() => router.replace("/(tabs)")}
              className="h-12 flex-row items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
            >
              <Text className="text-sm font-semibold text-white">Back home</Text>
            </Pressable>
          </View>
        ) : current ? (
          <View className="gap-5">
            {mode ? (
              <View className="flex-row items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <Sparkles size={18} color="#4f46e5" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900">
                    {MODE_LABELS[mode].title}
                  </Text>
                  <Text className="text-xs text-slate-600 mt-0.5 leading-5">
                    {MODE_LABELS[mode].subtitle}
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                {current.lessonTitle}
              </Text>
              <Text className="text-xl font-bold text-slate-900 leading-7">
                {current.question}
              </Text>
            </View>

            <View className="gap-2">
              {current.options.map((option, i) => {
                const isSelected = selected === i;
                const showResult = isCurrentAnswered && justAnswered;
                const isCorrect = showResult && justAnswered.result.correctIndex === i;
                const isWrongSelected =
                  showResult && i === justAnswered.selectedIndex && !justAnswered.result.correct;

                return (
                  <Pressable
                    key={i}
                    disabled={Boolean(showResult) || grading}
                    onPress={() => setSelected(i)}
                    className={`rounded-2xl border-2 p-4 ${
                      isCorrect
                        ? "border-emerald-300 bg-emerald-50"
                        : isWrongSelected
                          ? "border-rose-300 bg-rose-50"
                          : isSelected
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 bg-white"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`w-7 h-7 rounded-lg items-center justify-center ${
                          isCorrect
                            ? "bg-emerald-600"
                            : isWrongSelected
                              ? "bg-rose-600"
                              : isSelected
                                ? "bg-indigo-600"
                                : "bg-slate-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isCorrect || isWrongSelected || isSelected
                              ? "text-white"
                              : "text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm text-slate-900 leading-5">
                        {option}
                      </Text>
                      {isCorrect ? (
                        <CheckCircle2 size={18} color="#059669" />
                      ) : isWrongSelected ? (
                        <XCircle size={18} color="#dc2626" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!loading && !isDone && current ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white px-4 py-3">
          {isCurrentAnswered ? (
            <Pressable
              onPress={advance}
              className="h-12 flex-row items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
            >
              <Text className="text-sm font-semibold text-white">
                {activeIndex + 1 >= questions.length ? "See results" : "Next question"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={submit}
              disabled={selected == null || grading}
              className={`h-12 flex-row items-center justify-center gap-2 rounded-full ${
                selected != null && !grading
                  ? "bg-slate-900 active:bg-slate-800"
                  : "bg-slate-200"
              }`}
            >
              {grading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Flame size={16} color={selected != null ? "#ffffff" : "#94a3b8"} />
                  <Text
                    className={`text-sm font-semibold ${
                      selected != null ? "text-white" : "text-slate-400"
                    }`}
                  >
                    Submit answer
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
