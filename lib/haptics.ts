import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Web has no haptics — silently no-op so callers don't need to branch.
const safe = (fn: () => Promise<unknown>) => {
  if (Platform.OS === "web") return;
  fn().catch(() => {});
};

export const haptics = {
  // Generic light tap — buttons, toggles, selections.
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  // Medium tap — flipping a card, opening a panel, confirming a choice.
  pop: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  // Heavier thud — destructive actions, drag-end, big state changes.
  thud: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  // Soft tick — for scroll-snap, segmented controls, picker wheels.
  tick: () => safe(() => Haptics.selectionAsync()),

  // Semantic feedback — pair with the correct/incorrect sound.
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
