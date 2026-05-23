import { API_URL } from "./constants";
import { getAuthTokenSync } from "./auth-helpers";

function authHeaders(): Record<string, string> {
  const token = getAuthTokenSync();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PDF {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  userId: string;
  path: string;
  textExtracted?: boolean;
  isTopicBased?: boolean;
  topicQuery?: string;
}

export interface UserActivity {
  activityDates: string[];
  currentStreak: number;
  longestStreak: number;
  streakShields: number;
  scholarAuraActive: boolean;
  doubleXpToken: boolean;
  rivalEvents: unknown[];
}

export interface UserRank {
  totalMastery: number;
  title: string;
  nextTitle: string | null;
  pointsToNext: number | null;
}

export interface TokenUsageData {
  tokensUsed: number;
  tokenLimit: number;
  tokensRemaining: number;
  usagePercentage: number;
  resetDate: string;
  plan: string;
}

export interface PassportCourse {
  pdfId: string;
  title: string;
  currentDay: number;
  totalDays: number;
  isComplete: boolean;
  masteryAvg: number;
  totalMastery: number;
  masteryScores: Record<string, number>;
  createdAt: string;
  archivedAt?: string | null;
}

export async function getMyPDFs(): Promise<PDF[]> {
  const response = await fetch(`${API_URL}/my-pdfs`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to fetch PDFs");
  const data = await response.json();
  return data.pdfs ?? [];
}

export async function getUserActivity(): Promise<UserActivity> {
  const response = await fetch(`${API_URL}/users/activity`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to fetch activity");
  return response.json();
}

export async function getUserRank(): Promise<UserRank> {
  const response = await fetch(`${API_URL}/users/rank`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to fetch rank");
  return response.json();
}

export async function getUserTokens(): Promise<TokenUsageData> {
  const response = await fetch(`${API_URL}/users/tokens`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to fetch token usage");
  const data = await response.json();
  return data.data;
}

export async function getUserStudyPlans(): Promise<PassportCourse[]> {
  const response = await fetch(`${API_URL}/users/study-plans`, { headers: authHeaders() });
  if (!response.ok) return [];
  const data = await response.json();
  return data.courses ?? [];
}
