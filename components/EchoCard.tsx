import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CheckCircle2, Volume2, XCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import { answerEcho, getEcho, type EchoQuestion } from "@/lib/api";
import { markFeatureDiscovered } from "@/lib/feature-discovery";

interface EchoCardProps {
  /** Bump to force a re-fetch (e.g. after pull-to-refresh). */
  refreshToken?: number;
}

interface AnswerState {
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
}

export function EchoCard({ refreshToken }: EchoCardProps) {
  const toast = useToast();
  const [echo, setEcho] = useState<EchoQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState<AnswerState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getEcho();
        if (!cancelled) {
          setEcho(data.echo);
          setSelected(null);
          setAnswer(null);
        }
      } catch {
        // soft fail — echo is a bonus surface
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const submit = async () => {
    if (!echo || selected == null || submitting) return;
    setSubmitting(true);
    try {
      const result = await answerEcho(
        echo.planId,
        echo.pdfId,
        echo.lessonIndex,
        echo.question.id,
        selected,
      );
      Haptics.notificationAsync(
        result.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      setAnswer({
        selectedIndex: selected,
        correctIndex: result.correctIndex,
        correct: result.correct,
      });
      void markFeatureDiscovered("lesson-echo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't grade echo");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !echo) return null;

  return (
    <View
      className="overflow-hidden rounded-3xl border border-cyan-100 bg-white p-5 gap-4"
      style={{
        shadowColor: "#0e7490",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-start gap-3">
        <GradientIcon size={44} radius={14} from="#06b6d4" to="#3b82f6">
          <Volume2 size={20} color="#ffffff" />
        </GradientIcon>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider font-semibold text-cyan-700">
            Lesson echo
          </Text>
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {echo.lessonTitle}
          </Text>
        </View>
      </View>

      <Text className="text-base font-semibold text-slate-900 leading-6">
        {echo.question.question}
      </Text>

      <View className="gap-2">
        {echo.question.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = answer && answer.correctIndex === i;
          const isWrong =
            answer && answer.selectedIndex === i && !answer.correct;
          return (
            <Pressable
              key={i}
              disabled={Boolean(answer) || submitting}
              onPress={() => setSelected(i)}
              className={`rounded-2xl border-2 p-3 ${
                isCorrect
                  ? "border-emerald-300 bg-emerald-50"
                  : isWrong
                    ? "border-rose-300 bg-rose-50"
                    : isSelected
                      ? "border-cyan-300 bg-cyan-50"
                      : "border-slate-200 bg-white"
              }`}
            >
              <View className="flex-row items-center gap-3">
                <Text
                  className="flex-1 text-sm text-slate-900 leading-5"
                  numberOfLines={3}
                >
                  {option}
                </Text>
                {isCorrect ? (
                  <CheckCircle2 size={16} color="#059669" />
                ) : isWrong ? (
                  <XCircle size={16} color="#dc2626" />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {answer ? (
        <Text
          className={`text-xs font-semibold text-center ${
            answer.correct ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {answer.correct
            ? "Memory locked in. Echo cleared."
            : "Worth a review — tap the lesson tomorrow."}
        </Text>
      ) : (
        <Pressable
          onPress={submit}
          disabled={selected == null || submitting}
          className={`h-11 flex-row items-center justify-center rounded-full ${
            selected != null && !submitting
              ? "bg-slate-900 active:bg-slate-800"
              : "bg-slate-200"
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              selected != null && !submitting ? "text-white" : "text-slate-400"
            }`}
          >
            {submitting ? "Checking…" : "Answer echo"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default EchoCard;
