import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function ScreenContainer({
  children,
  scroll = false,
  className = "",
  contentClassName = "",
  refreshing,
  onRefresh,
}: ScreenContainerProps) {
  const Body = (
    <View className={`flex-1 px-6 ${contentClassName}`}>{children}</View>
  );

  const useScroll = scroll || Boolean(onRefresh);

  return (
    <SafeAreaView className={`flex-1 bg-background ${className}`} edges={["top", "bottom"]}>
      {useScroll ? (
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor="#4f46e5"
                colors={["#4f46e5"]}
              />
            ) : undefined
          }
        >
          {Body}
        </ScrollView>
      ) : (
        Body
      )}
    </SafeAreaView>
  );
}
