import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { MedicationGroup, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { MedicationCard } from "./MedicationCard";
import { todayString, toDateString } from "@/utils/scheduleCompute";

type Props = {
  group: MedicationGroup;
  onEdit?: () => void;
};

export function MedicationGroupCard({ group, onEdit }: Props) {
  const { colors } = useTheme();
  const { medications, medicationLogs, logMedicationGroup } = useApp();
  const [logging, setLogging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);

  const groupMeds = medications.filter(m => group.medicationIds.includes(m.id));
  const today = todayString();
  const todayLogs = medicationLogs.filter(l => toDateString(new Date(l.takenAt)) === today);
  const loggedIds = new Set(todayLogs.filter(l => l.groupId === group.id).map(l => l.medicationId));
  const allLogged = groupMeds.length > 0 && groupMeds.every(m => loggedIds.has(m.id));

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLogAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(withSpring(0.97), withSpring(1));
    setLogging(true);
    await logMedicationGroup(group.id);
    setLogging(false);
  };

  const accentColor = group.color || colors.tint;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name="layers" size={18} color={accentColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
              {group.timeLabel} · {groupMeds.length} medication{groupMeds.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {allLogged && (
              <View style={[styles.doneBadge, { backgroundColor: colors.tintLight }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.tint} />
                <Text style={[styles.doneText, { color: colors.tint }]}>Done</Text>
              </View>
            )}
            <Pressable onPress={() => setExpanded(e => !e)} style={styles.expandBtn}>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {expanded && (
          <View style={styles.medsList}>
            {groupMeds.map(med => (
              <MedicationCard key={med.id} medication={med} compact />
            ))}
          </View>
        )}

        <Pressable
          style={[
            styles.logAllBtn,
            {
              backgroundColor: allLogged ? colors.tintLight : accentColor,
            },
          ]}
          onPress={handleLogAll}
          disabled={logging}
        >
          {logging ? (
            <ActivityIndicator size="small" color={allLogged ? accentColor : "#fff"} />
          ) : (
            <>
              <Ionicons
                name={allLogged ? "checkmark-done" : "checkmark"}
                size={16}
                color={allLogged ? accentColor : "#fff"}
              />
              <Text style={[styles.logAllText, { color: allLogged ? accentColor : "#fff" }]}>
                {allLogged ? "All Logged" : "Log All"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  doneText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  expandBtn: {
    padding: 4,
  },
  medsList: {
    gap: 2,
  },
  logAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logAllText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
