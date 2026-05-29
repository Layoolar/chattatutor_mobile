import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Lock, Scroll, Sparkles } from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import {
  markFeatureDiscovered,
  useDiscoveredFeatures,
} from "@/lib/feature-discovery";

interface Quest {
  id: string;
  title: string;
  description: string;
  emoji: string;
  requiredFeatures: string[];
}

// Mobile quest list — pared down to features that exist in this app today.
const QUESTS: Quest[] = [
  {
    id: "first-drill",
    title: "Complete your first Daily Drill",
    description: "Answer 5 review questions to build your streak.",
    emoji: "💪",
    requiredFeatures: ["daily-drill"],
  },
  {
    id: "first-echo",
    title: "Answer a lesson Echo",
    description:
      "Echoes appear 48 hours after a lesson — one tap to confirm the memory stuck.",
    emoji: "🔁",
    requiredFeatures: ["lesson-echo"],
  },
  {
    id: "streak-shield",
    title: "Redeem a Streak Shield",
    description: "Use a shield to cover a missed day and keep your streak alive.",
    emoji: "🛡️",
    requiredFeatures: ["streak-shield"],
  },
  {
    id: "first-flashcards",
    title: "Run a flashcard deck",
    description: "Open the flashcards for any lesson and rate at least one card.",
    emoji: "🃏",
    requiredFeatures: ["flashcards-deck"],
  },
  {
    id: "first-quiz-pass",
    title: "Pass a lesson quiz",
    description: "Score 80% or higher on any lesson quiz.",
    emoji: "✅",
    requiredFeatures: ["quiz-pass"],
  },
  {
    id: "first-stamp",
    title: "Earn your first Passport Stamp",
    description: "Complete every lesson in a course to claim its stamp.",
    emoji: "🗺️",
    requiredFeatures: ["passport-visit"],
  },
  {
    id: "first-boss",
    title: "Defeat a Boss Quiz",
    description: "Clear the final assessment after all lessons in a course.",
    emoji: "👑",
    requiredFeatures: ["boss-quiz-cleared"],
  },
  {
    id: "weekly-five",
    title: "Drill on five different days",
    description: "Stretch your streak across a full work week.",
    emoji: "📆",
    requiredFeatures: ["weekly-five-drills"],
  },
];

export default function QuestsScreen() {
  const router = useRouter();
  const discovered = useDiscoveredFeatures();

  useEffect(() => {
    void markFeatureDiscovered("quest-board");
  }, []);

  const { completed, locked, total } = useMemo(() => {
    let done = 0;
    let lockCount = 0;
    for (const q of QUESTS) {
      const cleared = q.requiredFeatures.every((f) => discovered.includes(f));
      if (cleared) done += 1;
      else lockCount += 1;
    }
    return { completed: done, locked: lockCount, total: QUESTS.length };
  }, [discovered]);

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
          <Text className="text-xs text-slate-500">Quest board</Text>
          <Text className="text-base font-bold text-slate-900">
            Long-term challenges
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-12 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="overflow-hidden rounded-3xl bg-slate-900 p-5 mb-6"
          style={{
            shadowColor: "#312e81",
            shadowOpacity: 0.2,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
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
          <View className="flex-row items-start gap-3">
            <GradientIcon size={48} radius={14} from="#a78bfa" to="#6366f1">
              <Scroll size={22} color="#ffffff" />
            </GradientIcon>
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-wider font-semibold text-white/60">
                Your scroll
              </Text>
              <Text className="text-2xl font-extrabold text-white mt-1">
                {completed} / {total} cleared
              </Text>
              <Text className="text-sm text-white/70 mt-1">
                {locked} remaining. Most quests unlock by using the app —
                drills, echoes, quizzes.
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          {QUESTS.map((quest) => {
            const cleared = quest.requiredFeatures.every((f) =>
              discovered.includes(f),
            );
            return (
              <View
                key={quest.id}
                className={`flex-row items-start gap-3 rounded-2xl border p-4 ${
                  cleared
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <View
                  className={`w-12 h-12 rounded-2xl items-center justify-center ${
                    cleared ? "bg-emerald-100" : "bg-slate-50"
                  }`}
                >
                  <Text className="text-2xl">{quest.emoji}</Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text
                    className={`text-sm font-bold ${
                      cleared ? "text-emerald-800" : "text-slate-900"
                    }`}
                  >
                    {quest.title}
                  </Text>
                  <Text
                    className={`text-xs leading-5 ${
                      cleared ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {quest.description}
                  </Text>
                </View>
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${
                    cleared ? "bg-emerald-600" : "bg-slate-100"
                  }`}
                >
                  {cleared ? (
                    <CheckCircle2 size={14} color="#ffffff" />
                  ) : (
                    <Lock size={12} color="#94a3b8" />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View className="mt-6 flex-row items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <Sparkles size={18} color="#4f46e5" />
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-900">
              Quests cleared count forever
            </Text>
            <Text className="text-xs text-slate-600 mt-1 leading-5">
              They show up in your Passport later as proof of progression.
              New quests unlock as Phase 4 and 5 land.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
