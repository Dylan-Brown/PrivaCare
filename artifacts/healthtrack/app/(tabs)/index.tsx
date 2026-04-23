import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
import { DayTileCarousel } from "@/components/today/DayTileCarousel";
import { useTheme } from "@/hooks/useTheme";
import { GroupDetailModal } from "@/components/today/GroupDetailModal";
import {
  formatTime,
  formatNavDate,
  todayString,
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
  medGroups: DisplayGroup[];
  skinGroups: DisplayGroup[];
} {
  const buckets = new Map<string, DayLogEntry[]>();
  entries.forEach(e => {
    const key = `${e.itemType}|${e.scheduledTime}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(e);
  });

  const incomplete: DisplayGroup[] = [];
  const complete: DisplayGroup[]   = [];

  buckets.forEach((groupEntries, key) => {
    const [itemType, scheduledTime] = key.split("|") as ["medication" | "skincare", string];
    const incompleteEntries = groupEntries.filter(e => !e.isComplete);
    const completeEntries   = groupEntries.filter(e => e.isComplete);
    if (incompleteEntries.length > 0)
      incomplete.push({ groupKey: key, itemType, scheduledTime, entries: incompleteEntries, isComplete: false });
    if (completeEntries.length > 0)
      complete.push({ groupKey: `${key}:done`, itemType, scheduledTime, entries: completeEntries, isComplete: true });
  });

  const sort = (a: DisplayGroup, b: DisplayGroup) => a.scheduledTime.localeCompare(b.scheduledTime);
  incomplete.sort(sort);
  complete.sort(sort);

  // Merged per-type lists (incomplete first, then complete) for horizontal rows
  const allGroups = [...incomplete, ...complete];
  const medGroups  = allGroups.filter(g => g.itemType === "medication");
  const skinGroups = allGroups.filter(g => g.itemType === "skincare");

  return { incomplete, complete, medGroups, skinGroups };
}

// ─── BellButton ────────────────────────────────────────────────────────────

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

// ─── HorizGroupCard (horizontal row card) ──────────────────────────────────

const CARD_W = 192;
const CARD_H = 126;
const MED_COLOR  = "#34C78B";
const SKIN_COLOR = "#FF6CBF";

function HorizGroupCard({
  group, completing, accentColor, onComplete, onExpand, colors, skincareProducts,
}: {
  group: DisplayGroup; completing: boolean; accentColor: string;
  onComplete: () => void; onExpand: () => void;
  colors: any; skincareProducts: any[];
}) {
  const timeLabel = formatTime(group.scheduledTime);
  const names = group.entries.map(e => e.itemName).join(", ");

  const expiryWarning = group.itemType === "skincare"
    ? (() => {
        for (const e of group.entries) {
          const p = skincareProducts.find((pr: any) => pr.id === e.itemId);
          if (p?.expiryDate) {
            if (isDateExpired(p.expiryDate))   return { label: "Expired", danger: true };
            if (isDateExpiringSoon(p.expiryDate)) return { label: "Expiring soon", danger: false };
          }
        }
        return null;
      })()
    : null;

  const bg     = group.isComplete ? `${accentColor}12` : `${accentColor}09`;
  const border = group.isComplete ? `${accentColor}35` : `${accentColor}22`;

  return (
    <Pressable
      onPress={onExpand}
      style={[styles.horizCard, { width: CARD_W, height: CARD_H, backgroundColor: bg, borderColor: border }]}
    >
      {/* Top row: time + count badge */}
      <View style={styles.horizCardTop}>
        <Text style={[styles.horizCardTime, { color: accentColor }]}>{timeLabel}</Text>
        <View style={[styles.horizCardBadge, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.horizCardBadgeText, { color: accentColor }]}>{group.entries.length}</Text>
        </View>
        {expiryWarning && (
          <Ionicons
            name="warning-outline" size={13}
            color={expiryWarning.danger ? colors.danger : colors.amber}
            style={{ marginLeft: 2 }}
          />
        )}
      </View>

      {/* Names */}
      <Text style={[styles.horizCardNames, { color: colors.text }]} numberOfLines={3}>{names}</Text>

      {/* Bottom row: status or done button */}
      <View style={styles.horizCardBottom}>
        {group.isComplete ? (
          <View style={[styles.horizDoneTag, { backgroundColor: `${accentColor}20` }]}>
            <Ionicons name="checkmark-circle" size={13} color={accentColor} />
            <Text style={[styles.horizDoneText, { color: accentColor }]}>Done</Text>
          </View>
        ) : (
          <Pressable
            onPress={e => { e.stopPropagation?.(); onComplete(); }}
            style={[styles.horizMarkBtn, { borderColor: completing ? accentColor : `${accentColor}40`, backgroundColor: completing ? `${accentColor}15` : "transparent" }]}
            hitSlop={8}
          >
            <Ionicons
              name={completing ? "checkmark-circle" : "ellipse-outline"}
              size={16} color={completing ? accentColor : `${accentColor}80`}
            />
            <Text style={[styles.horizMarkBtnText, { color: completing ? accentColor : `${accentColor}80` }]}>
              {completing ? "Marking…" : "Mark done"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ─── Horizontal group row ──────────────────────────────────────────────────

function HorizGroupRow({
  label, groups, accentColor, completingKey, onComplete, onExpand, colors, skincareProducts,
}: {
  label: string; groups: DisplayGroup[]; accentColor: string;
  completingKey: string | null;
  onComplete: (g: DisplayGroup) => void; onExpand: (g: DisplayGroup) => void;
  colors: any; skincareProducts: any[];
}) {
  if (groups.length === 0) return null;
  return (
    <View style={styles.horizRow}>
      <View style={styles.horizRowHeader}>
        <View style={[styles.sectionDot, { backgroundColor: accentColor }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
          {groups.filter(g => g.isComplete).length}/{groups.length}
        </Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={g => g.groupKey}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizList}
        renderItem={({ item: group }) => (
          <HorizGroupCard
            group={group}
            completing={completingKey === group.groupKey}
            accentColor={accentColor}
            onComplete={() => onComplete(group)}
            onExpand={() => onExpand(group)}
            colors={colors}
            skincareProducts={skincareProducts}
          />
        )}
      />
    </View>
  );
}

// ─── Vertical GroupCard (used when only one type exists) ───────────────────

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
    ? medications.find((m: any) => m.id === group.entries[0]?.itemId)
    : skincareProducts.find((p: any) => p.id === group.entries[0]?.itemId);
  const accentColor = firstItem?.color ?? (group.itemType === "medication" ? MED_COLOR : SKIN_COLOR);

  const expiryWarning = group.itemType === "skincare"
    ? (() => {
        for (const e of group.entries) {
          const p = skincareProducts.find((pr: any) => pr.id === e.itemId);
          if (p?.expiryDate) {
            if (isDateExpired(p.expiryDate))     return { label: `${p.name} — Expired`, danger: true };
            if (isDateExpiringSoon(p.expiryDate)) return { label: `${p.name} — Expiring soon`, danger: false };
          }
        }
        return null;
      })()
    : null;

  return (
    <Pressable
      onPress={onExpand}
      style={[styles.groupCard, {
        backgroundColor: group.isComplete ? `${accentColor}08` : colors.card,
        borderColor: group.isComplete ? `${accentColor}25` : colors.border,
      }]}
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
          {completing || group.isComplete
            ? <Ionicons name="checkmark-circle" size={24} color={accentColor} />
            : <Ionicons name={group.itemType === "medication" ? "medical" : "sparkles"} size={20} color={accentColor} />
          }
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupMetaRow}>
            <Text style={[styles.groupTime, { color: accentColor }]}>{timeLabel}</Text>
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
            style={[styles.completeAllBtn, { borderColor: completing ? accentColor : colors.border, backgroundColor: completing ? `${accentColor}15` : colors.background }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Ionicons name={completing ? "checkmark-circle" : "ellipse-outline"} size={26}
              color={completing ? accentColor : colors.textTertiary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ─── ReactionCard ──────────────────────────────────────────────────────────

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

// ─── VitalsBar (anchored bottom) ───────────────────────────────────────────

function VitalsBar({ colors, onLog, onHistory }: { colors: any; onLog: () => void; onHistory: () => void }) {
  return (
    <View style={[styles.vitalsBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <Pressable style={styles.vitalsBtn} onPress={onLog}>
        <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.vitalsBtnTitle, { color: colors.text }]}>Log Vital Signs</Text>
          <Text style={[styles.vitalsBtnSub, { color: colors.textSecondary }]}>SpO₂, pressure, temperature</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
      </Pressable>
      <View style={[styles.vitalsDiv, { backgroundColor: colors.borderLight }]} />
      <Pressable style={styles.vitalsBtn} onPress={onHistory}>
        <Ionicons name="pulse-outline" size={20} color={colors.blue} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.vitalsBtnTitle, { color: colors.text }]}>View Vitals History</Text>
          <Text style={[styles.vitalsBtnSub, { color: colors.textSecondary }]}>Charts and trends over time</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
      </Pressable>
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
    medicationGroups, skincareRoutines,
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

  const dayLog = useMemo(() => getDayLog(viewingDate), [dayLogs, viewingDate]);
  const { incomplete, complete, medGroups, skinGroups } = useMemo(
    () => computeDisplayGroups(dayLog.entries), [dayLog]
  );
  const reactions    = dayLog.reactionNotes ?? [];
  const unreadCount  = notifications.filter(n => !n.read).length;
  const refillNeeded = getMedicationsNeedingRefill();

  const handleDateChange = useCallback((date: string) => setViewingDate(date), []);

  const handleCompleteGroup = (group: DisplayGroup) => {
    if (completingKey) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
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

  // Show horizontal rows when both types have scheduled items
  const hasBothTypes = medGroups.length > 0 && skinGroups.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Today",
          headerRight: () => (
            <BellButton unread={unreadCount} onPress={() => router.push("/notifications")} />
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <DayTileCarousel
          viewingDate={viewingDate}
          onDateChange={handleDateChange}
          getDayLog={getDayLog}
          buildDayLog={buildDayLog}
          medicationGroups={medicationGroups}
          skincareRoutines={skincareRoutines}
          medications={medications}
          skincareProducts={skincareProducts}
        />

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

        {/* ── Horizontal rows (both types present) ── */}
        {hasBothTypes && (
          <>
            <HorizGroupRow
              label="Medications"
              groups={medGroups}
              accentColor={MED_COLOR}
              completingKey={completingKey}
              onComplete={handleCompleteGroup}
              onExpand={g => setDetailGroup(g)}
              colors={colors}
              skincareProducts={skincareProducts}
            />
            <HorizGroupRow
              label="Skincare"
              groups={skinGroups}
              accentColor={SKIN_COLOR}
              completingKey={completingKey}
              onComplete={handleCompleteGroup}
              onExpand={g => setDetailGroup(g)}
              colors={colors}
              skincareProducts={skincareProducts}
            />
          </>
        )}

        {/* ── Vertical lists (only one type present) ── */}
        {!hasBothTypes && incomplete.length > 0 && (
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

        {!hasBothTypes && complete.length > 0 && (
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
            style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/skincare-reactions")}
          >
            <Ionicons name="sparkles-outline" size={20} color={colors.purple} />
            <View style={styles.actionRowInfo}>
              <Text style={[styles.actionRowTitle, { color: colors.text }]}>Log Skincare Reactions</Text>
              <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Note how products are working for you</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        )}

        <Pressable
          style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/adherence")}
        >
          <Ionicons name="bar-chart-outline" size={20} color={colors.tint} />
          <View style={styles.actionRowInfo}>
            <Text style={[styles.actionRowTitle, { color: colors.text }]}>How Am I Doing?</Text>
            <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Adherence streaks and monthly overview</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>
      </ScrollView>

      {/* Vitals bar — anchored below the scroll, above the tab bar */}
      <VitalsBar
        colors={colors}
        onLog={() => router.push("/vitals-log")}
        onHistory={() => router.push("/vitals-history")}
      />

      <GroupDetailModal
        visible={detailGroup !== null}
        onClose={() => setDetailGroup(null)}
        scheduledTime={detailGroup?.scheduledTime ?? ""}
        itemType={detailGroup?.itemType ?? "medication"}
        entries={detailEntries}
        date={viewingDate}
        allComplete={detailEntries.every(e => e.isComplete)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:    { flex: 1 },
  container: { flex: 1 },
  content:   { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  bellBtn: { marginRight: 12, padding: 4 },
  bellBadge: {
    position: "absolute", top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },

  refillBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  refillText:   { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

  emptyState:    { alignItems: "center", paddingVertical: 40, gap: 14 },
  emptyIcon:     { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle:    { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },

  // ── Horizontal rows ──────────────────────────────────────────────────────
  horizRow: { gap: 8 },
  horizRowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  horizList: { gap: 10, paddingRight: 16 },

  horizCard: {
    borderRadius: 16, borderWidth: 1.5,
    padding: 13, gap: 6, overflow: "hidden",
  },
  horizCardTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  horizCardTime: { fontSize: 12, fontFamily: "Inter_700Bold", flex: 1 },
  horizCardBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100 },
  horizCardBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  horizCardNames: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19, flex: 1 },
  horizCardBottom: { flexDirection: "row", alignItems: "center" },
  horizDoneTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  horizDoneText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  horizMarkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  horizMarkBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // ── Vertical sections ────────────────────────────────────────────────────
  section:       { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  sectionDot:    { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount:  { fontSize: 14, fontFamily: "Inter_500Medium" },

  timelineItem: { position: "relative" },
  connector:    { position: "absolute", left: 20, top: "100%", width: 2, height: 8, zIndex: 1 },

  groupCard:     { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  groupCardBody: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  groupIconBox:  { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  groupInfo:     { flex: 1, gap: 4 },
  groupMetaRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  groupTime:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  groupDot:      { fontSize: 12 },
  groupType:     { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  groupCountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100 },
  groupCount:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  groupNames:    { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  completeAllBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  expiryStrip:   { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7 },
  expiryStripText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // ── Reactions ─────────────────────────────────────────────────────────────
  reactionCard:    { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  reactionHeader:  { flexDirection: "row", alignItems: "center", gap: 8 },
  reactionProduct: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  reactionNote:    { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  // ── Action rows (reactions, adherence) ────────────────────────────────────
  actionRow:     { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  actionRowInfo: { flex: 1 },
  actionRowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  actionRowSub:  { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // ── Vitals bar ────────────────────────────────────────────────────────────
  vitalsBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  vitalsBtn: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingVertical: 11,
  },
  vitalsDiv: { height: StyleSheet.hairlineWidth, marginHorizontal: 32 },
  vitalsBtnTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  vitalsBtnSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
