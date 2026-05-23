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
  flashcards?: unknown[];
  quizQuestions?: unknown[];
  visuals?: unknown[];
  sections?: LearningSection[];
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
  const lessons =
    Array.isArray(data.plan) && data.plan.length > 0
      ? data.plan
      : Array.isArray(data.lessons)
        ? data.lessons
        : [];

  return {
    ...data,
    plan: lessons,
    lessons,
    totalDays: data.totalDays ?? lessons.length,
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

// Exposed for any direct-call sites that need to compose URLs manually.
export { API_BASE_URL, API_URL, getAuthTokenSync };
