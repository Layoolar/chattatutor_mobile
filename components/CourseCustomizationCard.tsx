import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Crown, Lock, Sparkles } from "lucide-react-native";
import {
  getCustomizationOptions,
  type CustomizationOptions,
  type LearningPreferences,
} from "@/lib/api";
import { FeatureLockSheet } from "@/components/FeatureLockSheet";
import { HIDE_PAYWALL_UI } from "@/lib/ios-paywall";

const FALLBACK_OPTIONS: CustomizationOptions = {
  toneStyles: [
    {
      value: "friendly",
      label: "Friendly",
      description: "Warm and approachable, like a helpful teacher",
      icon: "😊",
    },
    {
      value: "professional",
      label: "Professional",
      description: "Clear and structured, business-like",
      icon: "💼",
    },
    {
      value: "casual",
      label: "Casual",
      description: "Relaxed and conversational, like chatting with a friend",
      icon: "☕",
    },
    {
      value: "academic",
      label: "Academic",
      description: "Formal and scholarly, university-level",
      icon: "🎓",
    },
    {
      value: "enthusiastic",
      label: "Enthusiastic",
      description: "Energetic and passionate about the subject",
      icon: "🎉",
    },
    {
      value: "roast",
      label: "Roast Style",
      description: "Witty and sarcastic, playfully teasing without vulgarity",
      icon: "🔥",
    },
  ],
  explanationLevels: [
    {
      value: "simple",
      label: "Simple",
      description: "Straightforward and easy to grasp",
      icon: "⭐",
    },
    {
      value: "detailed",
      label: "Detailed",
      description: "Thorough with context and background",
      icon: "📖",
    },
    {
      value: "expert",
      label: "Expert",
      description: "Advanced and technical",
      icon: "🔬",
    },
  ],
  learningModes: [
    {
      value: "standard",
      label: "Standard",
      description: "Balanced approach for general learning",
      icon: "📚",
    },
    {
      value: "kids",
      label: "Kids Mode",
      description: "Simple language perfect for children",
      icon: "🎈",
    },
    {
      value: "eli5",
      label: "Explain Like I'm 5",
      description: "Simplest possible explanations",
      icon: "👶",
    },
    {
      value: "example-heavy",
      label: "Example Heavy",
      description: "Multiple examples for every concept",
      icon: "💡",
    },
    {
      value: "visual-learner",
      label: "Visual Learner",
      description: "Rich visual descriptions and imagery",
      icon: "🎨",
    },
    {
      value: "quick-summary",
      label: "Quick Summary",
      description: "Concise, key points only",
      icon: "⚡",
    },
  ],
  additionalOptions: [
    {
      key: "includeRealWorldExamples",
      label: "Real-world Examples",
      description: "Show practical applications",
      icon: "🌍",
    },
    {
      key: "includeAnalogies",
      label: "Analogies & Metaphors",
      description: "Use comparisons to explain concepts",
      icon: "🔄",
    },
    {
      key: "includeVisualDescriptions",
      label: "Visual Descriptions",
      description: "Describe with vivid imagery",
      icon: "👁️",
    },
    {
      key: "includeMemoryTricks",
      label: "Memory Tricks",
      description: "Mnemonics and memory aids",
      icon: "🧠",
    },
    {
      key: "simplifyJargon",
      label: "Simplify Jargon",
      description: "Explain technical terms immediately",
      icon: "💬",
    },
  ],
};

const LESSON_COUNTS = [3, 4, 5, 6] as const;

type SelectPreferenceKey = "tone" | "explanationLevel" | "learningMode";
type TogglePreferenceKey =
  | "includeRealWorldExamples"
  | "includeAnalogies"
  | "includeVisualDescriptions"
  | "includeMemoryTricks"
  | "simplifyJargon";

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  tone: "friendly",
  explanationLevel: "detailed",
  learningMode: "standard",
  includeRealWorldExamples: true,
  includeAnalogies: false,
  includeVisualDescriptions: false,
  includeMemoryTricks: false,
  simplifyJargon: false,
};

interface CourseCustomizationCardProps {
  hasPremiumAccess: boolean;
  createVisual: boolean;
  onCreateVisualChange: (value: boolean) => void;
  preferences: LearningPreferences;
  onPreferencesChange: (value: LearningPreferences) => void;
  numLessons?: number;
  onNumLessonsChange?: (value: number) => void;
}

export function CourseCustomizationCard({
  hasPremiumAccess,
  createVisual,
  onCreateVisualChange,
  preferences,
  onPreferencesChange,
  numLessons,
  onNumLessonsChange,
}: CourseCustomizationCardProps) {
  const [options, setOptions] = useState<CustomizationOptions>(FALLBACK_OPTIONS);
  const [lockOpen, setLockOpen] = useState(false);

  useEffect(() => {
    let active = true;

    void getCustomizationOptions()
      .then((data) => {
        if (active) setOptions(data);
      })
      .catch(() => {
        if (active) setOptions(FALLBACK_OPTIONS);
      });

    return () => {
      active = false;
    };
  }, []);

  // Free users: every customisation tap surfaces the upgrade sheet instead of silently
  // failing. Lock icons on the controls themselves make the gate visible at rest.
  const updateSelect = (key: SelectPreferenceKey, value: string) => {
    if (!hasPremiumAccess) {
      setLockOpen(true);
      return;
    }

    onPreferencesChange({ ...preferences, [key]: value });
  };

  const updateToggle = (key: TogglePreferenceKey) => {
    if (!hasPremiumAccess) {
      setLockOpen(true);
      return;
    }

    onPreferencesChange({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const toggleVisuals = () => {
    if (!hasPremiumAccess) {
      setLockOpen(true);
      return;
    }

    onCreateVisualChange(!createVisual);
  };

  const showLessonCount =
    typeof numLessons === "number" && typeof onNumLessonsChange === "function";

  return (
    <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Sparkles size={18} color="#4f46e5" />
            <Text className="text-base font-bold text-slate-900">
              Customize this course
            </Text>
          </View>
          <Text className="text-sm leading-5 text-slate-500">
            Tailor the tone, depth, and structure before ChattaTutor generates it.
          </Text>
        </View>
        <View
          className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${
            hasPremiumAccess ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
          }`}
        >
          <Crown size={13} color={hasPremiumAccess ? "#059669" : "#d97706"} />
          <Text
            className={`text-xs font-semibold ${
              hasPremiumAccess ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {hasPremiumAccess ? "Unlocked" : HIDE_PAYWALL_UI ? "Locked" : "Premium"}
          </Text>
        </View>
      </View>

      {!hasPremiumAccess ? (
        <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 gap-1">
          <Text className="text-sm font-semibold text-slate-900">
            {HIDE_PAYWALL_UI
              ? "Personalization is unavailable in this version"
              : "Personalization is a Premium feature"}
          </Text>
          <Text className="text-xs leading-5 text-slate-600">
            {HIDE_PAYWALL_UI
              ? "You can still generate the course now. Tone, explanation depth, learning mode, and interactive visuals are managed from your account on chattatutor.com."
              : "You can still generate the course now. Upgrade later to control tone, explanation depth, learning mode, and interactive visuals."}
          </Text>
        </View>
      ) : (
        <Text className="text-xs leading-5 text-slate-500">
          These settings apply to this generation only, so you can tune each course differently.
        </Text>
      )}

      {showLessonCount ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-900">
            Number of lessons
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {LESSON_COUNTS.map((count) => (
              <Pressable
                key={count}
                onPress={() => onNumLessonsChange?.(count)}
                className={`rounded-2xl border px-4 py-3 ${
                  numLessons === count
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-slate-50 active:bg-slate-100"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    numLessons === count ? "text-indigo-700" : "text-slate-700"
                  }`}
                >
                  {count} lessons
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-3 rounded-2xl border border-slate-200 px-4 py-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-slate-900">
              Interactive visuals
            </Text>
            <Text className="text-xs leading-5 text-slate-500">
              Generate lesson visuals and diagram-ready explanations when your plan allows it.
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {!hasPremiumAccess && <Lock size={14} color="#94a3b8" />}
            <Pressable
              onPress={toggleVisuals}
              className={`h-7 w-12 rounded-full px-1 justify-center ${
                hasPremiumAccess && createVisual ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <View
                className={`h-5 w-5 rounded-full bg-white ${
                  hasPremiumAccess && createVisual ? "self-end" : "self-start"
                }`}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <PreferenceSection
        title="Tone"
        options={options.toneStyles}
        selectedValue={preferences.tone}
        onSelect={(value) => updateSelect("tone", value)}
        hasPremiumAccess={hasPremiumAccess}
      />

      <PreferenceSection
        title="Explanation depth"
        options={options.explanationLevels}
        selectedValue={preferences.explanationLevel}
        onSelect={(value) => updateSelect("explanationLevel", value)}
        hasPremiumAccess={hasPremiumAccess}
      />

      <PreferenceSection
        title="Learning mode"
        options={options.learningModes}
        selectedValue={preferences.learningMode}
        onSelect={(value) => updateSelect("learningMode", value)}
        hasPremiumAccess={hasPremiumAccess}
      />

      <FeatureLockSheet
        visible={lockOpen}
        featureName="Course customization"
        description="Personalise tone, depth, learning mode, and visuals for every course you generate."
        onClose={() => setLockOpen(false)}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold text-slate-900">Extra guidance</Text>
        <View className="gap-2">
          {options.additionalOptions.map((option) => {
            const enabled = Boolean(
              preferences[option.key as TogglePreferenceKey],
            );

            return (
              <Pressable
                key={option.key}
                onPress={() => updateToggle(option.key as TogglePreferenceKey)}
                className={`rounded-2xl border px-4 py-3 ${
                  enabled
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-slate-50 active:bg-slate-100"
                }`}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1 flex-row items-center gap-3">
                    <Text className="text-lg">{option.icon}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">
                        {option.label}
                      </Text>
                      <Text className="text-xs leading-5 text-slate-500">
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {!hasPremiumAccess && <Lock size={12} color="#94a3b8" />}
                    <View
                      className={`h-6 w-10 rounded-full px-1 justify-center ${
                        enabled ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <View
                        className={`h-4 w-4 rounded-full bg-white ${
                          enabled ? "self-end" : "self-start"
                        }`}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function PreferenceSection({
  title,
  options,
  selectedValue,
  onSelect,
  hasPremiumAccess,
}: {
  title: string;
  options: Array<{
    value: string;
    label: string;
    icon: string;
    description: string;
  }>;
  selectedValue?: string;
  onSelect: (value: string) => void;
  hasPremiumAccess: boolean;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-900">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValue === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={{ width: "48%" }}
              className={`rounded-2xl border px-3 py-3 ${
                selected
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-200 bg-slate-50 active:bg-slate-100"
              } ${!hasPremiumAccess ? "opacity-75" : ""}`}
            >
              <View className="flex-row items-start justify-between">
                <Text className="text-lg">{option.icon}</Text>
                {!hasPremiumAccess && <Lock size={12} color="#94a3b8" />}
              </View>
              <Text className="mt-2 text-sm font-semibold text-slate-900">
                {option.label}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-slate-500">
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}