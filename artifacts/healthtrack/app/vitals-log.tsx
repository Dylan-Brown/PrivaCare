import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, VitalType } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

type MetricConfig = {
  type: VitalType;
  label: string;
  icon: string;
  color: string;
  unit: (tempUnit: "F" | "C") => string;
  normalLabel: (tempUnit: "F" | "C") => string;
  placeholder: (tempUnit: "F" | "C") => string;
  isBP?: boolean;
};

const METRICS: MetricConfig[] = [
  {
    type: "SpO2",
    label: "Blood Oxygen (SpO₂)",
    icon: "water-outline",
    color: "#007AFF",
    unit: () => "%",
    normalLabel: () => "Normal: 95–100%",
    placeholder: () => "e.g. 98",
  },
  {
    type: "BloodPressure",
    label: "Blood Pressure",
    icon: "pulse-outline",
    color: "#FF375F",
    unit: () => "mmHg",
    normalLabel: () => "Normal: 90–120 / 60–80 mmHg",
    placeholder: () => "Systolic (e.g. 120)",
    isBP: true,
  },
  {
    type: "TempOral",
    label: "Temperature (Oral)",
    icon: "thermometer-outline",
    color: "#FF9F0A",
    unit: (u) => `°${u}`,
    normalLabel: (u) => u === "F" ? "Normal: 97.6–99.6°F" : "Normal: 36.4–37.6°C",
    placeholder: (u) => u === "F" ? "e.g. 98.6" : "e.g. 37.0",
  },
  {
    type: "TempForehead",
    label: "Temperature (Forehead)",
    icon: "thermometer-outline",
    color: "#AF52DE",
    unit: (u) => `°${u}`,
    normalLabel: (u) => u === "F" ? "Normal: 97.9–99.0°F" : "Normal: 36.6–37.2°C",
    placeholder: (u) => u === "F" ? "e.g. 98.4" : "e.g. 36.9",
  },
];

function nowDateStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowTimeStr(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const iso = `${dateStr.trim()}T${timeStr.trim()}:00`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export default function VitalsLogScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addVitalReading, tempUnit } = useApp();

  const [selectedType, setSelectedType] = useState<VitalType>("SpO2");
  const [value, setValue] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [note, setNote] = useState("");
  const [dateStr, setDateStr] = useState(nowDateStr());
  const [timeStr, setTimeStr] = useState(nowTimeStr());
  const [saving, setSaving] = useState(false);

  const metric = METRICS.find(m => m.type === selectedType)!;

  const resolvedTimestamp = useMemo((): Date => {
    return parseDateTime(dateStr, timeStr) ?? new Date();
  }, [dateStr, timeStr]);

  const handleSave = useCallback(async () => {
    if (saving) return;

    const ts = parseDateTime(dateStr, timeStr);
    if (!ts) {
      Alert.alert("Invalid Date/Time", "Please enter a valid date (YYYY-MM-DD) and time (HH:MM).");
      return;
    }
    if (ts > new Date()) {
      Alert.alert("Invalid Date/Time", "The recorded time cannot be in the future.");
      return;
    }

    if (metric.isBP) {
      const sys = parseFloat(systolic);
      const dia = parseFloat(diastolic);
      if (isNaN(sys) || sys < 50 || sys > 250) {
        Alert.alert("Invalid Value", "Please enter a valid systolic pressure (50–250 mmHg).");
        return;
      }
      if (isNaN(dia) || dia < 30 || dia > 150) {
        Alert.alert("Invalid Value", "Please enter a valid diastolic pressure (30–150 mmHg).");
        return;
      }
      setSaving(true);
      await addVitalReading({
        type: "BloodPressure",
        value: { systolic: sys, diastolic: dia },
        unit: "mmHg",
        timestamp: ts.toISOString(),
        note: note.trim() || undefined,
      });
    } else {
      const num = parseFloat(value);
      if (isNaN(num)) {
        Alert.alert("Invalid Value", "Please enter a valid number.");
        return;
      }
      if (selectedType === "SpO2" && (num < 50 || num > 100)) {
        Alert.alert("Invalid Value", "SpO₂ must be between 50 and 100%.");
        return;
      }
      const isTemp = selectedType === "TempOral" || selectedType === "TempForehead";
      if (isTemp && tempUnit === "F" && (num < 90 || num > 110)) {
        Alert.alert("Invalid Value", "Temperature must be between 90°F and 110°F.");
        return;
      }
      if (isTemp && tempUnit === "C" && (num < 32 || num > 43)) {
        Alert.alert("Invalid Value", "Temperature must be between 32°C and 43°C.");
        return;
      }
      setSaving(true);
      await addVitalReading({
        type: selectedType,
        value: num,
        unit: metric.unit(tempUnit),
        timestamp: ts.toISOString(),
        note: note.trim() || undefined,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [saving, metric, systolic, diastolic, value, note, selectedType, tempUnit, dateStr, timeStr, addVitalReading, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Log Vitals",
          presentation: "modal",
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({ opacity: pressed || saving ? 0.6 : 1, paddingHorizontal: 4 })}
            >
              <Text style={[styles.saveBtn, { color: colors.tint }]}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT METRIC</Text>
          <View style={styles.metricGrid}>
            {METRICS.map(m => {
              const active = selectedType === m.type;
              return (
                <Pressable
                  key={m.type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedType(m.type);
                    setValue("");
                    setSystolic("");
                    setDiastolic("");
                  }}
                  style={[
                    styles.metricChip,
                    {
                      backgroundColor: active ? `${m.color}18` : colors.card,
                      borderColor: active ? m.color : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={m.icon as any} size={18} color={active ? m.color : colors.textSecondary} />
                  <Text
                    style={[styles.metricChipLabel, { color: active ? m.color : colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.inputCardHeader}>
              <View style={[styles.inputCardIcon, { backgroundColor: `${metric.color}18` }]}>
                <Ionicons name={metric.icon as any} size={20} color={metric.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputCardTitle, { color: colors.text }]}>{metric.label}</Text>
                <Text style={[styles.normalRange, { color: metric.color }]}>
                  {metric.normalLabel(tempUnit)}
                </Text>
              </View>
            </View>

            {metric.isBP ? (
              <View style={styles.bpRow}>
                <View style={styles.bpField}>
                  <Text style={[styles.bpLabel, { color: colors.textSecondary }]}>Systolic</Text>
                  <TextInput
                    style={[styles.bpInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="120"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={systolic}
                    onChangeText={setSystolic}
                    returnKeyType="next"
                    maxLength={3}
                  />
                  <Text style={[styles.bpUnit, { color: colors.textSecondary }]}>mmHg</Text>
                </View>
                <Text style={[styles.bpSep, { color: colors.textTertiary }]}>/</Text>
                <View style={styles.bpField}>
                  <Text style={[styles.bpLabel, { color: colors.textSecondary }]}>Diastolic</Text>
                  <TextInput
                    style={[styles.bpInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="80"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={diastolic}
                    onChangeText={setDiastolic}
                    returnKeyType="done"
                    maxLength={3}
                  />
                  <Text style={[styles.bpUnit, { color: colors.textSecondary }]}>mmHg</Text>
                </View>
              </View>
            ) : (
              <View style={styles.valueRow}>
                <TextInput
                  style={[styles.valueInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder={metric.placeholder(tempUnit)}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={setValue}
                  returnKeyType="done"
                />
                <View style={[styles.unitBadge, { backgroundColor: `${metric.color}18` }]}>
                  <Text style={[styles.unitText, { color: metric.color }]}>{metric.unit(tempUnit)}</Text>
                </View>
              </View>
            )}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>RECORDED AT</Text>
          <View style={[styles.timeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.timeRow}>
              <View style={[styles.timeIcon, { backgroundColor: `${colors.tint}18` }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.timeFieldLabel, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                maxLength={10}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.timeDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.timeRow}>
              <View style={[styles.timeIcon, { backgroundColor: `${colors.tint}18` }]}>
                <Ionicons name="time-outline" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.timeFieldLabel, { color: colors.textSecondary }]}>Time</Text>
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
                value={timeStr}
                onChangeText={setTimeStr}
                placeholder="HH:MM"
                placeholderTextColor={colors.textTertiary}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                maxLength={5}
                returnKeyType="done"
              />
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setDateStr(nowDateStr());
                setTimeStr(nowTimeStr());
              }}
              style={({ pressed }) => [styles.resetTimeBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.resetTimeBtnText, { color: colors.tint }]}>Reset to now</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>NOTE (OPTIONAL)</Text>
          <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              placeholder="e.g. after exercise, morning reading…"
              placeholderTextColor={colors.textTertiary}
              value={note}
              onChangeText={setNote}
              multiline
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          <View style={[styles.disclaimerCard, { backgroundColor: colors.amberLight, borderColor: `${colors.amber}30` }]}>
            <Ionicons name="warning-outline" size={14} color={colors.amber} />
            <Text style={[styles.disclaimerText, { color: colors.amber }]}>
              For informational tracking only. Always consult a healthcare provider for medical advice.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  saveBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.7,
    marginBottom: 6,
    marginLeft: 4,
  },

  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: "45%",
    flex: 1,
  },
  metricChipLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  inputCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  inputCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  inputCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inputCardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  normalRange: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  valueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  valueInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: "center",
  },
  unitBadge: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  unitText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  bpRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bpSep: { fontSize: 32, paddingBottom: 12 },
  bpField: { flex: 1, alignItems: "center", gap: 4 },
  bpLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bpInput: {
    width: "100%",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
  },
  bpUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },

  timeCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  timeFieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", width: 40 },
  timeInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    textAlign: "right",
  },
  timeDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  resetTimeBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  resetTimeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  noteCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  noteInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    minHeight: 80,
  },

  disclaimerCard: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "flex-start",
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    flex: 1,
  },
});
