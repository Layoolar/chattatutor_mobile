import { API_URL } from "./constants";
import { apiFetch } from "./fetch";

export type ChallengeStatus = "pending" | "active" | "completed";

export interface ChallengeListItem {
  id: string;
  pdfId: string;
  pdfName: string;
  lessonIndex: number;
  status: ChallengeStatus;
  winnerId: string | null;
  createdAt: number | string;
  userStatus?: "invited" | "accepted" | "completed";
  isCreator?: boolean;
  participantCount?: number;
  participants?: {
    userId: string;
    score: number | null;
    accuracy: number | null;
    completionTime: number | null;
    isCompleted: boolean;
  }[];
}

export interface ChallengeDetails {
  challenge: {
    id: string;
    pdfId: string;
    lessonIndex: number;
    status: ChallengeStatus;
    winnerId: string | null;
    questionTimeLimit?: number;
  };
  participants: {
    userId: string;
    score: number | null;
    accuracy: number | null;
    completionTime: number | null;
    isCompleted: boolean;
    status: "completed" | "accepted" | null;
  }[];
}

export interface CreateChallengeBody {
  pdfId: string;
  lessonIndex: number;
  opponentId: string | null;
  questionTimeLimit: number;
}

export interface CreateChallengeResponse {
  challenge: {
    id: string;
    pdfId: string;
    lessonIndex: number;
    questionTimeLimit: number;
    status: ChallengeStatus;
    inviteCode: string;
    createdAt: number;
    winnerId?: string | null;
  };
}

export async function listChallenges(): Promise<{ challenges: ChallengeListItem[] }> {
  const response = await apiFetch(`${API_URL}/challenges`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to list challenges");
  }
  return response.json();
}

export async function getChallengeDetails(id: string): Promise<ChallengeDetails> {
  const response = await apiFetch(`${API_URL}/challenges/${encodeURIComponent(id)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to load challenge");
  }
  return response.json();
}

export async function createChallenge(
  body: CreateChallengeBody,
): Promise<CreateChallengeResponse> {
  const response = await apiFetch(`${API_URL}/challenges`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create challenge");
  }
  return response.json();
}

export async function acceptChallenge(id: string): Promise<{ challengeId: string; status: "active" }> {
  const response = await apiFetch(
    `${API_URL}/challenges/${encodeURIComponent(id)}/accept`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to accept challenge");
  }
  return response.json();
}

export async function acceptChallengeByCode(
  code: string,
): Promise<{ challengeId: string; status: "active" }> {
  const response = await apiFetch(
    `${API_URL}/challenges/invite/${encodeURIComponent(code)}/accept`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Invalid invite code");
  }
  return response.json();
}

export async function declineChallenge(id: string): Promise<{ success: true }> {
  const response = await apiFetch(
    `${API_URL}/challenges/${encodeURIComponent(id)}/decline`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to decline challenge");
  }
  return response.json();
}

export async function cancelChallenge(id: string): Promise<{ deleted: true }> {
  const response = await apiFetch(
    `${API_URL}/challenges/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to cancel challenge");
  }
  return response.json();
}

// ─── Timed quiz session (Phase 4.5) ──────────────────────────────────────

export interface TimedQuizQuestion {
  id: string;
  text: string;
  options: string[];
  index: number;
  total: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  nextIndex: number;
  isFinished: boolean;
}

export interface CompleteChallengeResponse {
  challengeId: string;
  completed: true;
  winnerId: string | null;
}

export async function startChallengeQuiz(
  id: string,
): Promise<{ sessionId: string; challengeId: string }> {
  const response = await apiFetch(
    `${API_URL}/challenges/${encodeURIComponent(id)}/start`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to start challenge");
  }
  return response.json();
}

export async function getNextQuestion(
  sessionId: string,
): Promise<{ question: TimedQuizQuestion }> {
  const response = await apiFetch(
    `${API_URL}/timed-quiz/${encodeURIComponent(sessionId)}/next`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to load next question");
  }
  return response.json();
}

export async function submitAnswer(
  sessionId: string,
  selectedIndex: number,
): Promise<SubmitAnswerResponse> {
  const response = await apiFetch(
    `${API_URL}/timed-quiz/${encodeURIComponent(sessionId)}/answer`,
    {
      method: "POST",
      body: JSON.stringify({ selectedIndex }),
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to submit answer");
  }
  return response.json();
}

export async function completeChallenge(
  id: string,
): Promise<CompleteChallengeResponse> {
  const response = await apiFetch(
    `${API_URL}/challenges/${encodeURIComponent(id)}/complete`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to complete challenge");
  }
  return response.json();
}

export async function reportTabSwitch(sessionId: string): Promise<void> {
  try {
    await apiFetch(
      `${API_URL}/timed-quiz/${encodeURIComponent(sessionId)}/tab-switch`,
      {
        method: "POST",
        body: JSON.stringify({
          event: "tab_switch",
          timestamp: Date.now(),
        }),
      },
    );
  } catch {
    // best-effort — surface nothing to user
  }
}

export interface ChallengeAnalytics {
  challenge: {
    id: string;
    pdfId: string;
    lessonIndex: number;
    status: "completed";
    createdAt: string;
    startedAt: string;
    completedAt: string;
    winnerId: string;
    tabSwitchCount?: number;
  };
  participants: {
    userId: string;
    username: string;
    status: "completed";
    score: number;
    accuracy: number;
    totalTimeTaken: number;
    tabSwitchCount?: number;
    answers: {
      questionNumber: number;
      questionId: string;
      question: string;
      options: string[];
      selectedIndex: number;
      timeSpent: number;
      answeredAt: string;
      correctIndex: number;
    }[];
  }[];
}

export async function getChallengeAnalytics(
  challengeId: string,
): Promise<ChallengeAnalytics> {
  const response = await apiFetch(
    `${API_URL}/challenges/${encodeURIComponent(challengeId)}/analytics`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to load analytics");
  }
  return response.json();
}
