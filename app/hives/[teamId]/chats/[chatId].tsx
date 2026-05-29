import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, MessageSquare, Send } from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import {
  getChatDetails,
  getChatMessages,
  sendChatMessage,
  type HiveChatMessage,
  type TeamChat,
} from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/lib/toast";

const PAGE_SIZE = 50;

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface MessageRowProps {
  message: HiveChatMessage;
  isMine: boolean;
  showAuthor: boolean;
}

function MessageRow({ message, isMine, showAuthor }: MessageRowProps) {
  return (
    <View
      className={`px-4 ${isMine ? "items-end" : "items-start"}`}
      style={{ marginTop: showAuthor ? 12 : 2 }}
    >
      {showAuthor && !isMine ? (
        <Text className="mb-1 ml-1 text-[11px] font-semibold text-slate-500">
          {message.username}
        </Text>
      ) : null}
      <View
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
          isMine ? "bg-indigo-600" : "border border-slate-200 bg-white"
        }`}
        style={{
          shadowColor: "#0f172a",
          shadowOpacity: isMine ? 0 : 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        <Text
          className={`text-sm leading-6 ${isMine ? "text-white" : "text-slate-800"}`}
        >
          {message.message}
        </Text>
      </View>
      <Text
        className={`mt-1 text-[10px] ${isMine ? "text-slate-400 mr-1" : "text-slate-400 ml-1"}`}
      >
        {formatMessageTime(message.createdAt)}
      </Text>
    </View>
  );
}

export default function HiveChatThreadScreen() {
  const { teamId, chatId } = useLocalSearchParams<{ teamId?: string; chatId?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [chat, setChat] = useState<TeamChat | null>(null);
  const [messages, setMessages] = useState<HiveChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!chatId) {
      setError("Missing chat id");
      setChat(null);
      setMessages([]);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const [details, msgs] = await Promise.all([
        getChatDetails(chatId),
        getChatMessages(chatId, { limit: PAGE_SIZE }),
      ]);
      setChat(details);
      // Sort descending so the inverted FlatList renders newest at the
      // visual bottom (since `inverted` flips the list).
      const sorted = [...msgs.messages].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setMessages(sorted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load chat");
    } finally {
      inFlightRef.current = false;
    }
  }, [chatId]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Refresh whenever the user returns to this screen — covers the case where
  // they navigate away to do something then come back; messages stay fresh
  // without us setting up polling.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleSend = useCallback(async () => {
    if (!chatId) return;
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 2000) {
      toast.error("Message is too long (max 2000 characters)");
      return;
    }

    setSending(true);
    haptics.tap();
    try {
      const sent = await sendChatMessage(chatId, trimmed);
      // Prepend (since list is inverted = newest first).
      setMessages((current) => [sent, ...current]);
      setDraft("");
      haptics.success();
    } catch (err) {
      haptics.error();
      toast.error(err instanceof Error ? err.message : "Couldn't send message");
    } finally {
      setSending(false);
    }
  }, [chatId, draft, sending, toast]);

  const renderItem = useCallback(
    ({ item, index }: { item: HiveChatMessage; index: number }) => {
      const isMine = !!user && item.userId === user.id;
      // We get a "newer" message via index-1 because the list is inverted
      // (index 0 is the most recent). Show author when the previous newer
      // message was from a different author, OR when there's a gap >5min.
      const newer = index > 0 ? messages[index - 1] : null;
      const sameAuthor = newer && newer.userId === item.userId;
      const gapMs = newer ? new Date(newer.createdAt).getTime() - new Date(item.createdAt).getTime() : Infinity;
      const showAuthor = !sameAuthor || gapMs > 5 * 60 * 1000;
      return <MessageRow message={item} isMine={isMine} showAuthor={showAuthor} />;
    },
    [messages, user],
  );

  const keyExtractor = useCallback((item: HiveChatMessage) => item.id, []);

  const headerBack = () => {
    haptics.tick();
    if (router.canGoBack()) router.back();
    else if (teamId) router.replace({ pathname: "/hives/[teamId]", params: { teamId: String(teamId) } });
    else router.replace("/(tabs)/hives");
  };

  const canSend = !!chat && chat.status === "active" && draft.trim().length > 0 && !sending;
  const composerLocked = !chat || chat.status !== "active";

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-4 py-2">
        <Pressable
          onPress={headerBack}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ChevronLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-slate-500">Hive chat</Text>
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {chat?.name ?? (loading ? "Loading…" : "Chat")}
          </Text>
        </View>
        {chat?.status === "archived" ? (
          <View className="rounded-full bg-slate-100 px-3 py-1.5">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Archived
            </Text>
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View className="flex-1 gap-3 p-5">
            <Skeleton.Line width="40%" />
            <Skeleton.Card height={70} />
            <Skeleton.Card height={70} />
            <Skeleton.Card height={70} />
          </View>
        ) : error ? (
          <View className="flex-1 p-5">
            <EmptyState
              icon={MessageSquare}
              title="Chat unavailable"
              message={error}
              action={{ label: "Retry", onPress: onRefresh }}
              secondary={{
                label: "Back to hive",
                onPress: () => headerBack(),
              }}
              gradient={{ from: "#06b6d4", to: "#3b82f6" }}
            />
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <MessageSquare size={24} color="#4f46e5" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-slate-900">
              Start the conversation
            </Text>
            <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
              No messages yet. Say hi, share a tip, or kick off the next study sprint.
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4f46e5"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <View className="border-t border-slate-200 bg-white px-4 py-2">
          {composerLocked && !loading && !error ? (
            <View className="flex-row items-center gap-2 rounded-full bg-slate-100 px-4 py-3">
              <Text className="text-xs font-semibold text-slate-500">
                {chat?.status === "archived"
                  ? "This chat is archived — read-only"
                  : "Messages are paused for this chat"}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-end gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Send a message…"
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={2000}
                editable={!composerLocked}
                className="flex-1 max-h-32 py-2 text-sm text-slate-900"
              />
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  canSend ? "bg-indigo-600 active:bg-indigo-700" : "bg-slate-200"
                }`}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={14} color={canSend ? "#ffffff" : "#94a3b8"} />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
