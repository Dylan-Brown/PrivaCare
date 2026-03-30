import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Card = {
  icon: string;
  iconColor: string;
  title: string;
  body: string;
};

const CARDS: Card[] = [
  {
    icon: "heart",
    iconColor: "#34C78B",
    title: "Welcome to Vital",
    body: "Your personal health companion — private, simple, and always on your device.",
  },
  {
    icon: "today-outline",
    iconColor: "#007AFF",
    title: "Today Timeline",
    body: "See everything scheduled for the day at a glance and mark items complete with one tap.",
  },
  {
    icon: "medkit-outline",
    iconColor: "#FF6B6B",
    title: "Medications",
    body: "Track your medications, set schedules, monitor supply levels, and check for drug interactions.",
  },
  {
    icon: "sparkles-outline",
    iconColor: "#A78BFA",
    title: "Skincare",
    body: "Log your daily routine, keep an eye on expiry dates, and note how your skin reacts to products.",
  },
  {
    icon: "notifications-outline",
    iconColor: "#FF9F0A",
    title: "Reminders",
    body: "Vital sends you a notification at each scheduled time so you never miss a dose or routine step.",
  },
  {
    icon: "lock-closed",
    iconColor: "#34C78B",
    title: "100% Private",
    body: "Everything stays on your device. No accounts, no servers, no tracking. Tracking your health shouldn't cost you your privacy.",
  },
];

type Props = {
  visible: boolean;
  onDone: () => void;
};

export function WelcomeModal({ visible, onDone }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList<Card>>(null);
  const isLast = currentIndex === CARDS.length - 1;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      onDone();
    } else {
      const next = currentIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDone}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom + 16, 36),
            },
          ]}
        >
          <View style={styles.handle} />

          <FlatList
            ref={listRef}
            data={CARDS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={[styles.card, { width: SCREEN_WIDTH - 48 }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${item.iconColor}18` }]}>
                  <Ionicons name={item.icon as any} size={40} color={item.iconColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{item.body}</Text>
              </View>
            )}
          />

          <View style={styles.dots}>
            {CARDS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === currentIndex ? colors.tint : colors.borderLight,
                    width: i === currentIndex ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Pressable
            style={[styles.btn, { backgroundColor: colors.tint }]}
            onPress={goNext}
          >
            <Text style={styles.btnText}>{isLast ? "Get Started" : "Next"}</Text>
            {!isLast && <Ionicons name="chevron-forward" size={18} color="#fff" />}
          </Pressable>

          {!isLast && (
            <Pressable style={styles.skipBtn} onPress={onDone}>
              <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginBottom: 8,
  },
  card: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 4,
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cardBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 280,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
    marginTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
