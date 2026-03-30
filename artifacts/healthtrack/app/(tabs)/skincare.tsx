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
import { IconColorSheet } from "@/components/ui/IconColorSheet";

type TabType = "products" | "routines";

export default function SkincareScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    skincareProducts,
    skincareRoutines,
    deleteSkincareProduct,
    deleteSkincareRoutine,
    reorderSkincareProducts,
    updateSkincareProduct,
    archiveSkincareProduct,
    unarchiveSkincareProduct,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [editProduct, setEditProduct] = useState<SkincareProduct | null>(null);
  const [editRoutine, setEditRoutine] = useState<SkincareRoutine | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [editAppearanceProduct, setEditAppearanceProduct] = useState<SkincareProduct | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const sortedProducts = [...skincareProducts]
    .filter(p => !p.status || p.status === "active")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const storageProducts = skincareProducts.filter(p => p.status === "storage");
  const historyProducts = skincareProducts.filter(p => p.status === "history");

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newOrder = [...sortedProducts];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    reorderSkincareProducts(newOrder.map(p => p.id));
  };

  const moveDown = (idx: number) => {
    if (idx === sortedProducts.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newOrder = [...sortedProducts];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    reorderSkincareProducts(newOrder.map(p => p.id));
  };

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
          <View style={styles.headerActions}>
            {activeTab === "products" && skincareProducts.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReorderMode(v => !v);
                }}
                style={[
                  styles.reorderToggle,
                  {
                    backgroundColor: reorderMode ? colors.accent : colors.borderLight,
                    borderColor: reorderMode ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={reorderMode ? "checkmark" : "swap-vertical-outline"}
                  size={14}
                  color={reorderMode ? "#fff" : colors.textSecondary}
                />
                <Text style={[styles.reorderToggleText, { color: reorderMode ? "#fff" : colors.textSecondary }]}>
                  {reorderMode ? "Done" : "Reorder"}
                </Text>
              </Pressable>
            )}
            {!reorderMode && (
              <Pressable
                style={[styles.addBtn, { backgroundColor: colors.accent }]}
                onPress={() => activeTab === "products" ? setShowAddProduct(true) : setShowAddRoutine(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.segmentControl, { backgroundColor: colors.borderLight }]}>
          <Pressable
            style={[styles.segment, activeTab === "products" && [styles.segmentActive, { backgroundColor: colors.card }]]}
            onPress={() => { setActiveTab("products"); setReorderMode(false); }}
          >
            <Text style={[styles.segmentText, { color: activeTab === "products" ? colors.text : colors.textSecondary }]}>
              Products
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, activeTab === "routines" && [styles.segmentActive, { backgroundColor: colors.card }]]}
            onPress={() => { setActiveTab("routines"); setReorderMode(false); }}
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
            <>
              {reorderMode && (
                <View style={[styles.reorderHint, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}30` }]}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
                  <Text style={[styles.reorderHintText, { color: colors.accent }]}>
                    Use arrows to reorder. Tap Done when finished.
                  </Text>
                </View>
              )}
              <View style={styles.list}>
                {sortedProducts.map((product, idx) => (
                  <SkincareProductCard
                    key={product.id}
                    product={product}
                    reorderMode={reorderMode}
                    onMoveUp={() => moveUp(idx)}
                    onMoveDown={() => moveDown(idx)}
                    isFirst={idx === 0}
                    isLast={idx === sortedProducts.length - 1}
                    onEditAppearance={() => setEditAppearanceProduct(product)}
                    onLongPress={reorderMode ? undefined : () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Alert.alert(product.name, "What would you like to do?", [
                        { text: "Edit", onPress: () => { setEditProduct(product); setShowAddProduct(true); } },
                        { text: "Move to Storage", onPress: () => archiveSkincareProduct(product.id, "storage") },
                        { text: "Archive (History)", onPress: () => archiveSkincareProduct(product.id, "history") },
                        { text: "Delete", style: "destructive", onPress: () => handleDeleteProduct(product) },
                        { text: "Cancel", style: "cancel" },
                      ]);
                    }}
                  />
                ))}
              </View>

              {/* Storage section */}
              {storageProducts.length > 0 && (
                <View style={[styles.archivedSection, { borderColor: colors.border }]}>
                  <View style={styles.archivedHeader}>
                    <Ionicons name="archive-outline" size={15} color={colors.textSecondary} />
                    <Text style={[styles.archivedTitle, { color: colors.textSecondary }]}>
                      IN STORAGE ({storageProducts.length})
                    </Text>
                  </View>
                  {storageProducts.map(p => (
                    <Pressable
                      key={p.id}
                      style={[styles.archivedRow, { borderBottomColor: colors.borderLight }]}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(p.name, "Product is in storage", [
                          { text: "Restore to Active", onPress: () => unarchiveSkincareProduct(p.id) },
                          { text: "Move to History", onPress: () => archiveSkincareProduct(p.id, "history") },
                          { text: "Delete", style: "destructive", onPress: () => handleDeleteProduct(p) },
                          { text: "Cancel", style: "cancel" },
                        ]);
                      }}
                    >
                      <View style={[styles.archivedDot, { backgroundColor: p.color }]} />
                      <Text style={[styles.archivedName, { color: colors.textSecondary }]}>{p.name}</Text>
                      <Text style={[styles.archivedBadge, { color: colors.textTertiary }]}>storage</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* History section */}
              {historyProducts.length > 0 && (
                <View style={[styles.archivedSection, { borderColor: colors.border }]}>
                  <View style={styles.archivedHeader}>
                    <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                    <Text style={[styles.archivedTitle, { color: colors.textSecondary }]}>
                      HISTORY ({historyProducts.length})
                    </Text>
                  </View>
                  {historyProducts.map(p => (
                    <Pressable
                      key={p.id}
                      style={[styles.archivedRow, { borderBottomColor: colors.borderLight }]}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(p.name, "Product is in history", [
                          { text: "Restore to Active", onPress: () => unarchiveSkincareProduct(p.id) },
                          { text: "Delete", style: "destructive", onPress: () => handleDeleteProduct(p) },
                          { text: "Cancel", style: "cancel" },
                        ]);
                      }}
                    >
                      <View style={[styles.archivedDot, { backgroundColor: p.color }]} />
                      <Text style={[styles.archivedName, { color: colors.textTertiary }]}>{p.name}</Text>
                      <Text style={[styles.archivedBadge, { color: colors.textTertiary }]}>history</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
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
      <IconColorSheet
        visible={!!editAppearanceProduct}
        onClose={() => setEditAppearanceProduct(null)}
        selectedIcon={editAppearanceProduct?.icon ?? "mci:bottle-tonic"}
        selectedColor={editAppearanceProduct?.color ?? "#34C78B"}
        onIconChange={async (icon) => {
          if (editAppearanceProduct) {
            await updateSkincareProduct(editAppearanceProduct.id, { icon });
            setEditAppearanceProduct(prev => prev ? { ...prev, icon } : null);
          }
        }}
        onColorChange={async (color) => {
          if (editAppearanceProduct) {
            await updateSkincareProduct(editAppearanceProduct.id, { color });
            setEditAppearanceProduct(prev => prev ? { ...prev, color } : null);
          }
        }}
        type="skincare"
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  reorderToggle: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  reorderToggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  reorderHint: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  reorderHintText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  segmentControl: {
    flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 4,
  },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  segmentActive: {
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  segmentText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { gap: 2 },
  archivedSection: {
    borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 4,
  },
  archivedHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  archivedTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  archivedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  archivedDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  archivedName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  archivedBadge: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
