import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MedicationGroup, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#34C78B", "#FF6B6B", "#007AFF", "#FF9F0A", "#AF52DE", "#FF6CBF", "#5AC8FA", "#4CD964"];
const PRESET_TIMES = ["Morning", "Afternoon", "Evening", "Bedtime", "With meals", "Custom"];

type Props = {
  visible: boolean;
  onClose: () => void;
  editGroup?: MedicationGroup | null;
};

function clampToThreeWords(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(" ");
}

export function AddGroupModal({ visible, onClose, editGroup }: Props) {
  const { colors } = useTheme();
  const { medications, addMedicationGroup, updateMedicationGroup } = useApp();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [timeLabel, setTimeLabel] = useState("Morning");
  const [customTime, setCustomTime] = useState("");
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  useEffect(() => {
    if (visible) {
      if (editGroup) {
        setName(editGroup.name);
        const isPreset = PRESET_TIMES.slice(0, -1).includes(editGroup.timeLabel);
        if (isPreset) {
          setTimeLabel(editGroup.timeLabel);
          setCustomTime("");
        } else {
          setTimeLabel("Custom");
          setCustomTime(editGroup.timeLabel);
        }
        setSelectedMeds(editGroup.medicationIds);
        setSelectedColor(editGroup.color || COLORS[0]);
      } else {
        setName("");
        setTimeLabel("Morning");
        setCustomTime("");
        setSelectedMeds([]);
        setSelectedColor(COLORS[0]);
      }
    }
  }, [visible]);

  const toggleMed = (id: string) => {
    setSelectedMeds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCustomTimeChange = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      setCustomTime(text);
    } else {
      setCustomTime(words.slice(0, 3).join(" "));
    }
  };

  const resolvedTimeLabel =
    timeLabel === "Custom"
      ? (customTime.trim() || "Custom")
      : timeLabel;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a group name.");
      return;
    }
    if (selectedMeds.length === 0) {
      Alert.alert("Required", "Please select at least one medication.");
      return;
    }
    if (timeLabel === "Custom" && !customTime.trim()) {
      Alert.alert("Required", "Please enter a custom time label.");
      return;
    }
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    if (editGroup) {
      await updateMedicationGroup(editGroup.id, {
        name: name.trim(),
        timeLabel: resolvedTimeLabel,
        medicationIds: selectedMeds,
        color: selectedColor,
      });
    } else {
      await addMedicationGroup({
        name: name.trim(),
        timeLabel: resolvedTimeLabel,
        medicationIds: selectedMeds,
        color: selectedColor,
      });
    }
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
            {editGroup ? "Edit Group" : "New Group"}
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GROUP NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Morning Meds"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TIME</Text>
            <View style={styles.chipGrid}>
              {PRESET_TIMES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => setTimeLabel(t)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: timeLabel === t ? selectedColor : colors.borderLight,
                      borderColor: timeLabel === t ? selectedColor : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: timeLabel === t ? "#fff" : colors.text }]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {timeLabel === "Custom" && (
              <View style={[styles.customInputRow, { borderTopColor: colors.border }]}>
                <TextInput
                  style={[styles.customInput, {
                    color: colors.text,
                    backgroundColor: colors.borderLight,
                    borderColor: colors.border,
                  }]}
                  placeholder="Up to 3 words (e.g. Post Workout)"
                  placeholderTextColor={colors.textTertiary}
                  value={customTime}
                  onChangeText={handleCustomTimeChange}
                  maxLength={40}
                  returnKeyType="done"
                />
                <Text style={[styles.wordCount, { color: colors.textTertiary }]}>
                  {customTime.trim() ? customTime.trim().split(/\s+/).filter(Boolean).length : 0}/3 words
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              MEDICATIONS ({selectedMeds.length} selected)
            </Text>
            {medications.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No medications added yet. Add medications first.
              </Text>
            ) : (
              medications.map(med => {
                const isSelected = selectedMeds.includes(med.id);
                return (
                  <Pressable
                    key={med.id}
                    onPress={() => toggleMed(med.id)}
                    style={[
                      styles.medRow,
                      {
                        backgroundColor: isSelected ? `${med.color || selectedColor}15` : "transparent",
                        borderColor: isSelected ? `${med.color || selectedColor}40` : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.medDot, { backgroundColor: med.color || selectedColor }]} />
                    <View style={styles.medInfo}>
                      <Text style={[styles.medName, { color: colors.text }]}>{med.name}</Text>
                      <Text style={[styles.medDosage, { color: colors.textSecondary }]}>
                        {med.dosage} {med.unit}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={med.color || selectedColor} />}
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                >
                  {selectedColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
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
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 44, alignItems: "center", justifyContent: "center", height: 44 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  customInputRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  customInput: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  wordCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  medRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6,
  },
  medDot: { width: 10, height: 10, borderRadius: 5 },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  medDosage: { fontSize: 12, fontFamily: "Inter_400Regular" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  colorDotSelected: {
    transform: [{ scale: 1.15 }], shadowColor: "#000",
    shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
