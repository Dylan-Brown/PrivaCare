import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  count: number;
  total: number;
  lowThreshold?: number;
};

export function CountBadge({ count, total, lowThreshold = 10 }: Props) {
  const { colors } = useTheme();
  const isLow = count <= lowThreshold;
  const isEmpty = count === 0;

  const pct = total > 0 ? count / total : 0;
  const bg = isEmpty ? colors.accentLight : isLow ? colors.amberLight : colors.tintLight;
  const fg = isEmpty ? colors.danger : isLow ? colors.amber : colors.tint;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.count, { color: fg }]}>{count}</Text>
      <Text style={[styles.label, { color: fg }]}> left</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  count: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
