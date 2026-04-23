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
  formatValue: (v: VitalReading["value"], tempUnit: "F" | "C") => string;
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
    formatValue: (v) => `${v}%`,
  },
  {
    type: "BloodPressure",
    label: "Blood Pressure",
    icon: "pulse-outline",
    color: "#FF375F",
    unit: () => "mmHg",
    formatValue: (v) => {
      if (typeof v === "object" && v !== null && "systolic" in v) {
        return `${(v as any).systolic}/${(v as any).diastolic}`;
      }
      return String(v);
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
    formatValue: (v, u) => `${v}°${u}`,
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
    formatValue: (v, u) => `${v}°${u}`,
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
  if (range === "1W") return `${d.getDate()}`;
  return `${month} ${d.getDate()}`;
}

function formatFullDateTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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

  const chartData = useMemo(() => {
    if (metric.isBP) {
      return {
        systolic: readings.map(r => ({
          value: typeof r.value === "object" ? (r.value as any).systolic : 0,
          label: formatXLabel(r.timestamp, range),
          timestamp: r.timestamp,
        })),
        diastolic: readings.map(r => ({
          value: typeof r.value === "object" ? (r.value as any).diastolic : 0,
          label: formatXLabel(r.timestamp, range),
          timestamp: r.timestamp,
        })),
      };
    }
    return readings.map(r => ({
      value: typeof r.value === "number" ? r.value : 0,
      label: formatXLabel(r.timestamp, range),
      timestamp: r.timestamp,
    }));
  }, [readings, range, metric.isBP]);

  const latest = readings[0];
  const latestDisplay = latest
    ? metric.formatValue(latest.value, tempUnit)
    : null;

  const isOutOfRange = (v: number) =>
    (normalMin !== undefined && v < normalMin) ||
    (normalMax !== undefined && v > normalMax);

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${metric.color}18` }]}>
          <Ionicons name={metric.icon as any} size={20} color={metric.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.metricLabel, { color: colors.text }]}>{metric.label}</Text>
          {latestDisplay && (
            <Text style={[styles.metricLatest, { color: metric.color }]}>
              Latest: {latestDisplay}
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
          <Text style={[styles.bpChartLabel, { color: colors.textSecondary }]}>Systolic</Text>
          <VitalsLineChart
            data={(chartData as any).systolic}
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
            data={(chartData as any).diastolic}
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
      ) : (
        <VitalsLineChart
          data={chartData as any}
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
            const display = metric.formatValue(r.value, tempUnit);
            let outOfRange = false;
            if (!metric.isBP && typeof r.value === "number") {
              outOfRange = isOutOfRange(r.value);
            } else if (metric.isBP && typeof r.value === "object") {
              const bp = r.value as any;
              outOfRange = bp.systolic > 120 || bp.systolic < 90 || bp.diastolic > 80 || bp.diastolic < 60;
            }
            return (
              <Pressable
                key={r.id}
                onLongPress={() => {
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
                style={[styles.readingRow, { borderBottomColor: colors.borderLight }]}
              >
                <View style={[styles.readingDot, { backgroundColor: outOfRange ? "#FF6B6B" : metric.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.readingValue, { color: outOfRange ? "#FF6B6B" : colors.text }]}>
                    {display}
                    {outOfRange && (
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular" }}> ⚠️ out of range</Text>
                    )}
                  </Text>
                  <Text style={[styles.readingTime, { color: colors.textTertiary }]}>
                    {formatFullDateTime(r.timestamp)}
                    {r.note ? ` · ${r.note}` : ""}
                  </Text>
                </View>
              </Pressable>
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

  const cutoff = useMemo(() => {
    const days = RANGES.find(r => r.key === range)!.days;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }, [range]);

  const filteredByType = useCallback(
    (type: VitalType) =>
      vitalReadings
        .filter(r => r.type === type && new Date(r.timestamp) >= cutoff)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [vitalReadings, cutoff]
  );

  const handleDelete = useCallback((id: string) => {
    deleteVitalReading(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [deleteVitalReading]);

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
                onPress={() => {
                  Haptics.selectionAsync();
                  setRange(r.key);
                }}
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
            For informational tracking only. Consult a healthcare provider for medical advice. Long-press any reading to delete it.
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
