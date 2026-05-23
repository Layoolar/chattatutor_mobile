import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BookOpen } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { getMyPDFs, type PDF } from "@/lib/api";

export default function LessonsScreen() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPdfs(await getMyPDFs());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lessons");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScreenContainer scroll>
      <View className="pt-6 pb-4 gap-1">
        <Text className="text-2xl font-bold text-slate-900">Your courses</Text>
        <Text className="text-sm text-slate-500">
          Generated from your uploaded PDFs.
        </Text>
      </View>

      {loading && (
        <View className="py-12 items-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      )}

      {error && !loading && (
        <View className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      )}

      {!loading && !error && pdfs.length === 0 && (
        <View className="bg-white rounded-2xl border border-slate-200 p-6 items-center gap-3 mt-6">
          <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center">
            <BookOpen size={28} color="#4f46e5" />
          </View>
          <Text className="font-semibold text-slate-900">No courses yet</Text>
          <Text className="text-sm text-slate-600 text-center">
            Upload a PDF from the web app to generate your first course. PDF upload
            from mobile is coming in a future scaffold pass.
          </Text>
        </View>
      )}

      {!loading && !error && pdfs.length > 0 && (
        <View className="gap-3">
          {pdfs.map((pdf) => (
            <View key={pdf.id} className="bg-white rounded-2xl border border-slate-200 p-4 gap-1">
              <Text className="font-semibold text-slate-900" numberOfLines={1}>
                {pdf.originalName || pdf.fileName}
              </Text>
              <Text className="text-xs text-slate-500">
                Uploaded {new Date(pdf.uploadedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
