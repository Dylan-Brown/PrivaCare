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

type Props = {
  product: SkincareProduct;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
};

const PRODUCT_TYPE_ICONS: Record<string, string> = {
  Cleanser: "water",
  Toner: "flask",
  Serum: "eyedrop",
  Moisturizer: "leaf",
  Sunscreen: "sunny",
  "Eye Cream": "eye",
  Mask: "sparkles",
  Exfoliant: "layers",
  Oil: "droplet",
  Mist: "cloud",
  Tool: "build",
  Other: "ellipsis-horizontal",
};

export function SkincareProductCard({ product, onPress, onLongPress, compact = false }: Props) {
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
  const iconName = PRODUCT_TYPE_ICONS[product.type] || "ellipsis-horizontal";

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
              <Ionicons name={iconName as any} size={compact ? 16 : 18} color={accentColor} />
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
  brand: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
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
