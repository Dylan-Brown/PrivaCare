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

import { SkincareProduct, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#FF6B6B", "#FF9F0A", "#34C78B", "#007AFF", "#AF52DE", "#FF6CBF", "#5AC8FA", "#FF8C42"];
const PRODUCT_TYPES = [
  "Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen",
  "Eye Cream", "Mask", "Exfoliant", "Oil", "Mist", "Tool", "Other"
];

type Props = {
  visible: boolean;
  onClose: () => void;
  editProduct?: SkincareProduct | null;
};

export function AddSkincareProductModal({ visible, onClose, editProduct }: Props) {
  const { colors } = useTheme();
  const { addSkincareProduct, updateSkincareProduct } = useApp();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(editProduct?.name || "");
  const [brand, setBrand] = useState(editProduct?.brand || "");
  const [type, setType] = useState(editProduct?.type || "Serum");
  const [selectedColor, setSelectedColor] = useState(editProduct?.color || COLORS[0]);

  const reset = () => {
    if (!editProduct) {
      setName(""); setBrand(""); setType("Serum"); setSelectedColor(COLORS[0]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a product name.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editProduct) {
      await updateSkincareProduct(editProduct.id, {
        name: name.trim(),
        brand: brand.trim(),
        type,
        color: selectedColor,
      });
    } else {
      await addSkincareProduct({
        name: name.trim(),
        brand: brand.trim(),
        type,
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
            {editProduct ? "Edit Product" : "Add Product"}
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
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TYPE</Text>
            <View style={styles.typeGrid}>
              {PRODUCT_TYPES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: type === t ? selectedColor : colors.borderLight,
                      borderColor: type === t ? selectedColor : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.typeText, { color: type === t ? "#fff" : colors.text }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 44, alignItems: "center", justifyContent: "center", height: 44 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  divider: { height: 1, marginVertical: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  typeText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
