import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
}

export function ScreenContainer({
  children,
  scroll = false,
  className = "",
  contentClassName = "",
}: ScreenContainerProps) {
  const Body = (
    <View className={`flex-1 px-6 ${contentClassName}`}>{children}</View>
  );

  return (
    <SafeAreaView className={`flex-1 bg-background ${className}`} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {Body}
        </ScrollView>
      ) : (
        Body
      )}
    </SafeAreaView>
  );
}
