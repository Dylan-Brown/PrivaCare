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

import { Medication, MedicationGroup, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicationGroupCard } from "@/components/medications/MedicationGroupCard";
import { AddMedicationModal } from "@/components/medications/AddMedicationModal";
import { AddGroupModal } from "@/components/medications/AddGroupModal";

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
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>("medications");
  const [showAddMed, setShowAddMed] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editMed, setEditMed] = useState<Medication | null>(null);
  const [editGroup, setEditGroup] = useState<MedicationGroup | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleDeleteMed = (med: Medication) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Medication", `Remove ${med.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMedication(med.id) },
    ]);
  };

  const handleDeleteGroup = (group: MedicationGroup) => {
    Alert.alert("Delete Group", `Remove ${group.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMedicationGroup(group.id) },
    ]);
  };

  const handleRefill = (med: Medication) => {
    Alert.alert("Refill Medication", `How many ${med.unit}s are you adding?`, [
      { text: "Cancel", style: "cancel" },
      { text: "30", onPress: () => refillMedication(med.id, 30) },
      { text: "60", onPress: () => refillMedication(med.id, 60) },
      { text: "90", onPress: () => refillMedication(med.id, 90) },
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
          <Text style={[styles.title, { color: colors.text }]}>Medications</Text>
          <View style={styles.headerRight}>
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.tint }]}
              onPress={() => activeTab === "medications" ? setShowAddMed(true) : setShowAddGroup(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.segmentControl, { backgroundColor: colors.borderLight }]}>
          <Pressable
            style={[styles.segment, activeTab === "medications" && [styles.segmentActive, { backgroundColor: colors.card, shadowColor: colors.text }]]}
            onPress={() => setActiveTab("medications")}
          >
            <Text style={[styles.segmentText, { color: activeTab === "medications" ? colors.text : colors.textSecondary }]}>
              Individual
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, activeTab === "groups" && [styles.segmentActive, { backgroundColor: colors.card, shadowColor: colors.text }]]}
            onPress={() => setActiveTab("groups")}
          >
            <Text style={[styles.segmentText, { color: activeTab === "groups" ? colors.text : colors.textSecondary }]}>
              Groups
            </Text>
          </Pressable>
        </View>

        {activeTab === "medications" ? (
          medications.length === 0 ? (
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
            <View style={styles.list}>
              {medications.map(med => (
                <MedicationCard
                  key={med.id}
                  medication={med}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(med.name, "What would you like to do?", [
                      { text: "Edit", onPress: () => { setEditMed(med); setShowAddMed(true); } },
                      { text: "Refill", onPress: () => handleRefill(med) },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteMed(med) },
                      { text: "Cancel", style: "cancel" },
                    ]);
                  }}
                />
              ))}
            </View>
          )
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
                      { text: "Edit", onPress: () => { setEditGroup(group); setShowAddGroup(true); } },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  headerSection: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 8,
  },
  title: { fontSize: 32, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", gap: 8 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  segmentControl: {
    flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 4,
  },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  segmentActive: {
    shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
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
