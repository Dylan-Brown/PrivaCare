import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/AppIcon";
import { useTheme } from "@/hooks/useTheme";

export const SHARED_COLORS = [
  "#34C78B",
  "#FF6B6B",
  "#007AFF",
  "#FF9F0A",
  "#AF52DE",
  "#FF6CBF",
  "#5AC8FA",
  "#4CD964",
];

type IconEntry = { icon: string; label: string };

const MEDICATION_ICONS: { group: string; icons: IconEntry[] }[] = [
  {
    group: "Pill Shapes",
    icons: [
      { icon: "mci:pill",             label: "Tablet"      },
      { icon: "mci:pill-multiple",    label: "Multiple"    },
      { icon: "mci:tablet",           label: "Oval"        },
      { icon: "mci:needle",           label: "Injection"   },
      { icon: "mci:bottle-tonic-plus", label: "Bottle"     },
      { icon: "mci:medical-bag",      label: "Rx Bag"      },
    ],
  },
  {
    group: "Liquids & Drops",
    icons: [
      { icon: "ion:water-outline",    label: "Drops"       },
      { icon: "ion:flask-outline",    label: "Liquid"      },
      { icon: "mci:spray-bottle",     label: "Spray"       },
      { icon: "mci:bottle-tonic-outline", label: "Tonic"  },
      { icon: "mci:bandage",          label: "Patch"       },
      { icon: "mci:hospital-box-outline", label: "Medical" },
    ],
  },
  {
    group: "Health & Supplements",
    icons: [
      { icon: "ion:leaf-outline",     label: "Herbal"      },
      { icon: "ion:nutrition-outline", label: "Vitamin"    },
      { icon: "ion:heart-outline",    label: "Heart"       },
      { icon: "ion:eye-outline",      label: "Eye"         },
      { icon: "ion:fitness-outline",  label: "Fitness"     },
      { icon: "ion:pulse-outline",    label: "Cardiac"     },
    ],
  },
];

const SKINCARE_ICONS: { group: string; icons: IconEntry[] }[] = [
  {
    group: "Bottles & Jars",
    icons: [
      { icon: "mci:bottle-tonic",         label: "Serum"      },
      { icon: "mci:bottle-tonic-outline",  label: "Toner"      },
      { icon: "mci:bottle-tonic-plus",     label: "Essence"    },
      { icon: "mci:lotion",               label: "Cream"       },
      { icon: "mci:lotion-plus",          label: "Moisturizer" },
      { icon: "mci:spray",               label: "Mist"         },
    ],
  },
  {
    group: "Face & Skin",
    icons: [
      { icon: "mci:face-woman-shimmer-outline", label: "Glow"   },
      { icon: "mci:face-mask-outline",          label: "Mask"   },
      { icon: "mci:flower-outline",             label: "Natural" },
      { icon: "mci:medical-cotton-swab",        label: "Swab"   },
      { icon: "ion:sparkles",                   label: "Glow"   },
      { icon: "ion:water-outline",              label: "Hydrate" },
    ],
  },
  {
    group: "Tools & Ingredients",
    icons: [
      { icon: "mci:needle",           label: "Derma"       },
      { icon: "ion:sunny-outline",    label: "SPF"         },
      { icon: "ion:eye-outline",      label: "Eye Cream"   },
      { icon: "ion:contrast-outline", label: "Exfoliant"   },
      { icon: "ion:leaf-outline",     label: "Organic"     },
      { icon: "ion:flask-outline",    label: "Active"      },
    ],
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedIcon: string;
  selectedColor: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  type: "medication" | "skincare";
};

export function IconColorSheet({
  visible,
  onClose,
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
  type,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const iconGroups = type === "medication" ? MEDICATION_ICONS : SKINCARE_ICONS;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Choose Appearance
          </Text>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={[styles.doneText, { color: colors.tint }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview */}
          <View style={[styles.previewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.previewCircle, { backgroundColor: `${selectedColor}22` }]}>
              <AppIcon icon={selectedIcon} size={48} color={selectedColor} />
            </View>
            <Text style={[styles.previewHint, { color: colors.textSecondary }]}>
              Preview — select an icon and color below
            </Text>
          </View>

          {/* Color Picker */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {SHARED_COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onColorChange(c);
                  }}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorDotSelected,
                  ]}
                >
                  {selectedColor === c && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Icon Picker */}
          {iconGroups.map(group => (
            <View
              key={group.group}
              style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {group.group.toUpperCase()}
              </Text>
              <View style={styles.iconGrid}>
                {group.icons.map(entry => {
                  const active = selectedIcon === entry.icon;
                  return (
                    <Pressable
                      key={entry.icon}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onIconChange(entry.icon);
                      }}
                      style={[
                        styles.iconCell,
                        {
                          backgroundColor: active ? `${selectedColor}22` : colors.borderLight,
                          borderColor: active ? selectedColor : colors.border,
                        },
                      ]}
                    >
                      <AppIcon
                        icon={entry.icon}
                        size={28}
                        color={active ? selectedColor : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.iconLabel,
                          { color: active ? selectedColor : colors.textTertiary },
                        ]}
                        numberOfLines={1}
                      >
                        {entry.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 52, alignItems: "center", justifyContent: "center", height: 44 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  doneText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 16, gap: 12 },

  previewSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  previewCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  previewHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    transform: [{ scale: 1.2 }],
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconCell: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
