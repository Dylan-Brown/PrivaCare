import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import {
  requestHealthKitPermissions,
  setHealthKitSyncEnabled,
} from "@/utils/healthKit";

type Props = {
  visible: boolean;
  onDone: () => void;
};

const BENEFITS = [
  {
    icon: "heart-outline" as const,
    text: "Medication doses are automatically logged to Apple Health when you mark them taken.",
  },
  {
    icon: "phone-portrait-outline" as const,
    text: "Your Health data stays on your device and is managed entirely by Apple.",
  },
  {
    icon: "toggle-outline" as const,
    text: "You can turn this off at any time in Settings.",
  },
];

export function HealthKitOnboardingModal({ visible, onDone }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleEnable = async () => {
    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await requestHealthKitPermissions();

    if (result.success) {
      await setHealthKitSyncEnabled(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      onDone();
    } else {
      setLoading(false);
      setError(result.message);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 24) + 8,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: `#FF375F18` }]}>
            <Ionicons name="heart" size={36} color="#FF375F" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Connect Apple Health?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Vital can log your medication doses to Apple Health so they appear
            alongside your other health data.
          </Text>

          {/* Benefits list */}
          <View style={[styles.benefitsList, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={[styles.benefitRow, i < BENEFITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.benefitIcon, { backgroundColor: `#FF375F15` }]}>
                  <Ionicons name={b.icon} size={18} color="#FF375F" />
                </View>
                <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                  {b.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Buttons */}
          <Pressable
            onPress={handleEnable}
            disabled={loading}
            style={[styles.enableBtn, { backgroundColor: "#FF375F", opacity: loading ? 0.7 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="heart" size={18} color="#fff" />
                  <Text style={styles.enableBtnText}>Enable Apple Health</Text>
                </>
            }
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipBtn} disabled={loading}>
            <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>
              Not Now
            </Text>
          </Pressable>

          <Text style={[styles.footnote, { color: colors.textTertiary }]}>
            You can change this at any time in{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>Settings → Apple Health</Text>.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  benefitsList: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  errorBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  enableBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
  },
  enableBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  skipBtnText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  footnote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },
});
