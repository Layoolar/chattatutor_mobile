import type { User } from "./auth";

type PremiumUserLike =
  | Pick<
      User,
      | "plan"
      | "subscriptionStatus"
      | "subscriptionEndsAt"
      | "trialGenerationsRemaining"
      | "isAdmin"
    >
  | null
  | undefined;

function isFutureDate(dateString?: string | null): boolean {
  if (!dateString) return false;

  const value = new Date(dateString).getTime();
  return !Number.isNaN(value) && value > Date.now();
}

export function hasPremiumFeatureAccess(user: PremiumUserLike): boolean {
  if (!user) return false;

  if (user.isAdmin) return true;

  const plan = user.plan?.toLowerCase();
  const status = user.subscriptionStatus ?? null;

  if (status === "trialing") {
    return (user.trialGenerationsRemaining ?? 0) > 0;
  }

  if (status === "canceled") {
    return plan === "premium" && isFutureDate(user.subscriptionEndsAt);
  }

  if (status === "expired" || status === "past_due") {
    return false;
  }

  if (status === "active") {
    return plan === "premium";
  }

  return plan === "premium";
}