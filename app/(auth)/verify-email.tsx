import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { resendVerification, verifyEmail } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

type Status = "idle" | "verifying" | "success" | "error";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      setStatus("verifying");
      try {
        const res = await verifyEmail(token);
        setStatus("success");
        if (res.token) {
          setMessage("Email verified — signing you in...");
          await refresh();
          setTimeout(() => router.replace("/(tabs)"), 1100);
          return;
        }
        setMessage("Email verified successfully. You can now log in.");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    })();
  }, [token, router, refresh]);

  const handleResend = async () => {
    if (!email) return setMessage("No email to resend to");
    try {
      await resendVerification(email);
      setMessage("Verification email sent. Check your inbox.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Resend failed");
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-4">
        {status === "verifying" && (
          <>
            <ActivityIndicator color="#4f46e5" size="large" />
            <Text className="text-slate-600">Verifying...</Text>
          </>
        )}

        {status === "success" && (
          <View className="items-center gap-4 w-full max-w-md">
            <Text className="text-2xl font-bold text-slate-900">Verified!</Text>
            <Text className="text-center text-slate-600">{message}</Text>
            <View className="flex-row gap-3 w-full">
              <View className="flex-1">
                <Button title="Go to login" variant="secondary" onPress={() => router.replace("/(auth)/login")} />
              </View>
              <View className="flex-1">
                <Button title="Go to dashboard" onPress={() => router.replace("/(tabs)")} />
              </View>
            </View>
          </View>
        )}

        {status === "error" && (
          <View className="items-center gap-4 w-full max-w-md">
            <Text className="text-2xl font-bold text-slate-900">Verification failed</Text>
            <Text className="text-center text-slate-600">{message}</Text>
            <View className="flex-row gap-3 w-full">
              <View className="flex-1">
                <Button title="Create account" variant="secondary" onPress={() => router.replace("/(auth)/signup")} />
              </View>
              <View className="flex-1">
                <Button title="Resend" onPress={handleResend} disabled={!email} />
              </View>
            </View>
          </View>
        )}

        {status === "idle" && !token && (
          <View className="items-center gap-4 w-full max-w-md">
            <Text className="text-xl font-bold text-slate-900">No verification token</Text>
            <Text className="text-center text-slate-600">
              Open the verification link from your email to verify your account.
            </Text>
            <Button title="Back to login" onPress={() => router.replace("/(auth)/login")} />
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
