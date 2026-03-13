import React, { useState } from "react";
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

import { SkincareRoutine, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#FF6B6B", "#FF9F0A", "#34C78B", "#007AFF", "#AF52DE", "#FF6CBF", "#5AC8FA", "#FF8C42"];
const TIME_LABELS = ["AM Routine", "PM Routine", "Morning", "Evening", "Weekly", "Custom"];

type Props = {
  visible: boolean;
  onClose: () => void;
  editRoutine?: SkincareRoutine | null;
};

export function AddRoutineModal({ visible, onClose, editRoutine }: Props) {
  const { colors } = useTheme();
  const { skincareProducts, addSkincareRoutine, updateSkincareRoutine } = useApp();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(editRoutine?.name || "");
  const [timeLabel, setTimeLabel] = useState(editRoutine?.timeLabel || "AM Routine");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(editRoutine?.productIds || []);
  const [selectedColor, setSelectedColor] = useState(editRoutine?.color || COLORS[0]);

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const reset = () => {
    if (!editRoutine) {
      setName(""); setTimeLabel("AM Routine");
      setSelectedProducts([]); setSelectedColor(COLORS[0]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Required", "Please enter a routine name."); return; }
    if (selectedProducts.length === 0) { Alert.alert("Required", "Please select at least one product."); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editRoutine) {
      await updateSkincareRoutine(editRoutine.id, {
        name: name.trim(), timeLabel, productIds: selectedProducts, color: selectedColor,
      });
    } else {
      await addSkincareRoutine({
        name: name.trim(), timeLabel, productIds: selectedProducts, color: selectedColor,
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
            {editRoutine ? "Edit Routine" : "New Routine"}
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ROUTINE NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Evening Glow"
              placeholderTextColor={colors.textTertiary}
              value={name} onChangeText={setName} autoFocus
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TIME</Text>
            <View style={styles.chipGrid}>
              {TIME_LABELS.map(t => (
                <Pressable
                  key={t} onPress={() => setTimeLabel(t)}
                  style={[styles.chip, {
                    backgroundColor: timeLabel === t ? selectedColor : colors.borderLight,
                    borderColor: timeLabel === t ? selectedColor : colors.border,
                  }]}
                >
                  <Text style={[styles.chipText, { color: timeLabel === t ? "#fff" : colors.text }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              PRODUCTS ({selectedProducts.length} selected)
            </Text>
            {skincareProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No products added yet. Add products first.
              </Text>
            ) : (
              skincareProducts.map(product => {
                const isSelected = selectedProducts.includes(product.id);
                return (
                  <Pressable
                    key={product.id} onPress={() => toggleProduct(product.id)}
                    style={[styles.productRow, {
                      backgroundColor: isSelected ? `${product.color || selectedColor}15` : "transparent",
                      borderColor: isSelected ? `${product.color || selectedColor}40` : colors.border,
                    }]}
                  >
                    <View style={[styles.productDot, { backgroundColor: product.color || selectedColor }]} />
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productBrand, { color: colors.textSecondary }]}>
                        {product.brand} · {product.type}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={product.color || selectedColor} />}
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
                  key={c} onPress={() => setSelectedColor(c)}
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
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  productRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6,
  },
  productDot: { width: 10, height: 10, borderRadius: 5 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  productBrand: { fontSize: 12, fontFamily: "Inter_400Regular" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  colorDotSelected: {
    transform: [{ scale: 1.15 }], shadowColor: "#000",
    shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
