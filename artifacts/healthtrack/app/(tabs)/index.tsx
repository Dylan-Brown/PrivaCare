import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { SkincareProductCard } from "@/components/skincare/SkincareProductCard";

function formatDate() {
  const now = new Date();
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: string; color: string; bg: string }) {
  return (
    <View style={[statStyles.card, { backgroundColor: bg }]}>
      <View style={[statStyles.iconCircle, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: `${color}99` }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    gap: 8,
    minHeight: 100,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    medications,
    medicationGroups,
    skincareProducts,
    skincareRoutines,
    getTodayMedLogs,
    getTodaySkincareLogs,
    getMedicationsNeedingRefill,
  } = useApp();

  const todayMedLogs = getTodayMedLogs();
  const todaySkincareLogs = getTodaySkincareLogs();
  const needsRefill = getMedicationsNeedingRefill();
  const uniqueLoggedMeds = new Set(todayMedLogs.map(l => l.medicationId));
  const uniqueLoggedSkincare = new Set(todaySkincareLogs.map(l => l.productId));

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        Platform.OS === "web" && { paddingTop: topInset, paddingBottom: 34 + 84 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate()}</Text>
        <Text style={[styles.titleText, { color: colors.text }]}>Today</Text>
      </View>

      {needsRefill.length > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: colors.amberLight, borderColor: `${colors.amber}40` }]}>
          <Ionicons name="warning" size={18} color={colors.amber} />
          <View style={styles.alertText}>
            <Text style={[styles.alertTitle, { color: colors.amber }]}>
              {needsRefill.length} medication{needsRefill.length !== 1 ? "s" : ""} running low
            </Text>
            <Text style={[styles.alertSub, { color: `${colors.amber}99` }]}>
              {needsRefill.map(m => m.name).join(", ")}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <StatCard
          label="Meds Taken"
          value={uniqueLoggedMeds.size}
          icon="medkit"
          color={colors.tint}
          bg={colors.tintLight}
        />
        <StatCard
          label="Skincare Done"
          value={uniqueLoggedSkincare.size}
          icon="sparkles"
          color={colors.accent}
          bg={colors.accentLight}
        />
      </View>

      {medications.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medications</Text>
          {medications.slice(0, 3).map(med => (
            <MedicationCard key={med.id} medication={med} compact />
          ))}
          {medications.length > 3 && (
            <Text style={[styles.moreText, { color: colors.textTertiary }]}>
              +{medications.length - 3} more in Medications tab
            </Text>
          )}
        </View>
      )}

      {skincareProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Skincare</Text>
          {skincareProducts.slice(0, 3).map(product => (
            <SkincareProductCard key={product.id} product={product} compact />
          ))}
          {skincareProducts.length > 3 && (
            <Text style={[styles.moreText, { color: colors.textTertiary }]}>
              +{skincareProducts.length - 3} more in Skincare tab
            </Text>
          )}
        </View>
      )}

      {medications.length === 0 && skincareProducts.length === 0 && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.tintLight }]}>
            <Ionicons name="heart" size={32} color={colors.tint} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Start tracking your health</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Add your medications and skincare products in the tabs below to start logging.
          </Text>
        </View>
      )}

      {todayMedLogs.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Medication Log</Text>
          {todayMedLogs.slice(-5).reverse().map(log => (
            <View
              key={log.id}
              style={[styles.logEntry, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.logDot, { backgroundColor: colors.tint }]} />
              <View style={styles.logInfo}>
                <Text style={[styles.logName, { color: colors.text }]}>{log.medicationName}</Text>
                {log.groupName && (
                  <Text style={[styles.logGroup, { color: colors.textSecondary }]}>{log.groupName}</Text>
                )}
              </View>
              <Text style={[styles.logTime, { color: colors.textTertiary }]}>
                {new Date(log.takenAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {todaySkincareLogs.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Skincare Log</Text>
          {todaySkincareLogs.slice(-5).reverse().map(log => (
            <View
              key={log.id}
              style={[styles.logEntry, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.logDot, { backgroundColor: colors.accent }]} />
              <View style={styles.logInfo}>
                <Text style={[styles.logName, { color: colors.text }]}>{log.productName}</Text>
                {log.routineName && (
                  <Text style={[styles.logGroup, { color: colors.textSecondary }]}>{log.routineName}</Text>
                )}
              </View>
              <Text style={[styles.logTime, { color: colors.textTertiary }]}>
                {new Date(log.loggedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  headerSection: { paddingTop: 8 },
  dateText: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 4 },
  titleText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  alertBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  alertSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12 },
  section: { gap: 4 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  moreText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 4 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 280 },
  logEntry: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logInfo: { flex: 1 },
  logName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  logGroup: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  logTime: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
