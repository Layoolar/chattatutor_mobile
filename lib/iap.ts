/**
 * RevenueCat IAP wrapper.
 *
 * RevenueCat sits between our app and StoreKit (Apple) / Google Play Billing.
 * We use it instead of raw StoreKit because it absorbs receipt verification,
 * Apple's App Store Server Notifications V2, refund handling, family sharing,
 * billing retries — all the parts that take weeks to get right against raw infra.
 *
 * The backend never sees Apple receipts directly. Instead:
 *  1. The user purchases via Apple's native StoreKit UI (presented by RC's SDK).
 *  2. RC verifies the receipt server-side.
 *  3. RC posts a webhook to our /api/payments/webhooks/revenuecat endpoint.
 *  4. Our webhook handler updates the user's plan / subscriptionEndsAt.
 *
 * No code in this module talks to our backend directly — RC's events are the
 * sync mechanism. Entitlements come from RC's cached customer-info, which the
 * SDK fetches on `configureIAP()` and keeps live via observers.
 *
 * V1 scope: iOS only. Android stays on Flutterwave. To enable Android in V1.1,
 * add `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, branch in `configureIAP`, and
 * activate the corresponding products in the RC dashboard.
 */

import { Platform } from "react-native";
import { useEffect, useState } from "react";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

/** RC entitlement identifiers — must match dashboard config. */
export const ENTITLEMENT_PRO = "pro_access";
export const ENTITLEMENT_PREMIUM = "premium_access";

let configured = false;

/**
 * Call once on app start. Safe to call repeatedly — RC's SDK is idempotent and
 * we guard with our own flag to avoid log spam.
 *
 * `userId` is optional. When set, RC associates purchases with that ID; when
 * omitted (e.g., user not yet logged in), RC uses an anonymous ID and we can
 * promote it via `loginIAP(userId)` after sign-in. We always pass our backend
 * userId so the webhook's `app_user_id` matches our `User.id`.
 */
export async function configureIAP(userId?: string): Promise<void> {
  if (Platform.OS !== "ios") return; // V1: iOS only
  if (!IOS_KEY) {
    console.warn("RevenueCat iOS key not set (EXPO_PUBLIC_REVENUECAT_IOS_KEY) — IAP disabled");
    return;
  }
  if (configured) {
    // Idempotent: still call logIn so a fresh sign-in is reflected.
    if (userId) await Purchases.logIn(userId).catch(() => {});
    return;
  }
  try {
    if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
    configured = true;
  } catch (err) {
    console.warn("RevenueCat configure failed:", err);
  }
}

/** Promote an anonymous RC session to the authenticated user (call on login). */
export async function loginIAP(userId: string): Promise<void> {
  if (Platform.OS !== "ios" || !configured) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn("RevenueCat logIn failed:", err);
  }
}

/** Reset to an anonymous RC session (call on logout). */
export async function logoutIAP(): Promise<void> {
  if (Platform.OS !== "ios" || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // RC throws when logging out an already-anonymous user — ignore.
  }
}

/**
 * Fetch the default offering. RC's "Offering" is a curated set of Packages
 * the dashboard groups together. V1 uses a single offering named `default`
 * with both Pro and Premium packages.
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (Platform.OS !== "ios" || !configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    console.warn("RevenueCat getOfferings failed:", err);
    return null;
  }
}

/** Convenience: find the package for a given plan. */
export async function getPackageForPlan(plan: "pro" | "premium"): Promise<PurchasesPackage | null> {
  const offering = await getOfferings();
  if (!offering) return null;
  // RC packages have an `identifier` we name in the dashboard. By convention:
  //   "$rc_monthly" — RC's default Monthly slot
  // We rely on the productId fallback below in case the slot doesn't match.
  const targetProductId =
    plan === "pro" ? "com.chattatutor.mobile.pro.monthly" : "com.chattatutor.mobile.premium.monthly";
  const match =
    offering.availablePackages.find((pkg) => pkg.product.identifier === targetProductId) ?? null;
  return match;
}

/**
 * Buy a package. Resolves with the updated CustomerInfo on success; throws on
 * actual failures and silently returns null on user-cancel.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (Platform.OS !== "ios" || !configured) {
    throw new Error("IAP is not available on this platform");
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err: any) {
    // RC's error codes: ERROR_CODE.PURCHASE_CANCELLED_ERROR (1) is "user tapped Cancel"
    // — that's not a failure worth bubbling up.
    if (err?.userCancelled) return null;
    throw err;
  }
}

/**
 * Restore purchases. Required by Apple guideline 3.1.1 — must be reachable from
 * Settings. Returns the updated CustomerInfo, or null on error / non-iOS.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (Platform.OS !== "ios" || !configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.warn("RevenueCat restorePurchases failed:", err);
    return null;
  }
}

/** Read the current customer info (entitlements, active subscriptions). */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS !== "ios" || !configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn("RevenueCat getCustomerInfo failed:", err);
    return null;
  }
}

/**
 * React hook: live entitlement state.
 *
 * Listens to RC's customer-info updates so the UI reflects new purchases,
 * cancellations, family-sharing changes immediately. The hook is a no-op on
 * Android / web — entitlements there come from our existing user.plan field
 * driven by the Flutterwave flow.
 */
export interface IAPEntitlements {
  proActive: boolean;
  premiumActive: boolean;
  /** Source-of-truth subscriptionEndsAt from RC, ISO string. */
  expiresAt?: string | null;
  /** The active product SKU, if any. */
  productId?: string | null;
  /** True until the first customer-info fetch resolves. */
  loading: boolean;
}

export function useIAPEntitlements(): IAPEntitlements {
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const handle = (next: CustomerInfo) => {
      if (!cancelled) setInfo(next);
    };

    getCustomerInfo().then((first) => {
      if (cancelled) return;
      setInfo(first);
      setLoading(false);
    });

    Purchases.addCustomerInfoUpdateListener(handle);
    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(handle);
    };
  }, []);

  const proActive = !!info?.entitlements?.active?.[ENTITLEMENT_PRO];
  const premiumActive = !!info?.entitlements?.active?.[ENTITLEMENT_PREMIUM];
  // Prefer premium if both active (premium is a superset).
  const activeEntitlement =
    info?.entitlements?.active?.[ENTITLEMENT_PREMIUM] ?? info?.entitlements?.active?.[ENTITLEMENT_PRO];

  return {
    proActive,
    premiumActive,
    expiresAt: activeEntitlement?.expirationDate ?? null,
    productId: activeEntitlement?.productIdentifier ?? null,
    loading,
  };
}

/** Deep-link to Apple's "Manage Subscriptions" page. Used in Settings. */
export const APPLE_MANAGE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
