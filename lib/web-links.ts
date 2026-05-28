import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { WEB_APP_BASE_URL } from "@/lib/constants";

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
