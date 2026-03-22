import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  icon: string;
  size: number;
  color: string;
};

export function AppIcon({ icon, size, color }: Props) {
  if (icon.startsWith("mci:")) {
    const name = icon.slice(4) as any;
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  const name = (icon.startsWith("ion:") ? icon.slice(4) : icon) as any;
  return <Ionicons name={name} size={size} color={color} />;
}

export function defaultMedIcon(): string {
  return "mci:pill";
}

export function defaultSkincareIcon(): string {
  return "mci:bottle-tonic";
}
