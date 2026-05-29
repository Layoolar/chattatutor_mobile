import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ChevronLeft, Lightbulb, MessageCircle, MessageSquare, Pin } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { listAnnouncements, type Announcement } from "@/lib/api";
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

function stripHtmlPreview(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function totalReactions(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + Math.max(0, count), 0);
}

function AnnouncementCard({
  announcement,
  onPress,
}: {
  announcement: Announcement;
  onPress: () => void;
}) {
  const preview = stripHtmlPreview(announcement.body);
  const reactionEntries = Object.entries(announcement.reactionCounts)
    .filter(([, count]) => count > 0)
    .slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden rounded-3xl border bg-white p-5 ${
        announcement.pinned ? "border-amber-300" : "border-slate-200"
      }`}
      style={{
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      {announcement.pinned ? (
        <View className="mb-4 self-start flex-row items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
          <Pin size={12} color="#b45309" />
          <Text className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Pinned
          </Text>
        </View>
      ) : null}

      <Text className="text-lg font-extrabold text-slate-900">{announcement.title}</Text>
      <Text className="mt-1 text-xs text-slate-500">
        <Text className="font-semibold text-slate-600">{announcement.authorName}</Text>
        <Text> · </Text>
        <Text>{formatRelativeTime(announcement.createdAt)}</Text>
        {announcement.editedAt ? <Text> · edited</Text> : null}
      </Text>

      <Text className="mt-3 text-sm leading-6 text-slate-600" numberOfLines={4}>
        {preview || "Open this post to read the full update."}
      </Text>

      <View className="mt-4 flex-row flex-wrap items-center gap-3">
        <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5">
          <MessageCircle size={14} color="#475569" />
          <Text className="text-xs font-semibold text-slate-600">
            {announcement.replyCount} {announcement.replyCount === 1 ? "reply" : "replies"}
          </Text>
        </View>
        {reactionEntries.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {reactionEntries.map(([emoji, count]) => (
              <View key={emoji} className="rounded-full bg-slate-100 px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-600">
                  {emoji} {count}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="rounded-full bg-slate-100 px-3 py-1.5">
            <Text className="text-xs font-semibold text-slate-600">
              {totalReactions(announcement.reactionCounts)} reactions
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      const response = await listAnnouncements(null, 12);
      setAnnouncements(response.announcements ?? []);
      setNextCursor(response.nextCursor ?? null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load community feed";
      setAnnouncements([]);
      setNextCursor(null);
      setError(message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadInitial();
      setLoading(false);
    })();
  }, [loadInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitial();
    } finally {
      setRefreshing(false);
    }
  }, [loadInitial]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await listAnnouncements(nextCursor, 12);
      setAnnouncements((current) => [...current, ...(response.announcements ?? [])]);
      setNextCursor(response.nextCursor ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load more posts");
    } finally {
      setLoadingMore(false);
    }
  };

  const openAnnouncement = (id: string) => {
    router.push({
      pathname: "/community/[id]",
      params: { id },
    });
  };

  const openSuggestions = () => {
    router.push("/suggestions");
  };

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-4">
        <Pressable
          onPress={() => router.replace("/hives")}
          className="self-start flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
        >
          <ChevronLeft size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-900">Back</Text>
        </Pressable>
        <View className="gap-1">
          <Text className="text-2xl font-bold text-slate-900">Community</Text>
          <Text className="text-sm text-slate-500">
            Platform announcements and shared updates, still folded inside Hives.
          </Text>
        </View>

        <Pressable
          onPress={openSuggestions}
          className="overflow-hidden rounded-3xl border border-violet-200 bg-violet-50/70 p-5 active:bg-violet-100/70"
        >
          <View
            pointerEvents="none"
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-200/60"
          />
          <View className="flex-row items-start gap-4">
            <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
              <Lightbulb size={22} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Suggestions
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-slate-900">
                Vote on what gets built next
              </Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                Browse ideas, sort the board, and upvote the ones you want shipped.
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-end gap-1">
            <Text className="text-sm font-semibold text-violet-700">Open suggestions</Text>
            <ArrowRight size={16} color="#6d28d9" />
          </View>
        </Pressable>
      </View>

      {loading ? (
        <View className="gap-4 pb-8">
          <Skeleton.Card height={180} />
          <Skeleton.Card height={180} />
          <Skeleton.Card height={180} />
        </View>
      ) : error ? (
        <EmptyState
          icon={MessageSquare}
          title="Community feed unavailable"
          message={error}
          action={{ label: "Retry", onPress: onRefresh }}
          secondary={{ label: "Back to Hives", onPress: () => router.replace("/(tabs)/hives") }}
          gradient={{ from: "#06b6d4", to: "#3b82f6" }}
        />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No posts yet"
          message="This is the new read-first community lane. Once the admin feed starts posting, updates show up here."
          action={{ label: "Back to Hives", onPress: () => router.replace("/(tabs)/hives") }}
          gradient={{ from: "#06b6d4", to: "#3b82f6" }}
        />
      ) : (
        <View className="gap-4 pb-8">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onPress={() => openAnnouncement(announcement.id)}
            />
          ))}

          {nextCursor ? (
            <Button
              title={loadingMore ? "Loading..." : "Load more posts"}
              variant="secondary"
              onPress={loadMore}
              loading={loadingMore}
            />
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}
