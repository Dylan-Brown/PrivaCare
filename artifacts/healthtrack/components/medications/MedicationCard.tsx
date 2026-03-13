import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons, Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { Medication } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { CountBadge } from "@/components/ui/CountBadge";

type Props = {
  medication: Medication;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
};

export function MedicationCard({ medication, onPress, onLongPress, compact = false }: Props) {
  const { colors, isDark } = useTheme();
  const { logMedication } = useApp();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const isLow = medication.remainingCount <= medication.lowStockThreshold && medication.notifyLowStock;
  const isEmpty = medication.remainingCount === 0;

  const handleLog = async () => {
    if (isEmpty) {
      Alert.alert("Out of Stock", "This medication has run out. Please refill.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(withSpring(0.96), withSpring(1));
    checkScale.value = withSequence(withSpring(1.3), withSpring(1));
    await logMedication(medication.id);
  };

  const accentColor = medication.color || colors.tint;

  return (
    <Animated.View style={[animStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.95 : 1,
          },
          compact && styles.compact,
        ]}
        onPress={onPress || handleLog}
        onLongPress={onLongPress}
      >
        <View style={[styles.colorBar, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <View style={styles.top}>
            <View style={styles.iconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
                <Ionicons name="medkit" size={compact ? 16 : 18} color={accentColor} />
              </View>
            </View>
            <View style={styles.info}>
              <Text
                style={[styles.name, { color: colors.text }]}
                numberOfLines={1}
              >
                {medication.name}
              </Text>
              <Text style={[styles.dosage, { color: colors.textSecondary }]}>
                {medication.dosage} {medication.unit}
              </Text>
            </View>
            <View style={styles.right}>
              {isLow && !isEmpty && (
                <Ionicons name="warning" size={14} color={colors.amber} style={{ marginBottom: 4 }} />
              )}
              <CountBadge
                count={medication.remainingCount}
                total={medication.totalCount}
                lowThreshold={medication.lowStockThreshold}
              />
            </View>
          </View>

          {!compact && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.logBtn, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }]}
                onPress={handleLog}
              >
                <Animated.View style={checkStyle}>
                  <Ionicons name="checkmark" size={16} color={accentColor} />
                </Animated.View>
                <Text style={[styles.logBtnText, { color: accentColor }]}>Log Taken</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
  },
  compact: {
    marginBottom: 6,
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {},
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  dosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  logBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
