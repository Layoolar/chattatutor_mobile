import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, MessageSquare, Pin, Send, SmilePlus } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { RichContent } from "@/components/RichContent";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import {
  ANNOUNCEMENT_REACTION_EMOJIS,
  createAnnouncementReply,
  getAnnouncement,
  listAnnouncementReplies,
  toggleAnnouncementReaction,
  toggleReplyReaction,
  type Announcement,
  type AnnouncementReply,
  type AnnouncementReactionEmoji,
} from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/lib/toast";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function totalReactions(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + Math.max(0, count), 0);
}

// ───── Reaction bar ────────────────────────────────────────────────────────
// Applies a click-to-toggle reaction with optimistic update. Used for both
// announcements and replies — `onToggle` resolves with the server-confirmed
// state and we reconcile.

interface ReactionBarProps {
  reactionCounts: Record<string, number>;
  myReactions: string[];
  onToggle: (
    emoji: AnnouncementReactionEmoji,
  ) => Promise<{ added: boolean; count: number; emoji: AnnouncementReactionEmoji }>;
  onReconcile: (emoji: AnnouncementReactionEmoji, added: boolean, count: number) => void;
}

function ReactionBar({ reactionCounts, myReactions, onToggle, onReconcile }: ReactionBarProps) {
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());

  const handleTap = async (emoji: AnnouncementReactionEmoji) => {
    if (pendingRef.current.has(emoji)) return;
    pendingRef.current.add(emoji);

    const wasMine = myReactions.includes(emoji);
    const optimisticAdded = !wasMine;
    const currentCount = Math.max(0, reactionCounts[emoji] ?? 0);
    const optimisticCount = optimisticAdded ? currentCount + 1 : Math.max(0, currentCount - 1);

    haptics.tick();
    onReconcile(emoji, optimisticAdded, optimisticCount);

    try {
      const result = await onToggle(emoji);
      onReconcile(emoji, result.added, result.count);
    } catch {
      // Roll back
      onReconcile(emoji, wasMine, currentCount);
      haptics.error();
    } finally {
      pendingRef.current.delete(emoji);
    }
  };

  // Show only emojis that have at least one count, plus a "+" toggle that
  // reveals the full picker. Reduces visual noise on quiet threads.
  const visibleEmojis = ANNOUNCEMENT_REACTION_EMOJIS.filter(
    (emoji) => (reactionCounts[emoji] ?? 0) > 0,
  );

  return (
    <View className="mt-3 flex-row flex-wrap items-center gap-2">
      {visibleEmojis.map((emoji) => {
        const count = reactionCounts[emoji] ?? 0;
        const isMine = myReactions.includes(emoji);
        return (
          <Pressable
            key={emoji}
            onPress={() => handleTap(emoji)}
            className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
              isMine ? "bg-indigo-100 border border-indigo-300" : "bg-slate-100"
            }`}
          >
            <Text className="text-xs">{emoji}</Text>
            <Text
              className={`text-xs font-semibold ${
                isMine ? "text-indigo-700" : "text-slate-600"
              }`}
            >
              {count}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => {
          haptics.tick();
          setOpen((value) => !value);
        }}
        className="flex-row items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 active:bg-slate-200"
      >
        <SmilePlus size={12} color="#475569" />
        <Text className="text-xs font-semibold text-slate-600">
          {open ? "Close" : visibleEmojis.length === 0 ? "React" : "More"}
        </Text>
      </Pressable>

      {open ? (
        <View className="basis-full mt-2 flex-row flex-wrap gap-2 rounded-2xl bg-white p-2 border border-slate-200">
          {ANNOUNCEMENT_REACTION_EMOJIS.map((emoji) => {
            const isMine = myReactions.includes(emoji);
            return (
              <Pressable
                key={emoji}
                onPress={() => handleTap(emoji)}
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  isMine ? "bg-indigo-100" : "bg-slate-50"
                } active:bg-indigo-50`}
              >
                <Text>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// ───── Reply card ──────────────────────────────────────────────────────────

interface ReplyCardProps {
  announcementId: string;
  reply: AnnouncementReply;
  onReplyReact: (replyId: string, emoji: AnnouncementReactionEmoji, added: boolean, count: number) => void;
}

function ReplyCard({ announcementId, reply, onReplyReact }: ReplyCardProps) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-bold text-slate-900">{reply.username}</Text>
        <Text className="text-xs text-slate-400">{formatRelativeTime(reply.createdAt)}</Text>
      </View>

      <View className="mt-2">
        <RichContent html={reply.body} />
      </View>

      <ReactionBar
        reactionCounts={reply.reactionCounts}
        myReactions={reply.myReactions}
        onToggle={(emoji) => toggleReplyReaction(announcementId, reply.id, emoji)}
        onReconcile={(emoji, added, count) => onReplyReact(reply.id, emoji, added, count)}
      />
    </View>
  );
}

// ───── Screen ──────────────────────────────────────────────────────────────

export default function CommunityPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [replies, setReplies] = useState<AnnouncementReply[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyDraft, setReplyDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setAnnouncement(null);
      setReplies([]);
      setNextCursor(null);
      setError("Missing post id");
      return;
    }

    const [announcementResult, repliesResult] = await Promise.allSettled([
      getAnnouncement(id),
      listAnnouncementReplies(id, null, 20),
    ]);

    if (announcementResult.status === "fulfilled") {
      setAnnouncement(announcementResult.value.announcement);
      setError(null);
    } else {
      const message =
        announcementResult.reason instanceof Error
          ? announcementResult.reason.message
          : "Couldn't load post";
      setAnnouncement(null);
      setError(message);
    }

    if (repliesResult.status === "fulfilled") {
      setReplies(repliesResult.value.replies ?? []);
      setNextCursor(repliesResult.value.nextCursor ?? null);
    } else {
      setReplies([]);
      setNextCursor(null);
      if (announcementResult.status === "fulfilled") {
        toast.error(
          repliesResult.reason instanceof Error
            ? repliesResult.reason.message
            : "Couldn't load replies",
        );
      }
    }
  }, [id, toast]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const loadMoreReplies = async () => {
    if (!id || !nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await listAnnouncementReplies(id, nextCursor, 20);
      setReplies((current) => [...current, ...(response.replies ?? [])]);
      setNextCursor(response.nextCursor ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load more replies");
    } finally {
      setLoadingMore(false);
    }
  };

  const reconcileAnnouncementReaction = useCallback(
    (emoji: AnnouncementReactionEmoji, added: boolean, count: number) => {
      setAnnouncement((current) => {
        if (!current) return current;
        const nextCounts = { ...current.reactionCounts, [emoji]: count };
        const nextMine = added
          ? [...new Set([...current.myReactions, emoji])]
          : current.myReactions.filter((e) => e !== emoji);
        return { ...current, reactionCounts: nextCounts, myReactions: nextMine };
      });
    },
    [],
  );

  const reconcileReplyReaction = useCallback(
    (replyId: string, emoji: AnnouncementReactionEmoji, added: boolean, count: number) => {
      setReplies((current) =>
        current.map((reply) => {
          if (reply.id !== replyId) return reply;
          const nextCounts = { ...reply.reactionCounts, [emoji]: count };
          const nextMine = added
            ? [...new Set([...reply.myReactions, emoji])]
            : reply.myReactions.filter((e) => e !== emoji);
          return { ...reply, reactionCounts: nextCounts, myReactions: nextMine };
        }),
      );
    },
    [],
  );

  const handlePostReply = async () => {
    if (!id || !announcement) return;
    const trimmed = replyDraft.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    haptics.tap();
    try {
      const { reply } = await createAnnouncementReply(id, trimmed);
      setReplies((current) => [...current, reply]);
      setAnnouncement((current) =>
        current ? { ...current, replyCount: current.replyCount + 1 } : current,
      );
      setReplyDraft("");
      haptics.success();
    } catch (err) {
      haptics.error();
      toast.error(err instanceof Error ? err.message : "Couldn't post reply");
    } finally {
      setPosting(false);
    }
  };

  const canPostReply = replyDraft.trim().length > 0 && !posting;
  const reactionEntries = useMemo(
    () =>
      announcement
        ? Object.entries(announcement.reactionCounts)
            .filter(([, count]) => count > 0)
            .slice(0, 6)
        : [],
    [announcement],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
        <View className="pt-6 pb-4 gap-4">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/community"))}
            className="self-start flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
          >
            <ChevronLeft size={16} color="#0f172a" />
            <Text className="text-sm font-semibold text-slate-900">Back</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="gap-4 pb-8">
            <Skeleton.Card height={220} />
            <Skeleton.Card height={120} />
            <Skeleton.Card height={120} />
          </View>
        ) : error || !announcement ? (
          <EmptyState
            icon={MessageSquare}
            title="Post unavailable"
            message={error || "This post could not be loaded right now."}
            action={{ label: "Back to Community", onPress: () => router.replace("/community") }}
            secondary={{ label: "Retry", onPress: onRefresh }}
            gradient={{ from: "#06b6d4", to: "#3b82f6" }}
          />
        ) : (
          <View className="gap-5 pb-32">
            <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5">
              {announcement.pinned ? (
                <View className="mb-4 self-start flex-row items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
                  <Pin size={12} color="#b45309" />
                  <Text className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Pinned post
                  </Text>
                </View>
              ) : null}

              <Text className="text-2xl font-extrabold text-slate-900">{announcement.title}</Text>
              <Text className="mt-2 text-sm text-slate-500">
                <Text className="font-semibold text-slate-600">{announcement.authorName}</Text>
                <Text> · </Text>
                <Text>{formatRelativeTime(announcement.createdAt)}</Text>
                {announcement.editedAt ? <Text> · edited</Text> : null}
              </Text>

              <View className="mt-4">
                <RichContent html={announcement.body} />
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-slate-100 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-slate-600">
                    {announcement.replyCount} {announcement.replyCount === 1 ? "reply" : "replies"}
                  </Text>
                </View>
                <View className="rounded-full bg-slate-100 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-slate-600">
                    {totalReactions(announcement.reactionCounts)} reactions
                  </Text>
                </View>
              </View>

              <ReactionBar
                reactionCounts={announcement.reactionCounts}
                myReactions={announcement.myReactions}
                onToggle={(emoji) => toggleAnnouncementReaction(announcement.id, emoji)}
                onReconcile={reconcileAnnouncementReaction}
              />
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Replies
                </Text>
                <Text className="text-xs font-semibold text-slate-400">
                  {replies.length} loaded
                </Text>
              </View>

              {replies.length > 0 ? (
                <View className="gap-3">
                  {replies.map((reply) => (
                    <ReplyCard
                      key={reply.id}
                      announcementId={announcement.id}
                      reply={reply}
                      onReplyReact={reconcileReplyReaction}
                    />
                  ))}
                </View>
              ) : (
                <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <Text className="text-sm font-semibold text-slate-900">No replies yet</Text>
                  <Text className="mt-1 text-sm leading-6 text-slate-500">
                    Be the first to weigh in.
                  </Text>
                </View>
              )}

              {nextCursor ? (
                <Button
                  title={loadingMore ? "Loading..." : "Load more replies"}
                  variant="secondary"
                  onPress={loadMoreReplies}
                  loading={loadingMore}
                />
              ) : null}
            </View>
          </View>
        )}
      </ScreenContainer>

      {announcement ? (
        <View className="border-t border-slate-200 bg-white px-4 py-2">
          <View className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
            <TextInput
              value={replyDraft}
              onChangeText={setReplyDraft}
              placeholder="Write a reply…"
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={2000}
              className="flex-1 max-h-32 py-2 text-sm text-slate-900"
            />
            <Pressable
              onPress={handlePostReply}
              disabled={!canPostReply}
              className={`h-9 w-9 items-center justify-center rounded-full ${
                canPostReply ? "bg-indigo-600 active:bg-indigo-700" : "bg-slate-200"
              }`}
            >
              <Send size={14} color={canPostReply ? "#ffffff" : "#94a3b8"} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
