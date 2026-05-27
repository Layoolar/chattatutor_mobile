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

export interface DecayingLessonRow {
  pdfId: string;
  lessonIndex: number;
  title: string;
  currentMastery: number;
  daysSinceLastReview: number;
}

// Phase 6.5: returned by mastery-awarding endpoints (drill / echo / quiz) so
// the client can fire a Knowmad Level-up celebration. `awarded` is 0 when the
// question already paid out (anti-farming) or no credit was due.
export interface MasteryCredit {
  awarded: number;
  lifetime: number;
  leveledUp: boolean;
  newLevel?: number;
  newTitle?: string;
}

export interface UserRank {
  // Knowmad Level fields — drive the title and "X mastery to next" UI.
  level?: number;
  title: string;
  nextTitle: string | null;
  lifetimeMastery?: number;
  masteryToNext?: number | null;
  // Current knowledge mastery — drives the decay surface, NOT the title.
  currentKnowledgeMastery?: number;
  // Weekly mastery — for the league delta row on the rank card.
  weekly?: {
    earned: number;
  };
  // Top lessons due for refresh — frontend deep-links each to its lesson page.
  decayingLessons?: DecayingLessonRow[];
  // Backwards-compatible aliases (pre-Phase-6.5 readers).
  totalMastery: number;
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

export interface PushPreferences {
  learningReminders: boolean;
  socialAlerts: boolean;
  accountAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export interface PushDevicePayload {
  expoPushToken: string;
  deviceId: string;
  platform: "ios" | "android" | "web" | "unknown";
  appVersion?: string | null;
  preferences: PushPreferences;
}

export interface PushDeviceResponse {
  device: {
    id: string;
    userId: string;
    expoPushToken: string;
    deviceId: string | null;
    platform: string;
    appVersion: string | null;
    enabled: boolean;
    preferences: PushPreferences;
    lastRegisteredAt: string;
    lastSeenAt: string;
  };
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
  visuals?: (VisualSpec | null)[];
  conceptTypes?: (ConceptType | null)[];
  sectionIds?: string[];
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
  // Phase 6.5: present on the first lesson pass of the day (the 600-pt bonus).
  mastery?: MasteryCredit;
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

export interface TeamChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  membershipStatus: "active" | "archived";
  played: number;
  wins: number;
  averageScore: number;
  winRate: number;
}

export interface TeamChallengeLeaderboardResponse {
  leaderboard: TeamChallengeLeaderboardEntry[];
  type: "challenges";
}

export interface Announcement {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  pinned: boolean;
  reactionCounts: Record<string, number>;
  replyCount: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  myReactions: string[];
}

export interface AnnouncementReply {
  id: string;
  announcementId: string;
  userId: string;
  username: string;
  body: string;
  parentReplyId: string | null;
  createdAt: string;
  updatedAt: string;
  reactionCounts: Record<string, number>;
  myReactions: string[];
}

export interface ListAnnouncementsResponse {
  announcements: Announcement[];
  nextCursor: string | null;
}

export interface ListAnnouncementRepliesResponse {
  replies: AnnouncementReply[];
  nextCursor: string | null;
}

export type SuggestionStatus = "open" | "planned" | "in_progress" | "shipped" | "declined";
export type SuggestionCategory = "feature" | "bug" | "improvement" | "other";

export interface Suggestion {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  upvoteCount: number;
  commentCount: number;
  adminResponse: string | null;
  adminRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasVoted: boolean;
}

export interface ListSuggestionsResponse {
  suggestions: Suggestion[];
  nextCursor: string | null;
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
  status?: number;
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
  sourceAnchors?: string[];
}

// ─── Visual Diagram ──────────────────────────────────────────────────────

export type VisualType =
  | "flow"
  | "tree"
  | "network"
  | "comparison"
  | "timeline"
  | "cycle"
  | "matrix"
  | "layers"
  | "equation"
  | "storymap";

export type ConceptType =
  | "sequential"
  | "relational"
  | "hierarchical"
  | "comparison"
  | "spatial"
  | "temporal"
  | "causal"
  | "cyclical"
  | "categorical"
  | "anatomical"
  | "mathematical"
  | "narrative"
  | "argumentative"
  | "procedural";

export interface VisualNode {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  group?: string;
  state?: "default" | "highlighted";
}

export interface VisualEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed" | "thick";
}

export interface VisualSpec {
  type: VisualType;
  canvas: {
    orientation: "horizontal" | "vertical";
    aspectRatio?: string;
  };
  layout: {
    alignment: "center" | "distributed";
  };
  nodes: VisualNode[];
  edges: VisualEdge[];
  interaction?: {
    clickableNodes?: boolean;
    highlightSequence?: string[];
  };
  theme?: {
    title?: string;
    summary?: string;
  };
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

export type QualityReportTargetType = "section" | "visual" | "flashcard" | "question";
export type QualityReportKind = "inaccurate" | "unclear" | "missing_source" | "other";

export interface CreateQualityReportPayload {
  courseId: string;
  sectionId: string;
  targetType: QualityReportTargetType;
  targetId: string;
  kind?: QualityReportKind;
  anchorText?: string;
  userComment?: string;
}

export interface QualityReportResponse {
  report: {
    id: string;
    courseId: string;
    sectionId: string;
    targetType: QualityReportTargetType;
    targetId: string;
    kind: QualityReportKind;
    status: string;
    anchorText?: string | null;
    userComment?: string | null;
    createdAt?: string;
  };
  autoRegen?: {
    status: string;
    reason?: string;
    jobId?: string;
  };
}

export interface ExplainSlideResponse {
  explanation: string;
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

export async function registerPushDevice(
  payload: PushDevicePayload,
): Promise<PushDeviceResponse> {
  const response = await apiFetch(`${API_URL}/users/push-devices`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to register push notifications");
  }

  return response.json();
}

export async function updatePushPreferences(
  expoPushToken: string,
  preferences: PushPreferences,
): Promise<PushDeviceResponse> {
  const response = await apiFetch(`${API_URL}/users/push-devices/preferences`, {
    method: "PATCH",
    body: JSON.stringify({ expoPushToken, preferences }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to update push preferences");
  }

  return response.json();
}

export async function unregisterPushDevice(expoPushToken: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/users/push-devices`, {
    method: "DELETE",
    body: JSON.stringify({ expoPushToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to unregister push notifications");
  }
}

export async function createFlutterwaveCheckout(
  plan: "premium",
  redirectUrl: string,
): Promise<{ paymentLink: string; txRef: string; message?: string }> {
  const response = await apiFetch(`${API_URL}/flutterwave/subscriptions/checkout`, {
    method: "POST",
    body: JSON.stringify({ plan, redirectUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || "Failed to start checkout");
  }

  return response.json();
}

export async function cancelFlutterwaveSubscription(): Promise<{ message?: string }> {
  const response = await apiFetch(`${API_URL}/flutterwave/subscriptions/cancel`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || "Failed to cancel subscription");
  }

  return response.json();
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

export async function explainSlide(
  pdfId: string,
  lessonIndex: number,
  slideText: string,
  slideIndex: number,
  isFlashcard = false,
): Promise<ExplainSlideResponse> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/explain-slide`,
    {
      method: "POST",
      body: JSON.stringify({ slideText, slideIndex, isFlashcard }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = createApiError(error, "Failed to explain this slide");
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export async function createQualityReport(
  payload: CreateQualityReportPayload,
): Promise<QualityReportResponse> {
  const response = await apiFetch(`${API_URL}/quality-reports`, {
    method: "POST",
    body: JSON.stringify({ kind: "inaccurate", ...payload }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = createApiError(error, "Failed to submit report");
    err.status = response.status;
    throw err;
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
): Promise<{
  quizQuestions: QuizQuestion[];
  personalBest: { score: number } | null;
  alreadyCleared: boolean;
}> {
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
    alreadyCleared?: boolean;
  };

  return {
    quizQuestions: (data.quizQuestions ?? [])
      .map((question, index) => normalizeQuizQuestion(question, index))
      .filter((question): question is QuizQuestion => question !== null),
    personalBest:
      data.personalBest && typeof data.personalBest.score === "number"
        ? { score: data.personalBest.score }
        : null,
    alreadyCleared: !!data.alreadyCleared,
  };
}

export class QuizAlreadyClearedError extends Error {
  code = "ALREADY_CLEARED_TODAY" as const;
  constructor() {
    super("Lesson already cleared today. Come back tomorrow for a fresh attempt.");
    this.name = "QuizAlreadyClearedError";
  }
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

  if (response.status === 423) {
    throw new QuizAlreadyClearedError();
  }

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

export async function createTeam(data: {
  name: string;
  description?: string;
  pdfId: string;
  settings?: {
    isPublic?: boolean;
    allowMemberInvites?: boolean;
    requireApproval?: boolean;
  };
}): Promise<{
  message: string;
  team: Team;
}> {
  const response = await apiFetch(`${API_URL}/teams`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to create team");
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

export async function leaveTeam(teamId: string): Promise<{ message?: string }> {
  const response = await apiFetch(
    `${API_URL}/teams/${encodeURIComponent(teamId)}/leave`,
    { method: "POST" },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to leave hive");
  }

  return response.json();
}

// ─── Hive Chat ───────────────────────────────────────────────────────────

export interface TeamChat {
  id: string;
  teamId: string;
  name: string;
  status: "active" | "archived" | "locked";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  settings?: {
    allowMemberMessages?: boolean;
    rateLimit?: number;
  };
}

export interface HiveChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export async function getTeamChats(teamId: string): Promise<{ chats: TeamChat[] }> {
  const response = await apiFetch(
    `${API_URL}/teams/${encodeURIComponent(teamId)}/chats`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to load hive chats");
  }
  return response.json();
}

export async function createChat(teamId: string, name: string): Promise<TeamChat> {
  const response = await apiFetch(
    `${API_URL}/teams/${encodeURIComponent(teamId)}/chats`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to create chat");
  }
  return response.json();
}

export async function getChatDetails(chatId: string): Promise<TeamChat> {
  const response = await apiFetch(`${API_URL}/chats/${encodeURIComponent(chatId)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to load chat");
  }
  return response.json();
}

export async function getChatMessages(
  chatId: string,
  opts?: { after?: string | null; limit?: number },
): Promise<{ messages: HiveChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (opts?.after) params.set("after", opts.after);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const response = await apiFetch(
    `${API_URL}/chats/${encodeURIComponent(chatId)}/messages${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to load messages");
  }
  return response.json();
}

export async function sendChatMessage(
  chatId: string,
  message: string,
): Promise<HiveChatMessage> {
  const response = await apiFetch(
    `${API_URL}/chats/${encodeURIComponent(chatId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to send message");
  }
  return response.json();
}

export async function archiveChat(chatId: string): Promise<{ message?: string }> {
  const response = await apiFetch(`${API_URL}/chats/${encodeURIComponent(chatId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to archive chat");
  }
  return response.json();
}

export async function inviteTeamMember(
  teamId: string,
  data: {
    email?: string;
    expiresInDays?: number;
  },
): Promise<{
  message: string;
  invitation: TeamInvitation;
  inviteLink: string;
}> {
  const response = await apiFetch(
    `${API_URL}/teams/${encodeURIComponent(teamId)}/invitations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to create invitation");
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

export async function getTeamChallengeLeaderboard(
  teamId: string,
): Promise<TeamChallengeLeaderboardResponse> {
  const response = await apiFetch(
    `${API_URL}/teams/${encodeURIComponent(teamId)}/leaderboard?type=challenges`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch team challenge leaderboard");
  }

  return response.json();
}

export async function listAnnouncements(
  cursor?: string | null,
  limit = 20,
): Promise<ListAnnouncementsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  const response = await apiFetch(`${API_URL}/announcements?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch announcements");
  }

  return response.json();
}

export async function getAnnouncement(id: string): Promise<{ announcement: Announcement }> {
  const response = await apiFetch(`${API_URL}/announcements/${encodeURIComponent(id)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch announcement");
  }

  return response.json();
}

export async function listAnnouncementReplies(
  announcementId: string,
  cursor?: string | null,
  limit = 20,
): Promise<ListAnnouncementRepliesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  const response = await apiFetch(
    `${API_URL}/announcements/${encodeURIComponent(announcementId)}/replies?${params.toString()}`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch announcement replies");
  }

  return response.json();
}

export async function listSuggestions(opts?: {
  sort?: "top" | "new";
  status?: SuggestionStatus;
  category?: SuggestionCategory;
  cursor?: string | null;
  limit?: number;
}): Promise<ListSuggestionsResponse> {
  const params = new URLSearchParams();
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.category) params.set("category", opts.category);
  if (opts?.cursor) params.set("cursor", opts.cursor);
  params.set("limit", String(opts?.limit ?? 20));

  const response = await apiFetch(`${API_URL}/suggestions?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to fetch suggestions");
  }

  return response.json();
}

export async function toggleSuggestionUpvote(
  id: string,
): Promise<{ added: boolean; newCount: number }> {
  const response = await apiFetch(
    `${API_URL}/suggestions/${encodeURIComponent(id)}/upvote`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to toggle suggestion vote");
  }

  return response.json();
}

export async function createSuggestion(payload: {
  title: string;
  body: string;
  category: SuggestionCategory;
}): Promise<{ suggestion: Suggestion }> {
  const response = await apiFetch(`${API_URL}/suggestions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to create suggestion");
  }

  return response.json();
}

// Backend whitelist — mirror exactly. Any change requires a coordinated update.
export const ANNOUNCEMENT_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "🎉",
  "🚀",
  "😂",
  "🙏",
  "👀",
  "🔥",
] as const;
export type AnnouncementReactionEmoji = (typeof ANNOUNCEMENT_REACTION_EMOJIS)[number];

export async function createAnnouncementReply(
  announcementId: string,
  body: string,
  parentReplyId?: string,
): Promise<{ reply: AnnouncementReply }> {
  const response = await apiFetch(
    `${API_URL}/announcements/${encodeURIComponent(announcementId)}/replies`,
    {
      method: "POST",
      body: JSON.stringify({ body, parentReplyId }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to post reply");
  }

  return response.json();
}

export async function toggleAnnouncementReaction(
  announcementId: string,
  emoji: AnnouncementReactionEmoji,
): Promise<{ added: boolean; count: number; emoji: AnnouncementReactionEmoji }> {
  const response = await apiFetch(
    `${API_URL}/announcements/${encodeURIComponent(announcementId)}/react`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to toggle reaction");
  }

  return response.json();
}

export async function toggleReplyReaction(
  announcementId: string,
  replyId: string,
  emoji: AnnouncementReactionEmoji,
): Promise<{ added: boolean; count: number; emoji: AnnouncementReactionEmoji }> {
  const response = await apiFetch(
    `${API_URL}/announcements/${encodeURIComponent(announcementId)}/replies/${encodeURIComponent(replyId)}/react`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(error, "Failed to toggle reaction");
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
  sectionCheckAck?: Record<number, "correct" | "missed" | "skipped">,
): Promise<{ lectureCompletedAt: string | null }> {
  const response = await apiFetch(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/lecture-complete`,
    {
      method: "POST",
      body: JSON.stringify({ sectionCheckAck: sectionCheckAck ?? {} }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to mark lecture complete (HTTP ${response.status})`);
  }
  return response.json();
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAI(
  pdfId: string,
  question: string,
  chatHistory: ChatMessage[] = [],
): Promise<{ reply: string }> {
  const response = await apiFetch(`${API_URL}/pdfs/${encodeURIComponent(pdfId)}/ask`, {
    method: "POST",
    body: JSON.stringify({ question, chatHistory }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || "Failed to chat with AI");
  }
  const payload = await response.json();
  return payload.data ?? payload;
}

// The PDF chunk endpoint is consumed directly from the lesson page via
// `FileSystem.downloadAsync` so the binary stream stays on disk and never
// crosses the JS bridge. No wrapper needed here.

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
  mastery?: MasteryCredit;
}

export async function getDailyDrill(): Promise<{
  questions: DrillQuestion[];
  dailyMode: DailyMode;
}> {
  const response = await apiFetch(`${API_URL}/users/daily-drill`);
  if (!response.ok) throw new Error("Failed to fetch daily drill");
  return response.json();
}

// ─── Voice narration (Tutor Brief) ───────────────────────────────────────
// Server pipeline generates audio per lesson (ElevenLabs → S3). Mobile just
// plays the presigned URL. The persisted record stores `audioKey`; the API
// response augments it with a `url` minted per request (default 1h TTL).

export interface SectionNarration {
  audioKey: string;
  durationSec: number;
  voiceId: string;
  model: "eleven_v3";
  voicePipelineVersion: string;
  scriptHash: string;
  characters: number;
  generatedAt: string;
  url?: string;
}

export type NarrationOutcome = "generated" | "cached" | "cost_capped" | "user_capped";

export interface NarrationResult {
  outcome: NarrationOutcome;
  narration?: SectionNarration;
  warning?: { code: "voice_url_signing_failed"; message: string };
  reason?: {
    code: "voice_cost_cap_hit" | "voice_user_cap_hit";
    message: string;
    currentSpendUsd?: number;
    projectedSpendUsd?: number;
    ceilingUsd?: number;
    used?: number;
    cap?: number;
  };
}

export interface NarrationMapEntry {
  lessonIndex: number;
  // "lesson-brief" for V1; section IDs for legacy section-level entries.
  sectionId: string;
  target: "intro" | "section" | "lessonBrief";
  url?: string;
  audioKey?: string;
  scriptHash?: string;
  voiceId?: string;
  generatedAt?: string;
}

export class VoiceUnavailableError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code?: string, message?: string) {
    super(message || `Voice unavailable (${status})`);
    this.name = "VoiceUnavailableError";
    this.status = status;
    this.code = code;
  }
}

async function postNarration(url: string): Promise<NarrationResult> {
  const response = await apiFetch(url, { method: "POST" });
  if (!response.ok) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const body = await response.json();
      code = body?.code;
      message = body?.error || body?.message;
    } catch {
      // body might not be JSON — surface the status instead
    }
    throw new VoiceUnavailableError(response.status, code, message);
  }
  return response.json();
}

export async function generateLessonBriefNarration(
  pdfId: string,
  lessonIndex: number,
): Promise<NarrationResult> {
  return postNarration(
    `${API_URL}/study-plans/${encodeURIComponent(pdfId)}/lessons/${lessonIndex}/brief-narration/retry`,
  );
}

export async function getNarrationMap(
  pdfId: string,
): Promise<{ pdfId: string; sections: NarrationMapEntry[] }> {
  const response = await apiFetch(`${API_URL}/study-plans/${encodeURIComponent(pdfId)}/narration`);
  if (!response.ok) throw new VoiceUnavailableError(response.status);
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
): Promise<{ correct: boolean; correctIndex: number; correctOption: string; mastery?: MasteryCredit }> {
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
