import React, { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompoundIngredient, Medication, MedicationCategory, ItemSchedule, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/ui/AppIcon";
import { IconColorSheet, SHARED_COLORS } from "@/components/ui/IconColorSheet";
import { TimePicker } from "@/components/ui/TimePicker";
import { formatTime, todayString } from "@/utils/scheduleCompute";

const COLORS = SHARED_COLORS;
const UNITS = ["mg", "ml", "tablet", "capsule", "drops", "IU", "mcg", "g"];
const CATEGORIES: { key: MedicationCategory; label: string; icon: string }[] = [
  { key: "prescription", label: "Prescription", icon: "medical" },
  { key: "generic",      label: "Generic",      icon: "flask" },
  { key: "supplement",   label: "Supplement",   icon: "leaf" },
];
const FREQ_OPTIONS = [
  { key: "daily",           label: "Daily",           intervalDays: 1 },
  { key: "every-other-day", label: "Every Other Day",  intervalDays: 2 },
  { key: "weekly",          label: "Weekly",           intervalDays: 7 },
  { key: "custom",          label: "Custom",           intervalDays: 0 },
] as const;

const DEFAULT_INGREDIENTS: CompoundIngredient[] = [
  { name: "", amount: "", unit: "mg" },
  { name: "", amount: "", unit: "mg" },
];

const DISCLAIMER_TEXT =
  "Only take, use, and schedule your medication as directed by your healthcare provider. "
  + "Do not adjust your dosage or schedule without first consulting a qualified medical professional. "
  + "Vital is a personal tracking tool and is not a substitute for medical advice.";

const DISCLOSURE_TEXT =
  "Vital can check for potential drug interactions using the NIH RxNorm API — a free public service "
  + "maintained by the U.S. National Library of Medicine.\n\n"
  + "Important: While your other health data stays entirely on this device, your medication names "
  + "are sent to a third-party server during an interaction check. No personal information is "
  + "included, but your medication names will leave this device.\n\n"
  + "Would you like to enable drug interaction checking?";

type ScheduleType = "asNeeded" | "scheduled" | null;
type FreqKey = "daily" | "every-other-day" | "weekly" | "custom";

type Props = {
  visible: boolean;
  onClose: () => void;
  editMed?: Medication | null;
};

export function AddMedicationModal({ visible, onClose, editMed }: Props) {
  const { colors } = useTheme();
  const { addMedication, updateMedication, medications, skincareProducts, userProfile } = useApp();
  const insets = useSafeAreaInsets();

  // ── Core fields ────────────────────────────────────────────────────────
  const [name, setName]           = useState("");
  const [brandName, setBrandName] = useState("");
  const [dosage, setDosage]       = useState("");
  const [unit, setUnit]           = useState("mg");
  const [bottleCount, setBottleCount] = useState("30");
  const [remaining, setRemaining] = useState("30");
  const [lowThreshold, setLowThreshold] = useState("10");
  const [notifyLow, setNotifyLow] = useState(true);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon]   = useState("mci:pill");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [category, setCategory]   = useState<MedicationCategory | undefined>(undefined);
  const [isCompound, setIsCompound] = useState(false);
  const [ingredients, setIngredients] = useState<CompoundIngredient[]>(DEFAULT_INGREDIENTS);

  // ── Schedule fields ────────────────────────────────────────────────────
  const [scheduleType, setScheduleType] = useState<ScheduleType>(null);
  const [frequency, setFrequency]     = useState<FreqKey>("daily");
  const [customDays, setCustomDays]   = useState("3");
  const [times, setTimes]             = useState<string[]>(["08:00"]);
  const [timePickerIdx, setTimePickerIdx] = useState<number | null>(null);

  // ── Notes ──────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");

  // ── Reset / populate ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (editMed) {
      setName(editMed.name);
      setBrandName(editMed.brandName ?? "");
      setDosage(editMed.dosage);
      setUnit(editMed.unit);
      setBottleCount((editMed.bottleCount ?? editMed.totalCount ?? 30).toString());
      setRemaining(editMed.remainingCount.toString());
      setLowThreshold(editMed.lowStockThreshold.toString());
      setNotifyLow(editMed.notifyLowStock);
      setSelectedColor(editMed.color);
      setSelectedIcon(editMed.icon ?? "mci:pill");
      setCategory(editMed.category);
      setIsCompound(editMed.isCompound ?? false);
      setIngredients((editMed.ingredients?.length ?? 0) >= 2 ? editMed.ingredients! : DEFAULT_INGREDIENTS);
      setNotes(editMed.notes ?? "");
      const s = editMed.schedule;
      if (s.asNeeded) {
        setScheduleType("asNeeded");
      } else {
        setScheduleType("scheduled");
        setFrequency(s.frequency);
        setCustomDays(s.intervalDays.toString());
        setTimes(s.times);
      }
    } else {
      setName(""); setBrandName(""); setDosage(""); setUnit("mg");
      setBottleCount("30"); setRemaining("30");
      setLowThreshold("10"); setNotifyLow(true);
      setSelectedColor(COLORS[0]); setSelectedIcon("mci:pill"); setCategory(undefined);
      setIsCompound(false); setIngredients(DEFAULT_INGREDIENTS);
      setScheduleType(null); setFrequency("daily"); setCustomDays("3"); setTimes(["08:00"]);
      setNotes("");
    }
  }, [visible, editMed]);

  const syncRemaining = (bottle: string) => {
    if (!editMed) setRemaining(bottle);
    setBottleCount(bottle);
  };

  const toggleCompound = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCompound(val);
    if (val && ingredients.length < 2) setIngredients(DEFAULT_INGREDIENTS);
  };

  const updateIngredient = (index: number, field: keyof CompoundIngredient, value: string) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients(prev => [...prev, { name: "", amount: "", unit: "mg" }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const selectScheduleType = (type: ScheduleType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScheduleType(type);
  };

  const addTime = () => {
    if (times.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimes(prev => [...prev, "12:00"]);
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
    const bottle    = Math.max(1, parseInt(bottleCount) || 30);
    const rem       = Math.max(0, parseInt(remaining) || 0);
    const threshold = parseInt(lowThreshold) || 10;
    const cleanIngredients = isCompound
      ? ingredients.filter(ing => ing.name.trim() || ing.amount.trim())
      : [];

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const schedule = buildSchedule();

    if (editMed) {
      await updateMedication(editMed.id, {
        name: name.trim(), brandName: brandName.trim() || undefined,
        dosage: dosage.trim(), unit,
        bottleCount: bottle, totalCount: bottle, remainingCount: rem,
        lowStockThreshold: threshold, notifyLowStock: notifyLow,
        color: selectedColor, icon: selectedIcon, category,
        isCompound, ingredients: cleanIngredients,
        schedule, notes: notes.trim() || undefined,
      });
    } else {
      await addMedication({
        name: name.trim(), brandName: brandName.trim() || undefined,
        dosage: dosage.trim(), unit,
        bottleCount: bottle, totalCount: bottle, remainingCount: rem,
        lowStockThreshold: threshold, notifyLowStock: notifyLow,
        color: selectedColor, icon: selectedIcon,
        status: "active", awaitingRefill: false, category,
        isCompound, ingredients: cleanIngredients,
        schedule, notes: notes.trim() || undefined,
      });
    }
    onClose();
  };

  const afterDisclaimer = async () => {
    const disclosureShown = await AsyncStorage.getItem("@vital_interaction_disclosure_shown");
    const totalItems = medications.length + skincareProducts.length;
    if (!disclosureShown && totalItems >= 1) {
      Alert.alert("Drug Interaction Checking", DISCLOSURE_TEXT, [
        { text: "Skip", onPress: async () => {
          await AsyncStorage.setItem("@vital_interaction_disclosure_shown", "true");
          doActualSave();
        }},
        { text: "Enable", style: "default", onPress: async () => {
          await AsyncStorage.setItem("@vital_interaction_disclosure_shown", "true");
          doActualSave();
        }},
      ]);
    } else {
      doActualSave();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a medication name.");
      return;
    }
    if (!scheduleType) {
      Alert.alert("Required", "Please select whether this medication is as needed or on a schedule.");
      return;
    }
    if (scheduleType === "scheduled" && times.length === 0) {
      Alert.alert("Required", "Please add at least one scheduled time.");
      return;
    }
    if (isCompound && !ingredients.some(i => i.name.trim())) {
      Alert.alert("Required", "Please enter at least one ingredient name.");
      return;
    }

    if (editMed) {
      doActualSave();
      return;
    }

    const disclaimerDate = await AsyncStorage.getItem("@vital_disclaimer_date");
    if (disclaimerDate !== todayString()) {
      Alert.alert("Medical Disclaimer", DISCLAIMER_TEXT, [
        { text: "Cancel", style: "cancel" },
        { text: "I Understand", onPress: async () => {
          await AsyncStorage.setItem("@vital_disclaimer_date", todayString());
          afterDisclaimer();
        }},
      ]);
    } else {
      afterDisclaimer();
    }
  };

  const canSave = Boolean(name.trim() && scheduleType);

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
          <Pressable onPress={handleSave} style={styles.headerBtn} disabled={!canSave}>
            <Text style={[styles.saveText, { color: canSave ? colors.tint : colors.textTertiary }]}>
              {editMed ? "Save" : "Confirm"}
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Medication name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BRAND NAME (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Advil, Lipitor"
              placeholderTextColor={colors.textTertiary}
              value={brandName}
              onChangeText={setBrandName}
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
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
              How will you be taking this medication?
            </Text>
            <View style={styles.scheduleTypeRow}>
              <Pressable
                onPress={() => selectScheduleType("asNeeded")}
                style={[
                  styles.scheduleTypeBtn,
                  { borderColor: scheduleType === "asNeeded" ? colors.tint : colors.border,
                    backgroundColor: scheduleType === "asNeeded" ? `${colors.tint}15` : colors.background },
                ]}
              >
                <Ionicons
                  name="hand-left-outline"
                  size={20}
                  color={scheduleType === "asNeeded" ? colors.tint : colors.textSecondary}
                />
                <Text style={[styles.scheduleTypeBtnTitle, { color: scheduleType === "asNeeded" ? colors.tint : colors.text }]}>
                  As Needed
                </Text>
                <Text style={[styles.scheduleTypeBtnSub, { color: colors.textTertiary }]}>Take when required</Text>
              </Pressable>
              <Pressable
                onPress={() => selectScheduleType("scheduled")}
                style={[
                  styles.scheduleTypeBtn,
                  { borderColor: scheduleType === "scheduled" ? colors.tint : colors.border,
                    backgroundColor: scheduleType === "scheduled" ? `${colors.tint}15` : colors.background },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={scheduleType === "scheduled" ? colors.tint : colors.textSecondary}
                />
                <Text style={[styles.scheduleTypeBtnTitle, { color: scheduleType === "scheduled" ? colors.tint : colors.text }]}>
                  On a Schedule
                </Text>
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
                      style={[
                        styles.freqChip,
                        { borderColor: frequency === f.key ? colors.tint : colors.border,
                          backgroundColor: frequency === f.key ? `${colors.tint}15` : colors.background },
                      ]}
                    >
                      <Text style={[styles.freqChipText, { color: frequency === f.key ? colors.tint : colors.text }]}>
                        {f.label}
                      </Text>
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
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DOSE TIMES</Text>
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

          {/* Category */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TYPE</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => {
                const active = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => { setCategory(active ? undefined : cat.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: active ? selectedColor : colors.borderLight, borderColor: active ? selectedColor : colors.border },
                    ]}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={active ? "#fff" : colors.textSecondary} />
                    <Text style={[styles.categoryText, { color: active ? "#fff" : colors.text }]}>{cat.label}</Text>
                    {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Compound — only shown when the Compound Medications setting is enabled, or when editing an existing compound med */}
          {(userProfile.compoundMedicationsEnabled || editMed?.isCompound) && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.compoundLabelRow}>
                  <Ionicons name="layers-outline" size={16} color={isCompound ? selectedColor : colors.textSecondary} />
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Compound Medication</Text>
                </View>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                  Has multiple active ingredients (e.g. Motrin Dual Action)
                </Text>
              </View>
              <Switch
                value={isCompound}
                onValueChange={toggleCompound}
                trackColor={{ false: colors.border, true: selectedColor }}
                thumbColor="#fff"
                ios_backgroundColor={colors.border}
              />
            </View>
            {isCompound && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>INGREDIENTS</Text>
                <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                  Enter each active ingredient and its per-dose amount
                </Text>
                {ingredients.map((ing, idx) => (
                  <View key={idx} style={[styles.ingredientRow, { borderColor: colors.border }]}>
                    <View style={styles.ingredientHeader}>
                      <Text style={[styles.ingredientLabel, { color: colors.textSecondary }]}>Ingredient {idx + 1}</Text>
                      {ingredients.length > 2 && (
                        <Pressable onPress={() => removeIngredient(idx)} style={styles.removeBtn}>
                          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                        </Pressable>
                      )}
                    </View>
                    <TextInput
                      style={[styles.ingredientInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Ingredient name (e.g. Ibuprofen)"
                      placeholderTextColor={colors.textTertiary}
                      value={ing.name}
                      onChangeText={v => updateIngredient(idx, "name", v)}
                    />
                    <View style={styles.ingredientAmountRow}>
                      <TextInput
                        style={[styles.ingredientAmountInput, { color: colors.text, borderColor: colors.border }]}
                        placeholder="Amount"
                        placeholderTextColor={colors.textTertiary}
                        value={ing.amount}
                        onChangeText={v => updateIngredient(idx, "amount", v)}
                        keyboardType="decimal-pad"
                      />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ingredientUnitScroll} contentContainerStyle={styles.ingredientUnitContent}>
                        {UNITS.map(u => (
                          <Pressable
                            key={u}
                            onPress={() => updateIngredient(idx, "unit", u)}
                            style={[styles.ingredientUnitChip, { backgroundColor: ing.unit === u ? selectedColor : colors.borderLight, borderColor: ing.unit === u ? selectedColor : colors.border }]}
                          >
                            <Text style={[styles.ingredientUnitText, { color: ing.unit === u ? "#fff" : colors.text }]}>{u}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                ))}
                <Pressable onPress={addIngredient} style={[styles.addIngredientBtn, { borderColor: selectedColor }]}>
                  <Ionicons name="add" size={18} color={selectedColor} />
                  <Text style={[styles.addIngredientText, { color: selectedColor }]}>Add Ingredient</Text>
                </Pressable>
              </>
            )}
          </View>
          )}

          {/* Dosage + Unit */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {isCompound ? "TOTAL DOSE LABEL (OPTIONAL)" : "DOSAGE AMOUNT"}
            </Text>
            {isCompound && <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>Overall dose label (e.g. "1 tablet")</Text>}
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={isCompound ? "e.g. 1 tablet" : "e.g. 10"}
              placeholderTextColor={colors.textTertiary}
              value={dosage}
              onChangeText={setDosage}
              keyboardType={isCompound ? "default" : "decimal-pad"}
            />
            {!isCompound && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>UNIT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                  {UNITS.map(u => (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      style={[styles.unitChip, { backgroundColor: unit === u ? selectedColor : colors.borderLight, borderColor: unit === u ? selectedColor : colors.border }]}
                    >
                      <Text style={[styles.unitText, { color: unit === u ? "#fff" : colors.text }]}>{u}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>

          {/* Pill Count */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BOTTLE SIZE</Text>
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>How many pills/doses came in the bottle</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 90"
              placeholderTextColor={colors.textTertiary}
              value={bottleCount}
              onChangeText={syncRemaining}
              keyboardType="number-pad"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REMAINING NOW</Text>
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>How many you currently have left</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 45"
              placeholderTextColor={colors.textTertiary}
              value={remaining}
              onChangeText={setRemaining}
              keyboardType="number-pad"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Low stock alert</Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Alert when fewer than {lowThreshold || "?"} remain</Text>
              </View>
              <Switch value={notifyLow} onValueChange={setNotifyLow} trackColor={{ false: colors.border, true: selectedColor }} thumbColor="#fff" ios_backgroundColor={colors.border} />
            </View>
            {notifyLow && (
              <TextInput
                style={[styles.input, { color: colors.text, marginTop: 10 }]}
                placeholder="Alert threshold (e.g. 10)"
                placeholderTextColor={colors.textTertiary}
                value={lowThreshold}
                onChangeText={setLowThreshold}
                keyboardType="number-pad"
              />
            )}
          </View>

          {/* Notes */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTES (OPTIONAL)</Text>
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
              Special instructions, side effect reminders, doctor notes
            </Text>
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Take with food. Avoid direct sunlight."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
            {notes.length > 0 && (
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>{notes.length}/500</Text>
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
                <Text style={[styles.appearanceHint, { color: colors.textSecondary }]}>Tap to choose icon shape and color</Text>
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
        type="medication"
      />

      <TimePicker
        visible={timePickerIdx !== null}
        value={timePickerIdx !== null ? (times[timePickerIdx] ?? "08:00") : "08:00"}
        onChange={v => { if (timePickerIdx !== null) updateTime(timePickerIdx, v); }}
        onClose={() => setTimePickerIdx(null)}
        label="SET DOSE TIME"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerBtn: { minWidth: 52, alignItems: "center", justifyContent: "center", height: 44 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6 },
  fieldHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8, marginTop: -2 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  divider: { height: 1, marginVertical: 14 },

  // Schedule
  scheduleHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  requiredText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scheduleTypeRow: { flexDirection: "row", gap: 10 },
  scheduleTypeBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 6,
  },
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

  // Notes
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },

  // Category
  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  categoryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  compoundLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  ingredientRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  ingredientHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  ingredientLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  removeBtn: { padding: 2 },
  ingredientInput: { fontSize: 15, fontFamily: "Inter_400Regular", borderBottomWidth: 1, paddingVertical: 6, marginBottom: 10 },
  ingredientAmountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ingredientAmountInput: { fontSize: 15, fontFamily: "Inter_400Regular", borderBottomWidth: 1, paddingVertical: 6, width: 80 },
  ingredientUnitScroll: { flex: 1 },
  ingredientUnitContent: { gap: 6, paddingRight: 4 },
  ingredientUnitChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  ingredientUnitText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  addIngredientBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 10, paddingVertical: 10, marginTop: 4 },
  addIngredientText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unitScroll: { marginHorizontal: -4 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1, marginHorizontal: 4, marginBottom: 4 },
  unitText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  switchSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  appearanceBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  appearancePreview: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  appearanceInfo: { flex: 1 },
  appearanceLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  appearanceHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
});
