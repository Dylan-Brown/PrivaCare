import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  label: string;
  color?: string;
  size?: "sm" | "md";
};

export function PillBadge({ label, color, size = "md" }: Props) {
  const { colors } = useTheme();
  const bg = color ? `${color}22` : colors.tintLight;
  const text = color ?? colors.tint;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === "sm" && styles.sm]}>
      <Text style={[styles.label, { color: text }, size === "sm" && styles.labelSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  labelSm: {
    fontSize: 11,
  },
});
