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

import { SkincareProduct, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/ui/AppIcon";
import { IconColorSheet, SHARED_COLORS } from "@/components/ui/IconColorSheet";

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

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("Serum");
  const [selectedColor, setSelectedColor] = useState(SHARED_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState("mci:bottle-tonic");
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editProduct) {
        setName(editProduct.name);
        setBrand(editProduct.brand);
        setType(editProduct.type);
        setSelectedColor(editProduct.color);
        setSelectedIcon(editProduct.icon ?? "mci:bottle-tonic");
      } else {
        setName(""); setBrand(""); setType("Serum");
        setSelectedColor(SHARED_COLORS[0]);
        setSelectedIcon("mci:bottle-tonic");
      }
    }
  }, [visible, editProduct]);

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
        icon: selectedIcon,
      });
    } else {
      await addSkincareProduct({
        name: name.trim(),
        brand: brand.trim(),
        type,
        color: selectedColor,
        icon: selectedIcon,
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
                  onPress={() => {
                    setType(t);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
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
                <Text style={[styles.appearanceHint, { color: colors.textSecondary }]}>
                  Tap to choose icon and color
                </Text>
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
  appearanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  appearancePreview: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  appearanceInfo: { flex: 1 },
  appearanceLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  appearanceHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
});
