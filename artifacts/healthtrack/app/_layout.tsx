import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { DonationModal } from "@/components/DonationModal";
import { HealthKitOnboardingModal } from "@/components/onboarding/HealthKitOnboardingModal";
import { trackAppOpen, recordDonationShown } from "@/utils/appTracking";
import { isHealthKitAvailable } from "@/utils/healthKit";

const HK_PROMPTED_KEY = "@vital_healthkit_prompted";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const [donationVisible, setDonationVisible]   = useState(false);
  const [donationPromptCount, setDonationPromptCount] = useState(0);
  const [hkOnboardingVisible, setHkOnboardingVisible] = useState(false);

  useEffect(() => {
    // Check if we should show the Apple Health onboarding prompt (iOS only, once ever)
    if (Platform.OS === "ios") {
      Promise.all([
        AsyncStorage.getItem(HK_PROMPTED_KEY),
        isHealthKitAvailable(),
      ]).then(([prompted, available]) => {
        if (!prompted && available) {
          // Slight delay so the app renders first
          setTimeout(() => setHkOnboardingVisible(true), 800);
        }
      });
    }

    // Donation modal logic (independent)
    trackAppOpen().then(result => {
      if (result.shouldShowDonation) {
        setDonationPromptCount(result.donationPromptCount);
        setDonationVisible(true);
      }
    });
  }, []);

  const handleHkDone = async () => {
    await AsyncStorage.setItem(HK_PROMPTED_KEY, "true");
    setHkOnboardingVisible(false);
  };

  const handleDonate = async () => {
    await recordDonationShown();
    setDonationVisible(false);
  };

  const handleDismiss = async () => {
    await recordDonationShown();
    setDonationVisible(false);
  };

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications", presentation: "modal" }} />
        <Stack.Screen name="skincare-reactions" options={{ title: "Skincare Reactions", presentation: "modal" }} />
      </Stack>
      <HealthKitOnboardingModal
        visible={hkOnboardingVisible}
        onDone={handleHkDone}
      />
      <DonationModal
        visible={donationVisible}
        onDonate={handleDonate}
        onDismiss={handleDismiss}
        promptCount={donationPromptCount}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
