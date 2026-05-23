import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Shield, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import { redeemStreakShield } from "@/lib/api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

interface StreakShieldCardProps {
  shields: number;
  /** Called with the updated shield count after a successful redeem. */
  onChange?: (next: number) => void;
}

export function StreakShieldCard({ shields, onChange }: StreakShieldCardProps) {
  const toast = useToast();
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (shields <= 0 || redeeming) return;
    setRedeeming(true);
    try {
      const result = await redeemStreakShield();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success("Shield used — streak protected");
      void markFeatureDiscovered("streak-shield");
      onChange?.(result.streakShields);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use shield");
    } finally {
      setRedeeming(false);
    }
  };

  const hasShields = shields > 0;

  return (
    <View
      className={`overflow-hidden rounded-3xl border p-5 gap-3 ${
        hasShields ? "border-violet-100 bg-white" : "border-slate-200 bg-slate-50"
      }`}
      style={
        hasShields
          ? {
              shadowColor: "#5b21b6",
              shadowOpacity: 0.05,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 2,
            }
          : undefined
      }
    >
      <View className="flex-row items-center gap-3">
        <GradientIcon
          size={48}
          radius={14}
          from={hasShields ? "#8b5cf6" : "#94a3b8"}
          to={hasShields ? "#6366f1" : "#64748b"}
        >
          {hasShields ? (
            <ShieldCheck size={22} color="#ffffff" />
          ) : (
            <Shield size={22} color="#ffffff" />
          )}
        </GradientIcon>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider font-semibold text-violet-700">
            Streak shields
          </Text>
          <Text className="text-xl font-extrabold text-slate-900">
            {shields}{" "}
            <Text className="text-sm font-medium text-slate-500">
              {shields === 1 ? "shield" : "shields"} ready
            </Text>
          </Text>
        </View>
      </View>

      <Text className="text-xs text-slate-600 leading-5">
        {hasShields
          ? "Use one shield to cover a missed drill day. Your streak survives the gap."
          : "Earn shields by hitting weekly drill goals. They protect your streak when life gets in the way."}
      </Text>

      {hasShields ? (
        <Pressable
          onPress={handleRedeem}
          disabled={redeeming}
          className={`h-11 flex-row items-center justify-center rounded-full ${
            redeeming ? "bg-slate-300" : "bg-slate-900 active:bg-slate-800"
          }`}
        >
          <Text className="text-sm font-semibold text-white">
            {redeeming ? "Using…" : "Use a shield"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default StreakShieldCard;
