import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { SkincareRoutine, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { SkincareProductCard } from "./SkincareProductCard";
import { todayString, toDateString } from "@/utils/scheduleCompute";

type Props = {
  routine: SkincareRoutine;
  onEdit?: () => void;
};

export function SkincareRoutineCard({ routine, onEdit }: Props) {
  const { colors } = useTheme();
  const { skincareProducts, skincareLogs, logSkincareRoutine } = useApp();
  const [logging, setLogging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);

  const routineProducts = skincareProducts.filter(p => routine.productIds.includes(p.id));
  const today = todayString();
  const todayLogs = skincareLogs.filter(l => toDateString(new Date(l.loggedAt)) === today);
  const loggedIds = new Set(todayLogs.filter(l => l.routineId === routine.id).map(l => l.productId));
  const allLogged = routineProducts.length > 0 && routineProducts.every(p => loggedIds.has(p.id));

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLogAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(withSpring(0.97), withSpring(1));
    setLogging(true);
    await logSkincareRoutine(routine.id);
    setLogging(false);
  };

  const accentColor = routine.color || colors.accent;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name="sparkles" size={18} color={accentColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.routineName, { color: colors.text }]}>{routine.name}</Text>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
              {routine.timeLabel} · {routineProducts.length} product{routineProducts.length !== 1 ? "s" : ""}
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
          <View style={styles.productsList}>
            {routineProducts.map(product => (
              <SkincareProductCard key={product.id} product={product} compact />
            ))}
          </View>
        )}

        <Pressable
          style={[
            styles.logAllBtn,
            { backgroundColor: allLogged ? colors.tintLight : accentColor },
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
                {allLogged ? "All Logged" : "Log Routine"}
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
  routineName: {
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
  productsList: {
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
