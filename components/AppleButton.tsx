/**
 * Sign in with Apple — iOS-only.
 *
 * Wraps `AppleAuthentication.AppleAuthenticationButton` (native Apple-branded
 * pill button that satisfies Apple's HIG requirements for SIWA). On Android
 * and web this component renders nothing — Apple guideline 4.8 only requires
 * SIWA when other social logins are present, and that's an iOS-platform rule.
 *
 * Apple gives us:
 *   - `identityToken` — JWT signed by Apple. Backend verifies via JWKS.
 *   - `fullName`      — only on the very first authorization, and only if the
 *                       user agreed to share their name. Pass it through to
 *                       the backend so it can seed the initial username.
 *   - `email`         — also only on first authorization. We deliberately ignore
 *                       this client-side; the backend reads it from the verified
 *                       identity token claims instead (don't trust client input).
 */

import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

interface AppleButtonProps {
  onSuccess: (input: {
    identityToken: string;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
  }) => void;
  onError?: (error: Error) => void;
  /** Height in dp. Apple HIG: minimum 30, recommended 44. */
  height?: number;
  /** Border radius — 6 matches Apple's default, larger values blend with rounded UIs. */
  cornerRadius?: number;
}

export function AppleButton({
  onSuccess,
  onError,
  height = 48,
  cornerRadius = 12,
}: AppleButtonProps) {
  if (Platform.OS !== "ios") return null;

  const handlePress = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple sign-in returned no identity token");
      }

      onSuccess({
        identityToken: credential.identityToken,
        fullName: credential.fullName ?? null,
      });
    } catch (err: any) {
      // User-cancelled is the most common "error" — not worth bubbling up.
      // Expo surfaces it as code `ERR_REQUEST_CANCELED`.
      if (err?.code === "ERR_REQUEST_CANCELED" || err?.code === "ERR_CANCELED") return;
      const e = err instanceof Error ? err : new Error("Apple sign-in failed");
      if (onError) onError(e);
      else console.warn("Apple sign-in error:", e.message);
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={cornerRadius}
      style={{ width: "100%", height }}
      onPress={handlePress}
    />
  );
}

export default AppleButton;
