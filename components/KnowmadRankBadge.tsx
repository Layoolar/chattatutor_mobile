import { View, Text } from "react-native";
import { SvgXml } from "react-native-svg";
import {
  KNOWMAD_RANK_COLORS,
  KNOWMAD_RANK_SVGS,
  KNOWMAD_RANK_TITLES,
  clampKnowmadLevel,
} from "@/lib/knowmad-rank-badges";

interface KnowmadRankBadgeProps {
  level: number | null | undefined;
  /** xs = 16 (inline next to names), sm = 20, md = 28, lg = 48 (hero card) */
  size?: "xs" | "sm" | "md" | "lg" | number;
  showTitle?: boolean;
  className?: string;
}

const SIZE_MAP = { xs: 16, sm: 20, md: 28, lg: 48 } as const;

export function KnowmadRankBadge({
  level,
  size = "sm",
  showTitle = false,
  className,
}: KnowmadRankBadgeProps) {
  const safeLevel = clampKnowmadLevel(level);
  const px = typeof size === "number" ? size : SIZE_MAP[size];
  const xml = KNOWMAD_RANK_SVGS[safeLevel];
  const title = KNOWMAD_RANK_TITLES[safeLevel];
  const color = KNOWMAD_RANK_COLORS[safeLevel];

  const badge = <SvgXml xml={xml} width={px} height={px} />;

  if (!showTitle) {
    return (
      <View className={className} style={{ width: px, height: px }}>
        {badge}
      </View>
    );
  }

  return (
    <View
      className={`flex-row items-center gap-1.5 px-2 py-0.5 rounded-full ${className ?? ""}`}
      style={{ backgroundColor: `${color}22` }}
    >
      {badge}
      <Text className="text-xs font-bold" style={{ color }}>
        {title}
      </Text>
    </View>
  );
}

export default KnowmadRankBadge;
