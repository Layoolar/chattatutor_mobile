import { Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import type { UserRank } from "@/lib/api";

interface RankProgressCardProps {
  rank: UserRank | null;
}

export function RankProgressCard({ rank }: RankProgressCardProps) {
  if (!rank) return null;

  const hasNext = rank.nextTitle && rank.pointsToNext != null && rank.pointsToNext > 0;
  const totalMastery = Math.max(0, rank.totalMastery);
  const denominator = hasNext
    ? totalMastery + Math.max(0, rank.pointsToNext ?? 0)
    : Math.max(totalMastery, 1);
  const progress = hasNext
    ? Math.min(Math.round((totalMastery / denominator) * 100), 100)
    : 100;

  return (
    <View
      className="overflow-hidden rounded-3xl border border-amber-100 bg-white p-5 gap-3"
      style={{
        shadowColor: "#92400e",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-start gap-3">
        <GradientIcon size={48} radius={14} from="#fbbf24" to="#f59e0b">
          <Trophy size={22} color="#ffffff" />
        </GradientIcon>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider font-semibold text-amber-700">
            Current rank
          </Text>
          <Text className="text-xl font-extrabold text-slate-900">
            {rank.title || "Unranked"}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            {totalMastery} total mastery
          </Text>
        </View>
      </View>

      {hasNext ? (
        <>
          <View className="h-2 rounded-full bg-amber-100 overflow-hidden">
            <View
              className="h-2 rounded-full bg-amber-500"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-xs text-slate-600">
            <Text className="font-bold text-slate-900">{rank.pointsToNext}</Text> mastery
            to reach{" "}
            <Text className="font-bold text-amber-700">{rank.nextTitle}</Text>
          </Text>
        </>
      ) : (
        <Text className="text-xs text-slate-600">
          You've maxed the current ladder. New titles unlock with Phase 4
          gamification.
        </Text>
      )}
    </View>
  );
}

export default RankProgressCard;
