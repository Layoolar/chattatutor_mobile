import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { openWebAppFlow } from "@/lib/web-links";

type WebFlowRedirectProps = {
  path: string;
  query?: Record<string, string | undefined>;
  message?: string;
};

export function WebFlowRedirect({
  path,
  query,
  message = "Opening in your browser…",
}: WebFlowRedirectProps) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void openWebAppFlow(path, query);
  }, [path, query]);

  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <ActivityIndicator color="#4f46e5" size="large" />
      <Text className="text-center text-base text-slate-600">{message}</Text>
      <Text className="text-center text-sm text-slate-500">
        Finish this step on the web, then return to the ChattaTutor app.
      </Text>
    </View>
  );
}
