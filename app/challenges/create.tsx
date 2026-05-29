import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  Swords,
  Timer,
} from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/lib/toast";
import {
  getStudyPlan,
  getUserStudyPlans,
  type Lesson,
  type PassportCourse,
  type StudyPlanResponse,
} from "@/lib/api";
import { createChallenge } from "@/lib/challenge-api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

const TIME_OPTIONS = [
  { value: 15, label: "15s", subtitle: "Speed" },
  { value: 30, label: "30s", subtitle: "Standard" },
  { value: 60, label: "60s", subtitle: "Thinker" },
] as const;

export default function ChallengeCreateScreen() {
  const router = useRouter();
  const toast = useToast();

  const [courses, setCourses] = useState<PassportCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<PassportCourse | null>(null);

  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null);

  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getUserStudyPlans();
        // Only completable courses with actual lesson data
        const eligible = all.filter((c) => c.totalDays > 0 && !c.archivedAt);
        setCourses(eligible);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't load your courses",
        );
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, [toast]);

  const loadPlan = useCallback(
    async (pdfId: string) => {
      setPlanLoading(true);
      setSelectedLessonIndex(null);
      setPlan(null);
      try {
        const data = await getStudyPlan(pdfId);
        setPlan(data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't load lessons",
        );
      } finally {
        setPlanLoading(false);
      }
    },
    [toast],
  );

  const handleSubmit = async () => {
    if (!selectedCourse || selectedLessonIndex == null) return;
    setSubmitting(true);
    try {
      const res = await createChallenge({
        pdfId: selectedCourse.pdfId,
        lessonIndex: selectedLessonIndex,
        opponentId: null,
        questionTimeLimit: timeLimit,
      });
      toast.success("Challenge ready — share the invite code");
      void markFeatureDiscovered("challenge-create");
      router.replace({
        pathname: "/challenges/[id]",
        params: { id: res.challenge.id },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't create challenge",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const lessons: Lesson[] = plan?.lessons ?? plan?.plan ?? [];
  const canSubmit =
    !!selectedCourse && selectedLessonIndex != null && !submitting;

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
          <Text className="text-xs text-slate-500">New challenge</Text>
          <Text className="text-base font-bold text-slate-900">
            Build your race
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2 mb-6">
          <View className="self-start flex-row items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5">
            <Sparkles size={14} color="#e11d48" />
            <Text className="text-xs font-semibold text-rose-700">
              1v1 challenge
            </Text>
          </View>
          <Text className="text-2xl font-extrabold tracking-tight text-slate-900">
            Pick a lesson, set the timer
          </Text>
          <Text className="text-sm leading-6 text-slate-600">
            We'll generate a shareable invite code. Whoever lands the higher
            score under the timer wins.
          </Text>
        </View>

        <View className="gap-3 mb-6">
          <Text className="text-xs uppercase tracking-wider font-bold text-slate-500">
            1. Pick a course
          </Text>
          {coursesLoading ? (
            <View className="gap-2">
              <Skeleton.Card height={64} />
              <Skeleton.Card height={64} />
            </View>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses ready"
              message="Generate a course first, then race a friend through one of its lessons."
              action={{
                label: "Upload a PDF",
                onPress: () => router.push("/upload"),
              }}
              gradient={{ from: "#f43f5e", to: "#ec4899" }}
            />
          ) : (
            <View className="gap-2">
              {courses.map((course) => {
                const active = selectedCourse?.pdfId === course.pdfId;
                return (
                  <Pressable
                    key={course.pdfId}
                    onPress={() => {
                      setSelectedCourse(course);
                      void loadPlan(course.pdfId);
                    }}
                    className={`flex-row items-center gap-3 rounded-2xl border-2 p-3 ${
                      active
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center ${
                        active ? "bg-rose-600" : "bg-slate-100"
                      }`}
                    >
                      <BookOpen
                        size={18}
                        color={active ? "#ffffff" : "#475569"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-bold text-slate-900"
                        numberOfLines={1}
                      >
                        {course.title}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        {course.totalDays} lessons
                      </Text>
                    </View>
                    {active ? (
                      <CheckCircle2 size={18} color="#e11d48" />
                    ) : (
                      <ChevronRight size={18} color="#94a3b8" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {selectedCourse ? (
          <View className="gap-3 mb-6">
            <Text className="text-xs uppercase tracking-wider font-bold text-slate-500">
              2. Pick a lesson
            </Text>
            {planLoading ? (
              <View className="gap-2">
                <Skeleton.Card height={64} />
                <Skeleton.Card height={64} />
              </View>
            ) : lessons.length === 0 ? (
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <Text className="text-sm text-slate-600">
                  This course isn't ready yet.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {lessons.map((lesson, i) => {
                  const active = selectedLessonIndex === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setSelectedLessonIndex(i)}
                      className={`flex-row items-center gap-3 rounded-2xl border-2 p-3 ${
                        active
                          ? "border-rose-300 bg-rose-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <View
                        className={`w-9 h-9 rounded-lg items-center justify-center ${
                          active ? "bg-rose-600" : "bg-slate-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            active ? "text-white" : "text-slate-700"
                          }`}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <Text
                        className="flex-1 text-sm font-semibold text-slate-900"
                        numberOfLines={2}
                      >
                        {lesson.title}
                      </Text>
                      {active ? (
                        <CheckCircle2 size={18} color="#e11d48" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {selectedLessonIndex != null ? (
          <View className="gap-3 mb-6">
            <Text className="text-xs uppercase tracking-wider font-bold text-slate-500">
              3. Time per question
            </Text>
            <View className="flex-row gap-2">
              {TIME_OPTIONS.map((opt) => {
                const active = timeLimit === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setTimeLimit(opt.value)}
                    className={`flex-1 rounded-2xl border-2 px-3 py-4 items-center ${
                      active
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <Timer
                      size={18}
                      color={active ? "#e11d48" : "#94a3b8"}
                    />
                    <Text
                      className={`mt-2 text-lg font-extrabold ${
                        active ? "text-rose-700" : "text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      className={`text-xs ${
                        active ? "text-rose-600" : "text-slate-500"
                      }`}
                    >
                      {opt.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {canSubmit ? (
          <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex-row items-start gap-3">
            <Clock size={18} color="#e11d48" />
            <Text className="flex-1 text-xs leading-5 text-rose-900">
              Each question lasts {timeLimit}s. If you don't answer in time,
              it counts as missed.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white px-4 py-3">
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`h-12 flex-row items-center justify-center gap-2 rounded-full ${
            canSubmit ? "bg-slate-900 active:bg-slate-800" : "bg-slate-200"
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Swords
                size={16}
                color={canSubmit ? "#ffffff" : "#94a3b8"}
              />
              <Text
                className={`text-sm font-semibold ${
                  canSubmit ? "text-white" : "text-slate-400"
                }`}
              >
                Create challenge
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
