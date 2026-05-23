import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Flame,
  Lightbulb,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { GradientIcon } from "@/components/GradientIcon";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import {
  getMyPDFs,
  getUserActivity,
  getUserRank,
  getUserStudyPlans,
  type PassportCourse,
  type PDF,
  type UserActivity,
  type UserRank,
} from "@/lib/api";

interface CourseCard {
  pdfId: string;
  title: string;
  currentDay: number;
  totalDays: number;
  masteryAvg?: number;
  isComplete: boolean;
}

export default function DashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [a, r, plansResult, pdfsResult] = await Promise.allSettled([
      getUserActivity(),
      getUserRank(),
      getUserStudyPlans(),
      getMyPDFs(),
    ]);

    if (a.status === "fulfilled") setActivity(a.value);
    if (r.status === "fulfilled") setRank(r.value);

    // Stitch courses: prefer PassportCourse data; fall back to bare PDFs.
    const plans: PassportCourse[] =
      plansResult.status === "fulfilled" ? plansResult.value : [];
    const pdfs: PDF[] = pdfsResult.status === "fulfilled" ? pdfsResult.value : [];
    const plansById = new Map(plans.map((p) => [p.pdfId, p]));

    const merged: CourseCard[] = pdfs
      .filter((p) => !plansById.get(p.id)?.archivedAt)
      .map((p) => {
        const plan = plansById.get(p.id);
        return {
          pdfId: p.id,
          title: plan?.title ?? p.originalName ?? p.fileName,
          currentDay: Math.max(0, plan?.currentDay ?? 0),
          totalDays: plan?.totalDays ?? 0,
          masteryAvg: plan?.masteryAvg,
          isComplete: plan?.isComplete ?? false,
        };
      })
      .sort((a, b) => Number(b.isComplete) - Number(a.isComplete));

    setCourses(merged);

    if (plansResult.status === "rejected" || pdfsResult.status === "rejected") {
      toast.error("Couldn't refresh your courses");
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

  const activeCourses = courses.filter((c) => !c.isComplete).slice(0, 5);
  const resumeCourse = activeCourses[0];
  const getDisplayDay = (course: CourseCard) =>
    course.totalDays > 0
      ? Math.min(course.isComplete ? course.totalDays : course.currentDay + 1, course.totalDays)
      : 0;
  const getProgress = (course: CourseCard) =>
    course.totalDays > 0
      ? Math.min(
          (((course.isComplete ? course.totalDays : course.currentDay) / course.totalDays) * 100),
          100,
        )
      : 0;
  const getRemainingLessons = (course: CourseCard) =>
    course.totalDays > 0
      ? Math.max(course.totalDays - (course.isComplete ? course.totalDays : course.currentDay), 0)
      : 0;
  const resumeCourseDisplayDay = resumeCourse ? getDisplayDay(resumeCourse) : 0;
  const resumeCourseProgress = resumeCourse ? getProgress(resumeCourse) : 0;
  const activeCourseCount = courses.filter((course) => !course.isComplete).length;

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-5 gap-3">
        <View className="self-start flex-row items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5">
          <Sparkles size={14} color="#4f46e5" />
          <Text className="text-xs font-semibold text-indigo-600">
            Your learning momentum
          </Text>
        </View>
        <Text className="text-3xl font-extrabold tracking-tight text-slate-900">
          {user?.username ?? "Learner"}
        </Text>
        <Text className="text-sm leading-6 text-slate-500">
          {resumeCourse
            ? `You have ${activeCourseCount} active course${activeCourseCount === 1 ? "" : "s"}. Pick up right where you left off.`
            : "Upload a PDF or start from a topic to build a fresh learning streak."}
        </Text>
      </View>

      {loading ? (
        <View className="gap-4">
          <Skeleton.Card height={140} />
          <Skeleton.Card height={100} />
          <Skeleton.Card height={120} />
        </View>
      ) : (
        <View className="gap-5 pb-8">
          {/* Continue learning hero — only when there's an active course */}
          {resumeCourse ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/course/[pdfId]",
                  params: { pdfId: resumeCourse.pdfId },
                })
              }
              className="rounded-3xl bg-slate-900 active:opacity-90 p-5 overflow-hidden"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 7,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-violet-500/30"
              />
              <View
                pointerEvents="none"
                className="absolute -left-8 -bottom-12 w-44 h-44 rounded-full bg-indigo-500/30"
              />
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-wider font-semibold text-white/60">
                    Current mission
                  </Text>
                  <Text
                    className="text-xl font-extrabold text-white mt-1"
                    numberOfLines={2}
                  >
                    {resumeCourse.title}
                  </Text>
                  {resumeCourse.totalDays > 0 ? (
                    <Text className="text-sm text-white/70 mt-1">
                      Day {resumeCourseDisplayDay} of {resumeCourse.totalDays}
                    </Text>
                  ) : null}
                </View>
                {resumeCourse.totalDays > 0 ? (
                  <View className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white">
                      {Math.round(resumeCourseProgress)}% complete
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {resumeCourse.masteryAvg != null ? (
                  <View className="rounded-full bg-white/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white/85">
                      {Math.round(resumeCourse.masteryAvg)} mastery avg
                    </Text>
                  </View>
                ) : null}
                {resumeCourse.totalDays > 0 ? (
                  <View className="rounded-full bg-white/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white/85">
                      {getRemainingLessons(resumeCourse)} lesson{getRemainingLessons(resumeCourse) === 1 ? "" : "s"} left
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden">
                <View
                  className="h-2 rounded-full bg-white"
                  style={{
                    width: `${resumeCourseProgress}%`,
                  }}
                />
              </View>
              <View className="flex-row items-center justify-end mt-3 gap-1">
                <Text className="text-sm font-semibold text-white">
                  Resume
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </View>
            </Pressable>
          ) : null}

          {/* Primary action: upload or topic */}
          <View className="gap-3">
            <Pressable
              onPress={() => router.push("/upload")}
              className="flex-row items-center gap-3 rounded-2xl bg-indigo-600 active:bg-indigo-700 p-4"
            >
              <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
                <Upload size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Upload a PDF</Text>
                <Text className="text-xs text-white/80">
                  Turn any document into a course
                </Text>
              </View>
              <ChevronRight size={18} color="#ffffff" />
            </Pressable>

            <Pressable
              onPress={() => router.push("/topic-course")}
              className="flex-row items-center gap-3 rounded-2xl bg-white border border-slate-200 active:bg-slate-50 p-4"
            >
              <View className="w-12 h-12 rounded-xl bg-cyan-100 items-center justify-center">
                <Lightbulb size={22} color="#0891b2" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">
                  Start from a topic
                </Text>
                <Text className="text-xs text-slate-500">
                  No PDF needed — just type an idea
                </Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Active courses strip */}
          {activeCourses.length > 1 ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-slate-900">
                  Your courses
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/lessons")}
                  hitSlop={8}
                >
                  <Text className="text-xs font-semibold text-indigo-600">
                    See all
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 pr-6"
                className="-mx-6 px-6"
              >
                {activeCourses.slice(1).map((c) => (
                  <Pressable
                    key={c.pdfId}
                    onPress={() =>
                      router.push({
                        pathname: "/course/[pdfId]",
                        params: { pdfId: c.pdfId },
                      })
                    }
                    className="w-64 rounded-3xl border border-slate-200 bg-white p-4 gap-3 active:bg-slate-50"
                    style={{
                      shadowColor: "#0f172a",
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <GradientIcon size={44} radius={14} from="#6366f1" to="#7c3aed">
                        <BookOpen size={20} color="#ffffff" />
                      </GradientIcon>
                      {c.masteryAvg != null ? (
                        <View className="rounded-full bg-indigo-50 px-3 py-1.5">
                          <Text className="text-xs font-semibold text-indigo-600">
                            {Math.round(c.masteryAvg)} mastery
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      className="text-sm font-bold text-slate-900"
                      numberOfLines={2}
                    >
                      {c.title}
                    </Text>
                    {c.totalDays > 0 ? (
                      <>
                        <View className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <View
                            className="h-1.5 rounded-full bg-indigo-600"
                            style={{ width: `${getProgress(c)}%` }}
                          />
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-slate-500">
                            Day {getDisplayDay(c)} of {c.totalDays}
                          </Text>
                          <Text className="text-xs font-semibold text-slate-600">
                            {getRemainingLessons(c)} left
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text className="text-xs text-slate-500">Just uploaded</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Streak + rank — compact two-up */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 gap-2">
              <View className="w-9 h-9 rounded-lg bg-rose-50 items-center justify-center">
                <Flame size={18} color="#dc2626" />
              </View>
              <Text className="text-xs text-slate-500">Current streak</Text>
              <Text className="text-lg font-extrabold text-slate-900">
                {activity?.currentStreak ?? 0}{" "}
                <Text className="text-sm font-medium text-slate-500">days</Text>
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 gap-2">
              <View className="w-9 h-9 rounded-lg bg-amber-50 items-center justify-center">
                <Trophy size={18} color="#ca8a04" />
              </View>
              <Text className="text-xs text-slate-500">Rank</Text>
              <Text
                className="text-lg font-extrabold text-slate-900"
                numberOfLines={1}
              >
                {rank?.title ?? "—"}
              </Text>
            </View>
          </View>

          {/* First-time empty state for users with zero courses */}
          {!resumeCourse && courses.length === 0 ? (
            <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 gap-2 flex-row">
              <Sparkles size={20} color="#4f46e5" />
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">
                  Start your first course
                </Text>
                <Text className="text-sm text-slate-600 mt-1">
                  Upload a PDF or pick a topic — AI takes care of the rest.
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}
