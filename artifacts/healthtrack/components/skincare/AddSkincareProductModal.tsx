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

import { ItemSchedule, SkincareProduct, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/ui/AppIcon";
import { IconColorSheet, SHARED_COLORS } from "@/components/ui/IconColorSheet";
import { TimePicker } from "@/components/ui/TimePicker";
import { formatTime, todayString, toDateString } from "@/utils/scheduleCompute";

const PRODUCT_TYPES = [
  "Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen",
  "Eye Cream", "Mask", "Exfoliant", "Oil", "Mist", "Tool", "Other",
];

const FREQ_OPTIONS = [
  { key: "daily",           label: "Daily",           intervalDays: 1 },
  { key: "every-other-day", label: "Every Other Day",  intervalDays: 2 },
  { key: "weekly",          label: "Weekly",           intervalDays: 7 },
  { key: "custom",          label: "Custom",           intervalDays: 0 },
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ScheduleType = "asNeeded" | "scheduled" | null;
type FreqKey = "daily" | "every-other-day" | "weekly" | "custom";

type Props = {
  visible: boolean;
  onClose: () => void;
  editProduct?: SkincareProduct | null;
};

function parseExpiryDate(dateStr?: string): { month: number; year: number } {
  if (!dateStr) {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() + 1 };
  }
  const [y, m] = dateStr.split("-").map(Number);
  return { month: m, year: y };
}

function buildExpiryDate(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function AddSkincareProductModal({ visible, onClose, editProduct }: Props) {
  const { colors } = useTheme();
  const { addSkincareProduct, updateSkincareProduct } = useApp();
  const insets = useSafeAreaInsets();

  // ── Core fields ────────────────────────────────────────────────────────
  const [name, setName]           = useState("");
  const [brand, setBrand]         = useState("");
  const [type, setType]           = useState("Serum");
  const [notes, setNotes]         = useState("");
  const [selectedColor, setSelectedColor] = useState(SHARED_COLORS[0]);
  const [selectedIcon, setSelectedIcon]   = useState("mci:bottle-tonic");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // ── Schedule ───────────────────────────────────────────────────────────
  const [scheduleType, setScheduleType] = useState<ScheduleType>(null);
  const [frequency, setFrequency]       = useState<FreqKey>("daily");
  const [customDays, setCustomDays]     = useState("3");
  const [times, setTimes]               = useState<string[]>(["08:00"]);
  const [timePickerIdx, setTimePickerIdx] = useState<number | null>(null);

  // ── Expiry date ────────────────────────────────────────────────────────
  const [hasExpiry, setHasExpiry]   = useState(false);
  const [expiryMonth, setExpiryMonth] = useState(new Date().getMonth() + 1);
  const [expiryYear, setExpiryYear] = useState(new Date().getFullYear() + 1);

  // ── Reset / populate ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (editProduct) {
      setName(editProduct.name);
      setBrand(editProduct.brand);
      setType(editProduct.type);
      setNotes(editProduct.notes ?? "");
      setSelectedColor(editProduct.color);
      setSelectedIcon(editProduct.icon ?? "mci:bottle-tonic");
      if (editProduct.expiryDate) {
        setHasExpiry(true);
        const { month, year } = parseExpiryDate(editProduct.expiryDate);
        setExpiryMonth(month);
        setExpiryYear(year);
      } else {
        setHasExpiry(false);
      }
      const s = editProduct.schedule;
      if (s.asNeeded) {
        setScheduleType("asNeeded");
      } else {
        setScheduleType("scheduled");
        setFrequency(s.frequency);
        setCustomDays(s.intervalDays.toString());
        setTimes(s.times);
      }
    } else {
      setName(""); setBrand(""); setType("Serum"); setNotes("");
      setSelectedColor(SHARED_COLORS[0]); setSelectedIcon("mci:bottle-tonic");
      setScheduleType(null); setFrequency("daily"); setCustomDays("3"); setTimes(["08:00"]);
      setHasExpiry(false);
      const now = new Date();
      setExpiryMonth(now.getMonth() + 1);
      setExpiryYear(now.getFullYear() + 1);
    }
  }, [visible, editProduct]);

  const addTime = () => {
    if (times.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimes(prev => [...prev, "20:00"]);
  };

  const removeTime = (idx: number) => {
    if (times.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimes(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTime = (idx: number, val: string) => {
    setTimes(prev => prev.map((t, i) => i === idx ? val : t));
  };

  const buildSchedule = (): ItemSchedule => {
    if (scheduleType === "asNeeded") return { asNeeded: true };
    const freqOpt = FREQ_OPTIONS.find(f => f.key === frequency)!;
    const intervalDays = frequency === "custom" ? Math.max(1, parseInt(customDays) || 3) : freqOpt.intervalDays;
    return {
      asNeeded: false,
      frequency,
      intervalDays,
      times: [...times].sort(),
      startDate: todayString(),
    };
  };

  const doActualSave = async () => {
    const schedule = buildSchedule();
    const expiryDate = hasExpiry ? buildExpiryDate(expiryMonth, expiryYear) : undefined;
    const notesVal = notes.trim() || undefined;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    if (editProduct) {
      await updateSkincareProduct(editProduct.id, {
        name: name.trim(), brand: brand.trim(), type,
        color: selectedColor, icon: selectedIcon,
        schedule, expiryDate, notes: notesVal,
      });
    } else {
      await addSkincareProduct({
        name: name.trim(), brand: brand.trim(), type,
        color: selectedColor, icon: selectedIcon,
        schedule, expiryDate, notes: notesVal,
      });
    }
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a product name.");
      return;
    }
    if (!scheduleType) {
      Alert.alert("Required", "Please select a usage schedule.");
      return;
    }
    doActualSave();
  };

  const canSave = Boolean(name.trim() && scheduleType);

  // Year range for expiry
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

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
            {editProduct ? "Edit Product" : "Add Product"}
          </Text>
          <Pressable onPress={handleSave} style={styles.headerBtn} disabled={!canSave}>
            <Text style={[styles.saveText, { color: canSave ? colors.tint : colors.textTertiary }]}>
              {editProduct ? "Save" : "Confirm"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name + Brand */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRODUCT NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Vitamin C Serum"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BRAND</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. The Ordinary"
              placeholderTextColor={colors.textTertiary}
              value={brand}
              onChangeText={setBrand}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { color: colors.text }]}
              placeholder="How this product works for you, skin reactions, tips…"
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Schedule — REQUIRED */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.scheduleHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>USAGE SCHEDULE</Text>
              {!scheduleType && (
                <View style={[styles.requiredBadge, { backgroundColor: `${colors.danger}20`, borderColor: `${colors.danger}40` }]}>
                  <Text style={[styles.requiredText, { color: colors.danger }]}>Required</Text>
                </View>
              )}
            </View>
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>How will you be using this product?</Text>
            <View style={styles.scheduleTypeRow}>
              <Pressable
                onPress={() => { setScheduleType("asNeeded"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.scheduleTypeBtn, {
                  borderColor: scheduleType === "asNeeded" ? colors.tint : colors.border,
                  backgroundColor: scheduleType === "asNeeded" ? `${colors.tint}15` : colors.background,
                }]}
              >
                <Ionicons name="hand-left-outline" size={20} color={scheduleType === "asNeeded" ? colors.tint : colors.textSecondary} />
                <Text style={[styles.scheduleTypeBtnTitle, { color: scheduleType === "asNeeded" ? colors.tint : colors.text }]}>As Needed</Text>
                <Text style={[styles.scheduleTypeBtnSub, { color: colors.textTertiary }]}>Use when needed</Text>
              </Pressable>
              <Pressable
                onPress={() => { setScheduleType("scheduled"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.scheduleTypeBtn, {
                  borderColor: scheduleType === "scheduled" ? colors.tint : colors.border,
                  backgroundColor: scheduleType === "scheduled" ? `${colors.tint}15` : colors.background,
                }]}
              >
                <Ionicons name="calendar-outline" size={20} color={scheduleType === "scheduled" ? colors.tint : colors.textSecondary} />
                <Text style={[styles.scheduleTypeBtnTitle, { color: scheduleType === "scheduled" ? colors.tint : colors.text }]}>On a Schedule</Text>
                <Text style={[styles.scheduleTypeBtnSub, { color: colors.textTertiary }]}>Set days & times</Text>
              </Pressable>
            </View>

            {scheduleType === "scheduled" && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOW OFTEN</Text>
                <View style={styles.freqRow}>
                  {FREQ_OPTIONS.map(f => (
                    <Pressable
                      key={f.key}
                      onPress={() => { setFrequency(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.freqChip, {
                        borderColor: frequency === f.key ? colors.tint : colors.border,
                        backgroundColor: frequency === f.key ? `${colors.tint}15` : colors.background,
                      }]}
                    >
                      <Text style={[styles.freqChipText, { color: frequency === f.key ? colors.tint : colors.text }]}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {frequency === "custom" && (
                  <View style={styles.customDaysRow}>
                    <Text style={[styles.customDaysLabel, { color: colors.text }]}>Every</Text>
                    <TextInput
                      style={[styles.customDaysInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={customDays}
                      onChangeText={setCustomDays}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={[styles.customDaysLabel, { color: colors.text }]}>days</Text>
                  </View>
                )}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.timesHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPLICATION TIMES</Text>
                  {times.length < 4 && (
                    <Pressable onPress={addTime} style={[styles.addTimeBtn, { borderColor: colors.tint }]}>
                      <Ionicons name="add" size={14} color={colors.tint} />
                      <Text style={[styles.addTimeBtnText, { color: colors.tint }]}>Add Time</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.timesRow}>
                  {times.map((t, idx) => (
                    <View key={idx} style={styles.timeSlot}>
                      <Pressable
                        onPress={() => setTimePickerIdx(idx)}
                        style={[styles.timeChip, { backgroundColor: `${selectedColor}20`, borderColor: `${selectedColor}50` }]}
                      >
                        <Ionicons name="time-outline" size={14} color={selectedColor} />
                        <Text style={[styles.timeChipText, { color: selectedColor }]}>{formatTime(t)}</Text>
                      </Pressable>
                      {times.length > 1 && (
                        <Pressable onPress={() => removeTime(idx)} style={styles.removeTimeBtn}>
                          <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Type */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TYPE</Text>
            <View style={styles.typeGrid}>
              {PRODUCT_TYPES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => { setType(t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.typeChip, {
                    backgroundColor: type === t ? selectedColor : colors.borderLight,
                    borderColor: type === t ? selectedColor : colors.border,
                  }]}
                >
                  <Text style={[styles.typeText, { color: type === t ? "#fff" : colors.text }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Expiry Date */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => { setHasExpiry(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={styles.expiryToggleRow}
            >
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Expiry Date</Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                  Track when this product expires
                </Text>
              </View>
              <View style={[styles.checkbox, {
                backgroundColor: hasExpiry ? selectedColor : "transparent",
                borderColor: hasExpiry ? selectedColor : colors.border,
              }]}>
                {hasExpiry && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </Pressable>

            {hasExpiry && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EXPIRY MONTH</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expiryRow} contentContainerStyle={styles.expiryContent}>
                  {MONTHS.map((m, i) => (
                    <Pressable
                      key={m}
                      onPress={() => { setExpiryMonth(i + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.expiryChip, {
                        backgroundColor: expiryMonth === i + 1 ? selectedColor : colors.borderLight,
                        borderColor: expiryMonth === i + 1 ? selectedColor : colors.border,
                      }]}
                    >
                      <Text style={[styles.expiryChipText, { color: expiryMonth === i + 1 ? "#fff" : colors.text }]}>{m}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>EXPIRY YEAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expiryRow} contentContainerStyle={styles.expiryContent}>
                  {years.map(y => (
                    <Pressable
                      key={y}
                      onPress={() => { setExpiryYear(y); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.expiryChip, {
                        backgroundColor: expiryYear === y ? selectedColor : colors.borderLight,
                        borderColor: expiryYear === y ? selectedColor : colors.border,
                      }]}
                    >
                      <Text style={[styles.expiryChipText, { color: expiryYear === y ? "#fff" : colors.text }]}>{y}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={[styles.expiryPreview, { backgroundColor: `${selectedColor}15`, borderColor: `${selectedColor}30` }]}>
                  <Ionicons name="calendar-outline" size={14} color={selectedColor} />
                  <Text style={[styles.expiryPreviewText, { color: selectedColor }]}>
                    Expires {MONTHS[expiryMonth - 1]} {expiryYear}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Appearance */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
            <Pressable
              style={[styles.appearanceBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setShowIconPicker(true)}
            >
              <View style={[styles.appearancePreview, { backgroundColor: `${selectedColor}22` }]}>
                <AppIcon icon={selectedIcon} size={28} color={selectedColor} />
              </View>
              <View style={styles.appearanceInfo}>
                <Text style={[styles.appearanceLabel, { color: colors.text }]}>Icon & Color</Text>
                <Text style={[styles.appearanceHint, { color: colors.textSecondary }]}>Tap to choose icon and color</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: selectedColor }]} />
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <IconColorSheet
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        selectedIcon={selectedIcon}
        selectedColor={selectedColor}
        onIconChange={setSelectedIcon}
        onColorChange={setSelectedColor}
        type="skincare"
      />

      <TimePicker
        visible={timePickerIdx !== null}
        value={timePickerIdx !== null ? (times[timePickerIdx] ?? "08:00") : "08:00"}
        onChange={v => { if (timePickerIdx !== null) updateTime(timePickerIdx, v); }}
        onClose={() => setTimePickerIdx(null)}
        label="SET APPLICATION TIME"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerBtn: { minWidth: 44, alignItems: "center", justifyContent: "center", height: 44 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6 },
  fieldHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8, marginTop: -2 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  notesInput: { minHeight: 68, textAlignVertical: "top" },
  divider: { height: 1, marginVertical: 14 },

  scheduleHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  requiredText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scheduleTypeRow: { flexDirection: "row", gap: 10 },
  scheduleTypeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  scheduleTypeBtnTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scheduleTypeBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  freqChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  customDaysRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  customDaysLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  customDaysInput: { width: 64, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  timesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addTimeBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  addTimeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  timesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  timeSlot: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  timeChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  removeTimeBtn: { padding: 2 },
  expiryToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  switchSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  expiryRow: { marginHorizontal: -4 },
  expiryContent: { gap: 8, paddingHorizontal: 4 },
  expiryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  expiryChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expiryPreview: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  expiryPreviewText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  typeText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  appearanceBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  appearancePreview: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  appearanceInfo: { flex: 1 },
  appearanceLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  appearanceHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
});
