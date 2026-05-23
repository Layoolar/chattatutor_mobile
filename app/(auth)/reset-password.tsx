import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lock, CheckCircle2 } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ErrorMessage } from "@/components/ErrorMessage";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.token) setToken(params.token);
    else setError("Invalid or missing reset token");
  }, [params.token]);

  const handleSubmit = async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.replace("/(auth)/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
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
        <View className="bg-white rounded-2xl border border-indigo-100 p-6 mt-12">
          {success ? (
            <View className="items-center py-4 gap-4">
              <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center">
                <CheckCircle2 size={32} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-slate-900">Password Reset!</Text>
              <Text className="text-center text-slate-600">
                Your password has been changed. Redirecting to login...
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              <View className="items-center gap-3 mb-2">
                <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center">
                  <Lock size={32} color="#4f46e5" />
                </View>
                <Text className="text-2xl font-bold text-slate-900">Reset Password</Text>
                <Text className="text-center text-slate-600">Enter your new password below</Text>
              </View>

              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                secureToggle
                textContentType="newPassword"
              />
              <Text className="text-xs text-slate-500 -mt-2">Must be at least 8 characters</Text>

              <Input
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                secureToggle
              />

              <ErrorMessage message={error} />

              <Button
                title={loading ? "Resetting..." : "Reset Password"}
                loading={loading}
                onPress={handleSubmit}
                disabled={!token}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
