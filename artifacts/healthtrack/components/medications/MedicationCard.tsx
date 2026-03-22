import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { Medication, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { CountBadge } from "@/components/ui/CountBadge";
import { AppIcon } from "@/components/ui/AppIcon";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  prescription: { label: "Rx",  color: "#007AFF" },
  generic:      { label: "Gen", color: "#34C78B" },
  supplement:   { label: "Sup", color: "#FF9F0A" },
};

type Props = {
  medication: Medication;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
  archived?: boolean;
  reorderMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onEditAppearance?: () => void;
};

export function MedicationCard({
  medication,
  onPress,
  onLongPress,
  compact = false,
  archived = false,
  reorderMode = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  onEditAppearance,
}: Props) {
  const { colors } = useTheme();
  const { logMedication, archiveMedication, setAwaitingRefill } = useApp();
  const scale      = useSharedValue(1);
  const checkScale = useSharedValue(1);

  const animStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  const isEmpty        = medication.remainingCount === 0;
  const isAwaiting     = !!(medication.awaitingRefill && isEmpty);
  const isLow          = medication.notifyLowStock &&
                         medication.remainingCount > 0 &&
                         medication.remainingCount <= medication.lowStockThreshold;
  const isArchived     = archived || medication.status === "storage" || medication.status === "history";
  const accentColor    = isArchived ? colors.textTertiary : (medication.color || colors.tint);
  const catInfo        = medication.category ? CATEGORY_LABELS[medication.category] : null;
  const hasIngredients = medication.isCompound && medication.ingredients && medication.ingredients.length > 0;

  const showZeroAlert = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      `${medication.name} is out`,
      "What would you like to do?",
      [
        {
          text: "Archive to History",
          style: "destructive",
          onPress: () => {
            archiveMedication(medication.id, "history");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
        {
          text: "Put in Storage",
          onPress: () => {
            archiveMedication(medication.id, "storage");
          },
        },
        {
          text: "Await Refill",
          onPress: () => {
            setAwaitingRefill(medication.id, true);
          },
        },
        { text: "Dismiss", style: "cancel" },
      ]
    );
  };

  const handleLog = async () => {
    if (isArchived) return;

    if (isAwaiting) {
      Alert.alert(
        "Awaiting Refill",
        `${medication.name} is marked as awaiting refill. Refill to log doses again.`,
        [{ text: "OK" }]
      );
      return;
    }

    if (isEmpty) {
      showZeroAlert();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value      = withSequence(withSpring(0.96), withSpring(1));
    checkScale.value = withSequence(withSpring(1.3), withSpring(1));

    const willHitZero = medication.remainingCount === 1;
    await logMedication(medication.id);

    if (willHitZero) {
      setTimeout(showZeroAlert, 400);
    }
  };

  if (reorderMode) {
    return (
      <Animated.View style={animStyle}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.colorBar, { backgroundColor: accentColor }]} />
          <View style={[styles.content, styles.reorderContent]}>
            <Ionicons name="reorder-three-outline" size={22} color={colors.textTertiary} />
            <View style={[styles.reorderIconCircle, { backgroundColor: `${accentColor}18` }]}>
              <AppIcon icon={medication.icon ?? "mci:pill"} size={18} color={accentColor} />
            </View>
            <View style={styles.reorderInfo}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {medication.name}
              </Text>
              {medication.isCompound && (
                <Text style={[styles.compoundHint, { color: accentColor }]}>Compound</Text>
              )}
              <Text style={[styles.dosage, { color: colors.textSecondary }]} numberOfLines={1}>
                {medication.dosage} {!medication.isCompound ? medication.unit : ""}
              </Text>
            </View>
          </View>
          <View style={styles.reorderBtns}>
            {onEditAppearance && (
              <Pressable
                style={styles.reorderBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onEditAppearance();
                }}
              >
                <Ionicons name="color-palette-outline" size={18} color={accentColor} />
              </Pressable>
            )}
            <Pressable
              style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
              onPress={isFirst ? undefined : onMoveUp}
              disabled={isFirst}
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={isFirst ? colors.textTertiary : colors.text}
              />
            </Pressable>
            <Pressable
              style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
              onPress={isLast ? undefined : onMoveDown}
              disabled={isLast}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={isLast ? colors.textTertiary : colors.text}
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : isArchived ? 0.6 : 1,
          },
          compact && styles.compact,
        ]}
        onPress={onPress || handleLog}
        onLongPress={onLongPress}
      >
        <View style={[styles.colorBar, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <View style={styles.top}>
            <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
              {isArchived ? (
                <Ionicons
                  name={medication.status === "storage" ? "archive" : "time"}
                  size={compact ? 16 : 18}
                  color={accentColor}
                />
              ) : (
                <AppIcon
                  icon={medication.icon ?? (medication.isCompound ? "ion:layers" : "mci:pill")}
                  size={compact ? 16 : 18}
                  color={accentColor}
                />
              )}
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: isArchived ? colors.textSecondary : colors.text }]} numberOfLines={1}>
                  {medication.name}
                </Text>
                {medication.isCompound && !compact && (
                  <View style={[styles.compoundBadge, { backgroundColor: `${accentColor}18` }]}>
                    <Ionicons name="layers" size={10} color={accentColor} />
                    <Text style={[styles.compoundBadgeText, { color: accentColor }]}>Compound</Text>
                  </View>
                )}
                {catInfo && !compact && !medication.isCompound && (
                  <View style={[styles.catBadge, { backgroundColor: `${catInfo.color}18` }]}>
                    <Text style={[styles.catText, { color: catInfo.color }]}>{catInfo.label}</Text>
                  </View>
                )}
              </View>
              {medication.brandName ? (
                <Text style={[styles.brandName, { color: colors.textTertiary }]} numberOfLines={1}>
                  {medication.brandName}
                </Text>
              ) : null}
              <Text style={[styles.dosage, { color: colors.textSecondary }]}>
                {medication.dosage}{medication.dosage && !medication.isCompound ? ` ${medication.unit}` : ""}
                {isArchived && medication.status === "storage" ? " · In Storage" : ""}
                {isArchived && medication.status === "history" ? " · History" : ""}
              </Text>

              {hasIngredients && !compact && (
                <View style={styles.ingredientList}>
                  {medication.ingredients!.slice(0, 3).map((ing, idx) => (
                    <Text key={idx} style={[styles.ingredientItem, { color: colors.textTertiary }]}>
                      · {ing.name}{ing.amount ? ` ${ing.amount}${ing.unit}` : ""}
                    </Text>
                  ))}
                  {medication.ingredients!.length > 3 && (
                    <Text style={[styles.ingredientItem, { color: colors.textTertiary }]}>
                      · +{medication.ingredients!.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </View>
            <View style={styles.right}>
              {isLow && (
                <Ionicons name="warning" size={14} color={colors.amber} style={{ marginBottom: 4 }} />
              )}
              {isAwaiting && !compact && (
                <View style={[styles.awaitingBadge, { backgroundColor: colors.amberLight }]}>
                  <Text style={[styles.awaitingText, { color: colors.amber }]}>Awaiting Refill</Text>
                </View>
              )}
              {!isAwaiting && (
                <CountBadge
                  count={medication.remainingCount}
                  total={medication.bottleCount ?? medication.totalCount}
                  lowThreshold={medication.lowStockThreshold}
                />
              )}
            </View>
          </View>

          {!compact && !isArchived && (
            <View style={styles.actions}>
              {isAwaiting ? (
                <View style={[styles.logBtn, { backgroundColor: colors.amberLight, borderColor: `${colors.amber}30` }]}>
                  <Ionicons name="time-outline" size={15} color={colors.amber} />
                  <Text style={[styles.logBtnText, { color: colors.amber }]}>Awaiting Refill</Text>
                </View>
              ) : isEmpty ? (
                <Pressable
                  style={[styles.logBtn, { backgroundColor: colors.accentLight, borderColor: `${colors.accent}30` }]}
                  onPress={showZeroAlert}
                >
                  <Ionicons name="alert-circle-outline" size={15} color={colors.accent} />
                  <Text style={[styles.logBtnText, { color: colors.accent }]}>Out of Stock</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.logBtn, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }]}
                  onPress={handleLog}
                >
                  <Animated.View style={checkStyle}>
                    <Ionicons name="checkmark" size={16} color={accentColor} />
                  </Animated.View>
                  <Text style={[styles.logBtnText, { color: accentColor }]}>Log Taken</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, marginBottom: 10,
    flexDirection: "row", overflow: "hidden",
  },
  compact: { marginBottom: 6 },
  colorBar: { width: 4 },
  content: { flex: 1, padding: 14 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  brandName: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 1 },
  dosage: { fontSize: 13, fontFamily: "Inter_400Regular" },
  compoundBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  compoundBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  ingredientList: { marginTop: 5, gap: 1 },
  ingredientItem: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  right: { alignItems: "flex-end", gap: 4 },
  awaitingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  awaitingText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { marginTop: 12, flexDirection: "row", gap: 8 },
  logBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  logBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  reorderContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  reorderIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  reorderInfo: { flex: 1 },
  compoundHint: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  reorderBtns: { flexDirection: "column", paddingRight: 6, paddingVertical: 4 },
  reorderBtn: { padding: 8 },
  reorderBtnDisabled: { opacity: 0.25 },
});
