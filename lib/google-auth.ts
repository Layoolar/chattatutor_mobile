import { useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_SIGN_IN_ENABLED,
  GOOGLE_WEB_CLIENT_ID,
} from "./constants";
import { googleSignIn, type GoogleSignInResponse } from "./auth";

WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInHook {
  enabled: boolean;
  inFlight: boolean;
  ready: boolean;
  signIn: () => Promise<GoogleSignInResponse | null>;
}

export function useGoogleSignIn(options?: {
  onError?: (message: string) => void;
}): GoogleSignInHook {
  const webId = GOOGLE_WEB_CLIENT_ID || undefined;
  const iosId = GOOGLE_IOS_CLIENT_ID || webId;
  const androidId = GOOGLE_ANDROID_CLIENT_ID || webId;

  if (!GOOGLE_SIGN_IN_ENABLED) {
    return {
      enabled: false,
      inFlight: false,
      ready: false,
      signIn: async () => {
        options?.onError?.(
          "Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
        );
        return null;
      },
    };
  }

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webId,
    iosClientId: iosId,
    androidClientId: androidId,
    scopes: ["profile", "email"],
  });

  if (__DEV__ && request?.redirectUri) {
    console.log("[Google OAuth] redirect URI:", request.redirectUri);
  }

  const [inFlight, setInFlight] = useState(false);
  const [resolveExchange, setResolveExchange] = useState<
    ((value: GoogleSignInResponse | null) => void) | null
  >(null);

  useEffect(() => {
    if (!response || !resolveExchange) return;

    const finalize = (value: GoogleSignInResponse | null) => {
      setInFlight(false);
      resolveExchange(value);
      setResolveExchange(null);
    };

    if (response.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) {
        options?.onError?.("Google did not return an ID token");
        finalize(null);
        return;
      }
      (async () => {
        try {
          const result = await googleSignIn(idToken);
          finalize(result);
        } catch (err) {
          options?.onError?.(
            err instanceof Error ? err.message : "Google sign-in failed",
          );
          finalize(null);
        }
      })();
      return;
    }

    if (response.type === "error") {
      const message =
        response.error?.message || response.params?.error_description || "Google sign-in failed";
      options?.onError?.(message);
      finalize(null);
      return;
    }

    if (response.type === "cancel" || response.type === "dismiss") {
      finalize(null);
    }
  }, [response, resolveExchange, options]);

  const signIn = async (): Promise<GoogleSignInResponse | null> => {
    if (!GOOGLE_SIGN_IN_ENABLED) {
      options?.onError?.(
        "Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
      );
      return null;
    }
    if (!request) {
      options?.onError?.("Google sign-in is still loading. Try again in a moment.");
      return null;
    }

    setInFlight(true);
    return new Promise<GoogleSignInResponse | null>((resolve) => {
      setResolveExchange(() => resolve);
      promptAsync().catch((err: unknown) => {
        options?.onError?.(
          err instanceof Error ? err.message : "Google sign-in failed",
        );
        setInFlight(false);
        setResolveExchange(null);
        resolve(null);
      });
    });
  };

  return {
    enabled: GOOGLE_SIGN_IN_ENABLED,
    inFlight,
    ready: Boolean(request),
    signIn,
  };
}
