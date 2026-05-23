import { Users } from "lucide-react-native";
import { Text, View } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";

export default function HivesScreen() {
  return (
    <ScreenContainer scroll>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Hives</Text>
        <Text className="text-sm text-slate-500">
          Your teams, leaderboards, and 1v1 challenges.
        </Text>
      </View>

      <EmptyState
        icon={Users}
        title="Coming soon"
        message="Teams, leaderboards, and challenges land in Phase 5. Backend endpoints are already in place."
        gradient={{ from: "#f59e0b", to: "#f97316" }}
      />
    </ScreenContainer>
  );
}
