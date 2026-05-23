import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

interface SkeletonProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  radius?: number;
  className?: string;
  style?: object;
}

function SkeletonBase({ width, height = 16, radius = 8, className, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={[
        {
          width: width as never,
          height,
          borderRadius: radius,
          backgroundColor: "#e2e8f0",
          opacity,
        },
        style,
      ]}
    />
  );
}

function SkeletonLine({ width = "100%", height = 12, radius = 6 }: SkeletonProps) {
  return <SkeletonBase width={width} height={height} radius={radius} />;
}

function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <SkeletonBase width={size} height={size} radius={size / 2} />;
}

function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <View
      className="rounded-2xl border border-slate-100 bg-white p-4 gap-3"
      style={{ minHeight: height }}
    >
      <View className="flex-row items-center gap-3">
        <SkeletonCircle size={40} />
        <View className="flex-1 gap-2">
          <SkeletonLine width="60%" />
          <SkeletonLine width="40%" height={10} />
        </View>
      </View>
      <SkeletonLine width="100%" />
      <SkeletonLine width="80%" />
    </View>
  );
}

export const Skeleton = Object.assign(SkeletonBase, {
  Line: SkeletonLine,
  Circle: SkeletonCircle,
  Card: SkeletonCard,
});
