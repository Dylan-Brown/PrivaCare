import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { todayString, toDateString } from "@/utils/scheduleCompute";
import {
  buildMedAdherence,
  buildSkincareAdherence,
  computeMonthDayAdherence,
  AdherenceItem,
  DayAdherence,
} from "@/utils/adherence";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48) / 7);

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Calendar ──────────────────────────────────────────────────────────────

function MonthCalendar({
  year, month, dayAdherence, todayStr, accentColor,
}: {
  year: number; month: number; dayAdherence: DayAdherence[];
  todayStr: string; accentColor: string;
}) {
  const { colors } = useTheme();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (DayAdherence | null)[] = [
    ...Array(firstDay).fill(null),
    ...dayAdherence,
  ];

  const getDayStyle = (d: DayAdherence) => {
    if (d.isFuture) return { bg: colors.borderLight, text: colors.textTertiary };
    if (d.expected === 0) return { bg: "transparent", text: colors.textTertiary };
    if (d.completed === d.expected) return { bg: accentColor, text: "#fff" };
    if (d.completed > 0) return { bg: "#FF9F0A", text: "#fff" };
    return { bg: `${colors.danger}25`, text: colors.danger };
  };

  return (
    <View style={styles.calendarGrid}>
      {DAY_LABELS.map(d => (
        <View key={d} style={[styles.calCell, { width: CELL_SIZE }]}>
          <Text style={[styles.calDayLabel, { color: colors.textTertiary }]}>{d}</Text>
        </View>
      ))}
      {cells.map((cell, i) => {
        if (!cell) return <View key={`e${i}`} style={[styles.calCell, { width: CELL_SIZE }]} />;
        const dayNum = i - firstDay + 1;
        const style = getDayStyle(cell);
        const isToday = cell.date === todayStr;
        return (
          <View key={cell.date} style={[styles.calCell, { width: CELL_SIZE }]}>
            <View
              style={[
                styles.calDayCircle,
                { backgroundColor: style.bg, width: CELL_SIZE - 6, height: CELL_SIZE - 6 },
                isToday && { borderWidth: 2, borderColor: accentColor },
              ]}
            >
              <Text style={[styles.calDayNum, { color: style.text }]}>{dayNum}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Swipeable Calendar Header ─────────────────────────────────────────────

function CalendarPager({
  items, dayLogs, todayStr, accentColor,
}: {
  items: Array<{ id: string; schedule: any }>;
  dayLogs: Record<string, any>;
  todayStr: string;
  accentColor: string;
}) {
  const { colors } = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const dayAdherence = useMemo(
    () => computeMonthDayAdherence(items, dayLogs, year, month, todayStr),
    [items, dayLogs, year, month, todayStr],
  );

  const goPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const goNext = () => {
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    if (year > thisYear || (year === thisYear && month >= thisMonth)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.calHeader}>
        <Pressable onPress={goPrev} style={styles.calNavBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.calMonthLabel, { color: colors.text }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          onPress={goNext}
          style={[styles.calNavBtn, { opacity: isCurrentMonth ? 0.3 : 1 }]}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>
      <MonthCalendar
        year={year}
        month={month}
        dayAdherence={dayAdherence}
        todayStr={todayStr}
        accentColor={accentColor}
      />
      <View style={styles.legend}>
        {[
          { color: accentColor, label: "All done" },
          { color: "#FF9F0A", label: "Partial" },
          { color: "#FF6B6B40", label: "Missed" },
        ].map(l => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Adherence Row ─────────────────────────────────────────────────────────

function AdherenceRow({ item, accentColor }: { item: AdherenceItem; accentColor: string }) {
  const { colors } = useTheme();
  const pct = item.adherencePct;
  const barFill = pct / 100;

  return (
    <View style={[styles.adhRow, { borderBottomColor: colors.borderLight }]}>
      <View style={styles.adhTop}>
        <View style={[styles.adhDot, { backgroundColor: item.color }]} />
        <Text style={[styles.adhName, { color: colors.text }]} numberOfLines={1}>
          {item.itemName}
        </Text>
        <Text style={[styles.adhPct, { color: pct >= 80 ? accentColor : pct >= 50 ? "#FF9F0A" : colors.danger }]}>
          {pct}%
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${pct}%` as any,
              backgroundColor: pct >= 80 ? accentColor : pct >= 50 ? "#FF9F0A" : colors.danger,
            },
          ]}
        />
      </View>
      <View style={styles.adhMeta}>
        <Text style={[styles.adhMetaText, { color: colors.textSecondary }]}>
          {item.completedDays}/{item.expectedDays} days
        </Text>
        <Text style={[styles.adhMetaText, { color: colors.textSecondary }]}>
          {item.longestStreak}d streak
        </Text>
        {item.missedDays > 0 && (
          <Text style={[styles.adhMetaText, { color: colors.textTertiary }]}>
            {item.missedDays} missed
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function AdherenceScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { medications, skincareProducts, dayLogs } = useApp();

  const [activeTab, setActiveTab] = useState<"medications" | "skincare">("medications");
  const todayStr = todayString();

  const medItems = useMemo(
    () => medications.filter(m => m.status === "active" && !m.schedule.asNeeded),
    [medications],
  );
  const skincareItems = useMemo(
    () => skincareProducts.filter(p => p.status !== "history" && !p.schedule.asNeeded),
    [skincareProducts],
  );

  const medAdherence = useMemo(
    () => buildMedAdherence(medications, dayLogs, todayStr),
    [medications, dayLogs, todayStr],
  );
  const skincareAdherence = useMemo(
    () => buildSkincareAdherence(skincareProducts, dayLogs, todayStr),
    [skincareProducts, dayLogs, todayStr],
  );

  const currentItems = activeTab === "medications" ? medItems : skincareItems;
  const currentAdherence = activeTab === "medications" ? medAdherence : skincareAdherence;
  const accentColor = activeTab === "medications" ? colors.tint : "#A78BFA";

  const overallPct =
    currentAdherence.length === 0
      ? null
      : Math.round(
          currentAdherence.reduce((s, a) => s + a.adherencePct, 0) /
          currentAdherence.length,
        );

  return (
    <>
      <Stack.Screen options={{ title: "How Am I Doing?", presentation: "modal" }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Bar */}
        <View style={[styles.segmentControl, { backgroundColor: colors.borderLight }]}>
          {(["medications", "skincare"] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.segment,
                activeTab === tab && [styles.segmentActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <Text style={[styles.segmentText, { color: activeTab === tab ? colors.text : colors.textSecondary }]}>
                {tab === "medications" ? "Medications" : "Skincare"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Overall badge */}
        {overallPct !== null && (
          <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.overallCircle, { borderColor: accentColor }]}>
              <Text style={[styles.overallPct, { color: accentColor }]}>{overallPct}%</Text>
              <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>overall</Text>
            </View>
            <View style={styles.overallInfo}>
              <Text style={[styles.overallTitle, { color: colors.text }]}>
                {overallPct >= 90 ? "Outstanding!" : overallPct >= 75 ? "Well done!" : overallPct >= 50 ? "Keep going" : "Room to grow"}
              </Text>
              <Text style={[styles.overallSub, { color: colors.textSecondary }]}>
                {currentAdherence.length} item{currentAdherence.length !== 1 ? "s" : ""} tracked · across all scheduled days
              </Text>
            </View>
          </View>
        )}

        {/* Calendar */}
        {currentItems.length > 0 ? (
          <CalendarPager
            items={currentItems}
            dayLogs={dayLogs}
            todayStr={todayStr}
            accentColor={accentColor}
          />
        ) : null}

        {/* Per-item adherence list */}
        {currentAdherence.length > 0 ? (
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
              {activeTab === "medications" ? "MEDICATION BREAKDOWN" : "SKINCARE BREAKDOWN"}
            </Text>
            {currentAdherence.map(item => (
              <AdherenceRow key={item.itemId} item={item} accentColor={accentColor} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${accentColor}18` }]}>
              <Ionicons name="bar-chart-outline" size={36} color={accentColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No scheduled items</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add {activeTab === "medications" ? "medications" : "skincare products"} with a schedule to see adherence data here.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },

  segmentControl: {
    flexDirection: "row", borderRadius: 12, padding: 3,
  },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  segmentActive: {
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  segmentText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  overallCard: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  overallCircle: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 3,
    alignItems: "center", justifyContent: "center",
  },
  overallPct: { fontSize: 20, fontFamily: "Inter_700Bold" },
  overallLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  overallInfo: { flex: 1, gap: 4 },
  overallTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  overallSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  calendarCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  calHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  calNavBtn: { padding: 6 },
  calMonthLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  calendarGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 0,
  },
  calCell: {
    alignItems: "center", justifyContent: "center", paddingVertical: 3,
  },
  calDayLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  calDayCircle: {
    borderRadius: 100, alignItems: "center", justifyContent: "center",
  },
  calDayNum: { fontSize: 13, fontFamily: "Inter_500Medium" },
  legend: {
    flexDirection: "row", justifyContent: "center", gap: 20, paddingTop: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  listCard: {
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  listTitle: {
    fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5,
    marginBottom: 12,
  },

  adhRow: {
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  adhTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  adhDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  adhName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  adhPct: { fontSize: 15, fontFamily: "Inter_700Bold" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  adhMeta: { flexDirection: "row", gap: 12 },
  adhMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 20 },
});
