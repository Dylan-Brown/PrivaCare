import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkincareProduct, SkincareReactionNote, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/ui/AppIcon";
import { todayString } from "@/utils/scheduleCompute";

type Sentiment = "positive" | "neutral" | "negative";

const SENTIMENTS: { value: Sentiment; icon: string; label: string }[] = [
  { value: "positive", icon: "happy-outline",   label: "Loving it" },
  { value: "neutral",  icon: "remove-circle-outline", label: "Neutral" },
  { value: "negative", icon: "sad-outline",     label: "Reacting" },
];

function getSentimentColor(sentiment: Sentiment, colors: any): string {
  if (sentiment === "positive") return colors.tint;
  if (sentiment === "negative") return colors.danger;
  return colors.textSecondary;
}

function ReactionHistoryCard({ reaction, colors }: { reaction: SkincareReactionNote; colors: any }) {
  const sentimentColor = getSentimentColor(reaction.sentiment, colors);
  const sentimentIcon = SENTIMENTS.find(s => s.value === reaction.sentiment)?.icon ?? "remove-circle-outline";
  return (
    <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.historyHeader}>
        <Ionicons name="sparkles-outline" size={14} color={colors.purple} />
        <Text style={[styles.historyProduct, { color: colors.text }]}>{reaction.productName}</Text>
        <View style={[styles.sentimentBadge, { backgroundColor: `${sentimentColor}18` }]}>
          <Ionicons name={sentimentIcon as any} size={14} color={sentimentColor} />
          <Text style={[styles.sentimentBadgeText, { color: sentimentColor }]}>
            {SENTIMENTS.find(s => s.value === reaction.sentiment)?.label}
          </Text>
        </View>
      </View>
      <Text style={[styles.historyNote, { color: colors.textSecondary }]}>{reaction.note}</Text>
    </View>
  );
}

export default function SkincareReactionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { skincareProducts, dayLogs, logSkincareReaction, getDayLog } = useApp();

  const [selectedProduct, setSelectedProduct] = useState<SkincareProduct | null>(null);
  const [sentiment, setSentiment]             = useState<Sentiment>("neutral");
  const [note, setNote]                       = useState("");
  const [submitting, setSubmitting]           = useState(false);

  const today = todayString();
  const todayLog = useMemo(() => getDayLog(today), [dayLogs, today]);
  const todayReactions = todayLog.reactionNotes ?? [];

  useEffect(() => {
    if (skincareProducts.length > 0 && !selectedProduct) {
      setSelectedProduct(skincareProducts[0]);
    }
  }, [skincareProducts]);

  const handleSubmit = async () => {
    if (!selectedProduct) {
      Alert.alert("Select a product", "Please select a skincare product first.");
      return;
    }
    if (!note.trim()) {
      Alert.alert("Add a note", "Please describe your reaction or experience.");
      return;
    }

    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await logSkincareReaction(today, {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      note: note.trim(),
      sentiment,
      loggedAt: new Date().toISOString(),
    });

    setNote("");
    setSentiment("neutral");
    setSubmitting(false);
  };

  if (skincareProducts.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: "Skincare Reactions" }} />
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.purple}18` }]}>
            <Ionicons name="sparkles-outline" size={40} color={colors.purple} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No skincare products</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add skincare products first to start logging reactions.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Skincare Reactions" }} />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Product Picker */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT PRODUCT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productRow} contentContainerStyle={styles.productRowContent}>
              {skincareProducts.map(product => {
                const isSelected = selectedProduct?.id === product.id;
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => { setSelectedProduct(product); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.productChip,
                      {
                        borderColor: isSelected ? product.color : colors.border,
                        backgroundColor: isSelected ? `${product.color}18` : colors.background,
                      },
                    ]}
                  >
                    <View style={[styles.productChipIcon, { backgroundColor: `${product.color}22` }]}>
                      <AppIcon icon={product.icon ?? "mci:bottle-tonic"} size={16} color={product.color} />
                    </View>
                    <Text style={[styles.productChipText, { color: isSelected ? product.color : colors.text }]}>{product.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedProduct && (
              <View style={[styles.selectedProductDetail, { backgroundColor: `${selectedProduct.color}10`, borderColor: `${selectedProduct.color}25` }]}>
                <View style={[styles.selectedProductIcon, { backgroundColor: `${selectedProduct.color}22` }]}>
                  <AppIcon icon={selectedProduct.icon ?? "mci:bottle-tonic"} size={24} color={selectedProduct.color} />
                </View>
                <View>
                  <Text style={[styles.selectedProductName, { color: selectedProduct.color }]}>{selectedProduct.name}</Text>
                  <Text style={[styles.selectedProductMeta, { color: colors.textSecondary }]}>
                    {selectedProduct.type}{selectedProduct.brand ? ` · ${selectedProduct.brand}` : ""}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Sentiment */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOW IS IT WORKING?</Text>
            <View style={styles.sentimentRow}>
              {SENTIMENTS.map(s => {
                const isSelected = sentiment === s.value;
                const col = getSentimentColor(s.value, colors);
                return (
                  <Pressable
                    key={s.value}
                    onPress={() => { setSentiment(s.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.sentimentBtn,
                      {
                        borderColor: isSelected ? col : colors.border,
                        backgroundColor: isSelected ? `${col}18` : colors.background,
                      },
                    ]}
                  >
                    <Ionicons name={s.icon as any} size={24} color={isSelected ? col : colors.textTertiary} />
                    <Text style={[styles.sentimentLabel, { color: isSelected ? col : colors.textSecondary }]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Note */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR NOTES</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Noticed some redness after applying. Will try using less product tomorrow."
              placeholderTextColor={colors.textTertiary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.noteHint, { color: colors.textTertiary }]}>
              Be specific — this helps you track patterns over time.
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            style={[
              styles.submitBtn,
              {
                backgroundColor: note.trim() && selectedProduct ? colors.tint : colors.borderLight,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !note.trim() || !selectedProduct}
          >
            <Ionicons name="sparkles-outline" size={20} color={note.trim() && selectedProduct ? "#fff" : colors.textTertiary} />
            <Text style={[styles.submitBtnText, { color: note.trim() && selectedProduct ? "#fff" : colors.textTertiary }]}>
              {submitting ? "Saving…" : "Log Reaction"}
            </Text>
          </Pressable>

          {/* Today's Reactions */}
          {todayReactions.length > 0 && (
            <View style={styles.historySection}>
              <Text style={[styles.historySectionTitle, { color: colors.text }]}>Today's Reactions</Text>
              {todayReactions.map(r => (
                <ReactionHistoryCard key={r.id} reaction={r} colors={colors} />
              ))}
            </View>
          )}

          {/* Disclaimer */}
          <View style={[styles.disclaimerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
              Reaction logs are stored only on this device. If you experience a severe reaction,
              discontinue use and consult a dermatologist.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },

  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },

  productRow: { marginHorizontal: -4 },
  productRowContent: { gap: 8, paddingHorizontal: 4, paddingBottom: 2 },
  productChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1,
  },
  productChipIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  productChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  selectedProductDetail: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  selectedProductIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  selectedProductName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  selectedProductMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  sentimentRow: { flexDirection: "row", gap: 10 },
  sentimentBtn: {
    flex: 1, alignItems: "center", gap: 8,
    paddingVertical: 16, borderRadius: 14, borderWidth: 1.5,
  },
  sentimentLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },

  noteInput: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100,
  },
  noteHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 16, paddingVertical: 18,
  },
  submitBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },

  historySection: { gap: 10 },
  historySectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  historyCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyProduct: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  sentimentBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  sentimentBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  historyNote: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },

  disclaimerBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
