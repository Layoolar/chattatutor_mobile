import { ScreenContainer } from "@/components/ScreenContainer";
import { WebFlowRedirect } from "@/components/WebFlowRedirect";
import { useLocalSearchParams } from "expo-router";

export default function VerifyEmailScreen() {
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();

  return (
    <ScreenContainer>
      <WebFlowRedirect
        path="/verify-email"
        query={{
          ...(token ? { token } : {}),
          ...(email ? { email } : {}),
        }}
        message={
          token
            ? "Opening email verification in your browser…"
            : "Opening verification help in your browser…"
        }
      />
    </ScreenContainer>
  );
}
