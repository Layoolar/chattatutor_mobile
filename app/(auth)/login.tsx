import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Logo } from "@/components/Logo";
import { ErrorMessage } from "@/components/ErrorMessage";
import { login } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await login(emailOrUsername.trim(), password);
      if (res.requiresVerification) {
        router.replace({ pathname: "/(auth)/check-email", params: { email: emailOrUsername } });
        return;
      }
      await refresh();
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            onPress={() => router.canGoBack() ? router.back() : router.replace("/landing")}
            className="flex-row items-center gap-2"
            hitSlop={8}
          >
            <ArrowLeft size={16} color="#475569" />
            <Text className="text-sm font-medium text-slate-600">Back</Text>
          </Pressable>
        </View>

        <View className="items-center mt-6 mb-8">
          <Logo size="lg" />
        </View>

        <View className="gap-2 mb-8">
          <Text className="text-2xl font-bold text-slate-900">Sign in to your account</Text>
          <Text className="text-slate-600">
            Don't have an account?{" "}
            <Link href="/(auth)/signup" className="text-indigo-600 font-semibold">
              Sign up free
            </Link>
          </Text>
        </View>

        <View className="gap-5">
          <Input
            label="Email or Username"
            placeholder="Enter your email or username"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="username"
          />

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-900 font-medium">Password</Text>
              <Link href="/(auth)/forgot-password" className="text-sm text-indigo-600 font-medium">
                Forgot password?
              </Link>
            </View>
            <Input
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              textContentType="password"
            />
          </View>

          <ErrorMessage message={error} />

          <Button title={loading ? "Signing in..." : "Sign In"} loading={loading} onPress={handleSubmit} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
