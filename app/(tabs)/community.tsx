import { Text, View } from "react-native";
import { MessageSquare } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";

export default function CommunityScreen() {
  return (
    <ScreenContainer scroll>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Community</Text>
        <Text className="text-sm text-slate-500">
          Announcements, threaded replies, and the suggestions board.
        </Text>
      </View>

      <View className="bg-white rounded-2xl border border-slate-200 p-6 items-center gap-3 mt-6">
        <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center">
          <MessageSquare size={28} color="#4f46e5" />
        </View>
        <Text className="font-semibold text-slate-900">Coming soon</Text>
        <Text className="text-sm text-slate-600 text-center">
          The announcements feed and suggestions board will be ported here. The backend
          endpoints already exist — this screen just needs its UI built out.
        </Text>
      </View>
    </ScreenContainer>
  );
}
