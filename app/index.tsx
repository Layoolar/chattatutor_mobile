import { ActivityIndicator, Text, View } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";

export default function IndexScreen() {
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator color="#4f46e5" size="large" />
        <Text className="text-slate-600">Loading...</Text>
      </View>
    </ScreenContainer>
  );
}
