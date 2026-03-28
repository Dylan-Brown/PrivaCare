import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  value: string;       // "HH:MM" 24-hour
  onChange: (v: string) => void;
  onClose: () => void;
  label?: string;
};

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parse24(hhmm: string): { hour: number; minute: number; isPM: boolean } {
  const [h, m] = hhmm.split(":").map(Number);
  const isPM = h >= 12;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, minute: m, isPM };
}

function to24(hour: number, minute: number, isPM: boolean): string {
  let h = hour;
  if (isPM && hour !== 12) h = hour + 12;
  if (!isPM && hour === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimePicker({ visible, value, onChange, onClose, label }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const parsed = parse24(value || "08:00");

  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [isPM, setIsPM] = useState(parsed.isPM);

  useEffect(() => {
    if (visible) {
      const p = parse24(value || "08:00");
      setHour(p.hour);
      setMinute(p.minute);
      setIsPM(p.isPM);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onChange(to24(hour, minute, isPM));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {label && (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        )}

        <View style={[styles.preview, { backgroundColor: `${colors.tint}15`, borderColor: `${colors.tint}30` }]}>
          <Text style={[styles.previewText, { color: colors.tint }]}>
            {hour}:{String(minute).padStart(2, "0")} {isPM ? "PM" : "AM"}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOUR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {HOURS.map(h => (
            <Pressable
              key={h}
              onPress={() => setHour(h)}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.background },
                h === hour && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
            >
              <Text style={[styles.chipText, { color: h === hour ? "#fff" : colors.text }]}>{h}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MINUTE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {MINUTES.map(m => (
            <Pressable
              key={m}
              onPress={() => setMinute(m)}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.background },
                m === minute && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
            >
              <Text style={[styles.chipText, { color: m === minute ? "#fff" : colors.text }]}>
                {String(m).padStart(2, "0")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.ampmRow}>
          {(["AM", "PM"] as const).map(p => (
            <Pressable
              key={p}
              onPress={() => setIsPM(p === "PM")}
              style={[
                styles.ampmBtn,
                { borderColor: colors.border, backgroundColor: colors.background },
                (p === "PM") === isPM && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
            >
              <Text style={[styles.ampmText, { color: (p === "PM") === isPM ? "#fff" : colors.text }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.confirmBtn, { backgroundColor: colors.tint }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmText}>Set Time</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: -4 },
  preview: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  previewText: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: -4 },
  chipRow: { gap: 8, paddingHorizontal: 2 },
  chip: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  chipText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ampmRow: { flexDirection: "row", gap: 12 },
  ampmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  ampmText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  confirmBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4,
  },
  confirmText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
