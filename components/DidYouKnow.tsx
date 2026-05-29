import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { ArrowRight, Lightbulb, X } from "lucide-react-native";
import { useDiscoveredFeatures } from "@/lib/feature-discovery";

interface Tip {
  requiredUndiscovered: string[];
  message: string;
  cta?: { label: string; href: Href };
}

const TIPS: Tip[] = [
  {
    requiredUndiscovered: ["daily-drill"],
    message:
      "The Daily Drill tests your weakest concepts in two minutes. Build a streak.",
    cta: { label: "Start drill", href: "/daily-drill" },
  },
  {
    requiredUndiscovered: ["lesson-echo"],
    message:
      "48 hours after finishing a lesson, an Echo question appears — one tap to confirm the memory stuck.",
  },
  {
    requiredUndiscovered: ["quest-board"],
    message: "The Quest Board tracks long-term challenges. See how many you've cleared.",
    cta: { label: "Open quests", href: "/quests" },
  },
  {
    requiredUndiscovered: ["streak-shield"],
    message:
      "Streak Shields cover one missed day. You earn them by hitting weekly drill goals.",
  },
  {
    requiredUndiscovered: ["passport-visit"],
    message:
      "Every completed course earns a stamp in your Knowledge Passport — Bronze through Platinum.",
  },
  {
    requiredUndiscovered: ["consequence-timer"],
    message:
      "Your daily ring counts down to midnight. Let it hit zero and your streak breaks.",
  },
  {
    requiredUndiscovered: ["forgetting-curve"],
    message:
      "Each lesson card shows a live Ebbinghaus curve — watch mastery fade and review before it drops.",
  },
];

export function DidYouKnow() {
  const router = useRouter();
  const discovered = useDiscoveredFeatures();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const tip = useMemo(() => {
    const eligible = TIPS.filter(
      (t) =>
        t.requiredUndiscovered.every((key) => !discovered.includes(key)) &&
        !dismissed.has(t.message),
    );
    if (eligible.length === 0) return null;
    // Stable rotation by day-of-year — same tip each day
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86_400_000,
    );
    return eligible[dayOfYear % eligible.length];
  }, [discovered, dismissed]);

  if (!tip) return null;

  return (
    <View
      className="overflow-hidden rounded-3xl border border-amber-100 bg-amber-50 p-4"
      style={{
        shadowColor: "#92400e",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
          <Lightbulb size={18} color="#b45309" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-xs uppercase tracking-wider font-semibold text-amber-700">
            Did you know?
          </Text>
          <Text className="text-sm leading-5 text-slate-800">{tip.message}</Text>
          {tip.cta ? (
            <Pressable
              onPress={() => router.push(tip.cta!.href)}
              hitSlop={6}
              className="flex-row items-center gap-1 mt-1 self-start"
            >
              <Text className="text-xs font-semibold text-amber-700">
                {tip.cta.label}
              </Text>
              <ArrowRight size={12} color="#b45309" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() =>
            setDismissed((prev) => new Set(prev).add(tip.message))
          }
          hitSlop={8}
          className="w-7 h-7 rounded-full items-center justify-center bg-amber-100"
        >
          <X size={12} color="#92400e" />
        </Pressable>
      </View>
    </View>
  );
}

export default DidYouKnow;
