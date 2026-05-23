export const colors = {
  background: "#FAFBFC",
  surface: "#ffffff",
  border: "#e2e8f0",

  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",

  primary: "#4f46e5",
  primaryDark: "#4338ca",
  primaryLight: "#eef2ff",
  violet: "#7c3aed",

  success: "#10b981",
  successLight: "#d1fae5",
  danger: "#dc2626",
  dangerLight: "#fee2e2",

  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
} as const;

export type ThemeColor = keyof typeof colors;
