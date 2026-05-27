import type { MasteryCredit } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { sfx } from "@/lib/sfx";

type ToastLike = {
  success: (message: string) => void;
};

/**
 * Fire a Knowmad Level-up celebration when a mastery credit crosses a tier
 * threshold. Safe to call with any/undefined credit — only celebrates when
 * `leveledUp` is true. Centralised so drill / echo / quiz all behave the same.
 */
export function celebrateLevelUp(
  mastery: MasteryCredit | null | undefined,
  toast: ToastLike,
): boolean {
  if (!mastery?.leveledUp) return false;
  haptics.success();
  sfx.celebrate();
  const title = mastery.newTitle ?? "a new rank";
  const level = mastery.newLevel != null ? `Knowmad Level ${mastery.newLevel}` : "Knowmad Level up";
  toast.success(`${level} — you're now ${title}! +Double-XP token earned.`);
  return true;
}
