import React, { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppNotification, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { todayString, toDateString } from "@/utils/scheduleCompute";

// ─── Helpers ───────────────────────────────────────────────────────────────

function groupByDate(notifications: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const today     = todayString();
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  const oneWeekAgo = toDateString(new Date(Date.now() - 7 * 86400000));

  const todayItems:     AppNotification[] = [];
  const yesterdayItems: AppNotification[] = [];
  const weekItems:      AppNotification[] = [];
  const earlierItems:   AppNotification[] = [];

  const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  sorted.forEach(n => {
    const d = toDateString(new Date(n.createdAt));
    if (d === today)           todayItems.push(n);
    else if (d === yesterday)  yesterdayItems.push(n);
    else if (d >= oneWeekAgo)  weekItems.push(n);
    else                       earlierItems.push(n);
  });

  return [
    { label: "Today",     items: todayItems },
    { label: "Yesterday", items: yesterdayItems },
    { label: "This Week", items: weekItems },
    { label: "Earlier",   items: earlierItems },
  ].filter(g => g.items.length > 0);
}

function notifIcon(type: AppNotification["type"]): { name: string; color: string } {
  switch (type) {
    case "insight": return { name: "bar-chart-outline", color: "#AF52DE" };
    default:        return { name: "notifications-outline", color: "#34C78B" };
  }
}

function formatRelTime(isoDate: string): string {
  const ts   = new Date(isoDate).getTime();
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Notification Row ──────────────────────────────────────────────────────

function NotifRow({
  notification, onPress, onDelete, colors,
}: {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
  colors: any;
}) {
  const { name: iconName, color: iconColor } = notifIcon(notification.type);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.notifRow,
        {
          backgroundColor: notification.read ? colors.card : `${iconColor}08`,
          borderColor: notification.read ? colors.border : `${iconColor}25`,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
      </View>

      <View style={styles.notifBody}>
        <View style={styles.notifTitleRow}>
          <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={2}>
            {notification.message}
          </Text>
          {!notification.read && (
            <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
          )}
        </View>
        {notification.detail && (
          <Text style={[styles.notifDetail, { color: colors.textSecondary }]} numberOfLines={4}>
            {notification.detail}
          </Text>
        )}
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
          {formatRelTime(notification.createdAt)}
        </Text>
      </View>

      <Pressable
        onPress={onDelete}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { notifications, markNotificationRead, markAllNotificationsRead, deleteNotification } = useApp();

  const groups      = useMemo(() => groupByDate(notifications), [notifications]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handlePress = async (notif: AppNotification) => {
    if (!notif.read) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await markNotificationRead(notif.id);
    }
  };

  const handleDelete = (notif: AppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteNotification(notif.id);
  };

  const handleClearAll = () => {
    Alert.alert("Clear All Notifications", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => {
          notifications.forEach(n => deleteNotification(n.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAllNotificationsRead();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () =>
            notifications.length > 0 ? (
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <Pressable onPress={handleMarkAllRead} style={styles.headerBtn}>
                    <Text style={[styles.headerBtnText, { color: colors.tint }]}>Mark all read</Text>
                  </Pressable>
                )}
                <Pressable onPress={handleClearAll} style={styles.headerBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ) : null,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.tint}18` }]}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Weekly and monthly insights appear here once you've been tracking for a while.
            </Text>
          </View>
        ) : (
          <>
            {unreadCount > 0 && (
              <View style={[styles.unreadBanner, { backgroundColor: `${colors.tint}12`, borderColor: `${colors.tint}25` }]}>
                <Ionicons name="mail-unread-outline" size={16} color={colors.tint} />
                <Text style={[styles.unreadBannerText, { color: colors.tint }]}>
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </Text>
              </View>
            )}

            {groups.map(group => (
              <View key={group.label} style={styles.group}>
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.label}</Text>
                {group.items.map(n => (
                  <NotifRow
                    key={n.id}
                    notification={n}
                    onPress={() => handlePress(n)}
                    onDelete={() => handleDelete(n)}
                    colors={colors}
                  />
                ))}
              </View>
            ))}

            <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Weekly insights appear every Sunday. Monthly summaries appear on the 1st.
                Both require at least one logged entry to generate.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginRight: 8 },
  headerBtn: { padding: 6 },
  headerBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 32 },

  unreadBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  unreadBannerText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  group: { gap: 8 },
  groupLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 },

  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifBody: { flex: 1, gap: 4 },
  notifTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  notifTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginTop: 6 },
  notifDetail: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { padding: 4, flexShrink: 0 },

  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
