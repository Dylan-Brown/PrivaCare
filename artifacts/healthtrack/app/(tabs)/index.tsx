import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Stack, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayLogEntry, SkincareReactionNote, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/ui/AppIcon";
import { GroupDetailModal } from "@/components/today/GroupDetailModal";
import {
  formatTime,
  formatNavDate,
  todayString,
  toDateString,
  isDateExpired,
  isDateExpiringSoon,
} from "@/utils/scheduleCompute";

// ─── Types ─────────────────────────────────────────────────────────────────

type DisplayGroup = {
  groupKey: string;
  itemType: "medication" | "skincare";
  scheduledTime: string;
  entries: DayLogEntry[];
  isComplete: boolean;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeDisplayGroups(entries: DayLogEntry[]): {
  incomplete: DisplayGroup[];
  complete: DisplayGroup[];
} {
  const buckets = new Map<string, DayLogEntry[]>();
  entries.forEach(e => {
    const key = `${e.itemType}|${e.scheduledTime}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(e);
  });

  const incomplete: DisplayGroup[] = [];
  const complete: DisplayGroup[] = [];

  buckets.forEach((groupEntries, key) => {
    const [itemType, scheduledTime] = key.split("|") as ["medication" | "skincare", string];
    const incompleteEntries = groupEntries.filter(e => !e.isComplete);
    const completeEntries   = groupEntries.filter(e => e.isComplete);
    if (incompleteEntries.length > 0) {
      incomplete.push({ groupKey: key, itemType, scheduledTime, entries: incompleteEntries, isComplete: false });
    }
    if (completeEntries.length > 0) {
      complete.push({ groupKey: `${key}:done`, itemType, scheduledTime, entries: completeEntries, isComplete: true });
    }
  });

  const sort = (a: DisplayGroup, b: DisplayGroup) => a.scheduledTime.localeCompare(b.scheduledTime);
  return { incomplete: incomplete.sort(sort), complete: complete.sort(sort) };
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function BellButton({ unread, onPress }: { unread: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.bellBtn}>
      <Ionicons name={unread > 0 ? "notifications" : "notifications-outline"} size={24} color={colors.text} />
      {unread > 0 && (
        <View style={[styles.bellBadge, { backgroundColor: colors.danger }]}>
          <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

function DateNav({ date, onPrev, onNext }: { date: string; onPrev: () => void; onNext: () => void }) {
  const { colors } = useTheme();
  const today = todayString();
  const canGoNext = date < today;
  return (
    <View style={styles.dateNav}>
      <Pressable onPress={onPrev} style={styles.navArrow}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={[styles.dateNavText, { color: colors.text }]}>{formatNavDate(date)}</Text>
      <Pressable onPress={onNext} style={[styles.navArrow, { opacity: canGoNext ? 1 : 0.3 }]} disabled={!canGoNext}>
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function GroupCard({
  group, completing, onComplete, onExpand, colors, medications, skincareProducts,
}: {
  group: DisplayGroup; completing: boolean; onComplete: () => void; onExpand: () => void;
  colors: any; medications: any[]; skincareProducts: any[];
}) {
  const typeLabel = group.itemType === "medication" ? "Medications" : "Skincare";
  const timeLabel = formatTime(group.scheduledTime);
  const names = group.entries.map(e => e.itemName).join(", ");
  const firstItem = group.itemType === "medication"
    ? medications.find(m => m.id === group.entries[0]?.itemId)
    : skincareProducts.find(p => p.id === group.entries[0]?.itemId);
  const accentColor = firstItem?.color ?? colors.tint;

  // Check for expiry warnings
  const expiryWarning = group.itemType === "skincare"
    ? (() => {
        for (const e of group.entries) {
          const p = skincareProducts.find(pr => pr.id === e.itemId);
          if (p?.expiryDate) {
            if (isDateExpired(p.expiryDate)) return { label: `${p.name} — Expired`, danger: true };
            if (isDateExpiringSoon(p.expiryDate)) return { label: `${p.name} — Expiring soon`, danger: false };
          }
        }
        return null;
      })()
    : null;

  return (
    <Pressable
      onPress={onExpand}
      style={[
        styles.groupCard,
        {
          backgroundColor: group.isComplete ? `${accentColor}08` : colors.card,
          borderColor: group.isComplete ? `${accentColor}25` : colors.border,
        },
      ]}
    >
      {expiryWarning && (
        <View style={[styles.expiryStrip, { backgroundColor: expiryWarning.danger ? `${colors.danger}18` : `${colors.amber}18` }]}>
          <Ionicons name="warning-outline" size={12} color={expiryWarning.danger ? colors.danger : colors.amber} />
          <Text style={[styles.expiryStripText, { color: expiryWarning.danger ? colors.danger : colors.amber }]}>
            {expiryWarning.label}
          </Text>
        </View>
      )}
      <View style={styles.groupCardBody}>
        <View style={[styles.groupIconBox, { backgroundColor: `${accentColor}18` }]}>
          {completing
            ? <Ionicons name="checkmark-circle" size={24} color={accentColor} />
            : group.isComplete
              ? <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              : <Ionicons name={group.itemType === "medication" ? "medical" : "sparkles"} size={20} color={accentColor} />
          }
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupMetaRow}>
            <Text style={[styles.groupTime, { color: colors.tint }]}>{timeLabel}</Text>
            <Text style={[styles.groupDot, { color: colors.textTertiary }]}>·</Text>
            <Text style={[styles.groupType, { color: colors.textSecondary }]}>{typeLabel}</Text>
            <View style={[styles.groupCountBadge, { backgroundColor: colors.borderLight }]}>
              <Text style={[styles.groupCount, { color: colors.textTertiary }]}>{group.entries.length}</Text>
            </View>
          </View>
          <Text style={[styles.groupNames, { color: colors.text }]} numberOfLines={2}>{names}</Text>
        </View>
        {!group.isComplete && (
          <Pressable
            onPress={e => { e.stopPropagation?.(); onComplete(); }}
            style={[styles.completeAllBtn, { borderColor: completing ? colors.tint : colors.border, backgroundColor: completing ? `${colors.tint}15` : colors.background }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Ionicons
              name={completing ? "checkmark-circle" : "ellipse-outline"}
              size={26}
              color={completing ? colors.tint : colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function ReactionCard({ reaction, colors }: { reaction: SkincareReactionNote; colors: any }) {
  const sentimentIcon = reaction.sentiment === "positive" ? "happy-outline"
    : reaction.sentiment === "negative" ? "sad-outline" : "remove-circle-outline";
  const sentimentColor = reaction.sentiment === "positive" ? colors.tint
    : reaction.sentiment === "negative" ? colors.danger : colors.textSecondary;
  return (
    <View style={[styles.reactionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.reactionHeader}>
        <Ionicons name="sparkles-outline" size={14} color={colors.purple} />
        <Text style={[styles.reactionProduct, { color: colors.text }]}>{reaction.productName}</Text>
        <Ionicons name={sentimentIcon as any} size={16} color={sentimentColor} />
      </View>
      <Text style={[styles.reactionNote, { color: colors.textSecondary }]}>{reaction.note}</Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    medications, skincareProducts,
    dayLogs, buildDayLog, getDayLog,
    completeAllInGroup,
    notifications,
    getMedicationsNeedingRefill,
  } = useApp();

  const [viewingDate, setViewingDate]     = useState(todayString());
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const [detailGroup, setDetailGroup]     = useState<DisplayGroup | null>(null);

  useFocusEffect(useCallback(() => {
    buildDayLog(viewingDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingDate]));

  useEffect(() => {
    buildDayLog(viewingDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications.length, skincareProducts.length]);

  const dayLog      = useMemo(() => getDayLog(viewingDate), [dayLogs, viewingDate]);
  const { incomplete, complete } = useMemo(() => computeDisplayGroups(dayLog.entries), [dayLog]);
  const reactions   = dayLog.reactionNotes ?? [];
  const unreadCount = notifications.filter(n => !n.read).length;
  const refillNeeded = getMedicationsNeedingRefill();
  const today = todayString();

  const goToPrevDay = () => {
    const d = new Date(viewingDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setViewingDate(toDateString(d));
  };
  const goToNextDay = () => {
    if (viewingDate >= today) return;
    const d = new Date(viewingDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setViewingDate(toDateString(d));
  };

  const handleCompleteGroup = (group: DisplayGroup) => {
    if (completingKey) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletingKey(group.groupKey);
    setTimeout(() => {
      completeAllInGroup(viewingDate, group.itemType, group.scheduledTime);
      setCompletingKey(null);
    }, 950);
  };

  const detailEntries = useMemo(() => {
    if (!detailGroup) return [];
    return dayLog.entries.filter(
      e => e.itemType === detailGroup.itemType && e.scheduledTime === detailGroup.scheduledTime
    );
  }, [dayLog, detailGroup]);

  const isEmpty = incomplete.length === 0 && complete.length === 0 && reactions.length === 0;
  const hasSomethingScheduled =
    medications.some(m => !m.schedule.asNeeded) || skincareProducts.some(p => !p.schedule.asNeeded);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Today",
          headerRight: () => (
            <BellButton unread={unreadCount} onPress={() => router.push("/notifications")} />
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <DateNav date={viewingDate} onPrev={goToPrevDay} onNext={goToNextDay} />

        {refillNeeded.length > 0 && (
          <Pressable
            style={[styles.refillBanner, { backgroundColor: `${colors.amber}18`, borderColor: `${colors.amber}30` }]}
            onPress={() => router.push("/medications")}
          >
            <Ionicons name="alert-circle-outline" size={18} color={colors.amber} />
            <Text style={[styles.refillText, { color: colors.amber }]}>
              {refillNeeded.length === 1
                ? `${refillNeeded[0].name} is running low`
                : `${refillNeeded.length} medications need refill`}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.amber} />
          </Pressable>
        )}

        {isEmpty && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.tint}18` }]}>
              <Ionicons name={hasSomethingScheduled ? "checkmark-done-outline" : "calendar-outline"} size={40} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasSomethingScheduled ? "All clear!" : "Nothing scheduled yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {hasSomethingScheduled
                ? `No scheduled items for ${formatNavDate(viewingDate).toLowerCase()}.`
                : "Add medications or skincare products with a schedule to see them here."}
            </Text>
          </View>
        )}

        {incomplete.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.amber }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>To Do</Text>
              <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>{incomplete.length}</Text>
            </View>
            {incomplete.map((group, idx) => (
              <View key={group.groupKey} style={styles.timelineItem}>
                {idx < incomplete.length - 1 && (
                  <View style={[styles.connector, { backgroundColor: colors.border }]} />
                )}
                <GroupCard
                  group={group}
                  completing={completingKey === group.groupKey}
                  onComplete={() => handleCompleteGroup(group)}
                  onExpand={() => setDetailGroup(group)}
                  colors={colors}
                  medications={medications}
                  skincareProducts={skincareProducts}
                />
              </View>
            ))}
          </View>
        )}

        {complete.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed</Text>
              <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>{complete.length}</Text>
            </View>
            {complete.map((group, idx) => (
              <View key={group.groupKey} style={styles.timelineItem}>
                {idx < complete.length - 1 && (
                  <View style={[styles.connector, { backgroundColor: `${colors.tint}30` }]} />
                )}
                <GroupCard
                  group={group}
                  completing={false}
                  onComplete={() => {}}
                  onExpand={() => setDetailGroup(group)}
                  colors={colors}
                  medications={medications}
                  skincareProducts={skincareProducts}
                />
              </View>
            ))}
          </View>
        )}

        {reactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.purple }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reactions Logged</Text>
              <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>{reactions.length}</Text>
            </View>
            {reactions.map(r => <ReactionCard key={r.id} reaction={r} colors={colors} />)}
          </View>
        )}

        {skincareProducts.length > 0 && (
          <Pressable
            style={[styles.logReactionsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/skincare-reactions")}
          >
            <Ionicons name="sparkles-outline" size={20} color={colors.purple} />
            <View style={styles.logReactionsBtnInfo}>
              <Text style={[styles.logReactionsBtnTitle, { color: colors.text }]}>Log Skincare Reactions</Text>
              <Text style={[styles.logReactionsBtnSub, { color: colors.textSecondary }]}>Note how products are working for you</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        )}

        <Pressable
          style={[styles.logReactionsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/adherence")}
        >
          <Ionicons name="bar-chart-outline" size={20} color={colors.tint} />
          <View style={styles.logReactionsBtnInfo}>
            <Text style={[styles.logReactionsBtnTitle, { color: colors.text }]}>How Am I Doing?</Text>
            <Text style={[styles.logReactionsBtnSub, { color: colors.textSecondary }]}>Adherence streaks and monthly overview</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>

        <View style={[styles.logReactionsBtn, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "column", gap: 0, padding: 0 }]}>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
            onPress={() => router.push("/vitals-log")}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
            <View style={styles.logReactionsBtnInfo}>
              <Text style={[styles.logReactionsBtnTitle, { color: colors.text }]}>Log Vital Signs</Text>
              <Text style={[styles.logReactionsBtnSub, { color: colors.textSecondary }]}>Blood oxygen, pressure, temperature</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginHorizontal: 14 }} />
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
            onPress={() => router.push("/vitals-history")}
          >
            <Ionicons name="pulse-outline" size={20} color={colors.blue} />
            <View style={styles.logReactionsBtnInfo}>
              <Text style={[styles.logReactionsBtnTitle, { color: colors.text }]}>View Vitals History</Text>
              <Text style={[styles.logReactionsBtnSub, { color: colors.textSecondary }]}>Charts and trends over time</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>

      <GroupDetailModal
        visible={detailGroup !== null}
        onClose={() => setDetailGroup(null)}
        scheduledTime={detailGroup?.scheduledTime ?? ""}
        itemType={detailGroup?.itemType ?? "medication"}
        entries={detailEntries}
        date={viewingDate}
        allComplete={detailEntries.every(e => e.isComplete)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  bellBtn: { marginRight: 12, padding: 4 },
  bellBadge: {
    position: "absolute", top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },

  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 },
  navArrow: { padding: 8 },
  dateNavText: { fontSize: 17, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },

  refillBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  refillText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

  emptyState: { alignItems: "center", paddingVertical: 52, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },

  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount: { fontSize: 14, fontFamily: "Inter_500Medium" },

  timelineItem: { position: "relative" },
  connector: { position: "absolute", left: 20, top: "100%", width: 2, height: 8, zIndex: 1 },

  groupCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  groupCardBody: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  groupIconBox: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  groupInfo: { flex: 1, gap: 4 },
  groupMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  groupTime: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  groupDot: { fontSize: 12 },
  groupType: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  groupCountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100 },
  groupCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  groupNames: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  completeAllBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  expiryStrip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7 },
  expiryStripText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  reactionCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  reactionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reactionProduct: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  reactionNote: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  logReactionsBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  logReactionsBtnInfo: { flex: 1 },
  logReactionsBtnTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  logReactionsBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
