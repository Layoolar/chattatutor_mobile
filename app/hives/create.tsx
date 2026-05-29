import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Lock, Plus, ShieldCheck, UsersRound } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import {
  createTeam,
  getUserStudyPlans,
  type PassportCourse,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

function SettingChoice({
  icon: Icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-3xl border p-4 ${
        selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-2xl ${
            selected ? "bg-indigo-100" : "bg-slate-100"
          }`}
        >
          <Icon size={20} color={selected ? "#4f46e5" : "#475569"} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="text-base font-bold text-slate-900">{title}</Text>
            {selected ? (
              <View className="rounded-full bg-indigo-600 px-3 py-1.5">
                <Text className="text-xs font-semibold text-white">Selected</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-sm leading-6 text-slate-500">{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CreateHiveScreen() {
  const router = useRouter();
  const toast = useToast();
  const [courses, setCourses] = useState<PassportCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [allowMemberInvites, setAllowMemberInvites] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const plans = await getUserStudyPlans();
      const eligible = plans.filter((plan) => !plan.archivedAt);
      setCourses(eligible);
      setSelectedPdfId((current) => current ?? eligible[0]?.pdfId ?? null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load your courses";
      setCourses([]);
      setSelectedPdfId(null);
      setError(message);
    }
  }, []);

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

  const selectedCourse = useMemo(
    () => courses.find((course) => course.pdfId === selectedPdfId) ?? null,
    [courses, selectedPdfId],
  );
  const settingsIncomplete = isPublic == null || allowMemberInvites == null;
  const canSubmit = Boolean(name.trim()) && Boolean(selectedPdfId) && !settingsIncomplete;

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }

    if (!selectedPdfId) {
      toast.error("Choose a course for this team");
      return;
    }

    if (settingsIncomplete) {
      toast.error("Choose both team settings before creating the team");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        pdfId: selectedPdfId,
        settings: {
          isPublic,
          allowMemberInvites,
        },
      });
      toast.success(result.message || "Team created");
      router.replace({
        pathname: "/hives/[teamId]",
        params: { teamId: result.team.id },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create team");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-4">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/hives"))}
          className="self-start flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
        >
          <ChevronLeft size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-900">Back</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-2xl font-bold text-slate-900">Create team</Text>
          <Text className="text-sm leading-6 text-slate-500">
            Turn one of your existing courses into a Hive room with shared momentum, invites, and challenge pressure.
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="gap-4 pb-8">
          <Skeleton.Card height={120} />
          <Skeleton.Card height={220} />
          <Skeleton.Card height={120} />
        </View>
      ) : error ? (
        <EmptyState
          icon={UsersRound}
          title="Courses unavailable"
          message={error}
          action={{ label: "Retry", onPress: onRefresh }}
          secondary={{ label: "Back to Hives", onPress: () => router.replace("/(tabs)/hives") }}
          gradient={{ from: "#f59e0b", to: "#f97316" }}
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No eligible courses yet"
          message="Create a course first. Teams can only be created from courses that already have a study plan."
          action={{ label: "Upload a PDF", onPress: () => router.push("/upload") }}
          secondary={{ label: "Back to Hives", onPress: () => router.replace("/(tabs)/hives") }}
          gradient={{ from: "#f59e0b", to: "#f97316" }}
        />
      ) : (
        <View className="gap-5 pb-8">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 gap-4">
            <Input
              label="Team name"
              placeholder="e.g. Gen Z Biology Sprint"
              value={name}
              onChangeText={setName}
              maxLength={80}
            />

            <View className="gap-2">
              <Text className="font-medium text-slate-900">Description</Text>
              <TextInput
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="What is this team about?"
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                className="min-h-[112px] rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900"
              />
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Choose course
            </Text>
            <View className="gap-3">
              {courses.map((course) => {
                const selected = course.pdfId === selectedPdfId;

                return (
                  <Pressable
                    key={course.pdfId}
                    onPress={() => setSelectedPdfId(course.pdfId)}
                    className={`rounded-3xl border p-4 ${
                      selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
                          {course.title}
                        </Text>
                        <Text className="mt-1 text-sm text-slate-500">
                          Day {Math.max(1, course.currentDay + 1)} of {course.totalDays}
                        </Text>
                      </View>
                      {selected ? (
                        <View className="rounded-full bg-indigo-600 px-3 py-1.5">
                          <Text className="text-xs font-semibold text-white">Selected</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Team settings
              </Text>
              <Text className={`text-sm ${settingsIncomplete ? "text-amber-700" : "text-slate-500"}`}>
                Choose both settings before creating the team.
              </Text>
            </View>

            <View className="gap-3">
              <Text className="text-sm font-semibold text-slate-900">Privacy</Text>
              <SettingChoice
                icon={UsersRound}
                title="Public team"
                description="Anyone with access can join directly."
                selected={isPublic === true}
                onPress={() => setIsPublic(true)}
              />
              <SettingChoice
                icon={Lock}
                title="Invite-only team"
                description="Members join through generated invite links or direct invites."
                selected={isPublic === false}
                onPress={() => setIsPublic(false)}
              />
            </View>

            <View className="gap-3">
              <Text className="text-sm font-semibold text-slate-900">Invite permissions</Text>
              <SettingChoice
                icon={Plus}
                title="Members can invite"
                description="Trusted members can help grow the team with invite links."
                selected={allowMemberInvites === true}
                onPress={() => setAllowMemberInvites(true)}
              />
              <SettingChoice
                icon={ShieldCheck}
                title="Only admins can invite"
                description="Keep invites restricted to owners and admins only."
                selected={allowMemberInvites === false}
                onPress={() => setAllowMemberInvites(false)}
              />
            </View>
          </View>

          {selectedCourse ? (
            <View className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                Launching from
              </Text>
              <Text className="mt-2 text-base font-bold text-slate-900">{selectedCourse.title}</Text>
              <Text className="mt-1 text-sm text-slate-600">
                This team will track the same course path and leaderboard context.
              </Text>
            </View>
          ) : null}

          <Button title="Create team" onPress={handleCreate} loading={submitting} disabled={!canSubmit} />
        </View>
      )}
    </ScreenContainer>
  );
}