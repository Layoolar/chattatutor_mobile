import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { LogOut } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 gap-1">
      <Text className="text-xs text-slate-500 uppercase tracking-wide">{label}</Text>
      <Text className="text-base text-slate-900 font-medium">{value || "—"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't refresh profile");
    } finally {
      setRefreshing(false);
    }
  }, [refresh, toast]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.replace("/landing");
  };

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>
        <Text className="text-sm text-slate-500">Account details and preferences.</Text>
      </View>

      <View className="gap-3">
        <Field label="Username" value={user?.username} />
        <Field label="Email" value={user?.email} />
        <Field label="Plan" value={user?.plan ?? "free"} />
        <Field
          label="Email verified"
          value={user?.emailVerified ? "Yes" : "No"}
        />
      </View>

      <View className="mt-8">
        <Button
          title="Sign out"
          variant="secondary"
          onPress={handleSignOut}
        />
      </View>

      <View className="flex-row items-center justify-center gap-2 mt-4 opacity-60">
        <LogOut size={14} color="#94a3b8" />
        <Text className="text-xs text-slate-400">You'll be returned to the landing screen.</Text>
      </View>
    </ScreenContainer>
  );
}
