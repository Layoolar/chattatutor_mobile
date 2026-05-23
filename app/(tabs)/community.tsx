import { MessageSquare } from "lucide-react-native";
import { Text, View } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";

export default function CommunityScreen() {
  return (
    <ScreenContainer scroll>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Community</Text>
        <Text className="text-sm text-slate-500">
          Announcements, threaded replies, and the suggestions board.
        </Text>
      </View>

      <EmptyState
        icon={MessageSquare}
        title="Coming soon"
        message="The announcements feed and suggestions board land in Phase 5. Backend endpoints are already in place."
        gradient={{ from: "#06b6d4", to: "#3b82f6" }}
      />
    </ScreenContainer>
  );
}
