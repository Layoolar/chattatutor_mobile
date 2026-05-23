import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { resendVerification } from "@/lib/auth";

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleResend = async () => {
    if (!email) return setMessage("No email provided");
    setLoading(true);
    try {
      await resendVerification(email);
      setMessage("Verification email sent. Check your inbox.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View className="bg-white rounded-2xl border border-indigo-100 p-6 mt-16 items-center gap-4">
        <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center">
          <Mail size={32} color="#4f46e5" />
        </View>
        <Text className="text-2xl font-bold text-slate-900 text-center">Check your email</Text>
        <Text className="text-center text-slate-600">
          We sent a verification link to{" "}
          <Text className="font-semibold">{email || "your email"}</Text>. Follow the link to verify your account.
        </Text>

        {message ? <Text className="text-sm text-slate-700">{message}</Text> : null}

        <View className="flex-row gap-3 w-full">
          <View className="flex-1">
            <Button title="Back to login" variant="secondary" onPress={() => router.replace("/(auth)/login")} />
          </View>
          <View className="flex-1">
            <Button
              title={loading ? "Sending..." : "Resend"}
              onPress={handleResend}
              loading={loading}
              disabled={!email}
            />
          </View>
        </View>

        <Text className="text-xs text-slate-500 text-center mt-2">
          Didn't receive an email? Check your spam folder or try resending.
        </Text>
      </View>
    </ScreenContainer>
  );
}
