import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkincareProduct, SkincareRoutine, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { SkincareProductCard } from "@/components/skincare/SkincareProductCard";
import { SkincareRoutineCard } from "@/components/skincare/SkincareRoutineCard";
import { AddSkincareProductModal } from "@/components/skincare/AddSkincareProductModal";
import { AddRoutineModal } from "@/components/skincare/AddRoutineModal";

type TabType = "products" | "routines";

export default function SkincareScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    skincareProducts,
    skincareRoutines,
    deleteSkincareProduct,
    deleteSkincareRoutine,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [editProduct, setEditProduct] = useState<SkincareProduct | null>(null);
  const [editRoutine, setEditRoutine] = useState<SkincareRoutine | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleDeleteProduct = (product: SkincareProduct) => {
    Alert.alert("Delete Product", `Remove ${product.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSkincareProduct(product.id) },
    ]);
  };

  const handleDeleteRoutine = (routine: SkincareRoutine) => {
    Alert.alert("Delete Routine", `Remove ${routine.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSkincareRoutine(routine.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" && { paddingTop: topInset, paddingBottom: 34 + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.text }]}>Skincare</Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => activeTab === "products" ? setShowAddProduct(true) : setShowAddRoutine(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.segmentControl, { backgroundColor: colors.borderLight }]}>
          <Pressable
            style={[styles.segment, activeTab === "products" && [styles.segmentActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab("products")}
          >
            <Text style={[styles.segmentText, { color: activeTab === "products" ? colors.text : colors.textSecondary }]}>
              Products
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, activeTab === "routines" && [styles.segmentActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab("routines")}
          >
            <Text style={[styles.segmentText, { color: activeTab === "routines" ? colors.text : colors.textSecondary }]}>
              Routines
            </Text>
          </Pressable>
        </View>

        {activeTab === "products" ? (
          skincareProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="sparkles" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No products yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Add your skincare products to start tracking your routine
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                onPress={() => setShowAddProduct(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Add Product</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {skincareProducts.map(product => (
                <SkincareProductCard
                  key={product.id}
                  product={product}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(product.name, "What would you like to do?", [
                      { text: "Edit", onPress: () => { setEditProduct(product); setShowAddProduct(true); } },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteProduct(product) },
                      { text: "Cancel", style: "cancel" },
                    ]);
                  }}
                />
              ))}
            </View>
          )
        ) : (
          skincareRoutines.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.purpleLight }]}>
                <Ionicons name="flower" size={32} color={colors.purple} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No routines yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Create AM/PM routines to log all your products with one tap
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.purple }]}
                onPress={() => setShowAddRoutine(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Routine</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {skincareRoutines.map(routine => (
                <Pressable
                  key={routine.id}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(routine.name, "What would you like to do?", [
                      { text: "Edit", onPress: () => { setEditRoutine(routine); setShowAddRoutine(true); } },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteRoutine(routine) },
                      { text: "Cancel", style: "cancel" },
                    ]);
                  }}
                >
                  <SkincareRoutineCard routine={routine} />
                </Pressable>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <AddSkincareProductModal
        visible={showAddProduct}
        onClose={() => { setShowAddProduct(false); setEditProduct(null); }}
        editProduct={editProduct}
      />
      <AddRoutineModal
        visible={showAddRoutine}
        onClose={() => { setShowAddRoutine(false); setEditRoutine(null); }}
        editRoutine={editRoutine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  headerSection: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8,
  },
  title: { fontSize: 32, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  segmentControl: {
    flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 4,
  },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  segmentActive: {
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  segmentText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { gap: 2 },
  emptyState: { alignItems: "center", paddingVertical: 50, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4,
  },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
