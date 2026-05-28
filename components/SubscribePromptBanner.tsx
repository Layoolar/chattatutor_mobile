import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles, X } from "lucide-react-native";

import type { User } from "@/lib/auth";
import {
  dismissSubscribePrompt,
  getPromptCopy,
  pickSubscribePrompt,
  type SubscribePromptKind,
} from "@/lib/subscribe-prompts";

interface Props {
  user: User | null | undefined;
  tokenUsagePercent?: number | null;
}

/**
 * Dismissible upgrade nudge surfaced on tabs. Picks one prompt at a time (trial ending >
 * token cap > home) and respects per-kind dismissal cooldowns. Tapping the CTA opens
 * the Profile pricing sheet via the ?openPricing=1 deep-link param, which then routes
 * the user to /pricing on the web for the actual payment.
 */
export function SubscribePromptBanner({ user, tokenUsagePercent }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<SubscribePromptKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    pickSubscribePrompt({ user, tokenUsagePercent })
      .then((next) => {
        if (!cancelled) setKind(next);
      })
      .catch(() => {
        // Silent: if storage fails we just don't show a banner.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.plan, user?.subscriptionStatus, user?.subscriptionEndsAt, tokenUsagePercent]);

  if (!kind) return null;

  const copy = getPromptCopy(kind, user);

  const handleDismiss = async () => {
    setKind(null);
    await dismissSubscribePrompt(kind);
  };

  const handleCta = () => {
    router.push({ pathname: "/(tabs)/profile", params: { openPricing: "1", from: kind } });
  };

  // Tone varies by urgency.
  const palette =
    kind === "trialEnding"
      ? { container: "border-amber-200 bg-amber-50", title: "text-amber-900", body: "text-amber-800", icon: "#b45309" }
      : kind === "tokenCap"
      ? { container: "border-rose-200 bg-rose-50", title: "text-rose-900", body: "text-rose-800", icon: "#be123c" }
      : { container: "border-violet-200 bg-violet-50", title: "text-violet-900", body: "text-violet-800", icon: "#6d28d9" };

  return (
    <View className={`mx-4 mt-3 rounded-2xl border ${palette.container} px-4 py-3`}>
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5">
          <Sparkles size={18} color={palette.icon} />
        </View>
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${palette.title}`}>{copy.title}</Text>
          <Text className={`mt-1 text-xs leading-5 ${palette.body}`}>{copy.body}</Text>
          <Pressable onPress={handleCta} className="mt-3 self-start rounded-full bg-slate-900 px-4 py-2">
            <Text className="text-xs font-semibold text-white">{copy.cta}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={10}
          accessibilityLabel="Dismiss"
          className="h-7 w-7 items-center justify-center rounded-full"
        >
          <X size={14} color={palette.icon} />
        </Pressable>
      </View>
    </View>
  );
}

export default SubscribePromptBanner;
