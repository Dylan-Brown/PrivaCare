import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Medication, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
};

export function UpdateCountModal({ visible, medication, onClose }: Props) {
  const { colors } = useTheme();
  const { setRemainingCount } = useApp();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [value, setValue] = useState("");

  useEffect(() => {
    if (visible && medication) {
      setValue(medication.remainingCount.toString());
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible, medication]);

  if (!medication) return null;

  const accentColor = medication.color;
  const parsed = parseInt(value);
  const isValid = !isNaN(parsed) && parsed >= 0;

  const handleSave = async () => {
    if (!isValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setRemainingCount(medication.id, parsed);
    onClose();
  };

  const nudge = (delta: number) => {
    const current = parseInt(value) || 0;
    const next = Math.max(0, current + delta);
    setValue(next.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Update Count</Text>
          <Pressable onPress={handleSave} style={styles.headerBtn} disabled={!isValid}>
            <Text style={[styles.saveText, { color: isValid ? colors.tint : colors.textTertiary }]}>
              Save
            </Text>
          </Pressable>
        </View>

        <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
          <View style={[styles.medInfo, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }]}>
            <View style={[styles.medDot, { backgroundColor: accentColor }]} />
            <View>
              <Text style={[styles.medName, { color: colors.text }]}>{medication.name}</Text>
              {medication.brandName ? (
                <Text style={[styles.medSub, { color: colors.textSecondary }]}>{medication.brandName}</Text>
              ) : null}
              <Text style={[styles.medSub, { color: colors.textSecondary }]}>
                {medication.dosage} {medication.unit} · Bottle: {medication.bottleCount}
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>REMAINING COUNT</Text>

          <View style={styles.counterRow}>
            <Pressable
              style={[styles.nudgeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nudge(-5)}
            >
              <Text style={[styles.nudgeLarge, { color: colors.text }]}>−5</Text>
            </Pressable>
            <Pressable
              style={[styles.nudgeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nudge(-1)}
            >
              <Text style={[styles.nudgeLarge, { color: colors.text }]}>−1</Text>
            </Pressable>

            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: accentColor }]}>
              <TextInput
                ref={inputRef}
                style={[styles.countInput, { color: accentColor }]}
                value={value}
                onChangeText={v => setValue(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                selectTextOnFocus
                textAlign="center"
              />
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
                {medication.unit}s
              </Text>
            </View>

            <Pressable
              style={[styles.nudgeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nudge(1)}
            >
              <Text style={[styles.nudgeLarge, { color: colors.text }]}>+1</Text>
            </Pressable>
            <Pressable
              style={[styles.nudgeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nudge(5)}
            >
              <Text style={[styles.nudgeLarge, { color: colors.text }]}>+5</Text>
            </Pressable>
          </View>

          {isValid && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {parsed === 0
                ? "Setting to 0 will mark this as out of stock"
                : parsed <= medication.lowStockThreshold && medication.notifyLowStock
                ? `⚠ Below low-stock threshold (${medication.lowStockThreshold})`
                : `${parsed} of ${medication.bottleCount} remaining in bottle`}
            </Text>
          )}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: isValid ? accentColor : colors.borderLight }]}
            onPress={handleSave}
            disabled={!isValid}
          >
            <Ionicons name="checkmark" size={18} color={isValid ? "#fff" : colors.textTertiary} />
            <Text style={[styles.saveBtnText, { color: isValid ? "#fff" : colors.textTertiary }]}>
              Update Count
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 52, alignItems: "center", justifyContent: "center", height: 44 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },

  body: { flex: 1, padding: 24, gap: 20 },
  medInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  medDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  medName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  medSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: -8,
  },

  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nudgeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeLarge: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  inputWrap: {
    flex: 2,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countInput: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    minWidth: 80,
    textAlign: "center",
  },
  unitLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -2 },

  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: -8,
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
