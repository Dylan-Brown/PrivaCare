import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

type Action = {
  icon: string;
  color: string;
  onPress: () => void;
};

type Props = {
  children: React.ReactNode;
  rightActions?: Action[];
  leftActions?: Action[];
};

export function SwipeableRow({ children, rightActions = [], leftActions = [] }: Props) {
  return <View style={{ overflow: "hidden" }}>{children}</View>;
}
