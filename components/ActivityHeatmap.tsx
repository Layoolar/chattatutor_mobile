import { ScrollView, Text, View } from "react-native";

interface ActivityHeatmapProps {
  activityDates: string[];
  weeks?: number;
}

const CELL = 12;
const GAP = 3;
const ROW_HEIGHT = CELL + GAP;

function toLocalKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function ActivityHeatmap({ activityDates, weeks = 12 }: ActivityHeatmapProps) {
  const set = new Set(activityDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalKey(today);

  const totalDays = weeks * 7;
  const days: Date[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  // Pad so the grid starts on Monday (DOW: Mon=0)
  const firstDow = (days[0].getDay() + 6) % 7;
  const padded: (Date | null)[] = [...Array(firstDow).fill(null), ...days];
  const totalCols = Math.ceil(padded.length / 7);

  // Group days into columns (each column = a week)
  const columns: (Date | null)[][] = [];
  for (let c = 0; c < totalCols; c++) {
    columns.push(padded.slice(c * 7, c * 7 + 7));
  }

  // Month label per column when the month changes
  let lastMonth = -1;
  const monthLabels: (string | null)[] = columns.map((col) => {
    const firstReal = col.find((d): d is Date => d !== null);
    if (!firstReal) return null;
    if (firstReal.getMonth() !== lastMonth) {
      lastMonth = firstReal.getMonth();
      return firstReal.toLocaleString("default", { month: "short" });
    }
    return null;
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View className="flex-row" style={{ gap: GAP, marginBottom: 4 }}>
          {monthLabels.map((label, i) => (
            <View key={`mlabel-${i}`} style={{ width: CELL }}>
              {label ? (
                <Text className="text-[10px] font-medium text-slate-400">
                  {label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <View className="flex-row" style={{ gap: GAP }}>
          {columns.map((col, ci) => (
            <View key={`col-${ci}`} style={{ gap: GAP }}>
              {col.map((d, ri) => {
                if (!d)
                  return (
                    <View
                      key={`pad-${ci}-${ri}`}
                      style={{ width: CELL, height: CELL }}
                    />
                  );
                const key = toLocalKey(d);
                const active = set.has(key);
                const isToday = key === todayKey;
                return (
                  <View
                    key={key}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      backgroundColor: active ? "#4f46e5" : "#e2e8f0",
                      borderWidth: isToday ? 1 : 0,
                      borderColor: "#0f172a",
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <View className="flex-row items-center gap-2 mt-3">
          <Text className="text-[10px] text-slate-500">Less</Text>
          <View
            style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#e2e8f0" }}
          />
          <View
            style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#c7d2fe" }}
          />
          <View
            style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#4f46e5" }}
          />
          <Text className="text-[10px] text-slate-500">More</Text>
          {/* row height ref to keep tree-shaker honest */}
          <View style={{ height: ROW_HEIGHT, width: 0 }} />
        </View>
      </View>
    </ScrollView>
  );
}

export default ActivityHeatmap;
