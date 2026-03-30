import React from "react";
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onDonate: () => void;
  promptCount?: number;
};

type PromptContent = {
  icon: "heart" | "heart-half" | "sparkles";
  title: string;
  body: React.ReactNode;
  dismissText: string;
};

function getPromptContent(promptCount: number, colors: ReturnType<typeof useTheme>["colors"]): PromptContent {
  if (promptCount === 0) {
    return {
      icon: "heart",
      title: "Support PrivaCare",
      body: (
        <>
          PrivaCare is free and keeps all your health data{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>
            100% on your device
          </Text>
          {" "}— no subscriptions, no accounts, no servers.
          {"\n\n"}
          If PrivaCare helps you stay on top of your health, consider a small donation to keep
          it ad-free and independent.
        </>
      ),
      dismissText: "Maybe later",
    };
  }

  if (promptCount === 1) {
    return {
      icon: "heart-half",
      title: "You're Still Here — Thank You",
      body: (
        <>
          It means a lot that you keep coming back to PrivaCare. Your health data
          stays{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>
            completely private
          </Text>
          {" "}— always on your device, never shared.
          {"\n\n"}
          If PrivaCare has been useful, a small donation goes a long way for an
          independent developer.
        </>
      ),
      dismissText: "Not right now",
    };
  }

  return {
    icon: "sparkles",
    title: "A Quick Reminder",
    body: (
      <>
        PrivaCare remains free, ad-free, and fully private thanks to donations from
        people like you.
        {"\n\n"}
        If you find it useful, even a small contribution helps keep it going.
      </>
    ),
    dismissText: "Dismiss",
  };
}

export function DonationModal({ visible, onDismiss, onDonate, promptCount = 0 }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const content = getPromptContent(promptCount, colors);

  const handleDonate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDonate();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={[styles.iconWrap, { backgroundColor: colors.tintLight }]}>
            <Ionicons name={content.icon} size={32} color={colors.tint} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {content.title}
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {content.body}
          </Text>

          <View style={[styles.perksRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {[
              { icon: "shield-checkmark-outline", text: "No ads, ever" },
              { icon: "lock-closed-outline",      text: "Always private" },
              { icon: "code-slash-outline",       text: "Indie developer" },
            ].map(perk => (
              <View key={perk.icon} style={styles.perk}>
                <Ionicons name={perk.icon as any} size={18} color={colors.tint} />
                <Text style={[styles.perkText, { color: colors.textSecondary }]}>{perk.text}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.donateBtn, { backgroundColor: colors.tint }]}
            onPress={handleDonate}
          >
            <Ionicons name="heart" size={18} color="#fff" />
            <Text style={styles.donateBtnText}>Yes, I'd Like to Donate</Text>
          </Pressable>

          <Pressable style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={[styles.dismissText, { color: colors.textTertiary }]}>
              {content.dismissText}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginBottom: 24,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 22, fontFamily: "Inter_700Bold",
    textAlign: "center", marginBottom: 14,
  },
  body: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    lineHeight: 23, textAlign: "center", marginBottom: 20,
  },
  perksRow: {
    width: "100%", flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, marginBottom: 24,
  },
  perk: { alignItems: "center", gap: 6 },
  perkText: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  donateBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 16, marginBottom: 12,
  },
  donateBtnText: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff",
  },
  dismissBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  dismissText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
