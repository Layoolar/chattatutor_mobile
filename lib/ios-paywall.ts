/**
 * iOS paywall strictness — Apple guideline 3.1.1(a) compliance.
 *
 * Apps cannot include buttons, external links, or other calls-to-action that direct
 * customers to purchasing mechanisms other than in-app purchase. The safest reading
 * (the one that passes review consistently) is: no pricing labels, no "Subscribe" /
 * "Upgrade" verbs, no plan-comparison cards. Locked features just say "manage your
 * account on chattatutor.com" and open the marketing homepage — NOT the pricing page.
 *
 * On Android and web, the existing pricing UI keeps working normally.
 *
 * Every upsell surface should guard with `HIDE_PAYWALL_UI` and substitute
 * `IOS_NEUTRAL_COPY` + `openAccountOnWeb()` when true.
 */

import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { openWebAppFlow } from "@/lib/web-links";
import { getWebBridgeUrl } from "@/lib/auth";

/** True when we should hide all subscription pricing / plan names / upsell CTAs. */
export const HIDE_PAYWALL_UI = Platform.OS === "ios";

/** Neutral copy used in place of any "Subscribe" / "Upgrade" / "Premium" wording on iOS. */
export const IOS_NEUTRAL_COPY = {
  /** Title for lock sheets — replaces "AI coach" / specific feature names. */
  lockTitle: "Manage on the web",
  /** Body copy for lock sheets — no plan names, no pricing. */
  lockBody:
    "Some features are managed from your account on chattatutor.com. Open the website to continue, then return here and pull to refresh.",
  /** CTA wording — never "Subscribe", "Upgrade", "Get Premium". */
  cta: "Open chattatutor.com",
  /** Wording for the plan card button on Profile (free or paid user). */
  planCardButton: "Manage on web",
  /** Neutral badge text — replaces "Premium feature". */
  lockedBadge: "Not available here",
};

/**
 * Opens chattatutor.com with the user already signed in.
 *
 * Calls the backend to mint a single-use bridge token, then opens the resulting
 * `/auth/bridge?t=...&from=app&to=/` URL in the system browser. The web bridge
 * exchanges the token, drops a cookie, and redirects to `/` — so the user lands
 * already authenticated. Critical for Apple Sign-In users (no password + private
 * relay email means they can't log in on the web manually).
 *
 * On iOS we deliberately land on `/` (not `/pricing`) so the in-app flow looks
 * nothing like an external purchase CTA (Apple guideline 3.1.1).
 *
 * If the bridge mint fails (e.g. user not authenticated, network down), falls
 * back to the unauthenticated open so the user can at least see chattatutor.com.
 */
export async function openAccountOnWeb(): Promise<void> {
  try {
    const url = await getWebBridgeUrl("/");
    if (Platform.OS === "web") {
      await Linking.openURL(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url, {
      showInRecents: true,
      ...(Platform.OS === "ios" ? { dismissButtonStyle: "close" as const } : {}),
    });
  } catch {
    // Bridge unavailable — fall back to the public homepage handoff. User will
    // have to sign in on the web manually, but the trip isn't dead-ended.
    await openWebAppFlow("/");
  }
}
