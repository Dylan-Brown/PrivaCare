import React, { useEffect, useState } from "react";
import {
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
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompoundIngredient, Medication, MedicationCategory, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#34C78B", "#FF6B6B", "#007AFF", "#FF9F0A", "#AF52DE", "#FF6CBF", "#5AC8FA", "#4CD964"];
const UNITS  = ["mg", "ml", "tablet", "capsule", "drops", "IU", "mcg", "g"];

const CATEGORIES: { key: MedicationCategory; label: string; icon: string }[] = [
  { key: "prescription", label: "Prescription", icon: "medical" },
  { key: "generic",      label: "Generic",      icon: "flask" },
  { key: "supplement",   label: "Supplement",   icon: "leaf" },
];

const DEFAULT_INGREDIENTS: CompoundIngredient[] = [
  { name: "", amount: "", unit: "mg" },
  { name: "", amount: "", unit: "mg" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  editMed?: Medication | null;
};

export function AddMedicationModal({ visible, onClose, editMed }: Props) {
  const { colors, isDark } = useTheme();
  const { addMedication, updateMedication } = useApp();
  const insets = useSafeAreaInsets();

  const [name, setName]               = useState("");
  const [brandName, setBrandName]     = useState("");
  const [dosage, setDosage]           = useState("");
  const [unit, setUnit]               = useState("mg");
  const [bottleCount, setBottleCount] = useState("30");
  const [remaining, setRemaining]     = useState("30");
  const [lowThreshold, setLowThreshold] = useState("10");
  const [notifyLow, setNotifyLow]     = useState(true);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [category, setCategory]       = useState<MedicationCategory | undefined>(undefined);
  const [isCompound, setIsCompound]   = useState(false);
  const [ingredients, setIngredients] = useState<CompoundIngredient[]>(DEFAULT_INGREDIENTS);

  useEffect(() => {
    if (visible) {
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
        setCategory(editMed.category);
        setIsCompound(editMed.isCompound ?? false);
        setIngredients(
          editMed.ingredients && editMed.ingredients.length >= 2
            ? editMed.ingredients
            : DEFAULT_INGREDIENTS
        );
      } else {
        setName(""); setBrandName(""); setDosage(""); setUnit("mg");
        setBottleCount("30"); setRemaining("30");
        setLowThreshold("10"); setNotifyLow(true);
        setSelectedColor(COLORS[0]); setCategory(undefined);
        setIsCompound(false); setIngredients(DEFAULT_INGREDIENTS);
      }
    }
  }, [visible, editMed]);

  const syncRemaining = (bottle: string) => {
    if (!editMed) setRemaining(bottle);
    setBottleCount(bottle);
  };

  const toggleCompound = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCompound(val);
    if (val && ingredients.length < 2) {
      setIngredients(DEFAULT_INGREDIENTS);
    }
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a medication name.");
      return;
    }

    if (isCompound) {
      const hasValidIngredients = ingredients.some(ing => ing.name.trim());
      if (!hasValidIngredients) {
        Alert.alert("Required", "Please enter at least one ingredient name.");
        return;
      }
    }

    const bottle    = Math.max(1, parseInt(bottleCount) || 30);
    const rem       = Math.max(0, parseInt(remaining) || 0);
    const threshold = parseInt(lowThreshold) || 10;

    const cleanIngredients = isCompound
      ? ingredients.filter(ing => ing.name.trim() || ing.amount.trim())
      : [];

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editMed) {
      await updateMedication(editMed.id, {
        name: name.trim(),
        brandName: brandName.trim() || undefined,
        dosage: dosage.trim(),
        unit,
        bottleCount: bottle,
        totalCount: bottle,
        remainingCount: rem,
        lowStockThreshold: threshold,
        notifyLowStock: notifyLow,
        color: selectedColor,
        category,
        isCompound,
        ingredients: cleanIngredients,
      });
    } else {
      await addMedication({
        name: name.trim(),
        brandName: brandName.trim() || undefined,
        dosage: dosage.trim(),
        unit,
        bottleCount: bottle,
        totalCount: bottle,
        remainingCount: rem,
        lowStockThreshold: threshold,
        notifyLowStock: notifyLow,
        color: selectedColor,
        status: "active",
        awaitingRefill: false,
        category,
        isCompound,
        ingredients: cleanIngredients,
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

          {/* Category */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TYPE</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => {
                const active = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => {
                      setCategory(active ? undefined : cat.key);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? selectedColor : colors.borderLight,
                        borderColor: active ? selectedColor : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={14}
                      color={active ? "#fff" : colors.textSecondary}
                    />
                    <Text style={[styles.categoryText, { color: active ? "#fff" : colors.text }]}>
                      {cat.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Compound toggle */}
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
                      <Text style={[styles.ingredientLabel, { color: colors.textSecondary }]}>
                        Ingredient {idx + 1}
                      </Text>
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
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.ingredientUnitScroll}
                        contentContainerStyle={styles.ingredientUnitContent}
                      >
                        {UNITS.map(u => (
                          <Pressable
                            key={u}
                            onPress={() => updateIngredient(idx, "unit", u)}
                            style={[
                              styles.ingredientUnitChip,
                              {
                                backgroundColor: ing.unit === u ? selectedColor : colors.borderLight,
                                borderColor: ing.unit === u ? selectedColor : colors.border,
                              },
                            ]}
                          >
                            <Text style={[
                              styles.ingredientUnitText,
                              { color: ing.unit === u ? "#fff" : colors.text },
                            ]}>
                              {u}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                ))}

                <Pressable
                  onPress={addIngredient}
                  style={[styles.addIngredientBtn, { borderColor: selectedColor }]}
                >
                  <Ionicons name="add" size={18} color={selectedColor} />
                  <Text style={[styles.addIngredientText, { color: selectedColor }]}>
                    Add Ingredient
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Dosage + Unit (overall dose for compound, or sole dosage) */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {isCompound ? "TOTAL DOSE LABEL (OPTIONAL)" : "DOSAGE AMOUNT"}
            </Text>
            {isCompound && (
              <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                Overall dose label shown on the card (e.g. "1 tablet")
              </Text>
            )}
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
              </>
            )}
          </View>

          {/* Pill Count */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BOTTLE SIZE</Text>
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
              How many pills/doses came in the bottle
            </Text>
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
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
              How many you currently have left
            </Text>
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
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                  Alert when fewer than {lowThreshold || "?"} remain
                </Text>
              </View>
              <Switch
                value={notifyLow}
                onValueChange={setNotifyLow}
                trackColor={{ false: colors.border, true: selectedColor }}
                thumbColor="#fff"
                ios_backgroundColor={colors.border}
              />
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

          {/* Color */}
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

  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1,
  },
  categoryText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  compoundLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },

  ingredientRow: {
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  ingredientHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
  },
  ingredientLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  removeBtn: { padding: 2 },
  ingredientInput: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    borderBottomWidth: 1, paddingVertical: 6, marginBottom: 10,
  },
  ingredientAmountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ingredientAmountInput: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    borderBottomWidth: 1, paddingVertical: 6,
    width: 80,
  },
  ingredientUnitScroll: { flex: 1 },
  ingredientUnitContent: { gap: 6, paddingRight: 4 },
  ingredientUnitChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1,
  },
  ingredientUnitText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  addIngredientBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1.5, borderStyle: "dashed",
    borderRadius: 10, paddingVertical: 10, marginTop: 4,
  },
  addIngredientText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  unitScroll: { marginHorizontal: -4 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    borderWidth: 1, marginHorizontal: 4, marginBottom: 4,
  },
  unitText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  switchSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
