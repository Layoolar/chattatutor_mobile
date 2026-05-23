import { Text, View } from "react-native";

export function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
      <Text className="text-sm text-red-700">{message}</Text>
    </View>
  );
}
