import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { BookOpen, Upload } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/lib/toast";
import { getMyPDFs, type PDF } from "@/lib/api";

export default function LessonsScreen() {
  const toast = useToast();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setPdfs(await getMyPDFs());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load lessons");
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <ScreenContainer scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Your courses</Text>
        <Text className="text-sm text-slate-500">
          Generated from your uploaded PDFs.
        </Text>
      </View>

      {loading ? (
        <View className="gap-3">
          <Skeleton.Card />
          <Skeleton.Card />
          <Skeleton.Card />
        </View>
      ) : pdfs.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No courses yet"
          message="Upload a PDF to generate your first lessons, flashcards, and quizzes."
          action={{
            label: "Upload a PDF",
            onPress: () => toast.info("PDF upload is coming in Phase 1."),
          }}
        />
      ) : (
        <View className="gap-3">
          {pdfs.map((pdf) => (
            <View
              key={pdf.id}
              className="flex-row items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4"
            >
              <View className="w-10 h-10 rounded-xl bg-indigo-100 items-center justify-center">
                <BookOpen size={20} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-slate-900" numberOfLines={1}>
                  {pdf.originalName || pdf.fileName}
                </Text>
                <Text className="text-xs text-slate-500">
                  Uploaded {new Date(pdf.uploadedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
