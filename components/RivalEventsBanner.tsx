import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Swords, X } from "lucide-react-native";
import { GradientIcon } from "@/components/GradientIcon";
import { useToast } from "@/lib/toast";
import { dismissRivalEvent } from "@/lib/api";

interface RivalEventLike {
  id?: string;
  type?: string;
  message?: string;
  rivalName?: string;
  pdfId?: string;
  [key: string]: unknown;
}

interface RivalEventsBannerProps {
  events: unknown[];
  onChange?: (next: unknown[]) => void;
}

function isRivalEventLike(value: unknown): value is RivalEventLike {
  return Boolean(value) && typeof value === "object";
}

function formatMessage(event: RivalEventLike): string {
  if (event.message && typeof event.message === "string") return event.message;
  const rival = event.rivalName ? String(event.rivalName) : "Your rival";
  switch (event.type) {
    case "rival_passed_you":
      return `${rival} just overtook you. Win it back.`;
    case "rival_completed":
      return `${rival} finished a course. Catch up.`;
    case "rival_streak":
      return `${rival} is on a streak. Reclaim the lead.`;
    default:
      return `${rival} is making moves.`;
  }
}

export function RivalEventsBanner({ events, onChange }: RivalEventsBannerProps) {
  const router = useRouter();
  const toast = useToast();
  const [dismissing, setDismissing] = useState<string | null>(null);

  const event = events.find(isRivalEventLike);
  if (!event) return null;

  const eventId = typeof event.id === "string" ? event.id : null;

  const dismiss = async () => {
    if (!eventId) {
      onChange?.(events.filter((e) => e !== event));
      return;
    }
    setDismissing(eventId);
    try {
      await dismissRivalEvent(eventId);
      onChange?.(events.filter((e) => e !== event));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't dismiss");
    } finally {
      setDismissing(null);
    }
  };

  const tap = () => {
    if (typeof event.pdfId === "string" && event.pdfId.length > 0) {
      router.push({
        pathname: "/course/[pdfId]",
        params: { pdfId: event.pdfId },
      });
    }
  };

  return (
    <Pressable
      onPress={tap}
      className="overflow-hidden rounded-3xl border border-rose-200 bg-white p-4"
      style={{
        shadowColor: "#9f1239",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      <View
        pointerEvents="none"
        className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-rose-100"
      />
      <View className="flex-row items-start gap-3">
        <GradientIcon size={44} radius={14} from="#f43f5e" to="#ec4899">
          <Swords size={20} color="#ffffff" />
        </GradientIcon>
        <View className="flex-1 gap-1">
          <Text className="text-xs uppercase tracking-wider font-bold text-rose-700">
            Rival update
          </Text>
          <Text className="text-sm font-semibold text-slate-900 leading-5">
            {formatMessage(event)}
          </Text>
          {event.pdfId ? (
            <View className="flex-row items-center gap-1 mt-1">
              <Text className="text-xs font-semibold text-rose-700">
                Open the course
              </Text>
              <ArrowRight size={12} color="#be123c" />
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={dismiss}
          disabled={dismissing === eventId}
          hitSlop={8}
          className="w-7 h-7 rounded-full items-center justify-center bg-rose-100"
        >
          <X size={12} color="#9f1239" />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default RivalEventsBanner;
