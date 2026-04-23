import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import {
  DayLog,
  Medication,
  MedicationGroup,
  SkincareProduct,
  SkincareRoutine,
} from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { toDateString, todayString, formatNavDate } from "@/utils/scheduleCompute";

// ─── Layout constants ────────────────────────────────────────────────────────

const CENTER_SIZE     = 130;
const STEP            = 96;  // px between adjacent tile centers — slight overlap for depth
const TILE_POSITIONS  = [-3, -2, -1, 0, 1, 2, 3] as const;

const SIZE_AT_DIST    = [130, 94, 68, 46];   // tile size at distance 0,1,2,3
const OPACITY_AT_DIST = [1.0, 0.72, 0.46, 0.0];

const MED_COLOR  = "#34C78B";
const SKIN_COLOR = "#FF6CBF";
const DIVIDER_W  = 1.5;
const BRICK_GAP  = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function offsetDate(base: string, days: number): string {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

function computeBricks(
  medicationGroups: MedicationGroup[],
  skincareRoutines: SkincareRoutine[],
  medications: Medication[],
  skincareProducts: SkincareProduct[],
  dayLog: DayLog,
): { medFilled: boolean[]; skinFilled: boolean[] } {
  const scheduledMedIds  = new Set(dayLog.entries.filter(e => e.itemType === "medication").map(e => e.itemId));
  const scheduledSkinIds = new Set(dayLog.entries.filter(e => e.itemType === "skincare").map(e => e.itemId));

  // Med side: prefer groups that have scheduled items, else individual scheduled active meds
  const relevantMedGroups = medicationGroups.filter(g => g.medicationIds.some(id => scheduledMedIds.has(id)));
  const useMedGroups = relevantMedGroups.length > 0;
  const medItems = useMedGroups
    ? relevantMedGroups
    : medications.filter(m => m.status === "active" && scheduledMedIds.has(m.id));

  const medFilled: boolean[] = medItems.map(item => {
    const ids = useMedGroups ? (item as MedicationGroup).medicationIds : [(item as Medication).id];
    const entries = dayLog.entries.filter(e => e.itemType === "medication" && ids.includes(e.itemId));
    return entries.length > 0 && entries.every(e => e.isComplete);
  });

  // Skin side: prefer routines that have scheduled items, else individual scheduled active products
  const relevantRoutines = skincareRoutines.filter(r => r.productIds.some(id => scheduledSkinIds.has(id)));
  const useSkinRoutines = relevantRoutines.length > 0;
  const skinItems = useSkinRoutines
    ? relevantRoutines
    : skincareProducts.filter(p => scheduledSkinIds.has(p.id));

  const skinFilled: boolean[] = skinItems.map(item => {
    const ids = useSkinRoutines ? (item as SkincareRoutine).productIds : [(item as SkincareProduct).id];
    const entries = dayLog.entries.filter(e => e.itemType === "skincare" && ids.includes(e.itemId));
    return entries.length > 0 && entries.every(e => e.isComplete);
  });

  return { medFilled, skinFilled };
}

// ─── DayTile ─────────────────────────────────────────────────────────────────

type DayTileProps = {
  dayLog: DayLog;
  medicationGroups: MedicationGroup[];
  skincareRoutines: SkincareRoutine[];
  medications: Medication[];
  skincareProducts: SkincareProduct[];
};

function DayTile({ dayLog, medicationGroups, skincareRoutines, medications, skincareProducts }: DayTileProps) {
  const { isDark } = useTheme();

  const { medFilled, skinFilled } = useMemo(
    () => computeBricks(medicationGroups, skincareRoutines, medications, skincareProducts, dayLog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayLog.entries.length, medicationGroups.length, skincareRoutines.length]
  );

  const hasMedSide  = medFilled.length > 0;
  const hasSkinSide = skinFilled.length > 0;
  const hasBoth     = hasMedSide && hasSkinSide;

  const tileColor   = isDark ? "#2B2B2B" : "#E8EAED";
  const emptyBrick  = isDark ? "#3C3C3C" : "#D4D7DC";
  const borderColor = isDark ? "#404040" : "#CDD0D5";

  const renderColumn = (filled: boolean[], color: string) => (
    <View style={styles.column}>
      {filled.map((isFilled, i) => (
        <View
          key={i}
          style={[styles.brick, { backgroundColor: isFilled ? color : emptyBrick }]}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.tile, { backgroundColor: tileColor, borderColor }]}>
      <View style={styles.tileInner}>
        {!hasMedSide && !hasSkinSide ? (
          <View style={[styles.brick, { flex: 1, borderRadius: 3, backgroundColor: emptyBrick }]} />
        ) : hasBoth ? (
          <>
            {renderColumn(medFilled, MED_COLOR)}
            <View style={{ width: DIVIDER_W, backgroundColor: borderColor }} />
            {renderColumn(skinFilled, SKIN_COLOR)}
          </>
        ) : hasMedSide ? (
          renderColumn(medFilled, MED_COLOR)
        ) : (
          renderColumn(skinFilled, SKIN_COLOR)
        )}
      </View>
    </View>
  );
}

// ─── AnimatedTileSlot — one hook call per tile position ──────────────────────

type SlotProps = {
  logicalPos: number;
  animOffset: SharedValue<number>;
  containerHalfWidth: number;
  dayLog: DayLog;
  medicationGroups: MedicationGroup[];
  skincareRoutines: SkincareRoutine[];
  medications: Medication[];
  skincareProducts: SkincareProduct[];
};

function AnimatedTileSlot({
  logicalPos, animOffset, containerHalfWidth,
  dayLog, medicationGroups, skincareRoutines, medications, skincareProducts,
}: SlotProps) {
  const animStyle = useAnimatedStyle(() => {
    const visualPos = logicalPos + animOffset.value;
    const absDist   = Math.abs(visualPos);
    const size      = interpolate(absDist, [0, 1, 2, 3], SIZE_AT_DIST, "clamp");
    const op        = interpolate(absDist, [0, 1, 2, 3], OPACITY_AT_DIST, "clamp");
    const tx        = visualPos * STEP;
    const zIdx      = Math.round(20 - absDist * 4);
    // vertically centre within the fixed-height strip
    const top       = (CENTER_SIZE - size) / 2;

    return {
      width:     size,
      height:    size,
      opacity:   op,
      transform: [{ translateX: tx }],
      zIndex:    zIdx,
      left:      containerHalfWidth - size / 2,
      top,
    };
  });

  return (
    <Animated.View style={[styles.slotWrapper, animStyle]}>
      <DayTile
        dayLog={dayLog}
        medicationGroups={medicationGroups}
        skincareRoutines={skincareRoutines}
        medications={medications}
        skincareProducts={skincareProducts}
      />
    </Animated.View>
  );
}

// ─── DayTileCarousel ─────────────────────────────────────────────────────────

type Props = {
  viewingDate: string;
  onDateChange: (date: string) => void;
  getDayLog: (date: string) => DayLog;
  buildDayLog: (date: string) => void;
  medicationGroups: MedicationGroup[];
  skincareRoutines: SkincareRoutine[];
  medications: Medication[];
  skincareProducts: SkincareProduct[];
};

export function DayTileCarousel({
  viewingDate, onDateChange, getDayLog, buildDayLog,
  medicationGroups, skincareRoutines, medications, skincareProducts,
}: Props) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const today     = todayString();
  const canGoNext = viewingDate < today;

  const containerWidth     = screenWidth - 32;
  const containerHalfWidth = containerWidth / 2;

  // Pre-build day logs for all visible dates whenever viewingDate changes
  useEffect(() => {
    for (let d = -2; d <= 2; d++) {
      buildDayLog(offsetDate(viewingDate, d));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingDate]);

  const animOffset = useSharedValue(0);

  const navigate = useCallback((direction: 1 | -1) => {
    // direction: +1 = forward (next day), -1 = backward (prev day)
    if (direction === 1 && !canGoNext) return;
    if (animOffset.value !== 0) return;
    // When going next (+1): tiles shift LEFT → animOffset → -1
    // When going prev (-1): tiles shift RIGHT → animOffset → +1
    const target = -direction as -1 | 1;
    animOffset.value = withTiming(
      target,
      { duration: 340, easing: Easing.out(Easing.cubic) },
      finished => {
        if (finished) {
          runOnJS(onDateChange)(offsetDate(viewingDate, direction));
          animOffset.value = 0;
        }
      }
    );
  }, [viewingDate, canGoNext, onDateChange, animOffset]);

  const hasMedLegend  = medicationGroups.length > 0 || medications.some(m => m.status === "active" && !m.schedule?.asNeeded);
  const hasSkinLegend = skincareRoutines.length > 0  || skincareProducts.some(p => !p.schedule?.asNeeded);

  return (
    <View style={styles.wrapper}>
      {/* Nav row */}
      <View style={styles.navRow}>
        <Pressable onPress={() => navigate(-1)} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.dateLabel, { color: colors.text }]}>
          {formatNavDate(viewingDate)}
        </Text>
        <Pressable
          onPress={() => navigate(1)}
          style={[styles.navBtn, { opacity: canGoNext ? 1 : 0.3 }]}
          disabled={!canGoNext}
          hitSlop={10}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Tile strip */}
      <View style={[styles.strip, { width: containerWidth, height: CENTER_SIZE + 4 }]}>
        {TILE_POSITIONS.map(pos => (
          <AnimatedTileSlot
            key={pos}
            logicalPos={pos}
            animOffset={animOffset}
            containerHalfWidth={containerHalfWidth}
            dayLog={getDayLog(offsetDate(viewingDate, pos))}
            medicationGroups={medicationGroups}
            skincareRoutines={skincareRoutines}
            medications={medications}
            skincareProducts={skincareProducts}
          />
        ))}
      </View>

      {/* Legend */}
      {(hasMedLegend || hasSkinLegend) && (
        <View style={styles.legend}>
          {hasMedLegend && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MED_COLOR }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Medications</Text>
            </View>
          )}
          {hasSkinLegend && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SKIN_COLOR }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Skincare</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper:  { gap: 6 },

  navRow:    { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  navBtn:    { padding: 8 },
  dateLabel: { fontSize: 17, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },

  strip: { alignSelf: "center", overflow: "hidden" },

  slotWrapper: { position: "absolute" },

  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  tileInner: {
    flex: 1,
    flexDirection: "row",
    padding: 4,
    gap: BRICK_GAP,
  },
  column: {
    flex: 1,
    flexDirection: "column",
    gap: BRICK_GAP,
  },
  brick: {
    flex: 1,
    borderRadius: 3,
  },

  legend:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
