import "../global.css";

import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ToastProvider, useToast } from "@/lib/toast";
import { onUnauthorized } from "@/lib/fetch";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    const secondSegment = segments[1] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";
    const inTabsGroup = firstSegment === "(tabs)";
    const onLanding = firstSegment === "landing";
    // verify-email and reset-password must be reachable from email deep links
    // regardless of auth state — never auto-redirect away from them.
    const onPublicTokenRoute =
      secondSegment === "verify-email" || secondSegment === "reset-password";

    if (onPublicTokenRoute) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    if (!user && (inTabsGroup || firstSegment === undefined)) {
      router.replace("/landing");
    } else if (user && (inAuthGroup || onLanding || firstSegment === undefined)) {
      router.replace("/(tabs)");
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [user, loading, segments, router]);

  return null;
}

function UnauthorizedBridge() {
  const toast = useToast();
  useEffect(() => {
    return onUnauthorized(() => {
      toast.error("Your session expired. Please sign in again.");
    });
  }, [toast]);
  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            <UnauthorizedBridge />
            <AuthGate />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#FAFBFC" },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="landing" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="upload" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="topic-course" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="course/[pdfId]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="lesson/[pdfId]/[lessonIndex]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="lesson/[pdfId]/[lessonIndex]/flashcards" options={{ animation: "slide_from_right" }} />
            </Stack>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
