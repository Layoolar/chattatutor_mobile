import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

interface AppleButtonProps {
  onSuccess: (input: { identityToken: string; fullName?: string }) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  /** Override the button style. Defaults to BLACK on the white sign-up cards. */
  style?: AppleAuthentication.AppleAuthenticationButtonStyle;
}

/**
 * Sign in with Apple — iOS only. Apple guideline 4.8 mandates this option be
 * "at least as prominent" as any other third-party login. We render Apple's
 * native button for canonical branding (Apple is strict about visual treatment).
 *
 * On Android / web this component renders nothing — the calling screen should
 * decide whether to hide the surrounding "or" divider too.
 */
export function AppleButton({ onSuccess, onError, disabled, style }: AppleButtonProps) {
  if (Platform.OS !== "ios") return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={style ?? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={{ width: "100%", height: 48, opacity: disabled ? 0.5 : 1 }}
      onPress={async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          if (!credential.identityToken) {
            onError?.("Apple did not return an identity token");
            return;
          }
          // Apple only returns fullName on the FIRST sign-in for this app.
          // Join givenName + familyName when present so the server has something
          // sensible to seed the username from.
          const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
            .filter(Boolean)
            .join(" ")
            .trim();
          onSuccess({
            identityToken: credential.identityToken,
            fullName: fullName.length > 0 ? fullName : undefined,
          });
        } catch (err: any) {
          // ERR_CANCELED fires when the user dismisses the native sheet — that's
          // not an error worth surfacing.
          if (err?.code === "ERR_REQUEST_CANCELED" || err?.code === "ERR_CANCELED") return;
          onError?.(err?.message || "Apple sign-in failed");
        }
      }}
    />
  );
}

export default AppleButton;
