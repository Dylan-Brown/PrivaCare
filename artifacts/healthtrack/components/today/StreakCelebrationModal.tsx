import React, { useEffect, useRef } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { computeStreakMilestones } from "@/context/AppContext";

// ─── Milestone label helper ────────────────────────────────────────────────

function getMilestoneLabel(count: number): string {
  const today = new Date();
  const milestones = computeStreakMilestones(today);
  const idx = milestones.indexOf(count);

  if (count === 1) return "First Day";
  if (count === 7) return "One Week";
  if (count === 14) return "Two Weeks";

  // Month milestones
  function daysInLastNMonths(n: number): number {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += new Date(today.getFullYear(), today.getMonth() - i, 0).getDate();
    }
    return total;
  }
  if (count === daysInLastNMonths(1)) return "One Month";
  if (count === daysInLastNMonths(2)) return "Two Months";
  if (count === daysInLastNMonths(6)) return "Six Months";

  // Year milestones — find which year this is
  const oneYear = ((y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365)(today.getFullYear());
  if (count === oneYear) return "One Year";

  // Additional years
  let accum = oneYear;
  for (let y = 1; y <= 9; y++) {
    const yr = today.getFullYear() + y;
    accum += ((yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0) ? 366 : 365;
    if (count === accum) {
      const labels = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
      return `${labels[y - 1] ?? y + 1} Years`;
    }
  }

  return `${count} Days`;
}

function getMilestoneMessage(count: number): string {
  if (count === 1) return "Your health journey starts here. Every expert was once a beginner.";
  if (count === 7) return "A full week without missing a beat. Your consistency is building real habits.";
  if (count === 14) return "Two weeks strong. The science says habits start to form around now — you're right on track.";
  const today = new Date();
  function days(n: number) {
    let t = 0;
    for (let i = 0; i < n; i++) t += new Date(today.getFullYear(), today.getMonth() - i, 0).getDate();
    return t;
  }
  if (count === days(1)) return "A whole month of commitment. That's something to be genuinely proud of.";
  if (count === days(2)) return "Two months in. Your dedication to your health is becoming part of who you are.";
  if (count === days(6)) return "Six months of consistency. Very few people make it this far. You did.";
  return "Remarkable. Keep going — your future self will thank you for every single day.";
}

// ─── Particle confetti ─────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#FFD700", "#FF6CBF", "#34C78B", "#4DA6FF", "#FF8C42", "#A78BFA"];

function ConfettiDot({ delay, startX, accent }: { delay: number; startX: number; accent: string }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay,
      withSequence(
        withTiming(-60 - Math.random() * 60, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(200, { duration: 700, easing: Easing.in(Easing.quad) }),
      )
    );
    translateX.value = withDelay(delay,
      withTiming(startX, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
    opacity.value = withDelay(delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(900, withTiming(0, { duration: 200 })),
      )
    );
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const size = 6 + Math.random() * 6;

  return (
    <Animated.View
      style={[style, {
        position: "absolute",
        bottom: 40,
        left: "50%",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accent,
      }]}
    />
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  streakCount: number;
  milestoneCount: number;   // the specific milestone being celebrated
  onClose: () => void;
};

export function StreakCelebrationModal({ visible, streakCount, milestoneCount, onClose }: Props) {
  const { colors } = useTheme();
  const label   = getMilestoneLabel(milestoneCount);
  const message = getMilestoneMessage(milestoneCount);

  const scale   = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value   = withSpring(1, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value   = withTiming(0.85, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const confettiItems = React.useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      delay: i * 55,
      startX: (Math.random() - 0.5) * 180,
      accent: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })),
  [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}
        onPress={onClose}
      >
        <Pressable onPress={e => e.stopPropagation?.()}>
          <Animated.View
            style={[styles.card, { backgroundColor: colors.card, shadowColor: "#000" }, cardStyle]}
          >
            {/* Confetti burst */}
            <View style={styles.confettiContainer} pointerEvents="none">
              {confettiItems.map(c => (
                <ConfettiDot key={c.id} delay={c.delay} startX={c.startX} accent={c.accent} />
              ))}
            </View>

            {/* Icon */}
            <View style={[styles.iconRing, { backgroundColor: `${colors.tint}18` }]}>
              <Text style={styles.trophyEmoji}>🏆</Text>
            </View>

            {/* Milestone label */}
            <View style={[styles.milestonePill, { backgroundColor: `${colors.tint}18` }]}>
              <Text style={[styles.milestoneLabel, { color: colors.tint }]}>{label}</Text>
            </View>

            {/* Headline */}
            <Text style={[styles.headline, { color: colors.text }]}>
              {streakCount} Day Streak!
            </Text>

            {/* Message */}
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            {/* Close */}
            <Pressable
              style={[styles.closeBtn, { backgroundColor: colors.tint }]}
              onPress={onClose}
            >
              <Text style={styles.closeBtnText}>Keep going!</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 14,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 280,
    maxWidth: 340,
    overflow: "hidden",
  },
  confettiContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  trophyEmoji: {
    fontSize: 44,
  },
  milestonePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
  },
  milestoneLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 34,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  closeBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
