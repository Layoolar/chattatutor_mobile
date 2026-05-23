import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Lightbulb, Sparkles } from "lucide-react-native";
import {
  CourseCustomizationCard,
  DEFAULT_LEARNING_PREFERENCES,
} from "@/components/CourseCustomizationCard";
import { GradientIcon } from "@/components/GradientIcon";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { generateTopicCourse, type LearningPreferences } from "@/lib/api";
import { hasPremiumFeatureAccess } from "@/lib/premium-access";

const SUGGESTIONS = [
  "Photosynthesis for high schoolers",
  "Intro to React Native architecture",
  "WW2 — Pacific theater",
  "Bayesian statistics fundamentals",
  "The Krebs cycle, step by step",
];

export default function TopicCourseScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [numLessons, setNumLessons] = useState(5);
  const [preferences, setPreferences] = useState<LearningPreferences>(
    DEFAULT_LEARNING_PREFERENCES,
  );
  const hasPremiumAccess = hasPremiumFeatureAccess(user);
  const [createVisual, setCreateVisual] = useState(hasPremiumAccess);
  const [visualTouched, setVisualTouched] = useState(false);

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

  const submit = useCallback(async () => {
    const value = topic.trim();
    if (value.length < 4) {
      toast.error("Topic needs at least 4 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await generateTopicCourse(value, {
        numLessons,
        createVisual: hasPremiumAccess ? createVisual : false,
        learningPreferences: hasPremiumAccess ? preferences : undefined,
      });
      toast.success(`Course generated with ${numLessons} lessons`);
      router.replace({ pathname: "/course/[pdfId]", params: { pdfId: res.pdfId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Topic generation failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    createVisual,
    hasPremiumAccess,
    numLessons,
    preferences,
    router,
    toast,
    topic,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center bg-white border border-slate-200"
          >
            <ArrowLeft size={18} color="#475569" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Topic course</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-6 pb-12 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-start gap-3 mb-6">
            <GradientIcon size={64} radius={20} from="#06b6d4" to="#3b82f6">
              <Lightbulb size={28} color="#ffffff" />
            </GradientIcon>
            <Text className="text-3xl font-extrabold tracking-tight text-slate-900">
              Learn anything
            </Text>
            <Text className="text-base text-slate-600 leading-6">
              Skip the PDF. Just type a topic and AI builds the course from scratch.
            </Text>
          </View>

          <View className="gap-2 mb-4">
            <Text className="text-sm font-medium text-slate-900">Topic</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Intro to organic chemistry"
              placeholderTextColor="#94a3b8"
              multiline
              className="min-h-[120px] bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-base"
              style={{ textAlignVertical: "top" }}
              autoFocus
            />
            <Text className="text-xs text-slate-500">
              Be specific — "Newton's laws for 8th graders" works better than "physics."
            </Text>
          </View>

          <View className="gap-2 mb-6">
            <Text className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Quick ideas
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setTopic(s)}
                  className="px-3 py-2 rounded-full border border-slate-200 bg-white active:bg-slate-50"
                >
                  <Text className="text-xs font-medium text-slate-700">{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-6">
            <CourseCustomizationCard
              hasPremiumAccess={hasPremiumAccess}
              createVisual={createVisual}
              onCreateVisualChange={handleCreateVisualChange}
              preferences={preferences}
              onPreferencesChange={setPreferences}
              numLessons={numLessons}
              onNumLessonsChange={setNumLessons}
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={submitting || topic.trim().length < 4}
            className={`h-14 flex-row items-center justify-center gap-2 rounded-full ${
              !submitting && topic.trim().length >= 4
                ? "bg-slate-900 active:bg-slate-800"
                : "bg-slate-200"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Sparkles
                  size={18}
                  color={topic.trim().length >= 4 ? "#ffffff" : "#94a3b8"}
                />
                <Text
                  className={`text-base font-semibold ${
                    topic.trim().length >= 4 ? "text-white" : "text-slate-400"
                  }`}
                >
                  Generate course
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
