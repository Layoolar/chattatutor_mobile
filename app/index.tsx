import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.85,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fade, lift, scale, glow]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          pointerEvents="none"
          style={{ opacity: glow }}
          className="absolute -top-10 left-10 h-72 w-72 rounded-full bg-indigo-200/50"
        />
        <Animated.View
          pointerEvents="none"
          style={{ opacity: glow }}
          className="absolute bottom-24 right-0 h-64 w-64 rounded-full bg-violet-200/50"
        />
        <Animated.View
          pointerEvents="none"
          style={{ opacity: glow }}
          className="absolute top-1/3 right-12 h-40 w-40 rounded-full bg-cyan-200/40"
        />

        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: lift }, { scale }],
          }}
          className="items-center"
        >
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 128, height: 128 }}
            resizeMode="contain"
          />

          <Text className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900">
            ChattaTutor
          </Text>
          <Text className="mt-2 text-base text-slate-500">
            Learn smarter, not harder
          </Text>
        </Animated.View>

        <View className="absolute bottom-16 items-center gap-3">
          <ActivityIndicator color="#4f46e5" />
          <Text className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Getting things ready
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
