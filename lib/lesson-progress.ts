import AsyncStorage from "@react-native-async-storage/async-storage";

// Local-only cache of per-lesson side-step progress (flashcards visited, lecture
// soft-lock cleared on this device). The server is the source of truth for
// quiz scores, mastery, etc.; this just lets the UI gate the Quiz button
// without waiting on a roundtrip.

const flashcardsKey = (pdfId: string, lessonIndex: number) =>
  `lesson:flashcards-complete:${pdfId}:${lessonIndex}`;

const lectureKey = (pdfId: string, lessonIndex: number) =>
  `lesson:lecture-complete:${pdfId}:${lessonIndex}`;

export async function markFlashcardsCompleted(pdfId: string, lessonIndex: number) {
  try {
    await AsyncStorage.setItem(flashcardsKey(pdfId, lessonIndex), "1");
  } catch {
    // Best-effort cache — if AsyncStorage fails the user just sees the locked state.
  }
}

export async function isFlashcardsCompleted(pdfId: string, lessonIndex: number): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(flashcardsKey(pdfId, lessonIndex))) === "1";
  } catch {
    return false;
  }
}

export async function markLectureCompleted(pdfId: string, lessonIndex: number) {
  try {
    await AsyncStorage.setItem(lectureKey(pdfId, lessonIndex), "1");
  } catch {
    // Same fallback as above.
  }
}

export async function isLectureCompleted(pdfId: string, lessonIndex: number): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(lectureKey(pdfId, lessonIndex))) === "1";
  } catch {
    return false;
  }
}
