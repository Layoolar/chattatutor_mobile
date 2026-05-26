import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowUp, Sparkles, Trophy } from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { haptics } from "@/lib/haptics";
import type { UserRank } from "@/lib/api";

interface RankProgressCardProps {
  rank: UserRank | null;
}

export function RankProgressCard({ rank }: RankProgressCardProps) {
  const router = useRouter();
  if (!rank) return null;

  // Lifetime mastery — the new Knowmad Level currency. Falls back to the
  // legacy `totalMastery` alias for backwards compatibility with pre-rollout
  // backends.
  const lifetimeMastery = Math.max(0, rank.lifetimeMastery ?? rank.totalMastery ?? 0);
  const masteryToNext = rank.masteryToNext ?? rank.pointsToNext;
  const hasNext = !!rank.nextTitle && masteryToNext != null && masteryToNext > 0;

  const denominator = hasNext
    ? lifetimeMastery + Math.max(0, masteryToNext ?? 0)
    : Math.max(lifetimeMastery, 1);
  const progress = hasNext
    ? Math.min(Math.round((lifetimeMastery / denominator) * 100), 100)
    : 100;

  const weeklyEarned = rank.weekly?.earned ?? 0;
  const decayingLessons = rank.decayingLessons ?? [];

  const openLesson = (pdfId: string, lessonIndex: number) => {
    haptics.tap();
    router.push({
      pathname: "/lesson/[pdfId]/[lessonIndex]",
      params: { pdfId, lessonIndex: String(lessonIndex) },
    });
  };

  return (
    <View
      className="overflow-hidden rounded-3xl border border-amber-100 bg-white p-5 gap-4"
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
            Knowmad Level{typeof rank.level === "number" ? ` ${rank.level}` : ""}
          </Text>
          <Text className="text-xl font-extrabold text-slate-900">
            {rank.title || "Unranked"}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            {lifetimeMastery.toLocaleString()} lifetime mastery
          </Text>
        </View>
        {weeklyEarned > 0 ? (
          <View className="rounded-full bg-emerald-50 px-3 py-1.5 flex-row items-center gap-1">
            <ArrowUp size={12} color="#059669" />
            <Text className="text-xs font-bold text-emerald-700">
              +{weeklyEarned.toLocaleString()} this week
            </Text>
          </View>
        ) : null}
      </View>

      {hasNext ? (
        <View className="gap-2">
          <View className="h-2 rounded-full bg-amber-100 overflow-hidden">
            <View
              className="h-2 rounded-full bg-amber-500"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-xs text-slate-600">
            <Text className="font-bold text-slate-900">
              {(masteryToNext ?? 0).toLocaleString()}
            </Text>{" "}
            mastery to reach{" "}
            <Text className="font-bold text-amber-700">{rank.nextTitle}</Text>
          </Text>
        </View>
      ) : (
        <Text className="text-xs text-slate-600">
          You've reached the top of the Knowmad ladder. Keep refining mastery to
          stay sharp.
        </Text>
      )}

      {decayingLessons.length > 0 ? (
        <View className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 gap-2">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={12} color="#be123c" />
            <Text className="text-[11px] font-bold uppercase tracking-wide text-rose-700">
              {decayingLessons.length}{" "}
              {decayingLessons.length === 1 ? "lesson" : "lessons"} due for refresh
            </Text>
          </View>
          <View className="gap-1.5">
            {decayingLessons.slice(0, 3).map((lesson) => (
              <Pressable
                key={`${lesson.pdfId}-${lesson.lessonIndex}`}
                onPress={() => openLesson(lesson.pdfId, lesson.lessonIndex)}
                className="rounded-xl bg-white/80 px-3 py-2 active:bg-white"
              >
                <Text
                  className="text-xs font-semibold text-slate-900"
                  numberOfLines={1}
                >
                  {lesson.title}
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {lesson.daysSinceLastReview}d since last review · current
                  mastery {lesson.currentMastery}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default RankProgressCard;
