import { API_BASE_URL, API_URL } from "./constants";
import { apiFetch } from "./fetch";
import { getAuthTokenSync } from "./auth-helpers";

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

export interface LearningPreferences {
  tone?: string;
  explanationLevel?: string;
  learningMode?: string;
  includeRealWorldExamples?: boolean;
  includeAnalogies?: boolean;
  includeVisualDescriptions?: boolean;
  includeMemoryTricks?: boolean;
  simplifyJargon?: boolean;
}

export interface CustomizationOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

export interface CustomizationOptions {
  toneStyles: CustomizationOption[];
  explanationLevels: CustomizationOption[];
  learningModes: CustomizationOption[];
  additionalOptions: Array<{
    key: string;
    label: string;
    icon: string;
    description: string;
  }>;
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

export interface Lesson {
  day: number;
  title: string;
  description: string | string[];
  topics?: string[];
  estimatedMinutes?: number;
  storyHook?: string;
  bossQuestion?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  };
  flashcards?: LessonFlashcard[];
  quizQuestions?: LessonQuizQuestion[];
  visuals?: unknown[];
  sections?: LearningSection[];
}

export interface LessonFlashcard {
  id?: string;
  front?: string;
  back?: string;
  question?: string;
  answer?: string;
  tags?: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
}

export type FlashcardRating = "hard" | "good" | "easy";

export interface LessonQuizQuestion {
  id?: string;
  question: string;
  options: string[];
  answer?: string;
  correctIndex?: number;
  explanation?: string;
}

export const QUIZ_PASS_MARK = 80;

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  explanation?: string;
}

export interface QuizResultDetail {
  questionIndex: number;
  correct: boolean;
  selectedIndex?: number;
}

export interface BossQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string | null;
}

export interface QuizSubmissionResult {
  score: number;
  correctCount: number;
  total: number;
  details: QuizResultDetail[];
  progress: LessonProgress;
  bossQuestion?: BossQuestion | null;
  personalizedHook?: string | null;
}

export interface BossQuizQuestion {
  id: string;
  question: string;
  options: string[];
  lessonTitle: string;
}

export type BossQuizTier = "standard" | "evolved" | "apex" | "true";

export interface BossQuizPayload {
  questions: BossQuizQuestion[];
  total: number;
  tier: BossQuizTier;
  timeLimit: number | null;
  attempt: number;
}

export interface BossQuizResultDetail {
  questionId: string;
  correct: boolean;
  selectedIndex: number;
  correctIndex?: number;
}

export interface BossQuizResult {
  score: number;
  correctCount: number;
  total: number;
  details: BossQuizResultDetail[];
}

export interface WeakConcept {
  pdfId: string;
  lessonIndex: number;
  lessonTitle: string;
  topics: string[];
  masteryScore: number;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  pdfId: string;
  studyPlanId: string;
  ownerId: string;
  memberCount?: number;
  hiveLevel?: number;
  membershipStatus?: "active" | "archived" | "left" | "removed";
  settings?: {
    isPublic?: boolean;
    allowMemberInvites?: boolean;
    requireApproval?: boolean;
  };
}

export interface TeamInvitation {
  id: string;
  inviteCode: string;
  expiresAt: string;
  email?: string;
  invitedByUsername?: string;
}

export interface TeamInvitationWithTeam extends TeamInvitation {
  team: Team;
}

export interface TeamMember {
  id: string;
  userId: string;
  username?: string;
  email?: string;
  role: "owner" | "admin" | "member";
  status: "active" | "archived" | "left" | "removed";
  user?: {
    name: string;
    email: string;
  };
}

export interface TeamDetails {
  team: Team;
  members: TeamMember[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  membershipStatus: "active" | "archived";
  completedLessons: number;
  averageQuizScore: number;
  progressPercentage: number;
  badge?: "🥇" | "🥈" | "🥉";
}

export interface TeamLeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  type?: "progress" | "challenges";
}

export interface GeneralHiveStatus {
  team: Team | null;
  pdf: PDF | null;
  studyPlan: unknown | null;
  memberCount: number;
  pendingInviteCount: number;
  membershipStatus: "active" | "archived" | "left" | "removed" | null;
  pendingInvitation: TeamInvitation | null;
  canJoin: boolean;
  joinLabel:
    | "Join General Hive"
    | "Rejoin General Hive"
    | "Open General Hive"
    | "Restore premium"
    | null;
}

export interface ApiErrorWithCode extends Error {
  code?: string;
}

function createApiError(error: unknown, fallbackMessage: string): ApiErrorWithCode {
  const payload = error as { error?: string; message?: string; code?: string } | undefined;
  const apiError = new Error(
    payload?.error || payload?.message || fallbackMessage,
  ) as ApiErrorWithCode;
  if (payload?.code) {
    apiError.code = payload.code;
  }
  return apiError;
}

function isLessonLike(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const lesson = value as Partial<Lesson>;
  return typeof lesson.title === "string" || typeof lesson.description === "string" || Array.isArray(lesson.description);
}

export interface LearningSection {
  sectionId: string;
  ordinal: number;
  title: string;
  lectureHtml: string;
  learningObjective: string;
  thesis: string;
  retrievalCheck: {
    question: string;
    answer: string;
  };
  retrievalCheckSuppressed?: boolean;
}

export interface StudyPlanResponse {
  id?: string;
  pdfId: string;
  title?: string;
  courseTitle?: string;
  plan?: Lesson[];
  lessons?: Lesson[];
  currentDay?: number;
  totalDays?: number;
  status?: string;
  qualityStatus?: string;
}

function normalizeStudyPlanResponse(data: StudyPlanResponse): StudyPlanResponse {
  const rawLessons =
    Array.isArray(data.plan) && data.plan.length > 0
      ? data.plan
      : Array.isArray(data.lessons)
        ? data.lessons
        : [];
  const lessons = rawLessons.filter(isLessonLike);

  return {
    ...data,
    plan: lessons,
    lessons,
    totalDays: data.totalDays ?? lessons.length,
  };
}

function normalizeFlashcard(
  flashcard: LessonFlashcard,
  index: number,
): Flashcard | null {
  const front =
    typeof flashcard.front === "string"
      ? flashcard.front.trim()
      : typeof flashcard.question === "string"
        ? flashcard.question.trim()
        : "";
  const back =
    typeof flashcard.back === "string"
      ? flashcard.back.trim()
      : typeof flashcard.answer === "string"
        ? flashcard.answer.trim()
        : "";

  if (!front || !back) {
    return null;
  }

  return {
    id:
      typeof flashcard.id === "string" && flashcard.id.trim().length > 0
        ? flashcard.id
        : `flashcard-${index}-${front.slice(0, 24)}`,
    front,
    back,
    tags: flashcard.tags,
  };
}

function normalizeQuizQuestion(
  question: LessonQuizQuestion,
  index: number,
): QuizQuestion | null {
  const prompt =
    typeof question.question === "string" ? question.question.trim() : "";
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) =>
          typeof option === "string" ? option.trim() : String(option ?? "").trim(),
        )
        .filter((option) => option.length > 0)
    : [];

  if (!prompt || options.length < 2) {
    return null;
  }

  return {
    id:
      typeof question.id === "string" && question.id.trim().length > 0
        ? question.id
        : `quiz-${index}-${prompt.slice(0, 24)}`,
    question: prompt,
    options,
    explanation: question.explanation,
  };
}

function normalizeBossQuizQuestion(
  question: BossQuizQuestion,
  index: number,
): BossQuizQuestion | null {
  const prompt =
    typeof question.question === "string" ? question.question.trim() : "";
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) =>
          typeof option === "string" ? option.trim() : String(option ?? "").trim(),
        )
        .filter((option) => option.length > 0)
    : [];
  const lessonTitle =
    typeof question.lessonTitle === "string" && question.lessonTitle.trim().length > 0
      ? question.lessonTitle.trim()
      : `Lesson ${index + 1}`;

  if (!prompt || options.length < 2) {
    return null;
  }

  return {
    id:
      typeof question.id === "string" && question.id.trim().length > 0
        ? question.id
        : `boss-${index}-${prompt.slice(0, 24)}`,
    question: prompt,
    options,
    lessonTitle,
  };
}

export interface LessonProgress {
  lessonIndex: number;
  status?: "not_started" | "in_progress" | "completed";
  lectureCompletedAt?: string | null;
  quizScore?: number | null;
  masteryScore?: number | null;
}

// ─── User ────────────────────────────────────────────────────────────────

export async function getMyPDFs(): Promise<PDF[]> {
  const response = await apiFetch(`${API_URL}/my-pdfs`);
  if (!response.ok) throw new Error("Failed to fetch PDFs");
  const data = await response.json();
  return data.pdfs ?? [];
}

export async function getUserActivity(): Promise<UserActivity> {
  const response = await apiFetch(`${API_URL}/users/activity`);
  if (!response.ok) throw new Error("Failed to fetch activity");
  return response.json();
}

export async function getUserRank(): Promise<UserRank> {
  const response = await apiFetch(`${API_URL}/users/rank`);
  if (!response.ok) throw new Error("Failed to fetch rank");
  return response.json();
}

export async function getUserTokens(): Promise<TokenUsageData> {
  const response = await apiFetch(`${API_URL}/users/tokens`);
  if (!response.ok) throw new Error("Failed to fetch token usage");
  const data = await response.json();
  return data.data;
}

export async function getUserStudyPlans(): Promise<PassportCourse[]> {
  const response = await apiFetch(`${API_URL}/users/study-plans`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.courses ?? [];
}

export async function getCustomizationOptions(): Promise<CustomizationOptions> {
  const response = await apiFetch(`${API_URL}/learning/customization-options`, {
    skipAuth: true,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.error || "Failed to fetch customization options",
    );
  }

  const data = await response.json();
  return data.options;
}

// ─── PDF upload (presign → S3 PUT → complete) ────────────────────────────

export interface UploadedPdf {
  id: string;
  fileName?: string;
  originalName?: string;
  pdfId?: string;
}

interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  pdfId: string;
  requiredContentType?: string;
}

interface UploadLocalFile {
  uri: string;
  name: string;
  size: number;
  mimeType?: string | null;
}

export async function uploadPDF(
  file: UploadLocalFile,
  onProgress?: (percent: number) => void,
): Promise<UploadedPdf> {
  const presignRes = await apiFetch(`${API_URL}/upload-pdf/presign`, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.mimeType || "application/pdf",
    }),
  });

  if (!presignRes.ok) {
    const error = await presignRes.json().catch(() => ({}));
    throw new Error(error.error || error.message || "Failed to start upload");
  }

  const { uploadUrl, s3Key, pdfId, requiredContentType }: PresignResponse =
    await presignRes.json();

  await putToS3(file, uploadUrl, requiredContentType || "application/pdf", onProgress);

  const completeRes = await apiFetch(`${API_URL}/upload-pdf/complete`, {
    method: "POST",
    body: JSON.stringify({
      pdfId,
      s3Key,
      fileName: file.name,
      fileSize: file.size,
    }),
  });

  if (!completeRes.ok) {
    const error = await completeRes.json().catch(() => ({}));
    throw new Error(error.error || error.message || "Upload finalization failed");
  }

  const data = await completeRes.json();
  const payload = data.data ?? data.pdf ?? data;
  return {
    id: payload.id ?? pdfId,
    pdfId: payload.id ?? pdfId,
    fileName: payload.fileName,
    originalName: payload.originalName,
  };
}

function putToS3(
  file: UploadLocalFile,
  uploadUrl: string,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error uploading to S3"));
    // React Native fetch / XHR accept file URIs in {uri, name, type} shape via FormData,
    // but PUT with raw body needs a Blob. Reading the file as a Blob via fetch is the
    // most reliable cross-platform path on React Native.
    fetch(file.uri)
      .then((res) => res.blob())
      .then((blob) => xhr.send(blob))
      .catch((err) => reject(err instanceof Error ? err : new Error("Failed to read file")));
  });
}

// ─── Course generation ───────────────────────────────────────────────────

export interface GenerateCourseResponse {
  jobId?: string;
  status: string;
  message?: string;
  chunkCount?: number;
  estimatedTime?: string;
}

export async function generateCourse(
  pdfId: string,
  options?: {
    createVisual?: boolean;
    learningPreferences?: LearningPreferences;
  },
): Promise<GenerateCourseResponse> {
  const body: Record<string, unknown> = { pdfId };
  if (options?.learningPreferences) {
    body.learningPreferences = options.learningPreferences;
  }
  if (options?.createVisual !== undefined) body.createVisual = options.createVisual;

  const response = await apiFetch(`${API_URL}/generate-course`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "Course generation failed");
  }

  return response.json();
}

export interface GenerateTopicCourseResponse {
  pdfId: string;
  courseTitle: string;
  lessonCount: number;
  estimatedTime: string;
}

export async function generateTopicCourse(
  topic: string,
  options?: {
    createVisual?: boolean;
    learningPreferences?: LearningPreferences;
    numLessons?: number;
  },
): Promise<GenerateTopicCourseResponse> {
  const body: Record<string, unknown> = { topic };
  if (options?.learningPreferences) {
    body.learningPreferences = options.learningPreferences;
  }
  if (options?.createVisual !== undefined) body.createVisual = options.createVisual;
  if (options?.numLessons !== undefined) body.numLessons = options.numLessons;

  const response = await apiFetch(`${API_URL}/generate-topic-course`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "Topic course generation failed");
  }

  return response.json();
}

// ─── Study plan / lessons ────────────────────────────────────────────────

export async function getStudyPlan(pdfId: string): Promise<StudyPlanResponse> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.error || "Failed to fetch study plan") as Error & {
      code?: string;
      status?: number;
    };
    err.code = error.code;
    err.status = response.status;
    throw err;
  }
  const data = (await response.json()) as StudyPlanResponse;
  return normalizeStudyPlanResponse(data);
}

export async function getLesson(pdfId: string, lessonIndex: number): Promise<Lesson> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch lesson");
  }
  return response.json();
}

export async function getFlashcards(
  pdfId: string,
  lessonIndex: number,
): Promise<Flashcard[]> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/flashcards`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch flashcards");
  }

  const data = (await response.json()) as
    | { flashcards?: LessonFlashcard[] }
    | LessonFlashcard[];
  const rawFlashcards = Array.isArray(data) ? data : data.flashcards ?? [];

  return rawFlashcards
    .map((flashcard, index) => normalizeFlashcard(flashcard, index))
    .filter((flashcard): flashcard is Flashcard => flashcard !== null);
}

export async function getQuizQuestions(
  pdfId: string,
  lessonIndex: number,
): Promise<{ quizQuestions: QuizQuestion[]; personalBest: { score: number } | null }> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/quiz`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch quiz questions");
  }

  const data = (await response.json()) as {
    quizQuestions?: LessonQuizQuestion[];
    personalBest?: { score: number } | null;
  };

  return {
    quizQuestions: (data.quizQuestions ?? [])
      .map((question, index) => normalizeQuizQuestion(question, index))
      .filter((question): question is QuizQuestion => question !== null),
    personalBest:
      data.personalBest && typeof data.personalBest.score === "number"
        ? { score: data.personalBest.score }
        : null,
  };
}

export async function submitQuiz(
  pdfId: string,
  lessonIndex: number,
  answers: { selectedIndex: number }[],
): Promise<QuizSubmissionResult> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/quiz`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to submit quiz");
  }

  return response.json();
}

export async function recordFlashcardInteraction(
  pdfId: string,
  lessonIndex: number,
  flashcardId: string,
  rating: FlashcardRating,
): Promise<{ success: boolean; progress: LessonProgress }> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/flashcard`,
    {
      method: "POST",
      body: JSON.stringify({
        flashcardId,
        rating,
        correct: rating !== "hard",
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to record flashcard interaction");
  }

  return response.json();
}

export async function getBossQuiz(pdfId: string): Promise<BossQuizPayload> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/boss-quiz`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to load boss quiz");
  }

  const data = (await response.json()) as BossQuizPayload;

  return {
    questions: (data.questions ?? [])
      .map((question, index) => normalizeBossQuizQuestion(question, index))
      .filter((question): question is BossQuizQuestion => question !== null),
    total: typeof data.total === "number" ? data.total : data.questions?.length ?? 0,
    tier: data.tier ?? "standard",
    timeLimit: typeof data.timeLimit === "number" ? data.timeLimit : null,
    attempt: typeof data.attempt === "number" ? data.attempt : 1,
  };
}

export async function submitBossQuiz(
  pdfId: string,
  answers: { questionId: string; selectedIndex: number }[],
): Promise<BossQuizResult> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/boss-quiz/submit`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to grade boss quiz");
  }

  return response.json();
}

export async function getWeakConcepts(): Promise<{
  weakConcepts: WeakConcept[];
  message?: string;
}> {
  const response = await apiFetch(`${API_URL}/users/weak-concepts`);

  if (!response.ok) {
    return { weakConcepts: [] };
  }

  return response.json();
}

export async function getUserTeams(): Promise<Team[]> {
  const response = await apiFetch(`${API_URL}/teams`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch teams");
  }

  const data = (await response.json()) as { teams?: Team[] };
  return data.teams ?? [];
}

export async function getGeneralHiveStatus(): Promise<GeneralHiveStatus> {
  const response = await apiFetch(`${API_URL}/general-hive`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch General Hive");
  }

  const data = (await response.json()) as { generalHive: GeneralHiveStatus };
  return data.generalHive;
}

export async function joinGeneralHive(): Promise<{
  message: string;
  generalHive: GeneralHiveStatus;
}> {
  const response = await apiFetch(`${API_URL}/general-hive/join`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to join General Hive");
  }

  return response.json();
}

export async function getTeamDetails(teamId: string): Promise<TeamDetails> {
  const response = await apiFetch(`${API_URL}/teams/${encodeURIComponent(teamId)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch team details");
  }

  return response.json();
}

export async function getTeamLeaderboard(teamId: string): Promise<TeamLeaderboardResponse> {
  const response = await apiFetch(
    `${API_URL}/teams/${encodeURIComponent(teamId)}/leaderboard`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch team leaderboard");
  }

  return response.json();
}

export async function getUserInvitations(): Promise<TeamInvitationWithTeam[]> {
  const response = await apiFetch(`${API_URL}/invitations`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch invitations");
  }

  const data = (await response.json()) as { invitations?: TeamInvitationWithTeam[] };
  return data.invitations ?? [];
}

export async function acceptInvitation(inviteCode: string): Promise<{
  message: string;
  team: Team;
}> {
  const response = await apiFetch(
    `${API_URL}/invitations/${encodeURIComponent(inviteCode)}/accept`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to accept invitation");
  }

  return response.json();
}

export async function rejectInvitation(inviteCode: string): Promise<{
  message: string;
}> {
  const response = await apiFetch(
    `${API_URL}/invitations/${encodeURIComponent(inviteCode)}/reject`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to reject invitation");
  }

  return response.json();
}

export async function getLessonProgress(
  pdfId: string,
  lessonIndex: number,
): Promise<LessonProgress> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/progress`,
  );
  if (!response.ok) throw new Error("Failed to fetch lesson progress");
  return response.json();
}

export async function markLectureComplete(
  pdfId: string,
  lessonIndex: number,
): Promise<{ lectureCompletedAt: string | null }> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/lecture-complete`,
    {
      method: "POST",
      body: JSON.stringify({ sectionCheckAck: {} }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to mark lecture complete (HTTP ${response.status})`);
  }
  return response.json();
}

// ─── Daily Drill ─────────────────────────────────────────────────────────

export type DailyMode =
  | "speed-run"
  | "accuracy-only"
  | "dark-mode"
  | "double-or-nothing";

export interface DrillQuestion {
  id: string;
  question: string;
  options: string[];
  pdfId: string;
  lessonIndex: number;
  lessonTitle: string;
  decayDays: number;
}

export interface DrillGradeResult {
  correct: boolean;
  correctIndex: number;
  correctOption: string;
}

export async function getDailyDrill(): Promise<{
  questions: DrillQuestion[];
  dailyMode: DailyMode;
}> {
  const response = await apiFetch(`${API_URL}/users/daily-drill`);
  if (!response.ok) throw new Error("Failed to fetch daily drill");
  return response.json();
}

export async function gradeDrillQuestion(
  pdfId: string,
  lessonIndex: number,
  questionId: string,
  selectedIndex: number,
): Promise<DrillGradeResult> {
  const response = await apiFetch(`${API_URL}/users/daily-drill/grade`, {
    method: "POST",
    body: JSON.stringify({ pdfId, lessonIndex, questionId, selectedIndex }),
  });
  if (!response.ok) throw new Error("Failed to grade drill question");
  return response.json();
}

// ─── Lesson Echo ─────────────────────────────────────────────────────────

export interface EchoQuestion {
  planId: string;
  pdfId: string;
  lessonIndex: number;
  lessonTitle: string;
  question: { id: string; question: string; options: string[] };
}

export async function getEcho(): Promise<{ echo: EchoQuestion | null }> {
  const response = await apiFetch(`${API_URL}/users/echo`);
  if (!response.ok) return { echo: null };
  return response.json();
}

export async function answerEcho(
  planId: string,
  pdfId: string,
  lessonIndex: number,
  questionId: string,
  selectedIndex: number,
): Promise<{ correct: boolean; correctIndex: number; correctOption: string }> {
  const response = await apiFetch(`${API_URL}/users/echo/answer`, {
    method: "POST",
    body: JSON.stringify({ planId, pdfId, lessonIndex, questionId, selectedIndex }),
  });
  if (!response.ok) throw new Error("Failed to answer echo");
  return response.json();
}

// ─── Streak Shield ───────────────────────────────────────────────────────

export async function redeemStreakShield(): Promise<{
  success: boolean;
  streakShields: number;
}> {
  const response = await apiFetch(`${API_URL}/users/streak-shield`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to use streak shield");
  }
  return response.json();
}

// ─── Discovered features (for Quest Board + Did You Know) ─────────────────

export async function getDiscoveredFeatures(): Promise<string[]> {
  const response = await apiFetch(`${API_URL}/users/discovered-features`);
  if (!response.ok) throw new Error("Failed to fetch discovered features");
  const data = await response.json();
  return Array.isArray(data.discoveredFeatures) ? data.discoveredFeatures : [];
}

export async function mergeDiscoveredFeatures(
  features: string[],
): Promise<string[]> {
  const response = await apiFetch(`${API_URL}/users/discovered-features`, {
    method: "POST",
    body: JSON.stringify({ features }),
  });
  if (!response.ok) throw new Error("Failed to save discovered features");
  const data = await response.json();
  return Array.isArray(data.discoveredFeatures) ? data.discoveredFeatures : [];
}

// ─── League (Phase 4: Social Pressure) ───────────────────────────────────

export type LeagueTier = "bronze" | "silver" | "gold";

export interface LeagueMember {
  name: string;
  weeklyMastery: number;
  isUser: boolean;
  rank: number;
}

export interface LeagueData {
  members: LeagueMember[];
  userRank: number;
  tier: LeagueTier;
  leagueWeek: string;
  promotionCount: number;
  relegationCount: number;
}

export async function getLeague(): Promise<LeagueData> {
  const response = await apiFetch(`${API_URL}/users/league`);
  if (!response.ok) throw new Error("Failed to fetch league");
  return response.json();
}

// ─── Rival events ────────────────────────────────────────────────────────

export interface RivalEventBase {
  id: string;
  type: string;
  message?: string;
  pdfId?: string;
  rivalName?: string;
  occurredAt?: string;
}

export async function dismissRivalEvent(eventId: string): Promise<void> {
  await apiFetch(`${API_URL}/users/rival-event/dismiss`, {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

export interface Rival {
  name: string;
  currentDay: number;
  yourDay: number;
  simulated: boolean;
  lastLesson?: { index: number; title: string; hoursAgo: number } | null;
  ghostFlavor?: string;
}

export async function getRival(pdfId: string): Promise<{ rival: Rival | null }> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/rival`,
  );
  if (!response.ok) return { rival: null };
  return response.json();
}

// Exposed for any direct-call sites that need to compose URLs manually.
export { API_BASE_URL, API_URL, getAuthTokenSync };
