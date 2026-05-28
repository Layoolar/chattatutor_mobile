import { ScreenContainer } from "@/components/ScreenContainer";
import { WebFlowRedirect } from "@/components/WebFlowRedirect";
import { useLocalSearchParams } from "expo-router";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <ScreenContainer>
      <WebFlowRedirect
        path="/reset-password"
        query={token ? { token } : undefined}
        message="Opening password reset in your browser…"
      />
    </ScreenContainer>
  );
}
