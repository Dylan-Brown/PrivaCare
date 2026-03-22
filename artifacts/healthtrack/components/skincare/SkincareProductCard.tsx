import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { SkincareProduct, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { PillBadge } from "@/components/ui/PillBadge";
import { AppIcon } from "@/components/ui/AppIcon";

type Props = {
  product: SkincareProduct;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
  reorderMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onEditAppearance?: () => void;
};

export function SkincareProductCard({
  product,
  onPress,
  onLongPress,
  compact = false,
  reorderMode = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  onEditAppearance,
}: Props) {
  const { colors } = useTheme();
  const { logSkincareProduct } = useApp();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleLog = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(withSpring(0.96), withSpring(1));
    checkScale.value = withSequence(withSpring(1.3), withSpring(1));
    await logSkincareProduct(product.id);
  };

  const accentColor = product.color || colors.accent;
  const resolvedIcon = product.icon ?? "mci:bottle-tonic";

  if (reorderMode) {
    return (
      <Animated.View style={animStyle}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.colorBar, { backgroundColor: accentColor }]} />
          <View style={[styles.content, styles.reorderContent]}>
            <Ionicons name="reorder-three-outline" size={22} color={colors.textTertiary} />
            <View style={[styles.reorderIconCircle, { backgroundColor: `${accentColor}18` }]}>
              <AppIcon icon={resolvedIcon} size={18} color={accentColor} />
            </View>
            <View style={styles.reorderInfo}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
                {product.type}{product.brand ? ` · ${product.brand}` : ""}
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
              <Ionicons name="chevron-up" size={20} color={isFirst ? colors.textTertiary : colors.text} />
            </Pressable>
            <Pressable
              style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
              onPress={isLast ? undefined : onMoveDown}
              disabled={isLast}
            >
              <Ionicons name="chevron-down" size={20} color={isLast ? colors.textTertiary : colors.text} />
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
            <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
              <AppIcon icon={resolvedIcon} size={compact ? 16 : 18} color={accentColor} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
                {product.brand}
              </Text>
            </View>
            <PillBadge label={product.type} color={accentColor} size="sm" />
          </View>

          {!compact && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.logBtn, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }]}
                onPress={handleLog}
              >
                <Animated.View style={checkAnimStyle}>
                  <Ionicons name="checkmark" size={16} color={accentColor} />
                </Animated.View>
                <Text style={[styles.logBtnText, { color: accentColor }]}>Log Used</Text>
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
  compact: { marginBottom: 6 },
  colorBar: { width: 4 },
  content: { flex: 1, padding: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  brand: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actions: { marginTop: 12, flexDirection: "row" },
  logBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  logBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  reorderContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  reorderIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  reorderInfo: { flex: 1 },
  reorderBtns: { flexDirection: "column", paddingRight: 8, gap: 2 },
  reorderBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderBtnDisabled: { opacity: 0.3 },
});
