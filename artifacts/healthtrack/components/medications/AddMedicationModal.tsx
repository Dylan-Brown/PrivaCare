import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Medication, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#34C78B", "#FF6B6B", "#007AFF", "#FF9F0A", "#AF52DE", "#FF6CBF", "#5AC8FA", "#4CD964"];
const UNITS = ["mg", "ml", "tablet", "capsule", "drops", "IU", "mcg", "g"];

type Props = {
  visible: boolean;
  onClose: () => void;
  editMed?: Medication | null;
};

export function AddMedicationModal({ visible, onClose, editMed }: Props) {
  const { colors, isDark } = useTheme();
  const { addMedication, updateMedication } = useApp();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(editMed?.name || "");
  const [dosage, setDosage] = useState(editMed?.dosage || "");
  const [unit, setUnit] = useState(editMed?.unit || "mg");
  const [totalCount, setTotalCount] = useState(editMed?.totalCount?.toString() || "30");
  const [lowThreshold, setLowThreshold] = useState(editMed?.lowStockThreshold?.toString() || "10");
  const [notifyLow, setNotifyLow] = useState(editMed?.notifyLowStock ?? true);
  const [selectedColor, setSelectedColor] = useState(editMed?.color || COLORS[0]);

  const reset = () => {
    if (!editMed) {
      setName(""); setDosage(""); setUnit("mg");
      setTotalCount("30"); setLowThreshold("10");
      setNotifyLow(true); setSelectedColor(COLORS[0]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a medication name.");
      return;
    }
    const count = parseInt(totalCount) || 30;
    const threshold = parseInt(lowThreshold) || 10;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editMed) {
      await updateMedication(editMed.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        unit,
        totalCount: count,
        lowStockThreshold: threshold,
        notifyLowStock: notifyLow,
        color: selectedColor,
      });
    } else {
      await addMedication({
        name: name.trim(),
        dosage: dosage.trim(),
        unit,
        totalCount: count,
        remainingCount: count,
        lowStockThreshold: threshold,
        notifyLowStock: notifyLow,
        color: selectedColor,
      });
    }
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editMed ? "Edit Medication" : "Add Medication"}
          </Text>
          <Pressable onPress={handleSave} style={styles.headerBtn}>
            <Text style={[styles.saveText, { color: colors.tint }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Medication name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DOSAGE</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                placeholder="e.g. 10"
                placeholderTextColor={colors.textTertiary}
                value={dosage}
                onChangeText={setDosage}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>UNIT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
              {UNITS.map(u => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  style={[
                    styles.unitChip,
                    {
                      backgroundColor: unit === u ? selectedColor : colors.borderLight,
                      borderColor: unit === u ? selectedColor : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.unitText, { color: unit === u ? "#fff" : colors.text }]}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PILL COUNT</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Total pills/doses (e.g. 30)"
              placeholderTextColor={colors.textTertiary}
              value={totalCount}
              onChangeText={setTotalCount}
              keyboardType="number-pad"
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Low stock alert</Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                  Alert when fewer than {lowThreshold} remain
                </Text>
              </View>
              <Switch
                value={notifyLow}
                onValueChange={setNotifyLow}
                trackColor={{ false: colors.border, true: selectedColor }}
                thumbColor="#fff"
              />
            </View>

            {notifyLow && (
              <TextInput
                style={[styles.input, { color: colors.text, marginTop: 8 }]}
                placeholder="Alert threshold (e.g. 10)"
                placeholderTextColor={colors.textTertiary}
                value={lowThreshold}
                onChangeText={setLowThreshold}
                keyboardType="number-pad"
              />
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorDotSelected,
                  ]}
                >
                  {selectedColor === c && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitScroll: {
    marginHorizontal: -4,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  unitText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  switchSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
