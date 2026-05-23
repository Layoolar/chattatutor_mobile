import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { Skeleton } from "@/components/Skeleton";
import {
  getFlashcards,
  recordFlashcardInteraction,
  type Flashcard,
  type FlashcardRating,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-indigo-300/20 bg-indigo-500/15 px-3 py-3">
      <Text className="text-lg font-extrabold text-white">{value}</Text>
      <Text className="mt-1 text-xs font-semibold text-indigo-100">{label}</Text>
    </View>
  );
}

export default function LessonFlashcardsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pdfId, lessonIndex } = useLocalSearchParams<{
    pdfId: string;
    lessonIndex: string;
  }>();

  const index = Number(lessonIndex ?? 0);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<number[]>([]);
  const [reviewRound, setReviewRound] = useState(false);
  const [syncErrorShown, setSyncErrorShown] = useState(false);

  useEffect(() => {
    if (!pdfId || Number.isNaN(index)) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const cards = await getFlashcards(String(pdfId), index);
        setFlashcards(cards);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't load flashcards");
      } finally {
        setLoading(false);
      }
    })();
  }, [index, pdfId, toast]);

  const sessionCards = reviewRound
    ? reviewQueue
        .map((cardIndex) => flashcards[cardIndex])
        .filter((card): card is Flashcard => Boolean(card))
    : flashcards;
  const currentCard =
    currentIndex >= 0 && currentIndex < sessionCards.length
      ? sessionCards[currentIndex]
      : null;
  const sessionComplete = currentCard === null;
  const progressPercent =
    sessionCards.length > 0 ? Math.min((currentIndex / sessionCards.length) * 100, 100) : 0;
  const nextLabel = reviewRound ? "Review round" : "Main deck";

  const handleRate = async (rating: FlashcardRating) => {
    if (!currentCard || !pdfId || Number.isNaN(index)) return;

    const sourceIndex = reviewRound ? reviewQueue[currentIndex] : currentIndex;
    const nextReviewQueue =
      rating === "hard" && sourceIndex !== undefined && !reviewQueue.includes(sourceIndex)
        ? [...reviewQueue, sourceIndex]
        : reviewQueue;

    if (nextReviewQueue !== reviewQueue) {
      setReviewQueue(nextReviewQueue);
    }

    try {
      await recordFlashcardInteraction(String(pdfId), index, currentCard.id, rating);
    } catch (err) {
      if (!syncErrorShown) {
        toast.info("Progress didn't sync, but you can keep reviewing.");
        setSyncErrorShown(true);
      }
    }

    setIsFlipped(false);

    const nextIndex = currentIndex + 1;
    if (nextIndex < sessionCards.length) {
      setCurrentIndex(nextIndex);
      return;
    }

    if (!reviewRound && nextReviewQueue.length > 0) {
      setReviewRound(true);
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex(sessionCards.length);
  };

  const restartDeck = () => {
    setReviewRound(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewQueue([]);
    setSyncErrorShown(false);
  };

  const reviewHardCards = () => {
    if (reviewQueue.length === 0) return;
    setReviewRound(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/lessons"))}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          style={{
            shadowColor: "#0f172a",
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Flashcards
          </Text>
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            Lesson {Number.isNaN(index) ? "?" : index + 1}
          </Text>
        </View>
      </View>

      <View className="flex-1 px-5 pb-6 pt-3">
        {loading ? (
          <View className="gap-3">
            <Skeleton.Card height={180} />
            <Skeleton.Card height={340} />
            <Skeleton.Card height={80} />
          </View>
        ) : flashcards.length === 0 ? (
          <View className="flex-1 justify-center gap-4">
            <View className="rounded-3xl border border-slate-200 bg-white p-6">
              <GradientIcon size={56} radius={18} from="#6366f1" to="#7c3aed">
                <Zap size={24} color="#ffffff" />
              </GradientIcon>
              <Text className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
                No flashcards yet
              </Text>
              <Text className="mt-3 text-sm leading-6 text-slate-600">
                This lesson doesn't have a flashcard deck ready yet. You can go back to the lesson and keep studying.
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="mt-5 self-start rounded-full bg-indigo-600 px-5 py-3 active:bg-indigo-700"
              >
                <Text className="text-sm font-semibold text-white">Back to lesson</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-1 gap-5">
            <View
              className="overflow-hidden rounded-3xl bg-slate-900 p-5"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.2,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 7,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/30"
              />
              <View
                pointerEvents="none"
                className="absolute -left-10 bottom-[-22px] h-32 w-32 rounded-full bg-indigo-500/25"
              />
              <View className="self-start flex-row items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                <Sparkles size={14} color="#ffffff" />
                <Text className="text-xs font-semibold text-white">{nextLabel}</Text>
              </View>
              <Text className="mt-5 text-3xl font-extrabold leading-9 tracking-tight text-white">
                {reviewRound ? "Clean up the hard cards" : "Lock in the key ideas"}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-indigo-50">
                {reviewRound
                  ? "You flagged these for extra repetition. Finish them cleanly before you head back to the lesson."
                  : "Tap to flip, then rate each card. Hard cards come back for one more review round."}
              </Text>
              <View className="mt-6 flex-row gap-2">
                <StatPill label="Deck size" value={`${flashcards.length}`} />
                <StatPill label="Hard pile" value={`${reviewQueue.length}`} />
                <StatPill
                  label="Card"
                  value={sessionComplete ? `${sessionCards.length}/${sessionCards.length}` : `${Math.min(currentIndex + 1, sessionCards.length)}/${sessionCards.length}`}
                />
              </View>
              <View className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <View
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>

            {sessionComplete ? (
              <View className="rounded-3xl border border-slate-200 bg-white p-6 gap-4">
                <GradientIcon size={60} radius={20} from="#6366f1" to="#8b5cf6">
                  <Sparkles size={28} color="#ffffff" />
                </GradientIcon>
                <View>
                  <Text className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Deck complete
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    {reviewQueue.length > 0
                      ? `You reviewed ${flashcards.length} cards and flagged ${reviewQueue.length} for extra repetition.`
                      : `You cleared all ${flashcards.length} flashcards without needing an extra review round.`}
                  </Text>
                </View>

                <View className="gap-3">
                  {reviewQueue.length > 0 ? (
                    <Pressable
                      onPress={reviewHardCards}
                      className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-indigo-600 active:bg-indigo-700"
                    >
                      <Zap size={16} color="#ffffff" />
                      <Text className="text-sm font-semibold text-white">Review hard cards again</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={restartDeck}
                    className="h-12 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white active:bg-slate-50"
                  >
                    <RotateCcw size={16} color="#0f172a" />
                    <Text className="text-sm font-semibold text-slate-900">Restart full deck</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.back()}
                    className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-slate-900 active:bg-slate-800"
                  >
                    <ChevronRight size={16} color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">Back to lesson</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View className="relative h-[360px]">
                  <View className="absolute inset-x-7 top-5 bottom-0 rounded-[30px] bg-violet-200/45" />
                  <View className="absolute inset-x-4 top-2 bottom-0 rounded-[30px] bg-indigo-200/60" />

                  <Pressable
                    onPress={() => setIsFlipped((value) => !value)}
                    className={`absolute inset-0 overflow-hidden rounded-[32px] border p-6 ${
                      isFlipped ? "border-indigo-200 bg-white" : "border-indigo-300 bg-indigo-600"
                    }`}
                    style={{
                      shadowColor: isFlipped ? "#312e81" : "#4f46e5",
                      shadowOpacity: 0.16,
                      shadowRadius: 18,
                      shadowOffset: { width: 0, height: 10 },
                      elevation: 8,
                    }}
                  >
                    {!isFlipped ? (
                      <>
                        <View className="self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                          <Text className="text-xs font-semibold text-white">Front</Text>
                        </View>
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-center text-2xl font-extrabold leading-9 tracking-tight text-white">
                            {currentCard.front}
                          </Text>
                        </View>
                        <Text className="text-center text-sm font-medium text-indigo-100">
                          Tap to reveal the answer
                        </Text>
                      </>
                    ) : (
                      <>
                        <View className="self-start rounded-full bg-indigo-50 px-3 py-1.5">
                          <Text className="text-xs font-semibold text-indigo-600">Back</Text>
                        </View>
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-center text-xl font-bold leading-8 text-slate-900">
                            {currentCard.back}
                          </Text>
                        </View>
                        <Text className="text-center text-sm font-medium text-slate-500">
                          Rate it to move to the next card
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>

                <View className="gap-3">
                  <Text className="text-center text-sm text-slate-500">
                    {isFlipped
                      ? "Hard cards come back for one more pass."
                      : "Flip first, then choose how well you remembered it."}
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleRate("hard")}
                      disabled={!isFlipped}
                      className={`flex-1 h-12 items-center justify-center rounded-full border ${
                        isFlipped
                          ? "border-rose-200 bg-rose-50 active:bg-rose-100"
                          : "border-slate-200 bg-slate-100 opacity-60"
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${isFlipped ? "text-rose-600" : "text-slate-500"}`}>
                        Hard
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRate("good")}
                      disabled={!isFlipped}
                      className={`flex-1 h-12 items-center justify-center rounded-full border ${
                        isFlipped
                          ? "border-indigo-200 bg-white active:bg-indigo-50"
                          : "border-slate-200 bg-slate-100 opacity-60"
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${isFlipped ? "text-indigo-700" : "text-slate-500"}`}>
                        Good
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRate("easy")}
                      disabled={!isFlipped}
                      className={`flex-1 h-12 items-center justify-center rounded-full ${
                        isFlipped ? "bg-indigo-600 active:bg-indigo-700" : "bg-slate-100 opacity-60"
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${isFlipped ? "text-white" : "text-slate-500"}`}>
                        Easy
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}