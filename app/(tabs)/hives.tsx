import { Text, View } from "react-native";
import { Users } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";

export default function HivesScreen() {
  return (
    <ScreenContainer scroll>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Hives</Text>
        <Text className="text-sm text-slate-500">
          Your teams, leaderboards, and 1v1 challenges.
        </Text>
      </View>

      <View className="bg-white rounded-2xl border border-slate-200 p-6 items-center gap-3 mt-6">
        <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center">
          <Users size={28} color="#4f46e5" />
        </View>
        <Text className="font-semibold text-slate-900">Coming soon</Text>
        <Text className="text-sm text-slate-600 text-center">
          Team list, member progress, invitations, and the Knowmad leaderboard will live
          here. Backend support is already in place.
        </Text>
      </View>
    </ScreenContainer>
  );
}
