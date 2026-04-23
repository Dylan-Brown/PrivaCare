import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext, type SchemeOverride } from "@/context/ThemeContext";
import {
  BackupData,
  exportBackup,
  formatBackupDate,
  importBackup,
  listBackups,
  restoreBackup,
  saveBackupToDocuments,
} from "@/utils/backup";
import { generateAndSharePDF } from "@/utils/pdfExport";
import { buildMedAdherence, buildSkincareAdherence } from "@/utils/adherence";
import { todayString } from "@/utils/scheduleCompute";
import {
  getHealthKitSyncEnabled,
  isHealthKitAvailable,
  requestHealthKitPermissions,
  setHealthKitSyncEnabled,
} from "@/utils/healthKit";

type ActionState = "idle" | "loading" | "success" | "error";

function RowItem({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  trailing,
  disabled,
  last,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  disabled?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.rowItem,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
        { opacity: pressed && !disabled ? 0.7 : disabled ? 0.4 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={3}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>;
}

function StatusBanner({ state, message }: { state: ActionState; message: string }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    if (state === "success" || state === "error") {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0);
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [state, message]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isSuccess = state === "success";
  const bg = isSuccess ? colors.tintLight : colors.accentLight;
  const fg = isSuccess ? colors.tint : colors.danger;
  const iconName = isSuccess ? "checkmark-circle" : "alert-circle";

  if (state === "idle" || state === "loading") return null;

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bg, borderColor: `${fg}30` }, animStyle]}>
      <Ionicons name={iconName} size={16} color={fg} />
      <Text style={[styles.bannerText, { color: fg }]}>{message}</Text>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { colorSchemeOverride, setColorSchemeOverride } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { medications, medicationGroups, skincareProducts, skincareRoutines, medicationLogs, skincareLogs, dayLogs, userProfile, setUserProfile, tempUnit, setTempUnit } = useApp();
  const otherDrugsRef = useRef<TextInput>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [exportState, setExportState] = useState<ActionState>("idle");
  const [pdfState, setPdfState] = useState<ActionState>("idle");
  const [pdfMessage, setPdfMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [saveState, setSaveState] = useState<ActionState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [importState, setImportState] = useState<ActionState>("idle");
  const [importMessage, setImportMessage] = useState("");
  const [savedBackups, setSavedBackups] = useState<string[]>([]);

  const [hkAvailable, setHkAvailable] = useState(false);
  const [hkEnabled, setHkEnabled] = useState(false);
  const [hkConnecting, setHkConnecting] = useState(false);
  const [hkMessage, setHkMessage] = useState("");
  const [hkMessageState, setHkMessageState] = useState<ActionState>("idle");

  useEffect(() => {
    if (Platform.OS !== "web") {
      listBackups().then(setSavedBackups);
    }
    if (Platform.OS === "ios") {
      isHealthKitAvailable().then(setHkAvailable);
      getHealthKitSyncEnabled().then(setHkEnabled);
    }
  }, [saveState]);

  const handleToggleHealthKit = useCallback(async (value: boolean) => {
    if (value && !hkEnabled) {
      setHkConnecting(true);
      const result = await requestHealthKitPermissions();
      setHkConnecting(false);
      if (result.success) {
        await setHealthKitSyncEnabled(true);
        setHkEnabled(true);
        setHkMessageState("success");
        setHkMessage("Apple Health sync enabled — dose events will be written when you log a medication");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setHkMessageState("error");
        setHkMessage(result.message);
      }
      setTimeout(() => setHkMessageState("idle"), 5000);
    } else {
      await setHealthKitSyncEnabled(false);
      setHkEnabled(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hkEnabled]);

  const handlePdfExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPdfState("loading");
    const today = todayString();
    const medAdherence = buildMedAdherence(medications, dayLogs, today);
    const skincareAdherence = buildSkincareAdherence(skincareProducts, dayLogs, today);
    const result = await generateAndSharePDF(medications, skincareProducts, medAdherence, skincareAdherence);
    setPdfState(result.success ? "success" : "error");
    setPdfMessage(result.message);
    setTimeout(() => setPdfState("idle"), 4000);
  }, [medications, skincareProducts, dayLogs]);

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExportState("loading");
    const result = await exportBackup();
    setExportState(result.success ? "success" : "error");
    setExportMessage(result.message);
    setTimeout(() => setExportState("idle"), 4000);
  }, []);

  const handleSaveLocal = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaveState("loading");
    const result = await saveBackupToDocuments();
    setSaveState(result.success ? "success" : "error");
    setSaveMessage(result.success ? `Saved: ${result.message}` : result.message);
    setTimeout(() => setSaveState("idle"), 4000);
    if (result.success) {
      const updated = await listBackups();
      setSavedBackups(updated);
    }
  }, []);

  const handleImport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImportState("loading");
    const result = await importBackup();
    if (!result.success || !result.data) {
      setImportState("error");
      setImportMessage(result.message);
      setTimeout(() => setImportState("idle"), 4000);
      return;
    }
    const backup = result.data;
    setImportState("idle");

    const exportedAt = formatBackupDate(backup.exportedAt);
    const medCount = Array.isArray(backup.medications) ? backup.medications.length : 0;
    const productCount = Array.isArray(backup.skincareProducts) ? backup.skincareProducts.length : 0;

    Alert.alert(
      "Restore Backup?",
      `This backup from ${exportedAt} contains ${medCount} medication${medCount !== 1 ? "s" : ""} and ${productCount} skincare product${productCount !== 1 ? "s" : ""}.\n\nThis will replace all current data. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            const restoreResult = await restoreBackup(backup);
            setImportState(restoreResult.success ? "success" : "error");
            setImportMessage(
              restoreResult.success ? "Data restored — please restart the app" : restoreResult.message
            );
            if (restoreResult.success) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => setImportState("idle"), 4000);
          },
        },
      ]
    );
  }, []);

  const totalMedLogs = medicationLogs.length;
  const totalSkincareLogs = skincareLogs.length;

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
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={[styles.privacyCard, { backgroundColor: colors.tintLight, borderColor: `${colors.tint}30` }]}>
        <View style={styles.privacyRow}>
          <View style={[styles.privacyIcon, { backgroundColor: colors.tint }]}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
          </View>
          <View style={styles.privacyText}>
            <Text style={[styles.privacyTitle, { color: colors.tintDark }]}>100% On-Device Storage</Text>
            <Text style={[styles.privacySub, { color: colors.tintDark }]}>
              All your health data stays on this device using local storage. Nothing is sent to any server.
            </Text>
          </View>
        </View>
      </View>

      <SectionHeader title="APPEARANCE" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }]}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.tint}20` }]}>
            <Ionicons name="moon-outline" size={18} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              {colorSchemeOverride === "system" ? "Follows device setting" : colorSchemeOverride === "dark" ? "Dark mode" : "Light mode"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["light", "system", "dark"] as SchemeOverride[]).map((opt) => {
              const active = colorSchemeOverride === opt;
              const label = opt === "light" ? "Light" : opt === "system" ? "Auto" : "Dark";
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColorSchemeOverride(opt);
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: active ? colors.tint : colors.backgroundSecondary,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: active ? colors.tint : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#fff" : colors.textSecondary }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.rowItem, styles.rowItemLast]}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.amber}20` }]}>
            <Ionicons name="thermometer-outline" size={18} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Temperature Unit</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Used for body temperature readings
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["F", "C"] as const).map((unit) => {
              const active = tempUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTempUnit(unit);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: active ? colors.amber : colors.backgroundSecondary,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: active ? colors.amber : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#fff" : colors.textSecondary }}>
                    °{unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {Platform.OS === "ios" && (
        <>
          <SectionHeader title="APPLE HEALTH" />
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.rowItem, styles.rowItemLast]}>
              <View style={[styles.rowIcon, { backgroundColor: "#FF375F20" }]}>
                <Ionicons name="heart" size={18} color="#FF375F" />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Sync to Apple Health</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                  {hkEnabled
                    ? "Dose events are written to Apple Health when you log a medication"
                    : hkAvailable
                    ? "Log dose events to your Apple Health timeline when you take a medication"
                    : "Requires a native iOS build — not available in the Expo preview"}
                </Text>
              </View>
              {hkConnecting ? (
                <ActivityIndicator size="small" color="#FF375F" />
              ) : (
                <Switch
                  value={hkEnabled}
                  onValueChange={handleToggleHealthKit}
                  disabled={!hkAvailable || hkConnecting}
                  trackColor={{ false: colors.border, true: "#FF375F" }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              )}
            </View>
          </View>

          <StatusBanner state={hkMessageState} message={hkMessage} />

          {hkEnabled && (
            <View style={[styles.hkInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.hkInfoText, { color: colors.textSecondary }]}>
                When you log a medication in PrivaCare, a{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold" }}>Medication Dose Event</Text> is written to
                Apple Health. Your dose history will appear in the Health app under{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold" }}>Browse → Other Data → Medications</Text>.
              </Text>
            </View>
          )}

          {!hkAvailable && (
            <View style={[styles.hkInfoCard, { backgroundColor: colors.amberLight, borderColor: `${colors.amber}30` }]}>
              <Ionicons name="warning-outline" size={15} color={colors.amber} />
              <Text style={[styles.hkInfoText, { color: colors.amber }]}>
                Apple Health sync requires a native iOS build made with EAS Build or Xcode. It is not available in the Expo Go preview.
              </Text>
            </View>
          )}
        </>
      )}

      <SectionHeader title="MEDICATIONS" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowItem, styles.rowItemLast]}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.tint}20` }]}>
            <Ionicons name="layers-outline" size={18} color={colors.tint} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Compound Medications</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Allow adding compound medications (multiple active ingredients)
            </Text>
          </View>
          <Switch
            value={userProfile.compoundMedicationsEnabled ?? false}
            onValueChange={v => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setUserProfile({ compoundMedicationsEnabled: v });
            }}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor="#fff"
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>

      <SectionHeader title="LIFESTYLE & INTERACTIONS" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }]}>
          <View style={[styles.rowIcon, { backgroundColor: "#FF9F0A20" }]}>
            <Ionicons name="wine-outline" size={18} color="#FF9F0A" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Drinks Alcohol</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Include alcohol when checking for drug interactions
            </Text>
          </View>
          <Switch
            value={userProfile.drinksAlcohol}
            onValueChange={v => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setUserProfile({ drinksAlcohol: v });
            }}
            trackColor={{ false: colors.border, true: "#FF9F0A" }}
            thumbColor="#fff"
            ios_backgroundColor={colors.border}
          />
        </View>
        <View style={[styles.rowItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }]}>
          <View style={[styles.rowIcon, { backgroundColor: "#8E8E9320" }]}>
            <Ionicons name="flame-outline" size={18} color="#8E8E93" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Uses Tobacco / Nicotine</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              Include tobacco and nicotine in interaction checks
            </Text>
          </View>
          <Switch
            value={userProfile.smokesTobacco}
            onValueChange={v => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setUserProfile({ smokesTobacco: v });
            }}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor="#fff"
            ios_backgroundColor={colors.border}
          />
        </View>
        <View style={[styles.rowItem]}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Other Substances</Text>
            <TextInput
              ref={otherDrugsRef}
              style={[styles.otherDrugsInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. cannabis, caffeine, supplements…"
              placeholderTextColor={colors.textTertiary}
              value={userProfile.otherDrugs}
              onChangeText={t => setUserProfile({ otherDrugs: t })}
              returnKeyType="done"
              multiline={false}
            />
          </View>
        </View>
      </View>
      <View style={[styles.hkInfoCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 4 }]}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
        <Text style={[styles.hkInfoText, { color: colors.textSecondary }]}>
          These flags are used only to check drug interactions on the Medications screen. Your data never leaves this device. Interaction data is sourced from the free{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>NIH RxNorm API</Text>.
        </Text>
      </View>

      <SectionHeader title="YOUR DATA" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <RowItem
          icon="medkit"
          iconColor={colors.tint}
          iconBg={colors.tintLight}
          title="Medications"
          subtitle={`${medications.length} medication${medications.length !== 1 ? "s" : ""}, ${medicationGroups.length} group${medicationGroups.length !== 1 ? "s" : ""}`}
        />
        <RowItem
          icon="sparkles"
          iconColor={colors.accent}
          iconBg={colors.accentLight}
          title="Skincare"
          subtitle={`${skincareProducts.length} product${skincareProducts.length !== 1 ? "s" : ""}, ${skincareRoutines.length} routine${skincareRoutines.length !== 1 ? "s" : ""}`}
        />
        <RowItem
          icon="time"
          iconColor={colors.blue}
          iconBg={colors.blueLight}
          title="Log History"
          subtitle={`${totalMedLogs} medication log${totalMedLogs !== 1 ? "s" : ""}, ${totalSkincareLogs} skincare log${totalSkincareLogs !== 1 ? "s" : ""}`}
          last
        />
      </View>

      <SectionHeader title="REPORTS" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <RowItem
          icon="document-text-outline"
          iconColor="#A78BFA"
          iconBg="#A78BFA18"
          title="Export Health Report (PDF)"
          subtitle="Generates a PDF with adherence stats, medication and skincare details"
          onPress={pdfState === "loading" ? undefined : handlePdfExport}
          disabled={pdfState === "loading"}
          last
          trailing={
            pdfState === "loading" ? (
              <ActivityIndicator size="small" color="#A78BFA" />
            ) : undefined
          }
        />
      </View>
      <StatusBanner state={pdfState} message={pdfMessage} />

      <SectionHeader title="BACKUP & RESTORE" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {Platform.OS !== "web" && (
          <RowItem
            icon="folder"
            iconColor={colors.blue}
            iconBg={colors.blueLight}
            title="Save to Documents"
            subtitle="Saves a backup file to your local Documents folder, which iCloud backs up automatically"
            onPress={saveState === "loading" ? undefined : handleSaveLocal}
            disabled={saveState === "loading"}
            trailing={
              saveState === "loading" ? (
                <ActivityIndicator size="small" color={colors.blue} />
              ) : undefined
            }
          />
        )}
        <RowItem
          icon="share-outline"
          iconColor={colors.tint}
          iconBg={colors.tintLight}
          title="Export & Share"
          subtitle="Share your backup file via AirDrop, Files, email, or any app"
          onPress={exportState === "loading" ? undefined : handleExport}
          disabled={exportState === "loading"}
          trailing={
            exportState === "loading" ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : undefined
          }
        />
        <RowItem
          icon="cloud-download-outline"
          iconColor={colors.amber}
          iconBg={colors.amberLight}
          title="Restore from Backup"
          subtitle="Choose a PrivaCare backup (.json) to restore your data"
          onPress={importState === "loading" ? undefined : handleImport}
          disabled={importState === "loading"}
          last
          trailing={
            importState === "loading" ? (
              <ActivityIndicator size="small" color={colors.amber} />
            ) : undefined
          }
        />
      </View>

      <StatusBanner state={saveState} message={saveMessage} />
      <StatusBanner state={exportState} message={exportMessage} />
      <StatusBanner state={importState} message={importMessage} />

      {savedBackups.length > 0 && Platform.OS !== "web" && (
        <>
          <SectionHeader title={`SAVED BACKUPS (${savedBackups.length})`} />
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {savedBackups.map((filename, i) => {
              const datePart = filename.replace("vital-backup-", "").replace(".json", "");
              return (
                <RowItem
                  key={filename}
                  icon="document-text"
                  iconColor={colors.textSecondary}
                  iconBg={colors.borderLight}
                  title={`Backup ${datePart}`}
                  subtitle={filename}
                  last={i === savedBackups.length - 1}
                />
              );
            })}
          </View>
        </>
      )}

      <SectionHeader title="HOW ICLOUD BACKUP WORKS" />
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          'Tap "Save to Documents" to write a backup file to your device\'s Documents folder',
          "If iCloud Drive is enabled on your iPhone, iOS automatically backs up your Documents folder",
          'To restore, tap "Restore from Backup" and select your saved .json file from the Files app',
        ].map((text, i) => (
          <View key={i} style={styles.infoStep}>
            <View style={[styles.stepNum, { backgroundColor: colors.tintLight }]}>
              <Text style={[styles.stepNumText, { color: colors.tint }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{text}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
        PrivaCare · All data stored on-device only
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 4 },
  titleRow: { paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold" },

  privacyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    marginTop: 4,
  },
  privacyRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  privacySub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.7,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowItemLast: {},
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  bannerText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },

  hkInfoCard: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    alignItems: "flex-start",
  },
  hkInfoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },

  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  infoStep: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, flex: 1 },

  footerNote: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 20,
    marginBottom: 8,
  },
  otherDrugsInput: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 40,
  },
});
