import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrugInteraction } from "@/utils/drugInteractions";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  interactions: DrugInteraction[];
  loading: boolean;
  warnings: string[];
  lastChecked: string | null;
  onRecheck: () => void;
};

const SEVERITY_COLORS: Record<string, string> = {
  high:     "#FF3B30",
  moderate: "#FF9F0A",
  low:      "#34C78B",
  unknown:  "#8E8E93",
};

function severityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes("high") || s.includes("sever")) return SEVERITY_COLORS.high;
  if (s.includes("mod")) return SEVERITY_COLORS.moderate;
  if (s.includes("low") || s.includes("minor")) return SEVERITY_COLORS.low;
  return SEVERITY_COLORS.unknown;
}

export function InteractionsBanner({ interactions, loading, warnings, lastChecked, onRecheck }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.borderLight }]}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>
            Checking drug interactions…
          </Text>
        </View>
      </View>
    );
  }

  const hasInteractions = interactions.length > 0;
  const accentColor = hasInteractions ? "#FF9F0A" : colors.tint;
  const iconName = hasInteractions ? "warning" : "shield-checkmark";
  const headerMsg = hasInteractions
    ? `${interactions.length} potential interaction${interactions.length !== 1 ? "s" : ""} found`
    : "No known interactions detected";

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: hasInteractions ? "#FF9F0A12" : colors.card,
        borderColor: hasInteractions ? "#FF9F0A40" : colors.border,
      },
    ]}>
      <Pressable
        style={styles.headerRow}
        onPress={() => setExpanded(v => !v)}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name={iconName as any} size={18} color={accentColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerText, { color: hasInteractions ? "#FF9F0A" : colors.text }]}>
            {headerMsg}
          </Text>
          {lastChecked && (
            <Text style={[styles.checkedAt, { color: colors.textTertiary }]}>
              via NIH RxNorm · {new Date(lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
        <View style={styles.rightRow}>
          <Pressable onPress={onRecheck} style={styles.recheckBtn}>
            <Ionicons name="refresh" size={16} color={colors.textTertiary} />
          </Pressable>
          {hasInteractions && (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textTertiary}
            />
          )}
        </View>
      </Pressable>

      {expanded && hasInteractions && (
        <View style={styles.interactionList}>
          {interactions.map((ix, idx) => {
            const color = severityColor(ix.severity);
            return (
              <View
                key={idx}
                style={[styles.interactionItem, { borderColor: colors.border }]}
              >
                <View style={styles.interactionHeader}>
                  <View style={[styles.severityDot, { backgroundColor: color }]} />
                  <Text style={[styles.interactionDrugs, { color: colors.text }]}>
                    {ix.drug1} + {ix.drug2}
                  </Text>
                  {ix.severity && ix.severity !== "unknown" && (
                    <View style={[styles.severityBadge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.severityText, { color }]}>
                        {ix.severity}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.interactionDesc, { color: colors.textSecondary }]}>
                  {ix.description}
                </Text>
              </View>
            );
          })}
          {warnings.length > 0 && (
            <View style={[styles.warningNote, { borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.warningNoteText, { color: colors.textTertiary }]}>
                {warnings.join(" · ")}
              </Text>
            </View>
          )}
          <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            Interaction data sourced from the NIH National Library of Medicine (RxNorm). Always consult your
            pharmacist or prescriber before making any medication decisions.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 13,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  headerText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  checkedAt: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  rightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  recheckBtn: { padding: 4 },
  interactionList: {
    paddingHorizontal: 13, paddingBottom: 13, gap: 8,
  },
  interactionItem: {
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 4,
  },
  interactionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  interactionDrugs: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  severityBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  severityText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  interactionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  warningNote: {
    flexDirection: "row", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, alignItems: "flex-start",
  },
  warningNoteText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, flex: 1 },
  disclaimer: {
    fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15,
    marginTop: 4, fontStyle: "italic",
  },
});
