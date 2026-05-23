import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Lightbulb, MessageSquare, Sparkles, UsersRound } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { GradientIcon } from "@/components/GradientIcon";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import {
  getGeneralHiveStatus,
  getUserTeams,
  joinGeneralHive,
  listAnnouncements,
  type Announcement,
  type GeneralHiveStatus,
  type Team,
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

function stripHtmlPreview(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function TeamCard({
  team,
  generalHiveId,
  onPress,
}: {
  team: Team;
  generalHiveId?: string;
  onPress: () => void;
}) {
  const isGeneralHive = team.id === generalHiveId;
  const isArchived = team.membershipStatus === "archived";

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-3xl border p-5 ${
        isArchived ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
      style={{
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
            {team.name}
          </Text>
          <Text className="mt-1 text-sm leading-6 text-slate-600" numberOfLines={3}>
            {team.description || "Shared course, shared pressure, shared progress."}
          </Text>
        </View>
        <View
          className={`rounded-full px-3 py-1.5 ${
            isArchived ? "bg-amber-100" : isGeneralHive ? "bg-violet-100" : "bg-indigo-50"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              isArchived
                ? "text-amber-700"
                : isGeneralHive
                  ? "text-violet-700"
                  : "text-indigo-600"
            }`}
          >
            {isArchived ? "Archived" : isGeneralHive ? "General Hive" : "Active"}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <View className="rounded-full bg-slate-100 px-3 py-1.5">
          <Text className="text-xs font-semibold text-slate-600">
            {team.memberCount ?? 0} member{team.memberCount === 1 ? "" : "s"}
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-3 py-1.5">
          <Text className="text-xs font-semibold text-slate-600">
            {team.settings?.isPublic ? "Public" : "Invite only"}
          </Text>
        </View>
        {team.hiveLevel != null ? (
          <View className="rounded-full bg-slate-100 px-3 py-1.5">
            <Text className="text-xs font-semibold text-slate-600">
              Hive level {team.hiveLevel}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 flex-row items-center justify-end">
        <Text className="text-sm font-semibold text-indigo-600">Open hive</Text>
      </View>
    </Pressable>
  );
}

export default function HivesScreen() {
  const router = useRouter();
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [generalHive, setGeneralHive] = useState<GeneralHiveStatus | null>(null);
  const [communityPreview, setCommunityPreview] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningGeneralHive, setJoiningGeneralHive] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [teamsResult, generalHiveResult, communityResult] = await Promise.allSettled([
      getUserTeams(),
      getGeneralHiveStatus(),
      listAnnouncements(null, 2),
    ]);

    setTeams(teamsResult.status === "fulfilled" ? teamsResult.value : []);
    setGeneralHive(generalHiveResult.status === "fulfilled" ? generalHiveResult.value : null);
    setCommunityPreview(
      communityResult.status === "fulfilled" ? communityResult.value.announcements ?? [] : [],
    );

    if (teamsResult.status === "rejected" && generalHiveResult.status === "rejected") {
      toast.error("Couldn't load your hives");
    }
  }, [toast]);

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

  const activeTeams = useMemo(
    () => teams.filter((team) => !team.membershipStatus || team.membershipStatus === "active"),
    [teams],
  );
  const archivedTeams = useMemo(
    () => teams.filter((team) => team.membershipStatus === "archived"),
    [teams],
  );
  const showGeneralHiveJoinCard =
    Boolean(generalHive?.team) &&
    generalHive?.membershipStatus !== "active" &&
    !teams.some(
      (team) =>
        team.id === generalHive?.team?.id && team.membershipStatus === "archived",
    );

  const handleJoinGeneralHive = async () => {
    try {
      setJoinError(null);
      setJoiningGeneralHive(true);
      const result = await joinGeneralHive();
      setGeneralHive(result.generalHive);
      toast.success(result.message || "Joined General Hive");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join General Hive";
      setJoinError(message);
      toast.error(message);
    } finally {
      setJoiningGeneralHive(false);
    }
  };

  const openTeam = (teamId: string) => {
    router.push({
      pathname: "/hives/[teamId]",
      params: { teamId },
    });
  };

  const openCreateTeam = () => {
    router.push("/hives/create");
  };

  const openCommunity = () => {
    router.push("/community");
  };

  const openSuggestions = () => {
    router.push("/suggestions");
  };

  const openAnnouncement = (id: string) => {
    router.push({
      pathname: "/community/[id]",
      params: { id },
    });
  };

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-3">
        <Text className="text-2xl font-bold text-slate-900">Hives</Text>
        <Text className="text-sm text-slate-500">
          Study groups, school cohorts, and shared learning rooms that feed straight into Compete.
        </Text>
        <View className="pt-2">
          <Button title="Create team" fullWidth={false} onPress={openCreateTeam} />
        </View>
      </View>

      {loading ? (
        <View className="gap-4 pb-8">
          <Skeleton.Card height={180} />
          <Skeleton.Card height={140} />
          <Skeleton.Card height={140} />
        </View>
      ) : (
        <View className="gap-5 pb-8">
          {showGeneralHiveJoinCard && generalHive?.team ? (
            <View
              className="overflow-hidden rounded-3xl bg-slate-900 p-5"
              style={{
                shadowColor: "#312e81",
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 5,
              }}
            >
              <View
                pointerEvents="none"
                className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/25"
              />
              <View className="flex-row items-start gap-4">
                <GradientIcon size={52} radius={18} from="#f59e0b" to="#f97316">
                  <Sparkles size={24} color="#ffffff" />
                </GradientIcon>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-amber-100">
                    General Hive
                  </Text>
                  <Text className="mt-1 text-xl font-extrabold text-white">
                    {generalHive.team.name}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-white/75">
                    {generalHive.team.description || "Join the platform-wide Hive and learn with the wider ChattaTutor swarm."}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-white/10 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-white/85">
                    {generalHive.memberCount} members
                  </Text>
                </View>
                {generalHive.pendingInvitation ? (
                  <View className="rounded-full bg-white/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white/85">
                      Invite waiting
                    </Text>
                  </View>
                ) : null}
              </View>

              {joinError ? (
                <Text className="mt-4 text-sm font-medium text-rose-200">{joinError}</Text>
              ) : null}

              <Pressable
                onPress={handleJoinGeneralHive}
                disabled={!generalHive.canJoin || joiningGeneralHive}
                className={`mt-5 h-12 items-center justify-center rounded-full ${
                  generalHive.canJoin && !joiningGeneralHive
                    ? "bg-white active:opacity-90"
                    : "bg-white/15"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    generalHive.canJoin && !joiningGeneralHive
                      ? "text-slate-900"
                      : "text-white/70"
                  }`}
                >
                  {joiningGeneralHive
                    ? "Joining..."
                    : generalHive.joinLabel || "Join General Hive"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {activeTeams.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Active hives
                </Text>
                <Text className="text-xs font-semibold text-slate-400">
                  {activeTeams.length} live
                </Text>
              </View>
              <View className="gap-3">
                {activeTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    generalHiveId={generalHive?.team?.id}
                    onPress={() => openTeam(team.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {archivedTeams.length > 0 ? (
            <View className="gap-3">
              <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <Text className="text-xs font-bold uppercase tracking-wide text-amber-700">
                  Archived hives
                </Text>
                <Text className="mt-2 text-sm leading-6 text-amber-900">
                  Your premium access ended, so these hives are archived for your account until you restore access.
                </Text>
              </View>
              <View className="gap-3">
                {archivedTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    generalHiveId={generalHive?.team?.id}
                    onPress={() => openTeam(team.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View className="gap-3">
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
                    Open the ideas board directly from Hives to sort requests, filter them, and upvote the ones you want shipped.
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-end gap-1">
                <Text className="text-sm font-semibold text-violet-700">Open suggestions</Text>
                <ArrowRight size={16} color="#6d28d9" />
              </View>
            </Pressable>

            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Community feed
              </Text>
              <Pressable onPress={openCommunity} hitSlop={8}>
                <Text className="text-xs font-semibold text-cyan-700">Open feed</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={openCommunity}
              className="overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-50/70 p-5 active:bg-cyan-100/70"
            >
              <View
                pointerEvents="none"
                className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-200/60"
              />
              <View className="flex-row items-start gap-4">
                <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
                  <MessageSquare size={22} color="#0891b2" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                    Announcements
                  </Text>
                  <Text className="mt-1 text-lg font-extrabold text-slate-900">
                    Community lives here now
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    Announcements and shared drops stay folded into Hives instead of coming back as a separate tab.
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-end gap-1">
                <Text className="text-sm font-semibold text-cyan-700">Browse posts</Text>
                <ArrowRight size={16} color="#0e7490" />
              </View>
            </Pressable>

            {communityPreview.length > 0 ? (
              <View className="gap-3">
                {communityPreview.map((announcement) => (
                  <Pressable
                    key={announcement.id}
                    onPress={() => openAnnouncement(announcement.id)}
                    className={`rounded-2xl border bg-white px-4 py-4 ${
                      announcement.pinned ? "border-amber-200" : "border-slate-200"
                    }`}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-900" numberOfLines={2}>
                          {announcement.title}
                        </Text>
                        <Text className="mt-1 text-xs text-slate-500">
                          {announcement.authorName} • {formatRelativeTime(announcement.createdAt)}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600" numberOfLines={3}>
                          {stripHtmlPreview(announcement.body) || "Open this update to read the full post."}
                        </Text>
                      </View>
                      {announcement.pinned ? (
                        <View className="rounded-full bg-amber-50 px-3 py-1.5">
                          <Text className="text-xs font-semibold text-amber-700">Pinned</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <Text className="text-sm font-semibold text-slate-900">No community posts yet</Text>
                <Text className="mt-1 text-sm leading-6 text-slate-500">
                  The read-first feed is wired now. Once announcements publish, they will surface here and in the full feed.
                </Text>
              </View>
            )}
          </View>

          {activeTeams.length === 0 && archivedTeams.length === 0 && !showGeneralHiveJoinCard ? (
            <EmptyState
              icon={UsersRound}
              title="No hives yet"
              message="Join the General Hive first, then create a team and start learning with other people."
              gradient={{ from: "#f59e0b", to: "#f97316" }}
            />
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}
