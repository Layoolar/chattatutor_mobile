import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Lock,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import { Skeleton } from "@/components/Skeleton";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import { getStudyPlan, type Lesson, type StudyPlanResponse } from "@/lib/api";

function getLessonPreview(lesson: Lesson): string {
  const description = Array.isArray(lesson.description)
    ? lesson.description.find((entry) => entry.trim().length > 0)
    : lesson.description;

  return (
    lesson.storyHook?.trim() ||
    description?.trim() ||
    "Short, focused teaching with built-in recall and review."
  );
}

function getLessonReviewCount(lesson: Lesson): number {
  return (lesson.quizQuestions?.length ?? 0) + (lesson.flashcards?.length ?? 0);
}

function MetaChip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5">
      <Text className="text-xs font-semibold text-indigo-700">{label}</Text>
    </View>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-indigo-300/20 bg-indigo-500/15 px-3 py-3">
      <Text className="text-lg font-extrabold text-white">{value}</Text>
      <Text className="mt-1 text-xs font-semibold text-indigo-100">{label}</Text>
    </View>
  );
}

export default function CourseDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pdfId } = useLocalSearchParams<{ pdfId: string }>();

  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pdfId) return;
    try {
      const data = await getStudyPlan(pdfId);
      setPlan(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load course");
    }
  }, [pdfId, toast]);

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

  const courseTitle = plan?.courseTitle || plan?.title || "Course";
  const lessons: Lesson[] = plan?.lessons ?? [];
  const currentDay = Math.max(0, plan?.currentDay ?? 0);
  const completedLessons = Math.min(currentDay, lessons.length);
  const isComplete = lessons.length > 0 && currentDay >= lessons.length;
  const currentLessonIndex = lessons.length > 0 ? Math.min(currentDay, lessons.length - 1) : 0;
  const displayDay = lessons.length > 0 ? Math.min(currentLessonIndex + 1, lessons.length) : 0;
  const currentLesson = lessons.length > 0 ? lessons[currentLessonIndex] : null;
  const totalMinutes = lessons.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes ?? 0),
    0,
  );
  const totalReviews = lessons.reduce(
    (sum, lesson) => sum + getLessonReviewCount(lesson),
    0,
  );
  const totalSections = lessons.reduce(
    (sum, lesson) => sum + (lesson.sections?.length ?? 0),
    0,
  );
  const completionPercent =
    lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const progressWidth = lessons.length > 0 ? (completedLessons / lessons.length) * 100 : 0;
  const focusTitle = isComplete
    ? "Everything is unlocked"
    : currentLesson?.title ?? "Your next lesson is ready";
  const focusPreview = isComplete
    ? "Revisit any lesson, shore up weak spots, and finish strong with the boss quiz when you want the full mastery check."
    : getLessonPreview(currentLesson ?? lessons[0]);
  const focusActionLabel = isComplete ? "Review last lesson" : `Continue lesson ${displayDay}`;

  const openLesson = (lessonIndex: number) => {
    if (!pdfId) return;

    router.push({
      pathname: "/lesson/[pdfId]/[lessonIndex]",
      params: { pdfId: String(pdfId), lessonIndex: String(lessonIndex) },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/lessons"))}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          style={{
            shadowColor: "#0f172a",
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Learning Path
          </Text>
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {loading ? "Loading..." : courseTitle}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-16 pt-3"
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
        <View className="relative gap-5">
          <View
            pointerEvents="none"
            className="absolute -left-20 -top-10 h-56 w-56 rounded-full bg-indigo-200/40"
          />
          <View
            pointerEvents="none"
            className="absolute right-[-72px] top-40 h-44 w-44 rounded-full bg-cyan-200/35"
          />
          <View
            pointerEvents="none"
            className="absolute -bottom-6 left-10 h-40 w-40 rounded-full bg-violet-200/30"
          />

          {loading ? (
            <View className="gap-3">
              <Skeleton.Card height={240} />
              <Skeleton.Card height={140} />
              <Skeleton.Card />
              <Skeleton.Card />
            </View>
          ) : lessons.length === 0 ? (
            <View
              className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-6"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.22,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 12 },
                elevation: 8,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-indigo-500/25"
              />
              <View
                pointerEvents="none"
                className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-violet-500/20"
              />
              <View className="self-start flex-row items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                <Sparkles size={14} color="#ffffff" />
                <Text className="text-xs font-semibold text-white">Building your course</Text>
              </View>
              <Text className="mt-5 text-3xl font-extrabold tracking-tight text-white">
                Your lessons are almost ready
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/70">
                ChattaTutor is still shaping the learning path, flashcards, and quizzes for this course.
              </Text>
              <Pressable
                onPress={onRefresh}
                className="mt-6 self-start rounded-full bg-white px-5 py-3 active:opacity-90"
              >
                <Text className="text-sm font-semibold text-slate-900">Refresh course</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View
                className="overflow-hidden rounded-3xl bg-slate-900"
                style={{
                  shadowColor: "#312e81",
                  shadowOpacity: 0.22,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 9,
                }}
              >
                <View
                  pointerEvents="none"
                  className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-indigo-500/30"
                />
                <View
                  pointerEvents="none"
                  className="absolute -left-14 bottom-[-30px] h-44 w-44 rounded-full bg-violet-500/25"
                />
                <View
                  pointerEvents="none"
                  className="absolute right-10 top-24 h-16 w-16 rounded-full bg-cyan-400/20"
                />

                <View className="px-6 pb-6 pt-5">
                  <View className="self-start flex-row items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    <Sparkles size={14} color="#ffffff" />
                    <Text className="text-xs font-semibold text-white">AI-crafted learning path</Text>
                  </View>

                  <Text className="mt-5 text-3xl font-extrabold leading-9 tracking-tight text-white">
                    {courseTitle}
                  </Text>
                  <Text className="mt-3 text-sm leading-6 text-indigo-50">
                    {isComplete
                      ? `You completed all ${lessons.length} lessons. Review, reinforce, and take the final challenge whenever you are ready.`
                      : getLessonPreview(currentLesson ?? lessons[0])}
                  </Text>

                  <View className="mt-6 flex-row gap-2">
                    <HeroStat value={`${completionPercent}%`} label="Complete" />
                    <HeroStat
                      value={totalMinutes > 0 ? `${totalMinutes}m` : `${lessons.length}`}
                      label={totalMinutes > 0 ? "Study time" : "Lessons"}
                    />
                    <HeroStat
                      value={`${totalReviews > 0 ? totalReviews : totalSections}`}
                      label={totalReviews > 0 ? "Review reps" : "Sections"}
                    />
                  </View>

                  <View className="mt-6">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-white/60">
                        {isComplete ? "Course completed" : `Now focusing on lesson ${displayDay}`}
                      </Text>
                      <Text className="text-xs font-semibold text-white">
                        {completedLessons}/{lessons.length} done
                      </Text>
                    </View>
                    <View className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <View
                        className="h-2 rounded-full bg-white"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </View>
                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-xs text-white/60">
                        Day {displayDay} of {lessons.length}
                      </Text>
                      <Text className="text-xs text-indigo-100">
                        {isComplete ? "Boss quiz unlocked" : "Keep the streak alive"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => openLesson(currentLessonIndex)}
                className="rounded-3xl border border-slate-200 bg-white p-5"
                style={{
                  shadowColor: "#0f172a",
                  shadowOpacity: 0.05,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 3,
                }}
              >
                <View className="flex-row items-start gap-4">
                  <GradientIcon
                    size={54}
                    radius={18}
                    from={isComplete ? "#f59e0b" : "#06b6d4"}
                    to={isComplete ? "#f97316" : "#4f46e5"}
                  >
                    {isComplete ? (
                      <Trophy size={24} color="#ffffff" />
                    ) : (
                      <BookOpen size={24} color="#ffffff" />
                    )}
                  </GradientIcon>
                  <View className="flex-1">
                    <View
                      className={`self-start rounded-full px-3 py-1.5 ${
                        isComplete ? "bg-amber-50" : "bg-indigo-50"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isComplete ? "text-amber-700" : "text-indigo-600"
                        }`}
                      >
                        {isComplete ? "Course complete" : "Current focus"}
                      </Text>
                    </View>
                    <Text className="mt-3 text-lg font-bold text-slate-900">
                      {focusTitle}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-600">
                      {focusPreview}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <MetaChip label={`Day ${displayDay}`} />
                  {currentLesson?.estimatedMinutes ? (
                    <MetaChip label={`${currentLesson.estimatedMinutes} min`} />
                  ) : null}
                  {(currentLesson?.sections?.length ?? 0) > 0 ? (
                    <MetaChip label={`${currentLesson?.sections?.length ?? 0} sections`} />
                  ) : null}
                  {currentLesson && getLessonReviewCount(currentLesson) > 0 ? (
                    <MetaChip label={`${getLessonReviewCount(currentLesson)} review drills`} />
                  ) : null}
                </View>

                <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-white">{focusActionLabel}</Text>
                    <Text className="mt-1 text-xs text-indigo-100">
                      {isComplete
                        ? "Open the latest lesson and keep retention high."
                        : "Jump straight into the next unlocked lesson without scanning the list."}
                    </Text>
                  </View>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <ChevronRight size={18} color="#ffffff" />
                  </View>
                </View>
              </Pressable>

              <View className="flex-row items-end justify-between px-1">
                <View>
                  <Text className="text-xl font-extrabold tracking-tight text-slate-900">
                    Course map
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    Clear each lesson to keep the path opening up.
                  </Text>
                </View>
                <View className="rounded-full bg-indigo-600 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-white">
                    {completedLessons}/{lessons.length} cleared
                  </Text>
                </View>
              </View>

              <View className="gap-3">
                {lessons.map((lesson, i) => {
                  const locked = !isComplete && i > currentLessonIndex;
                  const isCurrent = !isComplete && i === currentLessonIndex;
                  const isCompleted = i < completedLessons;
                  const reviewCount = getLessonReviewCount(lesson);
                  const sectionCount = lesson.sections?.length ?? 0;

                  return (
                    <Pressable
                      key={i}
                      onPress={() => openLesson(i)}
                      disabled={locked}
                      className={`overflow-hidden rounded-3xl border p-4 ${
                        isCurrent
                          ? "border-indigo-200 bg-white"
                          : isCompleted
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white"
                      } ${locked ? "opacity-75" : "active:bg-slate-50"}`}
                      style={{
                        shadowColor: isCurrent ? "#4f46e5" : "#0f172a",
                        shadowOpacity: isCurrent ? 0.12 : 0.04,
                        shadowRadius: isCurrent ? 16 : 10,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: isCurrent ? 5 : 2,
                      }}
                    >
                      {isCurrent ? <View className="absolute inset-x-0 top-0 h-1.5 bg-indigo-500" /> : null}
                      {isCompleted ? <View className="absolute inset-x-0 top-0 h-1.5 bg-emerald-500" /> : null}

                      <View className="flex-row items-start gap-3">
                        <View
                          className={`h-12 w-12 items-center justify-center rounded-2xl ${
                            isCurrent
                              ? "bg-indigo-600"
                              : isCompleted
                                ? "bg-emerald-600"
                                : locked
                                  ? "bg-slate-100"
                                  : "bg-indigo-50"
                          }`}
                        >
                          {locked ? (
                            <Lock size={18} color="#94a3b8" />
                          ) : isCompleted ? (
                            <CheckCircle2 size={22} color="#ffffff" />
                          ) : isCurrent ? (
                            <Text className="text-base font-bold text-white">{i + 1}</Text>
                          ) : (
                            <Text className="text-base font-bold text-indigo-600">{i + 1}</Text>
                          )}
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Lesson {i + 1}
                              </Text>
                              <Text
                                className="mt-1 text-base font-bold text-slate-900"
                                numberOfLines={2}
                              >
                                {lesson.title}
                              </Text>
                            </View>
                            <View
                              className={`rounded-full px-3 py-1.5 ${
                                isCurrent
                                  ? "bg-indigo-600"
                                  : isCompleted
                                    ? "bg-emerald-100"
                                    : locked
                                      ? "bg-slate-100"
                                      : "bg-indigo-50"
                              }`}
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  isCurrent
                                    ? "text-white"
                                    : isCompleted
                                      ? "text-emerald-700"
                                      : locked
                                        ? "text-slate-500"
                                        : "text-indigo-600"
                                }`}
                              >
                                {isCurrent
                                  ? "Current focus"
                                  : isCompleted
                                    ? "Completed"
                                    : locked
                                      ? "Locked"
                                      : "Unlocked"}
                              </Text>
                            </View>
                          </View>

                          <Text className="mt-3 text-sm leading-6 text-slate-600" numberOfLines={3}>
                            {getLessonPreview(lesson)}
                          </Text>

                          <View className="mt-3 flex-row flex-wrap gap-2">
                            {lesson.estimatedMinutes ? (
                              <MetaChip label={`${lesson.estimatedMinutes} min`} />
                            ) : null}
                            {sectionCount > 0 ? (
                              <MetaChip label={`${sectionCount} sections`} />
                            ) : null}
                            {reviewCount > 0 ? (
                              <MetaChip label={`${reviewCount} review drills`} />
                            ) : null}
                          </View>

                          <View className="mt-4 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              <Clock3 size={14} color={locked ? "#94a3b8" : "#64748b"} />
                              <Text
                                className={`text-xs font-semibold ${
                                  locked
                                    ? "text-slate-400"
                                    : isCompleted
                                      ? "text-emerald-700"
                                      : "text-indigo-600"
                                }`}
                              >
                                {locked
                                  ? "Finish the previous lesson to unlock"
                                  : isCompleted
                                    ? "Review lesson"
                                    : isCurrent
                                      ? "Start lesson"
                                      : "Open lesson"}
                              </Text>
                            </View>
                            {locked ? (
                              <Lock size={16} color="#94a3b8" />
                            ) : (
                              <ChevronRight size={18} color="#94a3b8" />
                            )}
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View
                className="overflow-hidden rounded-3xl bg-slate-900 p-5"
                style={{
                  shadowColor: "#0f172a",
                  shadowOpacity: 0.12,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 4,
                }}
              >
                <View
                  pointerEvents="none"
                  className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-400/20"
                />
                <View
                  pointerEvents="none"
                  className="absolute -left-10 bottom-[-26px] h-28 w-28 rounded-full bg-violet-400/20"
                />
                <View className="flex-row items-start gap-4">
                  <GradientIcon size={52} radius={18} from="#f59e0b" to="#f97316">
                    <Trophy size={24} color="#ffffff" />
                  </GradientIcon>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-white">
                      {isComplete ? "Boss quiz is unlocked" : "Boss quiz awaits at the end"}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-white/70">
                      {isComplete
                        ? "You cleared the full course. Use the final assessment to prove mastery and lock in retention."
                        : "Finish every lesson and the final assessment opens up automatically. It is the cleanest way to turn progress into mastery."}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
