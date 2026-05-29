import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { WEB_APP_BASE_URL } from "@/lib/constants";
import { getWebBridgeUrl } from "@/lib/auth";

/** Query flag so chattatutor.com can show an "open the app" banner. */
export const WEB_FROM_APP_QUERY = "from";
export const WEB_FROM_APP_VALUE = "app";

export function buildWebAppUrl(
  path: string,
  query?: Record<string, string | undefined>,
  options?: { fromApp?: boolean },
): string {
  const base = WEB_APP_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (options?.fromApp !== false) {
    url.searchParams.set(WEB_FROM_APP_QUERY, WEB_FROM_APP_VALUE);
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

/** Open a chattatutor.com flow in the system browser (payments, OTP, password reset). */
export async function openWebAppFlow(
  path: string,
  query?: Record<string, string | undefined>,
): Promise<void> {
  const url = buildWebAppUrl(path, query);

  if (Platform.OS === "web") {
    await Linking.openURL(url);
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    showInRecents: true,
    ...(Platform.OS === "ios" ? { dismissButtonStyle: "close" as const } : {}),
  });
}

/**
 * Open a chattatutor.com flow with the user already signed in. Mints a one-shot
 * bridge token via the backend and opens `/auth/bridge?t=...&to=<path>`. The web
 * bridge consumes the token, drops a cookie, and redirects to `path`.
 *
 * Falls back to the unauthenticated open if the bridge mint fails (network down,
 * token not yet loaded, etc.) — the user can still sign in on the web manually.
 */
export async function openWebAppFlowAuthenticated(
  path: string,
  query?: Record<string, string | undefined>,
): Promise<void> {
  try {
    // Bridge URL already includes `?from=app` and the destination path; query is
    // appended onto the destination so callers like billing flows can still pass
    // their own params (?status=, ?invite=, etc.).
    const baseBridge = await getWebBridgeUrl(path);
    let bridgeUrl = baseBridge;
    if (query) {
      const url = new URL(baseBridge);
      // Stash extra params alongside the bridge token — the web's /auth/bridge
      // forwards `to` and `from`, but we can append additional query into `to`.
      const existingTo = url.searchParams.get("to") ?? path;
      const toUrl = new URL(existingTo, "https://chattatutor.com");
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== "") toUrl.searchParams.set(k, v);
      }
      url.searchParams.set("to", `${toUrl.pathname}${toUrl.search}`);
      bridgeUrl = url.toString();
    }

    if (Platform.OS === "web") {
      await Linking.openURL(bridgeUrl);
      return;
    }

    await WebBrowser.openBrowserAsync(bridgeUrl, {
      showInRecents: true,
      ...(Platform.OS === "ios" ? { dismissButtonStyle: "close" as const } : {}),
    });
  } catch {
    await openWebAppFlow(path, query);
  }
}
