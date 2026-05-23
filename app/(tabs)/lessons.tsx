import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, ChevronRight, Plus, Sparkles, Upload } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import {
  getMyPDFs,
  getUserStudyPlans,
  type PassportCourse,
  type PDF,
} from "@/lib/api";

interface CourseRow {
  pdfId: string;
  title: string;
  uploadedAt: string;
  currentDay: number;
  totalDays: number;
  masteryAvg?: number;
  isComplete: boolean;
}

export default function LessonsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pdfsResult, plansResult] = await Promise.allSettled([
        getMyPDFs(),
        getUserStudyPlans(),
      ]);
      const pdfs: PDF[] = pdfsResult.status === "fulfilled" ? pdfsResult.value : [];
      const plans: PassportCourse[] =
        plansResult.status === "fulfilled" ? plansResult.value : [];
      const plansById = new Map(plans.map((p) => [p.pdfId, p]));

      const merged: CourseRow[] = pdfs
        .filter((p) => !plansById.get(p.id)?.archivedAt)
        .map((p) => {
          const plan = plansById.get(p.id);
          return {
            pdfId: p.id,
            title: plan?.title ?? p.originalName ?? p.fileName,
            uploadedAt: p.uploadedAt,
            currentDay: Math.max(0, plan?.currentDay ?? 0),
            totalDays: plan?.totalDays ?? 0,
            masteryAvg: plan?.masteryAvg,
            isComplete: plan?.isComplete ?? false,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        );

      setRows(merged);

      if (pdfsResult.status === "rejected") {
        toast.error(
          pdfsResult.reason instanceof Error
            ? pdfsResult.reason.message
            : "Couldn't load lessons",
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load lessons");
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

  const activeCount = rows.filter((row) => !row.isComplete).length;
  const completedCount = rows.filter((row) => row.isComplete).length;
  const totalLessons = rows.reduce((sum, row) => sum + row.totalDays, 0);
  const getDisplayDay = (row: CourseRow) =>
    row.totalDays > 0
      ? Math.min(row.isComplete ? row.totalDays : row.currentDay + 1, row.totalDays)
      : 0;
  const getProgress = (row: CourseRow) =>
    row.totalDays > 0
      ? Math.min((((row.isComplete ? row.totalDays : row.currentDay) / row.totalDays) * 100), 100)
      : 0;

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-4">
        <View className="flex-row items-end justify-between">
          <View>
            <View className="self-start flex-row items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5">
              <Sparkles size={14} color="#4f46e5" />
              <Text className="text-xs font-semibold text-indigo-600">
                Learning library
              </Text>
            </View>
            <Text className="mt-3 text-2xl font-bold text-slate-900">Your courses</Text>
            <Text className="text-sm text-slate-500">
              Generated from your uploaded PDFs.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/upload")}
            hitSlop={8}
            className="w-10 h-10 rounded-full bg-slate-900 active:bg-slate-800 items-center justify-center"
          >
            <Plus size={20} color="#ffffff" />
          </Pressable>
        </View>

        {rows.length > 0 ? (
          <View
            className="overflow-hidden rounded-3xl bg-slate-900 p-5"
            style={{
              shadowColor: "#312e81",
              shadowOpacity: 0.18,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}
          >
            <View
              pointerEvents="none"
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30"
            />
            <View
              pointerEvents="none"
              className="absolute -left-10 bottom-[-24px] h-36 w-36 rounded-full bg-indigo-500/25"
            />
            <Text className="text-2xl font-extrabold tracking-tight text-white">
              Keep the streak moving
            </Text>
            <Text className="mt-2 text-sm leading-6 text-white/70">
              Every course here is ready to pull you back into focused, bite-sized progress.
            </Text>
            <View className="mt-5 flex-row gap-2">
              <View className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                <Text className="text-lg font-extrabold text-white">{activeCount}</Text>
                <Text className="mt-1 text-xs text-white/60">Active</Text>
              </View>
              <View className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                <Text className="text-lg font-extrabold text-white">{completedCount}</Text>
                <Text className="mt-1 text-xs text-white/60">Completed</Text>
              </View>
              <View className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                <Text className="text-lg font-extrabold text-white">{totalLessons}</Text>
                <Text className="mt-1 text-xs text-white/60">Lessons</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View className="gap-3">
          <Skeleton.Card />
          <Skeleton.Card />
          <Skeleton.Card />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No courses yet"
          message="Upload a PDF or start from a topic to generate your first lessons, flashcards, and quizzes."
          action={{ label: "Upload a PDF", onPress: () => router.push("/upload") }}
          secondary={{
            label: "Start from a topic",
            onPress: () => router.push("/topic-course"),
          }}
        />
      ) : (
        <View className="gap-3">
          {rows.map((row) => {
            const progress = getProgress(row);
            const displayDay = getDisplayDay(row);
            return (
              <Pressable
                key={row.pdfId}
                onPress={() =>
                  router.push({
                    pathname: "/course/[pdfId]",
                    params: { pdfId: row.pdfId },
                  })
                }
                className="rounded-3xl border border-slate-200 bg-white p-4 active:bg-slate-50"
                style={{
                  shadowColor: "#0f172a",
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <GradientIcon size={50} radius={16} from="#6366f1" to="#7c3aed">
                    <BookOpen size={22} color="#ffffff" />
                  </GradientIcon>
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-start justify-between gap-3">
                      <Text
                        className="flex-1 font-semibold text-slate-900"
                        numberOfLines={2}
                      >
                        {row.title}
                      </Text>
                      <View
                        className={`rounded-full px-3 py-1.5 ${
                          row.isComplete ? "bg-emerald-100" : "bg-indigo-50"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            row.isComplete ? "text-emerald-700" : "text-indigo-600"
                          }`}
                        >
                          {row.isComplete ? "Completed" : "In progress"}
                        </Text>
                      </View>
                    </View>

                    {row.totalDays > 0 ? (
                      <>
                        <View className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <View
                            className="h-1.5 rounded-full bg-indigo-600"
                            style={{ width: `${progress}%` }}
                          />
                        </View>
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-xs text-slate-500">
                            {row.isComplete
                              ? `Finished ${row.totalDays} lessons`
                              : `Day ${displayDay} of ${row.totalDays}`}
                          </Text>
                          {row.masteryAvg != null ? (
                            <Text className="text-xs font-semibold text-slate-600">
                              {Math.round(row.masteryAvg)} mastery
                            </Text>
                          ) : null}
                        </View>
                      </>
                    ) : (
                      <Text className="mt-2 text-xs text-slate-500">
                        Uploaded {new Date(row.uploadedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}
