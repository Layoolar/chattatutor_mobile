import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react-native";
import {
  CourseCustomizationCard,
  DEFAULT_LEARNING_PREFERENCES,
} from "@/components/CourseCustomizationCard";
import { GradientIcon } from "@/components/GradientIcon";
import { useAuth } from "@/lib/auth-context";
import { generateCourse, getStudyPlan, type LearningPreferences, uploadPDF } from "@/lib/api";
import { hasPremiumFeatureAccess } from "@/lib/premium-access";
import { useToast } from "@/lib/toast";

type Stage = "idle" | "uploading" | "generating" | "ready";

interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType?: string | null;
}

const MAX_BYTES = 50 * 1024 * 1024; // 50MB defensive cap

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const STEPS = [
  { key: "uploading", label: "Uploading PDF" },
  { key: "generating", label: "Generating lessons" },
  { key: "ready", label: "Course ready" },
] as const;

export default function UploadScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferences>(
    DEFAULT_LEARNING_PREFERENCES,
  );
  const hasPremiumAccess = hasPremiumFeatureAccess(user);
  const [createVisual, setCreateVisual] = useState(hasPremiumAccess);
  const [visualTouched, setVisualTouched] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!hasPremiumAccess) {
      setCreateVisual(false);
      return;
    }

    if (!visualTouched) {
      setCreateVisual(true);
    }
  }, [hasPremiumAccess, visualTouched]);

  const handleCreateVisualChange = useCallback((value: boolean) => {
    setVisualTouched(true);
    setCreateVisual(value);
  }, []);

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const a = result.assets[0];
      const size = a.size ?? 0;
      if (size > MAX_BYTES) {
        toast.error("PDF is larger than 50MB. Try a smaller file.");
        return;
      }
      setFile({
        uri: a.uri,
        name: a.name,
        size,
        mimeType: a.mimeType ?? "application/pdf",
      });
      setError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open file picker");
    }
  }, [toast]);

  const startPolling = useCallback(
    (id: string) => {
      let attempts = 0;
      const maxAttempts = 60; // ~5 minutes at 5s interval

      const tick = async () => {
        attempts += 1;
        try {
          const plan = await getStudyPlan(id);
          if (plan.lessons && plan.lessons.length > 0) {
            setStage("ready");
            toast.success("Your course is ready");
            return;
          }
        } catch {
          // 404 / not ready yet — keep polling
        }
        if (attempts >= maxAttempts) {
          setError("Generation is taking longer than expected. Check back later.");
          setStage("idle");
          return;
        }
        pollTimer.current = setTimeout(tick, 5000);
      };

      pollTimer.current = setTimeout(tick, 3000);
    },
    [toast],
  );

  const startUpload = useCallback(async () => {
    if (!file) return;
    setError(null);
    setStage("uploading");
    setUploadPercent(0);
    try {
      const uploaded = await uploadPDF(file, (p) => setUploadPercent(p));
      const id = uploaded.id ?? uploaded.pdfId;
      if (!id) throw new Error("Upload finished without an ID");
      setPdfId(id);

      setStage("generating");
      await generateCourse(id, {
        createVisual: hasPremiumAccess ? createVisual : false,
        learningPreferences: hasPremiumAccess ? preferences : undefined,
      });
      startPolling(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
      setStage("idle");
    }
  }, [
    createVisual,
    file,
    hasPremiumAccess,
    preferences,
    startPolling,
    toast,
  ]);

  const reset = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setFile(null);
    setStage("idle");
    setUploadPercent(0);
    setPdfId(null);
    setError(null);
  }, []);

  const goToCourse = useCallback(() => {
    if (!pdfId) return;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    router.replace({ pathname: "/course/[pdfId]", params: { pdfId } });
  }, [pdfId, router]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center bg-white border border-slate-200"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <Text className="text-base font-bold text-slate-900">New course</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2 mb-6">
          <Text className="text-3xl font-extrabold tracking-tight text-slate-900">
            Upload a PDF
          </Text>
          <Text className="text-base text-slate-600 leading-6">
            Drop any study material — textbook, lecture notes, research paper —
            and AI builds bite-sized lessons, flashcards, and quizzes.
          </Text>
        </View>

        {stage === "idle" ? (
          <>
            <Pressable
              onPress={pickFile}
              className="rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-10 items-center gap-4 active:bg-indigo-50"
            >
              <GradientIcon size={64} radius={20} from="#6366f1" to="#7c3aed">
                <Upload size={28} color="#ffffff" />
              </GradientIcon>
              <View className="items-center gap-1">
                <Text className="text-base font-semibold text-slate-900">
                  {file ? "Choose a different PDF" : "Tap to choose a PDF"}
                </Text>
                <Text className="text-xs text-slate-500">Up to 50MB</Text>
              </View>
            </Pressable>

            {file ? (
              <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="w-12 h-12 rounded-xl bg-indigo-100 items-center justify-center">
                  <FileText size={22} color="#4f46e5" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <Text className="text-xs text-slate-500">{formatBytes(file.size)}</Text>
                </View>
                <Pressable
                  onPress={() => setFile(null)}
                  hitSlop={8}
                  className="w-8 h-8 rounded-full items-center justify-center bg-slate-100"
                >
                  <X size={14} color="#475569" />
                </Pressable>
              </View>
            ) : null}

            {error ? (
              <View className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <Text className="text-sm text-rose-700">{error}</Text>
              </View>
            ) : null}

            <View className="mt-6">
              <CourseCustomizationCard
                hasPremiumAccess={hasPremiumAccess}
                createVisual={createVisual}
                onCreateVisualChange={handleCreateVisualChange}
                preferences={preferences}
                onPreferencesChange={setPreferences}
              />
            </View>

            <Pressable
              onPress={startUpload}
              disabled={!file}
              className={`mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full ${
                file ? "bg-slate-900 active:bg-slate-800" : "bg-slate-200"
              }`}
            >
              <Sparkles size={18} color={file ? "#ffffff" : "#94a3b8"} />
              <Text
                className={`text-base font-semibold ${
                  file ? "text-white" : "text-slate-400"
                }`}
              >
                Generate course
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/topic-course")}
              className="mt-3 h-12 flex-row items-center justify-center rounded-full border-2 border-slate-200 bg-white active:bg-slate-50"
            >
              <Text className="text-sm font-semibold text-slate-900">
                Or start from a topic
              </Text>
            </Pressable>
          </>
        ) : (
          <GenerationProgress
            stage={stage}
            uploadPercent={uploadPercent}
            error={error}
            onGoToCourse={goToCourse}
            onCancel={reset}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GenerationProgress({
  stage,
  uploadPercent,
  error,
  onGoToCourse,
  onCancel,
}: {
  stage: Stage;
  uploadPercent: number;
  error: string | null;
  onGoToCourse: () => void;
  onCancel: () => void;
}) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (stage === "ready") return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, stage]);

  const activeIndex = stage === "uploading" ? 0 : stage === "generating" ? 1 : 2;

  return (
    <View className="gap-6">
      <View className="items-center gap-3 mt-4">
        <Animated.View style={{ opacity: stage === "ready" ? 1 : pulse }}>
          <GradientIcon
            size={88}
            radius={26}
            from={stage === "ready" ? "#10b981" : "#6366f1"}
            to={stage === "ready" ? "#14b8a6" : "#7c3aed"}
          >
            {stage === "ready" ? (
              <CheckCircle2 size={40} color="#ffffff" />
            ) : (
              <Sparkles size={40} color="#ffffff" />
            )}
          </GradientIcon>
        </Animated.View>
        <Text className="text-xl font-bold text-slate-900">
          {stage === "uploading"
            ? "Uploading your PDF…"
            : stage === "generating"
              ? "Generating lessons…"
              : "Your course is ready"}
        </Text>
        <Text className="text-sm text-slate-500 text-center max-w-xs">
          {stage === "uploading"
            ? "Securely sending your file to ChattaTutor."
            : stage === "generating"
              ? "AI is analyzing chapters and structuring your lessons. This usually takes 1–3 minutes."
              : "Tap below to start learning."}
        </Text>
      </View>

      {stage === "uploading" ? (
        <View className="gap-2">
          <View className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <View
              className="h-2 rounded-full bg-indigo-600"
              style={{ width: `${uploadPercent}%` }}
            />
          </View>
          <Text className="text-xs text-slate-500 text-center">
            {uploadPercent}%
          </Text>
        </View>
      ) : null}

      <View className="gap-3 bg-white rounded-2xl border border-slate-200 p-4">
        {STEPS.map((step, i) => {
          const done = i < activeIndex || stage === "ready";
          const active = i === activeIndex && stage !== "ready";
          return (
            <View key={step.key} className="flex-row items-center gap-3">
              <View
                className={`w-7 h-7 rounded-full items-center justify-center ${
                  done
                    ? "bg-emerald-100"
                    : active
                      ? "bg-indigo-100"
                      : "bg-slate-100"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={16} color="#059669" />
                ) : active ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <View className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </View>
              <Text
                className={`text-sm font-medium ${
                  done || active ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {error ? (
        <View className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-sm text-rose-700">{error}</Text>
        </View>
      ) : null}

      {stage === "ready" ? (
        <Pressable
          onPress={onGoToCourse}
          className="h-14 flex-row items-center justify-center rounded-full bg-slate-900 active:bg-slate-800"
        >
          <Text className="text-base font-semibold text-white">Open course</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onCancel}
          className="h-12 flex-row items-center justify-center rounded-full border-2 border-slate-200 bg-white active:bg-slate-50"
        >
          <Text className="text-sm font-semibold text-slate-900">Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}
