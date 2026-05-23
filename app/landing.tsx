import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { GradientIcon } from "@/components/GradientIcon";

type Feature = {
  icon: typeof Zap;
  title: string;
  desc: string;
  from: string;
  to: string;
};

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "Instant Courses",
    desc: "Upload any PDF. Get lessons, flashcards, and quizzes in seconds.",
    from: "#6366f1",
    to: "#8b5cf6",
  },
  {
    icon: Target,
    title: "Daily Drills",
    desc: "Build streaks and beat memory decay with smart review.",
    from: "#06b6d4",
    to: "#3b82f6",
  },
  {
    icon: MessageSquare,
    title: "AI Tutor Chat",
    desc: "Ask anything. Get clear explanations inside every lesson.",
    from: "#f43f5e",
    to: "#ec4899",
  },
  {
    icon: BookOpen,
    title: "Knowledge Passport",
    desc: "Earn tiered stamps for every course you master.",
    from: "#10b981",
    to: "#14b8a6",
  },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-12"
      >
        <View className="flex-row items-center justify-between px-6 pt-2">
          <View className="flex-row items-center gap-2">
            <Image
              source={require("../assets/logo.png")}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
            <Text className="text-lg font-extrabold tracking-tight text-slate-900">
              ChattaTutor
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            hitSlop={8}
            className="px-3 py-1.5"
          >
            <Text className="text-sm font-semibold text-indigo-600">
              Sign in
            </Text>
          </Pressable>
        </View>

        <View className="relative px-6 pt-10 pb-12">
          <View
            pointerEvents="none"
            className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-indigo-200/40"
          />
          <View
            pointerEvents="none"
            className="absolute -right-24 top-20 h-64 w-64 rounded-full bg-violet-200/40"
          />
          <View
            pointerEvents="none"
            className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-cyan-200/30"
          />

          <View className="self-start flex-row items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <GradientIcon size={20} radius={999} from="#6366f1" to="#8b5cf6">
              <Sparkles size={10} color="#ffffff" />
            </GradientIcon>
            <Text className="text-xs font-semibold text-slate-700">
              AI-Powered Learning
            </Text>
          </View>

          <Text className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900">
            Transform PDFs into{"\n"}
            <Text className="text-indigo-600">Interactive Courses</Text>
          </Text>

          <View className="-mt-1 ml-1">
            <Svg width={180} height={10} viewBox="0 0 200 8">
              <Path
                d="M0 7 Q50 0 100 7 Q150 14 200 7"
                stroke="#c7d2fe"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          <Text className="mt-5 text-base leading-7 text-slate-600">
            Upload any PDF and let AI build personalized bite-sized lessons,
            flashcards, and quizzes. Learn smarter, not harder.
          </Text>

          <View className="mt-7 gap-3">
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              className="h-14 flex-row items-center justify-center gap-2 rounded-full bg-slate-900 active:bg-slate-800"
              style={{
                shadowColor: "#0f172a",
                shadowOpacity: 0.25,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              }}
            >
              <Text className="text-base font-semibold text-white">
                Start Learning Free
              </Text>
              <ArrowRight size={18} color="#ffffff" />
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/login")}
              className="h-14 flex-row items-center justify-center rounded-full border-2 border-slate-200 bg-white active:bg-slate-50"
            >
              <Text className="text-base font-semibold text-slate-900">
                I already have an account
              </Text>
            </Pressable>
          </View>

          <View className="mt-8 flex-row items-center gap-2">
            <View className="flex-row -space-x-2">
              {["#6366f1", "#7c3aed", "#06b6d4"].map((c) => (
                <View
                  key={c}
                  className="h-7 w-7 rounded-full border-2 border-white"
                  style={{ backgroundColor: c }}
                />
              ))}
            </View>
            <View className="flex-row items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={12} color="#f59e0b" fill="#f59e0b" />
              ))}
            </View>
            <Text className="text-xs text-slate-500">
              Loved by 100+ learners
            </Text>
          </View>
        </View>

        <View className="px-6 pb-8">
          <View className="flex-row items-center justify-around rounded-2xl border border-slate-200 bg-white px-4 py-5">
            {[
              { v: "100+", l: "Learners" },
              { v: "1.2k+", l: "PDFs" },
              { v: "4.9★", l: "Rating" },
            ].map((s) => (
              <View key={s.l} className="items-center">
                <Text className="text-xl font-extrabold text-slate-900">
                  {s.v}
                </Text>
                <Text className="text-xs text-slate-500">{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6">
          <View className="self-start flex-row items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5">
            <Zap size={14} color="#4f46e5" />
            <Text className="text-xs font-semibold text-indigo-600">
              Features
            </Text>
          </View>
          <Text className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
            Learn like you're playing a game
          </Text>
          <Text className="mt-3 text-base leading-6 text-slate-600">
            AI-powered learning meets gamification. Streaks, leagues, and a
            passport system keep you coming back.
          </Text>

          <View className="mt-6 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <View
                  key={f.title}
                  className="flex-row gap-4 rounded-2xl border border-slate-100 bg-white p-5"
                  style={{
                    shadowColor: "#0f172a",
                    shadowOpacity: 0.04,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                  }}
                >
                  <GradientIcon
                    size={48}
                    radius={14}
                    from={f.from}
                    to={f.to}
                  >
                    <Icon size={22} color="#ffffff" />
                  </GradientIcon>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">
                      {f.title}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-slate-600">
                      {f.desc}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-10 px-6">
          <View className="overflow-hidden rounded-3xl bg-indigo-600 p-7">
            <View
              pointerEvents="none"
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-400/40"
            />
            <View
              pointerEvents="none"
              className="absolute -left-8 -bottom-12 h-44 w-44 rounded-full bg-indigo-400/40"
            />
            <Text className="text-2xl font-extrabold leading-tight text-white">
              Ready to transform your learning?
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/80">
              Join learners who study smarter with AI-built courses. It's free
              to start.
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              className="mt-6 h-12 flex-row items-center justify-center gap-2 rounded-full bg-white active:bg-white/90"
            >
              <Text className="text-base font-semibold text-indigo-600">
                Get started for free
              </Text>
              <ArrowRight size={16} color="#4f46e5" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
