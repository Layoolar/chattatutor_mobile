import "../global.css";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/lib/auth-context";

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore: hideAsync runs on first render below
});

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";
    const inTabsGroup = firstSegment === "(tabs)";

    if (!user && (inTabsGroup || firstSegment === undefined)) {
      router.replace("/(auth)/login");
    } else if (user && (inAuthGroup || firstSegment === undefined)) {
      router.replace("/(tabs)");
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#FAFBFC" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
