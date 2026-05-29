/**
 * Subscribe-prompt logic for mobile.
 *
 * We surface up to one banner at a time, prioritised:
 *   1. trialEnding   — premium trial has <= 2 days left (most urgent)
 *   2. tokenCap      — free user has burned >= 80% of monthly token budget
 *   3. home          — passive nudge for free users to try Premium
 *
 * Each prompt kind has its own dismissal cooldown in AsyncStorage so dismissing one
 * type doesn't silence the others.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/lib/auth";
import { HIDE_PAYWALL_UI } from "@/lib/ios-paywall";

export type SubscribePromptKind = "home" | "tokenCap" | "trialEnding";

const STORAGE_PREFIX = "subscribePrompt:dismissedAt:";

/** Days a dismissal is honored before the prompt may re-appear. */
const DISMISS_COOLDOWN_DAYS: Record<SubscribePromptKind, number> = {
  home: 7,
  tokenCap: 3,
  trialEnding: 1,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isActivePaid(user: User | null | undefined): boolean {
  if (!user) return false;
  const paid = user.plan === "pro" || user.plan === "premium";
  return paid && user.subscriptionStatus === "active";
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / MS_PER_DAY);
}

async function isDismissed(kind: SubscribePromptKind): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + kind);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    const cooldownMs = DISMISS_COOLDOWN_DAYS[kind] * MS_PER_DAY;
    return Date.now() - ts < cooldownMs;
  } catch {
    return false;
  }
}

export async function dismissSubscribePrompt(kind: SubscribePromptKind): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + kind, String(Date.now()));
  } catch {
    // Storage failure: prompt will reappear on next load — acceptable.
  }
}

/**
 * Picks the highest-priority prompt the user should currently see, honoring dismissals.
 * Returns null when no prompt is appropriate (paid user, all dismissed, no triggers).
 */
export async function pickSubscribePrompt(params: {
  user: User | null | undefined;
  tokenUsagePercent?: number | null;
}): Promise<SubscribePromptKind | null> {
  const { user, tokenUsagePercent } = params;
  if (!user) return null;
  // Apple guideline 3.1.1: no upsell banners inside the iOS binary.
  if (HIDE_PAYWALL_UI) return null;

  // Trial ending — premium trial with <= 2 days remaining
  if (user.subscriptionStatus === "trialing" && (user.plan === "premium" || user.plan === "pro")) {
    const days = daysUntil(user.subscriptionEndsAt);
    if (days !== null && days <= 2 && !(await isDismissed("trialEnding"))) {
      return "trialEnding";
    }
  }

  // Token-cap nudge — free users who've used most of their monthly budget
  if (!isActivePaid(user) && user.subscriptionStatus !== "trialing") {
    if (typeof tokenUsagePercent === "number" && tokenUsagePercent >= 80 && !(await isDismissed("tokenCap"))) {
      return "tokenCap";
    }

    // Generic home-tab nudge for free users (lowest priority)
    if (!(await isDismissed("home"))) {
      return "home";
    }
  }

  return null;
}

export function getPromptCopy(kind: SubscribePromptKind, user: User | null | undefined): {
  title: string;
  body: string;
  cta: string;
} {
  switch (kind) {
    case "trialEnding": {
      const days = daysUntil(user?.subscriptionEndsAt);
      const daysLabel = days != null && days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "soon";
      return {
        title: `Your trial ends in ${daysLabel}`,
        body: "Keep Premium access without losing your archived courses or progress.",
        cta: "Continue with Premium",
      };
    }
    case "tokenCap":
      return {
        title: "Running low on credits",
        body: "You've used most of your monthly limit. Premium unlocks a much larger budget.",
        cta: "See Premium",
      };
    case "home":
    default:
      return {
        title: "Unlock more with Premium",
        body: "Larger monthly credits, premium practice modes, and priority generation.",
        cta: "Try Premium",
      };
  }
}
