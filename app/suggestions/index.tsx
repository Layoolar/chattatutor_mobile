import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronUp, Lightbulb, MessageSquare, Sparkles } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import {
  listSuggestions,
  toggleSuggestionUpvote,
  type Suggestion,
  type SuggestionCategory,
  type SuggestionStatus,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

const CATEGORIES: SuggestionCategory[] = ["feature", "bug", "improvement", "other"];
const STATUSES: SuggestionStatus[] = ["open", "planned", "in_progress", "shipped", "declined"];

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  feature: "Feature",
  bug: "Bug",
  improvement: "Improve",
  other: "Other",
};

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  open: "Open",
  planned: "Planned",
  in_progress: "In Progress",
  shipped: "Shipped",
  declined: "Declined",
};

const STATUS_CONTAINER_STYLES: Record<SuggestionStatus, string> = {
  open: "bg-slate-100",
  planned: "bg-sky-100",
  in_progress: "bg-amber-100",
  shipped: "bg-emerald-100",
  declined: "bg-rose-100",
};

const STATUS_TEXT_STYLES: Record<SuggestionStatus, string> = {
  open: "text-slate-700",
  planned: "text-sky-700",
  in_progress: "text-amber-700",
  shipped: "text-emerald-700",
  declined: "text-rose-700",
};

function formatRelativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-2 ${
        active ? "bg-slate-900" : "bg-white border border-slate-200"
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-white" : "text-slate-600"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SuggestionCard({
  suggestion,
  voting,
  onVote,
}: {
  suggestion: Suggestion;
  voting: boolean;
  onVote: () => void;
}) {
  return (
    <View
      className="rounded-3xl border border-slate-200 bg-white p-5"
      style={{
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-start gap-4">
        <Pressable
          onPress={onVote}
          disabled={voting}
          className={`items-center rounded-2xl px-3 py-3 ${
            suggestion.hasVoted ? "bg-violet-600" : "bg-slate-100"
          } ${voting ? "opacity-70" : ""}`}
        >
          <ChevronUp size={20} color={suggestion.hasVoted ? "#ffffff" : "#475569"} />
          <Text className={`mt-1 text-sm font-bold ${suggestion.hasVoted ? "text-white" : "text-slate-700"}`}>
            {suggestion.upvoteCount}
          </Text>
        </Pressable>

        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <View className={`rounded-full px-3 py-1.5 ${STATUS_CONTAINER_STYLES[suggestion.status]}`}>
              <Text className={`text-xs font-semibold ${STATUS_TEXT_STYLES[suggestion.status]}`}>
                {STATUS_LABELS[suggestion.status]}
              </Text>
            </View>
            <View className="rounded-full bg-slate-100 px-3 py-1.5">
              <Text className="text-xs font-semibold text-slate-600">
                {CATEGORY_LABELS[suggestion.category]}
              </Text>
            </View>
          </View>

          <Text className="mt-3 text-lg font-extrabold text-slate-900">{suggestion.title}</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600" numberOfLines={4}>
            {suggestion.body}
          </Text>

          <View className="mt-4 flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1">
              <MessageSquare size={14} color="#64748b" />
              <Text className="text-xs font-semibold text-slate-500">
                {suggestion.commentCount} {suggestion.commentCount === 1 ? "comment" : "comments"}
              </Text>
            </View>
            <Text className="text-xs text-slate-400">Posted {formatRelativeTime(suggestion.createdAt)}</Text>
            {suggestion.adminResponse ? (
              <Text className="text-xs font-semibold text-emerald-600">Admin responded</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function SuggestionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [filterStatus, setFilterStatus] = useState<SuggestionStatus | undefined>();
  const [filterCategory, setFilterCategory] = useState<SuggestionCategory | undefined>();
  const [votingId, setVotingId] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      const response = await listSuggestions({
        sort,
        status: filterStatus,
        category: filterCategory,
        limit: 12,
      });
      setSuggestions(response.suggestions ?? []);
      setNextCursor(response.nextCursor ?? null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load suggestions";
      setSuggestions([]);
      setNextCursor(null);
      setError(message);
    }
  }, [sort, filterCategory, filterStatus]);

  useEffect(() => {
    setLoading(true);
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
      const response = await listSuggestions({
        sort,
        status: filterStatus,
        category: filterCategory,
        cursor: nextCursor,
        limit: 12,
      });
      setSuggestions((current) => [...current, ...(response.suggestions ?? [])]);
      setNextCursor(response.nextCursor ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load more suggestions");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVote = async (id: string) => {
    if (votingId === id) return;

    const current = suggestions.find((suggestion) => suggestion.id === id);
    if (!current) return;

    const nextHasVoted = !current.hasVoted;
    const nextCount = current.upvoteCount + (current.hasVoted ? -1 : 1);

    setVotingId(id);
    setSuggestions((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, hasVoted: nextHasVoted, upvoteCount: nextCount }
          : item,
      ),
    );

    try {
      const result = await toggleSuggestionUpvote(id);
      setSuggestions((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, hasVoted: result.added, upvoteCount: result.newCount }
            : item,
        ),
      );
    } catch (err) {
      setSuggestions((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, hasVoted: current.hasVoted, upvoteCount: current.upvoteCount }
            : item,
        ),
      );
      toast.error(err instanceof Error ? err.message : "Couldn't update vote");
    } finally {
      setVotingId(null);
    }
  };

  const activeFilterCount = useMemo(
    () => (filterStatus ? 1 : 0) + (filterCategory ? 1 : 0),
    [filterCategory, filterStatus],
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

        <View className="overflow-hidden rounded-3xl border border-violet-200 bg-violet-50/70 p-5">
          <View
            pointerEvents="none"
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-200/60"
          />
          <View className="flex-row items-start gap-4">
            <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
              <Lightbulb size={22} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="mt-1 text-2xl font-extrabold text-slate-900">Suggestions</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                Vote ideas up, filter the board, and surface the changes that should get built next.
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row gap-2">
            <FilterChip label="Top" active={sort === "top"} onPress={() => setSort("top")} />
            <FilterChip label="New" active={sort === "new"} onPress={() => setSort("new")} />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Status {activeFilterCount > 0 ? `(${activeFilterCount} active filters)` : ""}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <FilterChip label="All" active={!filterStatus} onPress={() => setFilterStatus(undefined)} />
              {STATUSES.map((status) => (
                <FilterChip
                  key={status}
                  label={STATUS_LABELS[status]}
                  active={filterStatus === status}
                  onPress={() => setFilterStatus(status)}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              <FilterChip label="All" active={!filterCategory} onPress={() => setFilterCategory(undefined)} />
              {CATEGORIES.map((category) => (
                <FilterChip
                  key={category}
                  label={CATEGORY_LABELS[category]}
                  active={filterCategory === category}
                  onPress={() => setFilterCategory(category)}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="gap-4 pb-8">
          <Skeleton.Card height={180} />
          <Skeleton.Card height={180} />
          <Skeleton.Card height={180} />
        </View>
      ) : error ? (
        <EmptyState
          icon={Lightbulb}
          title="Suggestions unavailable"
          message={error}
          action={{ label: "Retry", onPress: onRefresh }}
          secondary={{ label: "Back to Community", onPress: () => router.replace("/community") }}
          gradient={{ from: "#8b5cf6", to: "#7c3aed" }}
        />
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No suggestions match yet"
          message={filterStatus || filterCategory ? "Try clearing the current filters." : "The board is empty right now. New ideas will appear here as users post them."}
          action={filterStatus || filterCategory ? { label: "Clear filters", onPress: () => {
            setFilterStatus(undefined);
            setFilterCategory(undefined);
          } } : undefined}
          secondary={{ label: "Back to Community", onPress: () => router.replace("/community") }}
          gradient={{ from: "#8b5cf6", to: "#7c3aed" }}
        />
      ) : (
        <View className="gap-4 pb-8">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              voting={votingId === suggestion.id}
              onVote={() => handleVote(suggestion.id)}
            />
          ))}

          {nextCursor ? (
            <Button
              title={loadingMore ? "Loading..." : "Load more suggestions"}
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