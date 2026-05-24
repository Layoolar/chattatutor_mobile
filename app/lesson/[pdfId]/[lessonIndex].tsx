import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  ListChecks,
  Lock,
  MessageSquare,
  Puzzle,
  Send,
  Sparkles,
  Zap,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getAuthTokenSync, loadAuthToken } from "@/lib/auth-helpers";
import { LectureAudioPlayer } from "@/components/LectureAudioPlayer";
import { RichContent } from "@/components/RichContent";
import { Skeleton } from "@/components/Skeleton";
import { VisualDiagram } from "@/components/VisualDiagram";
import {
  chatWithAI,
  createQualityReport,
  explainSlide,
  getLesson,
  markLectureComplete,
  type ApiErrorWithCode,
  type ChatMessage,
  type Lesson,
  type LearningSection,
} from "@/lib/api";
import { API_URL } from "@/lib/constants";
import { haptics } from "@/lib/haptics";
import {
  isFlashcardsCompleted,
  markLectureCompleted as markLectureCachedComplete,
} from "@/lib/lesson-progress";
import { useToast } from "@/lib/toast";
import { isBuildModeEligible } from "@/lib/visual-eligibility";

type LessonTab = "lecture" | "quiz" | "chat" | "book";
type SectionAck = "correct" | "missed" | "skipped";

const SLIDE_HORIZONTAL_PADDING = 20;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getSlideHtml(lesson: Lesson | null, slideIndex: number): string {
  if (!lesson) return "";
  if (Array.isArray(lesson.description)) return lesson.description[slideIndex] ?? "";
  return typeof lesson.description === "string" ? lesson.description : "";
}

function getSection(lesson: Lesson | null, slideIndex: number): LearningSection | undefined {
  return lesson?.sections?.[slideIndex];
}

function getSectionId(
  lesson: Lesson | null,
  slideIndex: number,
  section: LearningSection | undefined,
): string | null {
  return section?.sectionId || lesson?.sectionIds?.[slideIndex] || null;
}

function getCourseIdFromSectionId(sectionId: string | null): string | null {
  if (!sectionId) return null;
  const lastColon = sectionId.lastIndexOf(":");
  const previousColon = sectionId.lastIndexOf(":", lastColon - 1);
  if (previousColon <= 0) return null;
  return sectionId.slice(0, previousColon) || null;
}

function hasSoftLock(section: LearningSection | undefined): boolean {
  if (!section) return false;
  const q = section.retrievalCheck?.question?.trim();
  const a = section.retrievalCheck?.answer?.trim();
  return Boolean(q && a && !section.retrievalCheckSuppressed);
}

class VisualSlotBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
          <Text className="text-xs font-semibold text-slate-500">
            Diagram unavailable for this slide
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// ───── Slide ────────────────────────────────────────────────────────────────

type SlideProps = {
  width: number;
  pdfId: string;
  lessonIndex: number;
  lesson: Lesson;
  index: number;
  section: LearningSection | undefined;
  ack: SectionAck | undefined;
  revealed: boolean;
  setRevealed: (value: boolean) => void;
  onAck: (mode: SectionAck) => void;
  isFrontier: boolean;
  consecutiveSkips: number;
};

function Slide({
  width,
  pdfId,
  lessonIndex,
  lesson,
  index,
  section,
  ack,
  revealed,
  setRevealed,
  onAck,
  isFrontier,
  consecutiveSkips,
}: SlideProps) {
  const toast = useToast();
  const html = getSlideHtml(lesson, index);
  const softLock = hasSoftLock(section);
  const ackPending = softLock && isFrontier && ack === undefined;
  const visual = lesson.visuals?.[index] ?? null;
  const hasVisualSlot = Array.isArray(lesson.visuals) && index < lesson.visuals.length;
  const buildModeEligible = isBuildModeEligible(visual);
  const visualNodeCount = Array.isArray(visual?.nodes) ? visual.nodes.length : 0;
  const sectionId = getSectionId(lesson, index, section);
  const courseId = getCourseIdFromSectionId(sectionId);
  const sourceAnchors = (section?.sourceAnchors ?? []).filter(Boolean).slice(0, 4);
  const [diagramBuildMode, setDiagramBuildMode] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [reportingVisual, setReportingVisual] = useState(false);
  const [reportingSection, setReportingSection] = useState(false);

  useEffect(() => {
    setDiagramBuildMode(false);
  }, [index, visual?.type, visualNodeCount]);

  useEffect(() => {
    setExplanation(null);
    setExplaining(false);
  }, [html, index]);

  const handleExplainDifferently = useCallback(async () => {
    const slideText = stripHtml(html);
    if (!slideText) return;

    setExplaining(true);
    try {
      const result = await explainSlide(pdfId, lessonIndex, slideText, index, false);
      setExplanation(result.explanation);
      haptics.success();
    } catch (error) {
      const apiError = error as ApiErrorWithCode;
      if (apiError.status === 403) {
        toast.error(apiError.message || "Premium subscription required for this explanation.");
      } else {
        toast.error(apiError.message || "Couldn't explain this slide right now.");
      }
    } finally {
      setExplaining(false);
    }
  }, [html, index, lessonIndex, pdfId, toast]);

  const handleReportVisual = useCallback(async () => {
    if (!visual || !sectionId || !courseId) {
      toast.error("Report unavailable for this slide.");
      return;
    }

    setReportingVisual(true);
    try {
      const result = await createQualityReport({
        courseId,
        sectionId,
        targetType: "visual",
        targetId: `${sectionId}:visual`,
        kind: "inaccurate",
        anchorText: visual.theme?.summary || visual.theme?.title || section?.thesis || stripHtml(html).slice(0, 220),
        userComment: "Learner reported this mobile diagram as inaccurate.",
      });
      haptics.success();
      toast.success(result.autoRegen?.status === "queued" ? "Repair pass queued." : "Diagram report saved.");
    } catch (error) {
      const apiError = error as ApiErrorWithCode;
      toast.error(apiError.message || "Couldn't submit the diagram report.");
    } finally {
      setReportingVisual(false);
    }
  }, [courseId, html, section?.thesis, sectionId, toast, visual]);

  const handleReportSection = useCallback(async () => {
    if (!sectionId || !courseId) {
      toast.error("Report unavailable for this slide.");
      return;
    }

    setReportingSection(true);
    try {
      const result = await createQualityReport({
        courseId,
        sectionId,
        targetType: "section",
        targetId: sectionId,
        kind: "inaccurate",
        anchorText: section?.thesis || stripHtml(html).slice(0, 220),
        userComment: "Learner reported this lesson section as inaccurate.",
      });
      haptics.success();
      toast.success(result.autoRegen?.status === "queued" ? "Repair pass queued." : "Content report saved.");
    } catch (error) {
      const apiError = error as ApiErrorWithCode;
      toast.error(apiError.message || "Couldn't submit the content report.");
    } finally {
      setReportingSection(false);
    }
  }, [courseId, html, section?.thesis, sectionId, toast]);

  return (
    <View style={{ width, paddingHorizontal: SLIDE_HORIZONTAL_PADDING }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {lesson.storyHook ? (
          <View className="mb-4 flex-row items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
            <Text className="text-base">🎯</Text>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                Mission
              </Text>
              <Text className="mt-1 text-xs italic leading-5 text-violet-900">
                {lesson.storyHook}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="rounded-3xl border border-indigo-100 bg-white p-5">
          {section?.thesis ? (
            <View className="mb-3">
              <Text className="text-base font-bold leading-6 text-slate-900">
                <Text className="text-indigo-500">✦ </Text>
                {section.thesis}
              </Text>
            </View>
          ) : null}
          {section?.learningObjective ? (
            <View className="mb-4">
              <Text className="text-xs italic text-indigo-600/90">
                <Text className="font-bold uppercase tracking-wide not-italic">
                  You'll learn:{" "}
                </Text>
                {section.learningObjective}
              </Text>
            </View>
          ) : null}

          {visual ? (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between gap-3">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Diagram
                </Text>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={handleReportVisual}
                    disabled={reportingVisual || !sectionId || !courseId}
                    accessibilityRole="button"
                    accessibilityLabel="Report inaccurate diagram"
                    accessibilityHint="Sends this diagram for quality review."
                    className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-90 ${
                      reportingVisual || !sectionId || !courseId
                        ? "border-slate-200 bg-slate-50 opacity-50"
                        : "border-rose-100 bg-rose-50"
                    }`}
                  >
                    {reportingVisual ? (
                      <ActivityIndicator size="small" color="#be123c" />
                    ) : (
                      <Flag size={12} color="#be123c" />
                    )}
                    <Text className="text-[11px] font-bold text-rose-700">Report</Text>
                  </Pressable>
                  {buildModeEligible ? (
                    <Pressable
                      onPress={() => {
                        haptics.tap();
                        setDiagramBuildMode((current) => !current);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={diagramBuildMode ? "Exit Build Mode" : "Start Build Mode"}
                      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-90 ${
                        diagramBuildMode ? "bg-slate-900" : "bg-indigo-50"
                      }`}
                    >
                      <Puzzle size={12} color={diagramBuildMode ? "#ffffff" : "#4f46e5"} />
                      <Text
                        className={`text-[11px] font-bold ${
                          diagramBuildMode ? "text-white" : "text-indigo-700"
                        }`}
                      >
                        {diagramBuildMode ? "Exit Build" : "Build"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <VisualSlotBoundary key={`visual-${index}-${visual?.type ?? "unknown"}-${visualNodeCount}`}>
                <VisualDiagram
                  visual={visual}
                  conceptType={lesson.conceptTypes?.[index] ?? null}
                  buildMode={diagramBuildMode}
                />
              </VisualSlotBoundary>
              {sourceAnchors.length > 0 ? (
                <View className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Source anchors
                  </Text>
                  <View className="mt-1.5 gap-1">
                    {sourceAnchors.map((anchor, anchorIndex) => (
                      <Text key={`${anchor}-${anchorIndex}`} className="text-xs leading-5 text-slate-600">
                        {anchor}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : hasVisualSlot ? (
            <View className="mb-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <Text className="text-xs font-semibold text-slate-500">
                Diagram unavailable for this slide
              </Text>
            </View>
          ) : null}

          {html ? (
            <>
              <RichContent html={html} />
              <View className="mt-4 gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-indigo-900">Need another angle?</Text>
                  <Text className="mt-0.5 text-[11px] leading-4 text-indigo-700">
                    Get a simpler explanation for this exact slide.
                  </Text>
                </View>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Pressable
                    onPress={handleExplainDifferently}
                    disabled={explaining}
                    accessibilityRole="button"
                    accessibilityLabel="Explain this differently"
                    className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 active:opacity-90 ${
                      explaining ? "bg-indigo-300" : "bg-indigo-600"
                    }`}
                  >
                    {explaining ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Sparkles size={13} color="#ffffff" />
                    )}
                    <Text className="text-[11px] font-bold text-white">
                      {explaining ? "Thinking" : "Explain"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleReportSection}
                    disabled={reportingSection || !sectionId || !courseId}
                    accessibilityRole="button"
                    accessibilityLabel="Report inaccurate content"
                    className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 active:opacity-90 ${
                      reportingSection || !sectionId || !courseId
                        ? "border-slate-200 bg-white/60 opacity-50"
                        : "border-rose-100 bg-white"
                    }`}
                  >
                    {reportingSection ? (
                      <ActivityIndicator size="small" color="#be123c" />
                    ) : (
                      <Flag size={13} color="#be123c" />
                    )}
                    <Text className="text-[11px] font-bold text-rose-700">Report</Text>
                  </Pressable>
                </View>
              </View>
              {explanation ? (
                <View className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-3">
                  <View className="flex-row items-center gap-2">
                    <Sparkles size={14} color="#7c3aed" />
                    <Text className="text-xs font-bold uppercase tracking-widest text-violet-600">
                      Different explanation
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-6 text-violet-950">
                    {explanation}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {ackPending ? (
            <View className="mt-6 border-t border-indigo-100 pt-4">
              {consecutiveSkips >= 2 ? (
                <View className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                  <Text className="text-xs leading-5 text-violet-900">
                    <Text className="font-bold">Skipped twice in a row.</Text> Want a different angle on this idea? Try Explain or the AI chat tab.
                  </Text>
                </View>
              ) : null}
              <Text className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                Retrieval Check ✦
              </Text>
              <Text className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                {section!.retrievalCheck.question}
              </Text>
              {!revealed ? (
                <View className="mt-3 flex-row flex-wrap items-center gap-2">
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      setRevealed(true);
                    }}
                    className="rounded-full border border-indigo-300 bg-white px-4 py-2 active:bg-indigo-50"
                  >
                    <Text className="text-sm font-semibold text-indigo-700">
                      Reveal Answer
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      haptics.warning();
                      onAck("skipped");
                    }}
                    className="rounded-full px-3 py-2 active:bg-slate-100"
                  >
                    <Text className="text-xs text-slate-500">Skip (−5 XP)</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="mt-3">
                  <View className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <Text className="text-sm leading-6 text-indigo-900">
                      {section!.retrievalCheck.answer}
                    </Text>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">
                    Be honest — how did you do?
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <Pressable
                      onPress={() => {
                        haptics.success();
                        onAck("correct");
                      }}
                      className="rounded-full bg-emerald-600 px-4 py-2 active:bg-emerald-700"
                    >
                      <Text className="text-sm font-semibold text-white">
                        ✓ Got it right
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        haptics.tick();
                        onAck("missed");
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 active:bg-slate-50"
                    >
                      <Text className="text-sm font-semibold text-slate-700">
                        ✗ Missed it
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

// ───── Tab Bar ─────────────────────────────────────────────────────────────

function TabIcon({
  tab,
  color,
}: {
  tab: LessonTab;
  color: string;
}) {
  if (tab === "lecture") return <BookOpen size={14} color={color} />;
  if (tab === "quiz") return <Brain size={14} color={color} />;
  if (tab === "chat") return <MessageSquare size={14} color={color} />;
  return <BookOpen size={14} color={color} />;
}

const TAB_LABELS: Record<LessonTab, string> = {
  lecture: "Lecture",
  quiz: "Quiz",
  chat: "AI Chat",
  book: "Book",
};

const TAB_ORDER: LessonTab[] = ["lecture", "quiz", "chat", "book"];

function TabBar({
  active,
  onChange,
  quizLocked,
}: {
  active: LessonTab;
  onChange: (tab: LessonTab) => void;
  quizLocked: boolean;
}) {
  return (
    <View className="border-b border-slate-200 bg-white">
      <View className="flex-row px-2">
        {TAB_ORDER.map((tabId) => {
          const isActive = active === tabId;
          const isQuizLocked = tabId === "quiz" && quizLocked;
          const tint = isActive
            ? "#4338ca"
            : isQuizLocked
            ? "#cbd5e1"
            : "#64748b";
          return (
            <Pressable
              key={tabId}
              onPress={() => {
                haptics.tick();
                onChange(tabId);
              }}
              className="flex-1 items-center justify-center px-2 py-3"
            >
              <View
                className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                  isActive ? "bg-indigo-50" : ""
                }`}
              >
                {isQuizLocked ? (
                  <Lock size={14} color={tint} />
                ) : (
                  <TabIcon tab={tabId} color={tint} />
                )}
                <Text
                  className={`text-xs font-semibold ${
                    isActive
                      ? "text-indigo-700"
                      : isQuizLocked
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  {TAB_LABELS[tabId]}
                </Text>
              </View>
              {isActive ? (
                <View className="mt-2 h-0.5 w-8 rounded-full bg-indigo-600" />
              ) : (
                <View className="mt-2 h-0.5 w-8" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ───── AI Chat ─────────────────────────────────────────────────────────────

function ChatBubble({ message, isTyping }: { message: ChatMessage; isTyping?: boolean }) {
  const isUser = message.role === "user";
  return (
    <View
      className={`mb-3 max-w-[85%] rounded-2xl px-4 py-3 ${
        isUser
          ? "self-end bg-indigo-600"
          : "self-start border border-slate-200 bg-white"
      }`}
    >
      <Text
        className={`text-sm leading-6 ${isUser ? "text-white" : "text-slate-800"}`}
      >
        {message.content}
        {isTyping ? <Text className="text-slate-400"> ▌</Text> : null}
      </Text>
    </View>
  );
}

type AIChatTabProps = {
  pdfId: string;
  lessonTitle: string;
};

function AIChatTab({ pdfId, lessonTitle }: AIChatTabProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingText, setTypingText] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  const scrollToEnd = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const sendQuestion = async () => {
    const question = input.trim();
    if (!question || loading) return;

    haptics.tap();
    const next: ChatMessage = { role: "user", content: question };
    const history = [...messages, next];
    setMessages(history);
    setInput("");
    setLoading(true);
    scrollToEnd();

    try {
      const response = await chatWithAI(pdfId, question, messages);
      const reply = response.reply ?? "";
      // Type-reveal the reply for a tutor-feel.
      let i = 0;
      setTypingText("");
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      typingTimerRef.current = setInterval(() => {
        i += 2;
        if (i >= reply.length) {
          setTypingText(reply);
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          setTypingText("");
        } else {
          setTypingText(reply.slice(0, i));
        }
        scrollToEnd();
      }, 18);
    } catch (err) {
      haptics.error();
      toast.error(err instanceof Error ? err.message : "Couldn't reach the tutor right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !typingText ? (
          <View className="mt-8 items-center gap-3 rounded-3xl border border-indigo-100 bg-white p-6">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
              <Sparkles size={22} color="#4f46e5" />
            </View>
            <Text className="text-center text-base font-bold text-slate-900">
              Ask the tutor anything about this lesson
            </Text>
            <Text className="text-center text-sm leading-6 text-slate-500">
              {lessonTitle
                ? `“${lessonTitle}” is loaded. Ask for an analogy, a clearer explanation, or a worked example.`
                : "The lesson context is loaded — ask for an analogy, a clearer explanation, or a worked example."}
            </Text>
          </View>
        ) : null}
        {messages.map((message, i) => (
          <ChatBubble key={i} message={message} />
        ))}
        {typingText ? (
          <ChatBubble message={{ role: "assistant", content: typingText }} isTyping />
        ) : null}
      </ScrollView>
      <View className="border-t border-slate-100 bg-white px-4 py-3">
        <View className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about anything in the lesson…"
            placeholderTextColor="#94a3b8"
            multiline
            className="flex-1 max-h-32 py-2 text-sm text-slate-900"
          />
          <Pressable
            onPress={sendQuestion}
            disabled={!input.trim() || loading}
            className={`h-9 w-9 items-center justify-center rounded-full ${
              !input.trim() || loading ? "bg-slate-200" : "bg-indigo-600"
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={14} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ───── Book Tab ────────────────────────────────────────────────────────────

function BookTab({ pdfId, lessonIndex }: { pdfId: string; lessonIndex: number }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const openOriginal = async () => {
    haptics.tap();
    setDownloading(true);
    try {
      const destination = `${FileSystem.cacheDirectory}lesson-${pdfId}-${lessonIndex}.pdf`;
      const downloadResult = await FileSystem.downloadAsync(
        `${API_URL}/pdfs/${encodeURIComponent(pdfId)}/chunks/${lessonIndex}`,
        destination,
        { headers: await buildAuthHeaders() },
      );
      if (downloadResult.status !== 200) {
        throw new Error(`Couldn't download the source (HTTP ${downloadResult.status})`);
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toast.info("Sharing isn't available on this device.");
        return;
      }
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Open original source",
      });
    } catch (err) {
      haptics.error();
      toast.error(err instanceof Error ? err.message : "Couldn't open the source");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 px-5"
      contentContainerStyle={{ paddingVertical: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <BookOpen size={24} color="#0f172a" />
        </View>
        <Text className="text-xl font-extrabold text-slate-900">
          Open the original source
        </Text>
        <Text className="text-sm leading-6 text-slate-600">
          The lesson is built from a chunk of your original PDF. Open it in your device's PDF viewer to read the source pages this lesson is drawn from.
        </Text>
        <Pressable
          onPress={openOriginal}
          disabled={downloading}
          className={`flex-row items-center gap-2 rounded-full px-5 py-3 ${
            downloading ? "bg-slate-200" : "bg-slate-900 active:bg-slate-800"
          }`}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <ExternalLink size={16} color="#ffffff" />
          )}
          <Text
            className={`text-sm font-semibold ${
              downloading ? "text-slate-500" : "text-white"
            }`}
          >
            {downloading ? "Preparing source…" : "Open source PDF"}
          </Text>
        </Pressable>
        <Text className="text-xs text-slate-400">
          The file is downloaded to your device cache and opened in your default PDF viewer.
        </Text>
      </View>
    </ScrollView>
  );
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = getAuthTokenSync() ?? (await loadAuthToken());
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ───── Main Screen ─────────────────────────────────────────────────────────

export default function LessonDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pdfId, lessonIndex } = useLocalSearchParams<{
    pdfId: string;
    lessonIndex: string;
  }>();

  const index = Number(lessonIndex ?? 0);
  const windowWidth = Dimensions.get("window").width;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LessonTab>("lecture");

  // Slide reveal-teaching state
  const [revealedUpTo, setRevealedUpTo] = useState(0);
  const [descIndex, setDescIndex] = useState(0);
  const [revealedByIndex, setRevealedByIndex] = useState<Record<number, boolean>>({});
  const [ackByIndex, setAckByIndex] = useState<Record<number, SectionAck>>({});
  const [consecutiveSkips, setConsecutiveSkips] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const lectureCompleteSentRef = useRef(false);

  const [flashcardsDone, setFlashcardsDone] = useState(false);

  // Reset the reveal-teaching state whenever the user lands on a different
  // lesson — otherwise jumping from one lesson into the next would inherit
  // the previous lesson's slide position, acks, and softlock progress.
  useEffect(() => {
    setLesson(null);
    setLoading(true);
    setTab("lecture");
    setRevealedUpTo(0);
    setDescIndex(0);
    setRevealedByIndex({});
    setAckByIndex({});
    setConsecutiveSkips(0);
    setFlashcardsDone(false);
    lectureCompleteSentRef.current = false;
  }, [pdfId, index]);

  useEffect(() => {
    if (!pdfId || Number.isNaN(index)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getLesson(pdfId, index);
        if (cancelled) return;
        setLesson(data);
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Couldn't load lesson");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfId, index, toast]);

  // Refresh flashcards-done flag whenever the tab changes (covers returning
  // from the flashcards screen).
  useEffect(() => {
    if (!pdfId || Number.isNaN(index)) return;
    isFlashcardsCompleted(String(pdfId), index).then(setFlashcardsDone);
  }, [pdfId, index, tab]);

  const slides = useMemo(() => {
    if (!lesson) return [] as number[];
    if (Array.isArray(lesson.description)) {
      return lesson.description.map((_, i) => i);
    }
    return [0];
  }, [lesson]);

  const totalSlides = slides.length;
  const isAtFrontier = descIndex === revealedUpTo;
  const allSlidesRevealed = revealedUpTo >= totalSlides - 1;

  // A lesson is considered "lecture-complete" when all slides have been
  // revealed AND every non-suppressed soft-lock section has been acked.
  const lectureComplete = useMemo(() => {
    if (!lesson || totalSlides === 0) return false;
    if (!allSlidesRevealed) return false;
    const sections = lesson.sections;
    if (!Array.isArray(sections) || sections.length === 0) return true;
    return sections.every((section, i) => {
      if (!hasSoftLock(section)) return true;
      return ackByIndex[i] !== undefined;
    });
  }, [lesson, totalSlides, allSlidesRevealed, ackByIndex]);

  // Fire markLectureComplete once when the lecture goes complete.
  useEffect(() => {
    if (!lesson || !lectureComplete || lectureCompleteSentRef.current) return;
    if (!pdfId || Number.isNaN(index)) return;
    lectureCompleteSentRef.current = true;
    markLectureCachedComplete(String(pdfId), index);
    markLectureComplete(String(pdfId), index, ackByIndex).catch(() => {
      // Server-side gate is best-effort here — the UI already let the user through.
      lectureCompleteSentRef.current = false;
    });
  }, [lesson, lectureComplete, pdfId, index, ackByIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / windowWidth);
    if (pageIndex !== descIndex) {
      setDescIndex(pageIndex);
    }
  };

  const handleContinue = () => {
    if (!isAtFrontier) return;
    const section = getSection(lesson, descIndex);
    if (hasSoftLock(section) && ackByIndex[descIndex] === undefined) return;
    if (allSlidesRevealed) return;

    haptics.tap();
    const nextIndex = revealedUpTo + 1;
    setRevealedUpTo(nextIndex);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    });
  };

  const acknowledgeCheckAt = (slideIndex: number, mode: SectionAck) => {
    setAckByIndex((prev) => ({ ...prev, [slideIndex]: mode }));
    if (mode === "skipped") {
      setConsecutiveSkips((c) => c + 1);
    } else {
      setConsecutiveSkips(0);
    }
  };

  const setRevealedAt = (slideIndex: number, value: boolean) => {
    setRevealedByIndex((prev) => ({ ...prev, [slideIndex]: value }));
  };

  const navBack = () => {
    haptics.tick();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const openFlashcards = () => {
    if (!lectureComplete) return;
    haptics.tap();
    router.push({
      pathname: "/lesson/[pdfId]/[lessonIndex]/flashcards",
      params: { pdfId: String(pdfId), lessonIndex: String(index) },
    });
  };

  const openQuiz = () => {
    if (!lectureComplete) {
      haptics.warning();
      toast.info("Finish every slide first to unlock the quiz.");
      return;
    }
    if (!flashcardsDone && (lesson?.flashcards?.length ?? 0) > 0) {
      haptics.warning();
      toast.info("Complete flashcards first to unlock the quiz.");
      return;
    }
    haptics.tap();
    router.push({
      pathname: "/lesson/[pdfId]/[lessonIndex]/quiz",
      params: {
        pdfId: String(pdfId),
        lessonIndex: String(index),
        flashcardsReady: (lesson?.flashcards?.length ?? 0) > 0 ? "1" : "0",
      },
    });
  };

  const hasFlashcards = (lesson?.flashcards?.length ?? 0) > 0;
  const quizLocked = !lectureComplete || (hasFlashcards && !flashcardsDone);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable
          onPress={navBack}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
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

      <TabBar active={tab} onChange={setTab} quizLocked={quizLocked} />

      {tab === "lecture" && pdfId && !Number.isNaN(index) ? (
        <LectureAudioPlayer pdfId={String(pdfId)} lessonIndex={index} />
      ) : null}

      <View className="flex-1">
        {loading ? (
          <View className="gap-3 p-5">
            <Skeleton.Line width="60%" height={24} />
            <Skeleton.Card height={280} />
            <Skeleton.Line width="40%" />
          </View>
        ) : !lesson ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-base text-slate-600">This lesson isn't ready yet.</Text>
          </View>
        ) : tab === "lecture" ? (
          <LectureTab
            windowWidth={windowWidth}
            pdfId={String(pdfId)}
            lessonIndex={index}
            lesson={lesson}
            slides={slides}
            descIndex={descIndex}
            revealedUpTo={revealedUpTo}
            totalSlides={totalSlides}
            revealedByIndex={revealedByIndex}
            ackByIndex={ackByIndex}
            consecutiveSkips={consecutiveSkips}
            setRevealedAt={setRevealedAt}
            acknowledgeCheckAt={acknowledgeCheckAt}
            handleContinue={handleContinue}
            handleScroll={handleScroll}
            flatListRef={flatListRef}
            isAtFrontier={isAtFrontier}
            allSlidesRevealed={allSlidesRevealed}
            lectureComplete={lectureComplete}
            hasFlashcards={hasFlashcards}
            flashcardsDone={flashcardsDone}
            openFlashcards={openFlashcards}
            openQuiz={openQuiz}
          />
        ) : tab === "quiz" ? (
          <QuizTab
            locked={quizLocked}
            hasFlashcards={hasFlashcards}
            lectureComplete={lectureComplete}
            flashcardsDone={flashcardsDone}
            openFlashcards={openFlashcards}
            openQuiz={openQuiz}
          />
        ) : tab === "chat" ? (
          <AIChatTab pdfId={String(pdfId)} lessonTitle={lesson.title} />
        ) : (
          <BookTab pdfId={String(pdfId)} lessonIndex={index} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ───── Lecture Tab ─────────────────────────────────────────────────────────

type LectureTabProps = {
  windowWidth: number;
  pdfId: string;
  lessonIndex: number;
  lesson: Lesson;
  slides: number[];
  descIndex: number;
  revealedUpTo: number;
  totalSlides: number;
  revealedByIndex: Record<number, boolean>;
  ackByIndex: Record<number, SectionAck>;
  consecutiveSkips: number;
  setRevealedAt: (slideIndex: number, value: boolean) => void;
  acknowledgeCheckAt: (slideIndex: number, mode: SectionAck) => void;
  handleContinue: () => void;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  flatListRef: React.RefObject<FlatList>;
  isAtFrontier: boolean;
  allSlidesRevealed: boolean;
  lectureComplete: boolean;
  hasFlashcards: boolean;
  flashcardsDone: boolean;
  openFlashcards: () => void;
  openQuiz: () => void;
};

function LectureTab({
  windowWidth,
  pdfId,
  lessonIndex,
  lesson,
  slides,
  descIndex,
  revealedUpTo,
  totalSlides,
  revealedByIndex,
  ackByIndex,
  consecutiveSkips,
  setRevealedAt,
  acknowledgeCheckAt,
  handleContinue,
  handleScroll,
  flatListRef,
  isAtFrontier,
  allSlidesRevealed,
  lectureComplete,
  hasFlashcards,
  flashcardsDone,
  openFlashcards,
  openQuiz,
}: LectureTabProps) {
  // Only render slides up to the frontier — FlatList's edge naturally
  // prevents forward swipe past it. Append slides as revealedUpTo grows.
  const visibleSlides = slides.slice(0, revealedUpTo + 1);
  const lockedCount = totalSlides - 1 - revealedUpTo;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming((descIndex + 1) / Math.max(1, totalSlides), {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [descIndex, totalSlides, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const section = getSection(lesson, descIndex);
  const ack = ackByIndex[descIndex];
  const continueDisabled =
    !isAtFrontier ||
    (hasSoftLock(section) && ack === undefined) ||
    allSlidesRevealed;

  return (
    <View className="flex-1">
      <View className="border-b border-slate-100 bg-white px-5 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              if (descIndex === 0) return;
              haptics.tick();
              flatListRef.current?.scrollToIndex({
                index: Math.max(0, descIndex - 1),
                animated: true,
              });
            }}
            disabled={descIndex === 0}
            hitSlop={8}
            className={`h-9 w-9 items-center justify-center rounded-full ${
              descIndex === 0 ? "bg-slate-100" : "bg-indigo-100 active:bg-indigo-200"
            }`}
          >
            <ChevronLeft size={18} color={descIndex === 0 ? "#94a3b8" : "#4338ca"} />
          </Pressable>

          <View className="flex-1 px-3">
            <Text className="text-center text-xs font-semibold text-slate-600">
              Slide {descIndex + 1} of {totalSlides}
              {lockedCount > 0 ? (
                <Text className="text-indigo-400"> · {lockedCount} locked</Text>
              ) : null}
            </Text>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <Animated.View
                style={[
                  { height: 6, borderRadius: 999, backgroundColor: "#4f46e5" },
                  progressStyle,
                ]}
              />
            </View>
          </View>

          <Pressable
            onPress={() => {
              if (descIndex >= revealedUpTo) return;
              haptics.tick();
              flatListRef.current?.scrollToIndex({
                index: Math.min(revealedUpTo, descIndex + 1),
                animated: true,
              });
            }}
            disabled={descIndex >= revealedUpTo}
            hitSlop={8}
            className={`h-9 w-9 items-center justify-center rounded-full ${
              descIndex >= revealedUpTo
                ? "bg-slate-100"
                : "bg-indigo-100 active:bg-indigo-200"
            }`}
          >
            <ChevronRight
              size={18}
              color={descIndex >= revealedUpTo ? "#94a3b8" : "#4338ca"}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={visibleSlides}
        keyExtractor={(item) => `slide-${item}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_, idx) => ({
          length: windowWidth,
          offset: windowWidth * idx,
          index: idx,
        })}
        renderItem={({ item }) => (
          <Slide
            width={windowWidth}
            pdfId={pdfId}
            lessonIndex={lessonIndex}
            lesson={lesson}
            index={item}
            section={getSection(lesson, item)}
            ack={ackByIndex[item]}
            revealed={!!revealedByIndex[item]}
            setRevealed={(value) => setRevealedAt(item, value)}
            onAck={(mode) => acknowledgeCheckAt(item, mode)}
            isFrontier={item === revealedUpTo}
            consecutiveSkips={consecutiveSkips}
          />
        )}
      />

      <View className="border-t border-slate-100 bg-white px-5 py-3">
        {lectureComplete ? (
          <LectureCompleteFooter
            hasFlashcards={hasFlashcards}
            flashcardsDone={flashcardsDone}
            openFlashcards={openFlashcards}
            openQuiz={openQuiz}
          />
        ) : (
          <Pressable
            onPress={handleContinue}
            disabled={continueDisabled}
            className={`h-12 flex-row items-center justify-center gap-2 rounded-full ${
              continueDisabled
                ? "bg-slate-200"
                : "bg-indigo-600 active:bg-indigo-700"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                continueDisabled ? "text-slate-500" : "text-white"
              }`}
            >
              {!isAtFrontier
                ? `Back to slide ${revealedUpTo + 1}`
                : hasSoftLock(section) && ack === undefined
                ? "Answer the check to continue"
                : "Continue →"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function LectureCompleteFooter({
  hasFlashcards,
  flashcardsDone,
  openFlashcards,
  openQuiz,
}: {
  hasFlashcards: boolean;
  flashcardsDone: boolean;
  openFlashcards: () => void;
  openQuiz: () => void;
}) {
  const flashcardsBlocked = hasFlashcards && !flashcardsDone;
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5">
        <CheckCircle2 size={14} color="#059669" />
        <Text className="text-xs font-semibold text-emerald-700">Lecture complete</Text>
      </View>
      <View className="flex-row gap-2">
        {hasFlashcards ? (
          <Pressable
            onPress={openFlashcards}
            className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full bg-indigo-600 active:bg-indigo-700"
          >
            <Zap size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">
              {flashcardsDone ? "Review flashcards" : "Flashcards"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={openQuiz}
          disabled={flashcardsBlocked}
          className={`flex-1 h-12 flex-row items-center justify-center gap-2 rounded-full ${
            flashcardsBlocked
              ? "bg-slate-200"
              : "bg-slate-900 active:bg-slate-800"
          }`}
        >
          {flashcardsBlocked ? (
            <Lock size={14} color="#64748b" />
          ) : (
            <ListChecks size={16} color="#ffffff" />
          )}
          <Text
            className={`text-sm font-semibold ${
              flashcardsBlocked ? "text-slate-500" : "text-white"
            }`}
          >
            {flashcardsBlocked ? "Quiz · locked" : "Take quiz"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ───── Quiz Tab ────────────────────────────────────────────────────────────

function QuizTab({
  locked,
  hasFlashcards,
  lectureComplete,
  flashcardsDone,
  openFlashcards,
  openQuiz,
}: {
  locked: boolean;
  hasFlashcards: boolean;
  lectureComplete: boolean;
  flashcardsDone: boolean;
  openFlashcards: () => void;
  openQuiz: () => void;
}) {
  const reason = !lectureComplete
    ? "Work through every slide and acknowledge each retrieval check first."
    : hasFlashcards && !flashcardsDone
    ? "Drill the flashcards once to lock the concepts in before you're scored."
    : null;

  return (
    <ScrollView
      className="flex-1 px-5"
      contentContainerStyle={{ paddingVertical: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {locked ? (
        <View className="gap-4 rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-6">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
            <Lock size={22} color="#4f46e5" />
          </View>
          <Text className="text-xl font-extrabold text-slate-900">
            Quiz is locked
          </Text>
          <Text className="text-sm leading-6 text-slate-600">{reason}</Text>

          <View className="mt-2 gap-2">
            {!lectureComplete ? (
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-amber-500" />
                <Text className="text-xs font-semibold text-slate-700">
                  Finish the lecture slides
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={14} color="#059669" />
                <Text className="text-xs font-semibold text-emerald-700">
                  Lecture complete
                </Text>
              </View>
            )}
            {hasFlashcards ? (
              flashcardsDone ? (
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={14} color="#059669" />
                  <Text className="text-xs font-semibold text-emerald-700">
                    Flashcards complete
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <View
                    className={`h-2 w-2 rounded-full ${
                      lectureComplete ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      lectureComplete ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    Drill the flashcards
                  </Text>
                </View>
              )
            ) : null}
          </View>

          {lectureComplete && hasFlashcards && !flashcardsDone ? (
            <Pressable
              onPress={openFlashcards}
              className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-full bg-indigo-600 active:bg-indigo-700"
            >
              <Zap size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">
                Open flashcards
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View className="gap-4 rounded-3xl border border-slate-200 bg-white p-6">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
            <Brain size={22} color="#ffffff" />
          </View>
          <Text className="text-xl font-extrabold text-slate-900">
            Ready when you are
          </Text>
          <Text className="text-sm leading-6 text-slate-600">
            Hit 80% or higher to clear this lesson. The quiz tracks your personal best.
          </Text>
          <Pressable
            onPress={openQuiz}
            className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-indigo-600 active:bg-indigo-700"
          >
            <ListChecks size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Start quiz</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
