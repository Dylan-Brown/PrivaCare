import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

import { Medication, MedicationGroup, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicationGroupCard } from "@/components/medications/MedicationGroupCard";
import { AddMedicationModal } from "@/components/medications/AddMedicationModal";
import { AddGroupModal } from "@/components/medications/AddGroupModal";
import { UpdateCountModal } from "@/components/medications/UpdateCountModal";
import { InteractionsBanner } from "@/components/medications/InteractionsBanner";
import { checkAllInteractions, DrugInteraction } from "@/utils/drugInteractions";
import { IconColorSheet } from "@/components/ui/IconColorSheet";

const COLOR_ORDER = [
  "#34C78B", "#FF6B6B", "#007AFF", "#FF9F0A",
  "#AF52DE", "#FF6CBF", "#5AC8FA", "#4CD964",
];

function colorSortKey(color: string): number {
  const idx = COLOR_ORDER.indexOf(color);
  return idx === -1 ? COLOR_ORDER.length : idx;
}

type TabType = "medications" | "groups";

export default function MedicationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    medications,
    medicationGroups,
    deleteMedication,
    deleteMedicationGroup,
    refillMedication,
    archiveMedication,
    unarchiveMedication,
    setAwaitingRefill,
    reorderMedications,
    updateMedication,
    userProfile,
  } = useApp();

  const [activeTab, setActiveTab]         = useState<TabType>("medications");
  const [showAddMed, setShowAddMed]       = useState(false);
  const [showAddGroup, setShowAddGroup]   = useState(false);
  const [editMed, setEditMed]             = useState<Medication | null>(null);
  const [editGroup, setEditGroup]         = useState<MedicationGroup | null>(null);
  const [updateCountMed, setUpdateCountMed] = useState<Medication | null>(null);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [reorderMode, setReorderMode]     = useState(false);
  const [editAppearanceMed, setEditAppearanceMed] = useState<Medication | null>(null);

  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [interactions, setInteractions]   = useState<DrugInteraction[]>([]);
  const [interactionWarnings, setInteractionWarnings] = useState<string[]>([]);
  const [interactionsCheckedAt, setInteractionsCheckedAt] = useState<string | null>(null);
  const [interactionNetworkError, setInteractionNetworkError] = useState(false);
  const interactionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runInteractionCheck = useCallback(async () => {
    const activeMedNames = medications
      .filter(m => m.status === "active")
      .map(m => m.name);
    if (activeMedNames.length === 0) {
      setInteractions([]);
      setInteractionWarnings([]);
      setInteractionsCheckedAt(null);
      setInteractionNetworkError(false);
      return;
    }
    setInteractionsLoading(true);
    setInteractionNetworkError(false);
    try {
      const result = await checkAllInteractions(activeMedNames, userProfile);
      setInteractions(result.interactions);
      setInteractionWarnings(result.warnings);
      setInteractionsCheckedAt(result.checkedAt);
    } catch (err: any) {
      const isNetworkErr =
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch") ||
        err?.message?.toLowerCase().includes("failed to fetch") ||
        err?.name === "TypeError";
      if (isNetworkErr) {
        setInteractionNetworkError(true);
      }
    } finally {
      setInteractionsLoading(false);
    }
  }, [medications, userProfile]);

  useEffect(() => {
    if (interactionDebounce.current) clearTimeout(interactionDebounce.current);
    interactionDebounce.current = setTimeout(() => {
      runInteractionCheck();
    }, 800);
    return () => {
      if (interactionDebounce.current) clearTimeout(interactionDebounce.current);
    };
  }, [runInteractionCheck]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const activeMeds   = medications.filter(m => m.status === "active");
  const archivedMeds = medications.filter(m => m.status === "storage" || m.status === "history");

  const allHaveSortOrder = activeMeds.every(m => m.sortOrder !== undefined);

  const sortedActiveMeds = useMemo(() => {
    return [...activeMeds].sort((a, b) => {
      if (allHaveSortOrder) {
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }
      const colorDiff = colorSortKey(a.color) - colorSortKey(b.color);
      if (colorDiff !== 0) return colorDiff;
      return a.name.localeCompare(b.name);
    });
  }, [activeMeds, allHaveSortOrder]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ids = sortedActiveMeds.map(m => m.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderMedications(ids);
  };

  const moveDown = (idx: number) => {
    if (idx === sortedActiveMeds.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ids = sortedActiveMeds.map(m => m.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderMedications(ids);
  };

  const handleMedLongPress = (med: Medication) => {
    if (reorderMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isActive = med.status === "active";

    if (!isActive) {
      Alert.alert(med.name, `${med.status === "storage" ? "In Storage" : "History"} — what would you like to do?`, [
        { text: "Restore to Active", onPress: () => unarchiveMedication(med.id) },
        { text: "Delete Permanently", style: "destructive", onPress: () => confirmDelete(med) },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    const awaitingOptions = med.awaitingRefill
      ? [{ text: "Cancel Await Refill", onPress: () => setAwaitingRefill(med.id, false) }]
      : [];

    Alert.alert(med.name, "What would you like to do?", [
      { text: "Edit",          onPress: () => { setEditMed(med); setShowAddMed(true); } },
      { text: "Update Count",  onPress: () => setUpdateCountMed(med) },
      { text: "Refill",        onPress: () => handleRefill(med) },
      { text: "Move to Storage", onPress: () => {
          Alert.alert("Move to Storage?", `${med.name} will be marked inactive but kept in your list.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Move to Storage", onPress: () => archiveMedication(med.id, "storage") },
          ]);
        }
      },
      { text: "Archive to History", style: "destructive", onPress: () => {
          Alert.alert("Archive to History?", `${med.name} will be marked as no longer available. Remaining count will be set to 0.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Archive", style: "destructive", onPress: () => archiveMedication(med.id, "history") },
          ]);
        }
      },
      ...awaitingOptions,
      { text: "Delete",        style: "destructive", onPress: () => confirmDelete(med) },
      { text: "Cancel",        style: "cancel" },
    ]);
  };

  const confirmDelete = (med: Medication) => {
    Alert.alert("Delete Medication", `Permanently remove ${med.name}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMedication(med.id) },
    ]);
  };

  const handleDeleteGroup = (group: MedicationGroup) => {
    Alert.alert("Delete Group", `Remove "${group.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMedicationGroup(group.id) },
    ]);
  };

  const handleRefill = (med: Medication) => {
    Alert.alert(
      `Refill ${med.name}`,
      `Current: ${med.remainingCount} · Bottle: ${med.bottleCount ?? med.totalCount}\nHow many are you adding?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "30",  onPress: () => refillMedication(med.id, 30) },
        { text: "60",  onPress: () => refillMedication(med.id, 60) },
        { text: "90",  onPress: () => refillMedication(med.id, 90) },
        { text: "Custom", onPress: () => setUpdateCountMed(med) },
      ]
    );
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
          <Text style={[styles.title, { color: colors.text }]}>Medications</Text>
          <View style={styles.headerActions}>
            {activeTab === "medications" && activeMeds.length > 1 && (
              <Pressable
                style={[
                  styles.reorderToggle,
                  {
                    backgroundColor: reorderMode ? colors.tint : colors.borderLight,
                    borderColor: reorderMode ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReorderMode(v => !v);
                }}
              >
                <Ionicons
                  name={reorderMode ? "checkmark" : "swap-vertical-outline"}
                  size={16}
                  color={reorderMode ? "#fff" : colors.textSecondary}
                />
                <Text style={[styles.reorderToggleText, { color: reorderMode ? "#fff" : colors.textSecondary }]}>
                  {reorderMode ? "Done" : "Reorder"}
                </Text>
              </Pressable>
            )}
            {!reorderMode && (
              <Pressable
                style={[styles.addBtn, { backgroundColor: colors.tint }]}
                onPress={() => activeTab === "medications" ? setShowAddMed(true) : setShowAddGroup(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.segmentControl, { backgroundColor: colors.borderLight }]}>
          {(["medications", "groups"] as TabType[]).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.segment,
                activeTab === tab && [styles.segmentActive, { backgroundColor: colors.card, shadowColor: colors.text }],
              ]}
              onPress={() => {
                setActiveTab(tab);
                setReorderMode(false);
              }}
            >
              <Text style={[styles.segmentText, { color: activeTab === tab ? colors.text : colors.textSecondary }]}>
                {tab === "medications" ? "Individual" : "Groups"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "medications" && medications.filter(m => m.status === "active").length > 0 && (
          <InteractionsBanner
            interactions={interactions}
            loading={interactionsLoading}
            warnings={interactionWarnings}
            lastChecked={interactionsCheckedAt}
            onRecheck={runInteractionCheck}
            networkError={interactionNetworkError}
          />
        )}

        {activeTab === "medications" ? (
          <>
            {activeMeds.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.tintLight }]}>
                  <Ionicons name="medkit" size={32} color={colors.tint} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No medications yet</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Tap + to add your first medication
                </Text>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
                  onPress={() => setShowAddMed(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>Add Medication</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {reorderMode && (
                  <View style={[styles.reorderHint, { backgroundColor: colors.tintLight, borderColor: `${colors.tint}30` }]}>
                    <Ionicons name="information-circle-outline" size={15} color={colors.tint} />
                    <Text style={[styles.reorderHintText, { color: colors.tint }]}>
                      Use the arrows to change the order. Tap Done when finished.
                    </Text>
                  </View>
                )}
                <View style={styles.list}>
                  {sortedActiveMeds.map((med, idx) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      onLongPress={() => handleMedLongPress(med)}
                      reorderMode={reorderMode}
                      onMoveUp={() => moveUp(idx)}
                      onMoveDown={() => moveDown(idx)}
                      isFirst={idx === 0}
                      isLast={idx === sortedActiveMeds.length - 1}
                      onEditAppearance={() => setEditAppearanceMed(med)}
                    />
                  ))}
                </View>
              </>
            )}

            {archivedMeds.length > 0 && !reorderMode && (
              <View style={styles.archiveSection}>
                <Pressable
                  style={styles.archiveHeader}
                  onPress={() => {
                    setArchiveExpanded(v => !v);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.archiveHeaderLeft}>
                    <Ionicons name="archive-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.archiveTitle, { color: colors.textSecondary }]}>
                      Archived ({archivedMeds.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={archiveExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>

                {archiveExpanded && (
                  <View style={styles.list}>
                    {archivedMeds.map(med => (
                      <MedicationCard
                        key={med.id}
                        medication={med}
                        archived
                        onLongPress={() => handleMedLongPress(med)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          medicationGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.blueLight }]}>
                <Ionicons name="layers" size={32} color={colors.blue} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Group medications by time (morning, evening, etc.) for quick logging
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.blue }]}
                onPress={() => setShowAddGroup(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Group</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {medicationGroups.map(group => (
                <Pressable
                  key={group.id}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(group.name, "What would you like to do?", [
                      { text: "Edit",   onPress: () => { setEditGroup(group); setShowAddGroup(true); } },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteGroup(group) },
                      { text: "Cancel", style: "cancel" },
                    ]);
                  }}
                >
                  <MedicationGroupCard group={group} />
                </Pressable>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <AddMedicationModal
        visible={showAddMed}
        onClose={() => { setShowAddMed(false); setEditMed(null); }}
        editMed={editMed}
      />
      <AddGroupModal
        visible={showAddGroup}
        onClose={() => { setShowAddGroup(false); setEditGroup(null); }}
        editGroup={editGroup}
      />
      <UpdateCountModal
        visible={!!updateCountMed}
        medication={updateCountMed}
        onClose={() => setUpdateCountMed(null)}
      />
      <IconColorSheet
        visible={!!editAppearanceMed}
        onClose={() => setEditAppearanceMed(null)}
        selectedIcon={editAppearanceMed?.icon ?? "mci:pill"}
        selectedColor={editAppearanceMed?.color ?? "#34C78B"}
        onIconChange={async (icon) => {
          if (editAppearanceMed) {
            await updateMedication(editAppearanceMed.id, { icon });
            setEditAppearanceMed(prev => prev ? { ...prev, icon } : null);
          }
        }}
        onColorChange={async (color) => {
          if (editAppearanceMed) {
            await updateMedication(editAppearanceMed.id, { color });
            setEditAppearanceMed(prev => prev ? { ...prev, color } : null);
          }
        }}
        type="medication"
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
  segmentControl: { flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 4 },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  segmentActive: { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
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

  archiveSection: { marginTop: 8 },
  archiveHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 4, marginBottom: 6,
  },
  archiveHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  archiveTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
