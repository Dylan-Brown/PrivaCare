import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, VitalReading, VitalType } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { VitalsLineChart } from "@/components/vitals/VitalsLineChart";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - 32;

type RangeKey = "1D" | "1W" | "1M" | "3M" | "12M";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "1D", label: "1D", days: 1 },
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "12M", label: "12M", days: 365 },
];

type ScalarReading = { id: string; type: Exclude<VitalType, "BloodPressure">; value: number; unit: string; timestamp: string; note?: string };
type BPReading = { id: string; type: "BloodPressure"; value: { systolic: number; diastolic: number }; unit: string; timestamp: string; note?: string };

function isScalarReading(r: VitalReading): r is ScalarReading {
  return r.type !== "BloodPressure" && typeof r.value === "number";
}
function isBPReading(r: VitalReading): r is BPReading {
  return r.type === "BloodPressure" && typeof r.value === "object" && r.value !== null;
}

type MetricDef = {
  type: VitalType;
  label: string;
  icon: string;
  color: string;
  normalMin?: number;
  normalMinC?: number;
  normalMax?: number;
  normalMaxC?: number;
  yMin?: number;
  yMax?: number;
  yMinC?: number;
  yMaxC?: number;
  unit: (tempUnit: "F" | "C") => string;
  formatValue: (r: VitalReading, tempUnit: "F" | "C") => string;
  isBP?: boolean;
};

const METRICS: MetricDef[] = [
  {
    type: "SpO2",
    label: "Blood Oxygen (SpO₂)",
    icon: "water-outline",
    color: "#007AFF",
    normalMin: 95,
    normalMax: 100,
    yMin: 85,
    yMax: 100,
    unit: () => "%",
    formatValue: (r) => {
      if (isScalarReading(r)) return `${r.value}%`;
      return "";
    },
  },
  {
    type: "BloodPressure",
    label: "Blood Pressure",
    icon: "pulse-outline",
    color: "#FF375F",
    unit: () => "mmHg",
    formatValue: (r) => {
      if (isBPReading(r)) return `${r.value.systolic}/${r.value.diastolic} mmHg`;
      return "";
    },
    isBP: true,
  },
  {
    type: "TempOral",
    label: "Oral Temperature",
    icon: "thermometer-outline",
    color: "#FF9F0A",
    normalMin: 97.6,
    normalMax: 99.6,
    normalMinC: 36.4,
    normalMaxC: 37.6,
    yMin: 95,
    yMax: 104,
    yMinC: 35,
    yMaxC: 40,
    unit: (u) => `°${u}`,
    formatValue: (r, u) => {
      if (isScalarReading(r)) return `${r.value}°${u}`;
      return "";
    },
  },
  {
    type: "TempForehead",
    label: "Forehead Temperature",
    icon: "thermometer-outline",
    color: "#AF52DE",
    normalMin: 97.9,
    normalMax: 99.0,
    normalMinC: 36.6,
    normalMaxC: 37.2,
    yMin: 95,
    yMax: 104,
    yMinC: 35,
    yMaxC: 40,
    unit: (u) => `°${u}`,
    formatValue: (r, u) => {
      if (isScalarReading(r)) return `${r.value}°${u}`;
      return "";
    },
  },
];

function formatXLabel(ts: string, range: RangeKey): string {
  const d = new Date(ts);
  if (range === "1D") {
    const h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 === 0 ? 12 : h % 12}${ampm}`;
  }
  const month = d.toLocaleString("default", { month: "short" });
  return `${month} ${d.getDate()}`;
}

function formatWindowLabel(range: RangeKey, windowOffset: number): string {
  const days = RANGES.find(r => r.key === range)!.days;
  const end = new Date(Date.now() - windowOffset * days * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  if (windowOffset === 0) {
    if (range === "1D") return "Today";
    if (range === "1W") return "Past 7 days";
    if (range === "1M") return "Past 30 days";
    if (range === "3M") return "Past 90 days";
    return "Past 12 months";
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (range === "1D") {
    return end.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatFullDateTime(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isReadingOutOfRange(r: VitalReading, normalMin?: number, normalMax?: number): boolean {
  if (isScalarReading(r)) {
    return (normalMin !== undefined && r.value < normalMin) ||
           (normalMax !== undefined && r.value > normalMax);
  }
  if (isBPReading(r)) {
    return r.value.systolic > 120 || r.value.systolic < 90 ||
           r.value.diastolic > 80 || r.value.diastolic < 60;
  }
  return false;
}

function MetricSection({
  metric,
  readings,
  range,
  tempUnit,
  onDelete,
  colors,
}: {
  metric: MetricDef;
  readings: VitalReading[];
  range: RangeKey;
  tempUnit: "F" | "C";
  onDelete: (id: string) => void;
  colors: any;
}) {
  const isTemp = metric.type === "TempOral" || metric.type === "TempForehead";
  const normalMin = isTemp && tempUnit === "C" ? metric.normalMinC : metric.normalMin;
  const normalMax = isTemp && tempUnit === "C" ? metric.normalMaxC : metric.normalMax;
  const yMin = isTemp && tempUnit === "C" ? metric.yMinC : metric.yMin;
  const yMax = isTemp && tempUnit === "C" ? metric.yMaxC : metric.yMax;

  const latest = readings[0];

  const scalarData = useMemo(() => {
    if (metric.isBP) return null;
    return readings.filter(isScalarReading).map(r => ({
      value: r.value,
      label: formatXLabel(r.timestamp, range),
      timestamp: r.timestamp,
    }));
  }, [readings, range, metric.isBP]);

  const systolicData = useMemo(() => {
    if (!metric.isBP) return null;
    return readings.filter(isBPReading).map(r => ({
      value: r.value.systolic,
      label: formatXLabel(r.timestamp, range),
      timestamp: r.timestamp,
    }));
  }, [readings, range, metric.isBP]);

  const diastolicData = useMemo(() => {
    if (!metric.isBP) return null;
    return readings.filter(isBPReading).map(r => ({
      value: r.value.diastolic,
      label: formatXLabel(r.timestamp, range),
      timestamp: r.timestamp,
    }));
  }, [readings, range, metric.isBP]);

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${metric.color}18` }]}>
          <Ionicons name={metric.icon as any} size={20} color={metric.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.metricLabel, { color: colors.text }]}>{metric.label}</Text>
          {latest && (
            <Text style={[styles.metricLatest, { color: metric.color }]}>
              Latest: {metric.formatValue(latest, tempUnit)}
            </Text>
          )}
        </View>
        {normalMin !== undefined && normalMax !== undefined && (
          <View style={[styles.normalBadge, { backgroundColor: `${metric.color}12` }]}>
            <Text style={[styles.normalBadgeText, { color: metric.color }]}>
              {`${normalMin}–${normalMax}${metric.unit(tempUnit)}`}
            </Text>
          </View>
        )}
      </View>

      {readings.length === 0 ? (
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>No readings in this period</Text>
        </View>
      ) : metric.isBP ? (
        <>
          {systolicData && systolicData.length > 0 && (
            <>
              <Text style={[styles.bpChartLabel, { color: colors.textSecondary }]}>Systolic</Text>
              <VitalsLineChart
                data={systolicData}
                width={CHART_WIDTH - 32}
                height={140}
                normalMin={90}
                normalMax={120}
                yMin={60}
                yMax={180}
                color="#FF375F"
                colors={colors}
                unit="mmHg"
              />
              <Text style={[styles.bpChartLabel, { color: colors.textSecondary, marginTop: 8 }]}>Diastolic</Text>
              <VitalsLineChart
                data={diastolicData ?? []}
                width={CHART_WIDTH - 32}
                height={140}
                normalMin={60}
                normalMax={80}
                yMin={40}
                yMax={120}
                color="#FF6B6B"
                colors={colors}
                unit="mmHg"
              />
            </>
          )}
        </>
      ) : (
        <VitalsLineChart
          data={scalarData ?? []}
          width={CHART_WIDTH - 32}
          height={160}
          normalMin={normalMin}
          normalMax={normalMax}
          yMin={yMin}
          yMax={yMax}
          color={metric.color}
          colors={colors}
          unit={metric.unit(tempUnit)}
        />
      )}

      {readings.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.readingsTitle, { color: colors.textSecondary }]}>Readings</Text>
          {readings.slice(0, 10).map(r => {
            const display = metric.formatValue(r, tempUnit);
            const outOfRange = isReadingOutOfRange(r, normalMin, normalMax);
            return (
              <View
                key={r.id}
                style={[styles.readingRow, { borderBottomColor: colors.borderLight }]}
              >
                <View style={[styles.readingDot, { backgroundColor: outOfRange ? "#FF6B6B" : metric.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.readingValue, { color: outOfRange ? "#FF6B6B" : colors.text }]}>
                    {display}
                    {outOfRange ? "  ⚠ out of range" : ""}
                  </Text>
                  <Text style={[styles.readingTime, { color: colors.textTertiary }]}>
                    {formatFullDateTime(r.timestamp)}
                    {r.note ? `  ·  ${r.note}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(
                      "Delete Reading",
                      `Delete this reading (${display})?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => onDelete(r.id) },
                      ]
                    );
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            );
          })}
          {readings.length > 10 && (
            <Text style={[styles.moreText, { color: colors.textTertiary }]}>
              +{readings.length - 10} more readings
            </Text>
          )}
        </>
      )}
    </View>
  );
}

export default function VitalsHistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { vitalReadings, deleteVitalReading, tempUnit } = useApp();
  const [range, setRange] = useState<RangeKey>("1W");
  const [windowOffset, setWindowOffset] = useState(0);

  const { windowStart, windowEnd } = useMemo(() => {
    const days = RANGES.find(r => r.key === range)!.days;
    const end = new Date(Date.now() - windowOffset * days * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return { windowStart: start, windowEnd: end };
  }, [range, windowOffset]);

  const filteredByType = useCallback(
    (type: VitalType) =>
      vitalReadings
        .filter(r => r.type === type &&
          new Date(r.timestamp) >= windowStart &&
          new Date(r.timestamp) <= windowEnd)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [vitalReadings, windowStart, windowEnd]
  );

  const handleDelete = useCallback((id: string) => {
    deleteVitalReading(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [deleteVitalReading]);

  const handleRangeChange = (newRange: RangeKey) => {
    Haptics.selectionAsync();
    setRange(newRange);
    setWindowOffset(0);
  };

  const canGoForward = windowOffset > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Vital Signs History",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/vitals-log")}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingRight: 4 })}
            >
              <Ionicons name="add-circle" size={26} color={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.rangeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {RANGES.map(r => {
            const active = range === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => handleRangeChange(r.key)}
                style={[
                  styles.rangeBtn,
                  { backgroundColor: active ? colors.tint : "transparent" },
                ]}
              >
                <Text style={[styles.rangeBtnText, { color: active ? "#fff" : colors.textSecondary }]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.windowNav}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setWindowOffset(prev => prev + 1);
            }}
            style={styles.windowArrow}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.windowLabel, { color: colors.text }]}>
            {formatWindowLabel(range, windowOffset)}
          </Text>
          <Pressable
            onPress={() => {
              if (!canGoForward) return;
              Haptics.selectionAsync();
              setWindowOffset(prev => prev - 1);
            }}
            style={[styles.windowArrow, { opacity: canGoForward ? 1 : 0.3 }]}
            disabled={!canGoForward}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        {METRICS.map(metric => (
          <MetricSection
            key={metric.type}
            metric={metric}
            readings={filteredByType(metric.type)}
            range={range}
            tempUnit={tempUnit}
            onDelete={handleDelete}
            colors={colors}
          />
        ))}

        <View style={[styles.disclaimerCard, { backgroundColor: colors.amberLight, borderColor: `${colors.amber}30` }]}>
          <Ionicons name="warning-outline" size={14} color={colors.amber} />
          <Text style={[styles.disclaimerText, { color: colors.amber }]}>
            For informational tracking only. Consult a healthcare provider for medical advice.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },

  rangeRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
  },
  rangeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  windowNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: -4,
  },
  windowArrow: { padding: 8 },
  windowLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },

  metricCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  metricHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metricLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  metricLatest: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },

  normalBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  normalBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  emptyChart: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChartText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  bpChartLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: -8 },

  divider: { height: StyleSheet.hairlineWidth },
  readingsTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },

  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  readingDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  readingValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  readingTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  moreText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingTop: 4 },

  disclaimerCard: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "flex-start",
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    flex: 1,
  },
});
