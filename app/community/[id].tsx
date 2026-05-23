import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, MessageCircle, MessageSquare, Pin } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { RichContent } from "@/components/RichContent";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import {
  getAnnouncement,
  listAnnouncementReplies,
  type Announcement,
  type AnnouncementReply,
} from "@/lib/api";
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

function ReplyCard({ reply }: { reply: AnnouncementReply }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-bold text-slate-900">{reply.username}</Text>
        <Text className="text-xs text-slate-400">{formatRelativeTime(reply.createdAt)}</Text>
      </View>

      <View className="mt-2">
        <RichContent html={reply.body} />
      </View>

      {totalReactions(reply.reactionCounts) > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {Object.entries(reply.reactionCounts)
            .filter(([, count]) => count > 0)
            .slice(0, 4)
            .map(([emoji, count]) => (
              <View key={emoji} className="rounded-full bg-slate-100 px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-600">
                  {emoji} {count}
                </Text>
              </View>
            ))}
        </View>
      ) : null}
    </View>
  );
}

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
        <View className="gap-5 pb-8">
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
              {reactionEntries.map(([emoji, count]) => (
                <View key={emoji} className="rounded-full bg-slate-100 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-slate-600">
                    {emoji} {count}
                  </Text>
                </View>
              ))}
            </View>
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
                  <ReplyCard key={reply.id} reply={reply} />
                ))}
              </View>
            ) : (
              <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <Text className="text-sm font-semibold text-slate-900">No replies yet</Text>
                <Text className="mt-1 text-sm leading-6 text-slate-500">
                  This detail screen is read-first for now. Replies will appear here as the thread grows.
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

          <Button title="Back to Community" variant="secondary" onPress={() => router.replace("/community")} />
        </View>
      )}
    </ScreenContainer>
  );
}