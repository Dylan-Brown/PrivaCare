import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayLogEntry, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/ui/AppIcon";
import { formatTime, isDateExpired, isDateExpiringSoon } from "@/utils/scheduleCompute";

type Props = {
  visible: boolean;
  onClose: () => void;
  scheduledTime: string;
  itemType: "medication" | "skincare";
  entries: DayLogEntry[];
  date: string;
  allComplete: boolean;
};

export function GroupDetailModal({
  visible, onClose, scheduledTime, itemType, entries, date, allComplete,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { medications, skincareProducts, completeDayEntry, uncompleteDayEntry } = useApp();
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const timeLabel = formatTime(scheduledTime);
  const typeLabel = itemType === "medication" ? "Medications" : "Skincare";

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggle = async (entry: DayLogEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (entry.isComplete) {
      await uncompleteDayEntry(date, entry.id);
    } else {
      await completeDayEntry(date, entry.id);
    }
  };

  const allDone = entries.every(e => e.isComplete);

  const getMedDetails = (itemId: string) => medications.find(m => m.id === itemId);
  const getProductDetails = (itemId: string) => skincareProducts.find(p => p.id === itemId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={[styles.timeLabel, { color: colors.tint }]}>{timeLabel}</Text>
            <Text style={[styles.typeLabel, { color: colors.text }]}>{typeLabel}</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.borderLight }]}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {allDone && (
          <View style={[styles.allDoneBanner, { backgroundColor: `${colors.tint}15`, borderColor: `${colors.tint}30` }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
            <Text style={[styles.allDoneText, { color: colors.tint }]}>All done for this slot!</Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={{ gap: 10 }}>
          {entries.map(entry => {
            const medDetails = itemType === "medication" ? getMedDetails(entry.itemId) : null;
            const productDetails = itemType === "skincare" ? getProductDetails(entry.itemId) : null;
            const itemColor = medDetails?.color ?? productDetails?.color ?? colors.tint;
            const itemIcon = medDetails?.icon ?? productDetails?.icon ?? (itemType === "medication" ? "mci:pill" : "mci:bottle-tonic");
            const notes = medDetails?.notes;
            const expiryDate = productDetails?.expiryDate;
            const isExpired = expiryDate ? isDateExpired(expiryDate) : false;
            const isExpiringSoon = expiryDate ? isDateExpiringSoon(expiryDate) : false;
            const notesExpanded = expandedNotes.has(entry.id);

            return (
              <View
                key={entry.id}
                style={[
                  styles.entryCard,
                  { backgroundColor: colors.background, borderColor: entry.isComplete ? `${colors.tint}40` : colors.border },
                ]}
              >
                {/* Expiry warning */}
                {isExpired && (
                  <View style={[styles.expiryBanner, { backgroundColor: `${colors.danger}15` }]}>
                    <Ionicons name="warning-outline" size={14} color={colors.danger} />
                    <Text style={[styles.expiryText, { color: colors.danger }]}>Expired</Text>
                  </View>
                )}
                {!isExpired && isExpiringSoon && expiryDate && (
                  <View style={[styles.expiryBanner, { backgroundColor: `${colors.amber}15` }]}>
                    <Ionicons name="time-outline" size={14} color={colors.amber} />
                    <Text style={[styles.expiryText, { color: colors.amber }]}>
                      Expires {new Date(expiryDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                )}

                <View style={styles.entryRow}>
                  <View style={[styles.iconCircle, { backgroundColor: `${itemColor}20` }]}>
                    <AppIcon icon={itemIcon} size={20} color={itemColor} />
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryName, { color: colors.text }]}>{entry.itemName}</Text>
                    {medDetails && (
                      <Text style={[styles.entryDosage, { color: colors.textSecondary }]}>
                        {medDetails.dosage} {medDetails.unit}
                        {medDetails.brandName ? ` · ${medDetails.brandName}` : ""}
                      </Text>
                    )}
                    {productDetails && (
                      <Text style={[styles.entryDosage, { color: colors.textSecondary }]}>
                        {productDetails.type}{productDetails.brand ? ` · ${productDetails.brand}` : ""}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleToggle(entry)}
                    style={[
                      styles.completeBtn,
                      {
                        backgroundColor: entry.isComplete ? `${colors.tint}20` : colors.card,
                        borderColor: entry.isComplete ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={entry.isComplete ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={entry.isComplete ? colors.tint : colors.textTertiary}
                    />
                    <Text style={[styles.completeBtnText, { color: entry.isComplete ? colors.tint : colors.textSecondary }]}>
                      {entry.isComplete ? "Done" : "Mark Done"}
                    </Text>
                  </Pressable>
                </View>

                {/* Notes (medications) */}
                {notes && (
                  <Pressable onPress={() => toggleNotes(entry.id)} style={styles.notesToggle}>
                    <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.notesToggleText, { color: colors.textSecondary }]}>
                      {notesExpanded ? "Hide notes" : "Show notes"}
                    </Text>
                    <Ionicons name={notesExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.textTertiary} />
                  </Pressable>
                )}
                {notes && notesExpanded && (
                  <View style={[styles.notesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>{notes}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <Pressable
          style={[styles.doneBtn, { backgroundColor: colors.tint }]}
          onPress={onClose}
        >
          <Text style={styles.doneBtnText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerInfo: { gap: 2 },
  timeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  typeLabel: { fontSize: 22, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  allDoneBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    marginBottom: 14,
  },
  allDoneText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  list: { marginBottom: 16 },
  entryCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  expiryBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  expiryText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  entryRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  entryInfo: { flex: 1, gap: 2 },
  entryName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  entryDosage: { fontSize: 13, fontFamily: "Inter_400Regular" },
  completeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1, flexShrink: 0,
  },
  completeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notesToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  notesToggleText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  notesBox: {
    marginHorizontal: 14, marginBottom: 12,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  doneBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
