import React, { useEffect } from "react";
import { Dimensions, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const COLORS = ["#6366f1", "#7c3aed", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"];
const PARTICLE_COUNT = 28;

type Particle = {
  startX: number;
  endX: number;
  endY: number;
  size: number;
  rotation: number;
  delay: number;
  color: string;
  duration: number;
};

function buildParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const startX = width / 2 + (Math.random() - 0.5) * 40;
    return {
      startX,
      endX: startX + (Math.random() - 0.5) * width * 0.95,
      endY: height * (0.55 + Math.random() * 0.35),
      size: 6 + Math.random() * 8,
      rotation: (Math.random() - 0.5) * 720,
      delay: Math.random() * 120,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 1100 + Math.random() * 700,
    };
  });
}

function Particle({ particle, height }: { particle: Particle; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, { duration: particle.duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [particle.delay, particle.duration, progress]);

  const style = useAnimatedStyle(() => {
    const translateX = (particle.endX - particle.startX) * progress.value;
    const translateY = -particle.endY * progress.value;
    const rotate = `${particle.rotation * progress.value}deg`;
    const opacity = progress.value < 0.85 ? 1 : 1 - (progress.value - 0.85) / 0.15;
    return {
      transform: [{ translateX }, { translateY }, { rotate }],
      opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: particle.startX,
          top: height - 8,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 3,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

export function Confetti({ style }: { style?: ViewStyle }) {
  const width = Dimensions.get("window").width;
  const height = Dimensions.get("window").height * 0.6;
  const particles = React.useMemo(() => buildParticles(width, height), [width, height]);

  return (
    <View
      pointerEvents="none"
      style={[
        { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" },
        style,
      ]}
    >
      {particles.map((particle, i) => (
        <Particle key={i} particle={particle} height={height} />
      ))}
    </View>
  );
}
