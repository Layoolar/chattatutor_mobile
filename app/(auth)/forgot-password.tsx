import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ErrorMessage } from "@/components/ErrorMessage";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="pt-4 pb-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/login"))}
            className="flex-row items-center gap-2"
            hitSlop={8}
          >
            <ArrowLeft size={16} color="#475569" />
            <Text className="text-sm font-medium text-slate-600">Back to Login</Text>
          </Pressable>
        </View>

        <View className="bg-white rounded-2xl border border-indigo-100 p-6 mt-8">
          {success ? (
            <View className="items-center py-4 gap-4">
              <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center">
                <CheckCircle2 size={32} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-slate-900">Check Your Email</Text>
              <Text className="text-center text-slate-600">
                If an account with that email exists, we sent a reset link to{" "}
                <Text className="font-semibold">{email}</Text>. Open the link in your mail app,
                then use the banner on the page to return here.
              </Text>
              <Text className="text-sm text-slate-500 text-center">
                The link expires in 1 hour.
              </Text>
              <Button title="Return to Login" onPress={() => router.replace("/(auth)/login")} />
            </View>
          ) : (
            <View className="gap-4">
              <View className="items-center gap-3 mb-2">
                <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center">
                  <Mail size={32} color="#4f46e5" />
                </View>
                <Text className="text-2xl font-bold text-slate-900">Forgot Password?</Text>
                <Text className="text-center text-slate-600">
                  Enter your email and we will send you a link to reset your password.
                </Text>
              </View>

              <Input
                label="Email Address"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              <ErrorMessage message={error} />

              <Button
                title={loading ? "Sending..." : "Send Reset Link"}
                loading={loading}
                onPress={handleSubmit}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
