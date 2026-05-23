import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ListChecks,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { Skeleton } from "@/components/Skeleton";
import { RichContent } from "@/components/RichContent";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import { getLesson, markLectureComplete, type Lesson } from "@/lib/api";

export default function LessonDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pdfId, lessonIndex } = useLocalSearchParams<{
    pdfId: string;
    lessonIndex: string;
  }>();

  const index = Number(lessonIndex ?? 0);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!pdfId || Number.isNaN(index)) return;
    (async () => {
      try {
        const data = await getLesson(pdfId, index);
        setLesson(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't load lesson");
      } finally {
        setLoading(false);
      }
    })();
  }, [pdfId, index, toast]);

  const handleMarkComplete = useCallback(async () => {
    if (!pdfId) return;
    setMarking(true);
    try {
      await markLectureComplete(pdfId, index);
      setCompleted(true);
      toast.success("Lecture marked complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't mark complete");
    } finally {
      setMarking(false);
    }
  }, [pdfId, index, toast]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-2 border-b border-slate-100">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center bg-white border border-slate-200"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-slate-500">
            Lesson {Number.isNaN(index) ? "?" : index + 1}
          </Text>
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {lesson?.title ?? (loading ? "Loading…" : "Lesson")}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="gap-3">
            <Skeleton.Line width="60%" height={24} />
            <Skeleton.Line width="100%" />
            <Skeleton.Line width="92%" />
            <Skeleton.Line width="80%" />
            <View className="h-6" />
            <Skeleton.Line width="50%" height={20} />
            <Skeleton.Line width="100%" />
            <Skeleton.Line width="95%" />
            <Skeleton.Line width="70%" />
          </View>
        ) : !lesson ? (
          <View className="py-12 items-center gap-3">
            <Text className="text-base text-slate-600">
              This lesson isn't ready yet.
            </Text>
          </View>
        ) : (
          <View className="gap-6">
            <View className="flex-row items-center gap-3">
              <GradientIcon size={48} radius={14} from="#6366f1" to="#7c3aed">
                <BookOpen size={22} color="#ffffff" />
              </GradientIcon>
              <View className="flex-1">
                <Text className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {lesson.title}
                </Text>
                {lesson.estimatedMinutes ? (
                  <Text className="text-sm text-slate-500">
                    About {lesson.estimatedMinutes} min
                  </Text>
                ) : null}
              </View>
            </View>

            {lesson.storyHook ? (
              <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex-row gap-3">
                <Sparkles size={18} color="#4f46e5" />
                <Text className="flex-1 text-sm leading-6 text-indigo-900">
                  {lesson.storyHook}
                </Text>
              </View>
            ) : null}

            {lesson.topics && lesson.topics.length > 0 ? (
              <View className="gap-2">
                <Text className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Topics
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {lesson.topics.map((t) => (
                    <View
                      key={t}
                      className="px-3 py-1.5 rounded-full bg-white border border-slate-200"
                    >
                      <Text className="text-xs font-medium text-slate-700">{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {lesson.sections && lesson.sections.length > 0 ? (
              <View className="gap-6">
                {lesson.sections.map((section, i) => (
                  <View key={section.sectionId ?? i} className="gap-3">
                    <Text className="text-lg font-bold text-slate-900">
                      {i + 1}. {section.title}
                    </Text>
                    {section.thesis ? (
                      <View className="bg-white border border-slate-200 rounded-xl p-3">
                        <Text className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">
                          Key idea
                        </Text>
                        <Text className="text-sm text-slate-800 leading-5">
                          {section.thesis}
                        </Text>
                      </View>
                    ) : null}
                    <RichContent html={section.lectureHtml ?? ""} />
                    {section.retrievalCheck && !section.retrievalCheckSuppressed ? (
                      <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <Text className="text-xs uppercase tracking-wider font-semibold text-amber-700 mb-1">
                          Quick check
                        </Text>
                        <Text className="text-sm font-medium text-slate-900 mb-2">
                          {section.retrievalCheck.question}
                        </Text>
                        <Text className="text-sm text-slate-700 leading-5">
                          {section.retrievalCheck.answer}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : Array.isArray(lesson.description) ? (
              <View className="gap-3">
                {lesson.description.map((p, i) => (
                  <Text key={i} className="text-base text-slate-700 leading-7">
                    {p}
                  </Text>
                ))}
              </View>
            ) : lesson.description ? (
              <Text className="text-base text-slate-700 leading-7">
                {lesson.description}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {!loading && lesson ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white px-4 py-3">
          <View className="flex-row gap-2">
            <Pressable
              disabled
              className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full bg-slate-100 opacity-60"
            >
              <Zap size={16} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-500">Flashcards</Text>
            </Pressable>
            <Pressable
              disabled
              className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full bg-slate-100 opacity-60"
            >
              <ListChecks size={16} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-500">Quiz</Text>
            </Pressable>
            <Pressable
              onPress={handleMarkComplete}
              disabled={marking || completed}
              className={`flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full ${
                completed ? "bg-emerald-600" : "bg-slate-900 active:bg-slate-800"
              } ${marking ? "opacity-60" : ""}`}
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">
                {completed ? "Done" : marking ? "Saving…" : "Mark done"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
