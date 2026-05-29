import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Lock, Sparkles, X } from "lucide-react-native";

interface Props {
  visible: boolean;
  /** Name of the feature the user just tapped, e.g. "AI coach", "Advanced practice". */
  featureName: string;
  /** Optional extra detail rendered under the title. */
  description?: string;
  onClose: () => void;
}

/**
 * Paywall sheet shown when a free user taps a premium-only feature. Intent-triggered,
 * never preemptive. The CTA routes to the Profile pricing sheet (which then takes the
 * user to the web for payment).
 */
export function FeatureLockSheet({ visible, featureName, description, onClose }: Props) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push({ pathname: "/(tabs)/profile", params: { openPricing: "1", from: "featureLock" } });
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/40">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-slate-300" />
            </View>

            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1 flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                  <Lock size={18} color="#6d28d9" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-extrabold text-slate-900">{featureName}</Text>
                  <Text className="mt-1 text-sm leading-6 text-slate-500">
                    {description ?? "This feature is part of Premium."}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={16} color="#334155" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
              <View className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                <View className="flex-row items-center gap-2">
                  <Sparkles size={16} color="#6d28d9" />
                  <Text className="text-sm font-semibold text-violet-900">Premium unlocks</Text>
                </View>
                <Text className="mt-2 text-sm leading-6 text-violet-900">
                  Larger monthly credits, AI coach, weak-concept targeting, and premium practice modes — for $9.99/month.
                </Text>
              </View>

              <Text className="mt-3 text-xs leading-5 text-slate-500">
                Billing happens on chattatutor.com. Return to the app and pull to refresh once you're done.
              </Text>
            </ScrollView>

            <Pressable
              onPress={handleUpgrade}
              className="mt-4 rounded-full bg-slate-900 px-4 py-3 items-center"
            >
              <Text className="text-sm font-semibold text-white">See Premium</Text>
            </Pressable>
            <Pressable onPress={onClose} className="mt-2 px-4 py-3 items-center">
              <Text className="text-sm font-medium text-slate-500">Not now</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default FeatureLockSheet;
