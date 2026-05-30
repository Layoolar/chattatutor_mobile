import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Logo } from "@/components/Logo";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GoogleButton } from "@/components/GoogleButton";
import { AppleButton } from "@/components/AppleButton";
import { signup, appleSignIn, type AppleSignInInput } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useGoogleSignIn } from "@/lib/google-auth";

export default function SignupScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const google = useGoogleSignIn({ onError: setError });

  const handleGoogle = async () => {
    setError(null);
    const res = await google.signIn();
    if (!res) return;
    await refresh();
    router.replace("/(tabs)");
  };

  const handleApple = async (input: AppleSignInInput) => {
    setError(null);
    try {
      await appleSignIn(input);
      await refresh();
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple sign-in failed");
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await signup(email.trim(), username.trim(), password);
      if (res.requiresVerification) {
        router.replace({ pathname: "/(auth)/check-email", params: { email: email.trim() } });
        return;
      }
      await refresh();
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
          <Text className="text-2xl font-bold text-slate-900">Create your account</Text>
          <Text className="text-slate-600">
            Already have an account?{" "}
            <Link href="/(auth)/login" className="text-indigo-600 font-semibold">
              Sign in
            </Link>
          </Text>
        </View>

        <View className="gap-5 pb-12">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Input
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            textContentType="username"
          />
          <Input
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            textContentType="newPassword"
          />
          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            secureToggle
          />

          <ErrorMessage message={error} />

          <Button
            title={loading ? "Creating account..." : "Create Account"}
            loading={loading}
            onPress={handleSubmit}
          />

          {(google.enabled || Platform.OS === "ios") && (
            <>
              <View className="my-2 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-slate-200" />
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  or continue with
                </Text>
                <View className="h-px flex-1 bg-slate-200" />
              </View>

              {/* SIWA must appear above other social logins on iOS (Apple HIG 4.8). */}
              <AppleButton onSuccess={handleApple} onError={(e) => setError(e.message)} />

              {google.enabled && (
                <GoogleButton
                  onPress={handleGoogle}
                  loading={google.inFlight}
                  disabled={!google.ready}
                  label="Sign up with Google"
                />
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
