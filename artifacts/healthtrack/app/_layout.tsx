import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DonationModal } from "@/components/DonationModal";
import { HealthKitOnboardingModal } from "@/components/onboarding/HealthKitOnboardingModal";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { trackAppOpen, recordDonationShown } from "@/utils/appTracking";
import { isHealthKitAvailable } from "@/utils/healthKit";
import { requestNotificationPermissions } from "@/utils/pushNotifications";

const HK_PROMPTED_KEY = "@vital_healthkit_prompted";
const WELCOME_SHOWN_KEY = "@vital_welcome_shown";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const [donationVisible, setDonationVisible]   = useState(false);
  const [donationPromptCount, setDonationPromptCount] = useState(0);
  const [hkOnboardingVisible, setHkOnboardingVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Welcome modal — show once ever on first launch
    AsyncStorage.getItem(WELCOME_SHOWN_KEY).then(shown => {
      if (!shown) {
        setTimeout(() => setWelcomeVisible(true), 600);
      }
    });

    // Notification permissions + response listener
    requestNotificationPermissions().catch(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)");
    });

    // Check if we should show the Apple Health onboarding prompt (iOS only, once ever)
    if (Platform.OS === "ios") {
      Promise.all([
        AsyncStorage.getItem(HK_PROMPTED_KEY),
        isHealthKitAvailable(),
      ]).then(([prompted, available]) => {
        if (!prompted && available) {
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

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const handleWelcomeDone = async () => {
    await AsyncStorage.setItem(WELCOME_SHOWN_KEY, "true");
    setWelcomeVisible(false);
  };

  const handleHkDone = async () => {
    await AsyncStorage.setItem(HK_PROMPTED_KEY, "true");
    setHkOnboardingVisible(false);
  };

  const handleDonate = async () => {
    await recordDonationShown();
    setDonationVisible(false);
    Linking.openURL("https://paypal.me/dylbrn");
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
        <Stack.Screen name="adherence" options={{ title: "How Am I Doing?", presentation: "modal" }} />
        <Stack.Screen name="vitals-log" options={{ title: "Log Vitals", presentation: "modal" }} />
        <Stack.Screen name="vitals-history" options={{ title: "Vital Signs History" }} />
      </Stack>
      <WelcomeModal visible={welcomeVisible} onDone={handleWelcomeDone} />
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
  // Render with system-font fallback after 600ms so a slow/hanging Google
  // Fonts CDN request never leaves the screen blank for long. The custom
  // fonts will swap in seamlessly once they finish loading.
  const [timedOut, setTimedOut] = useState(false);
  const fontsReady = fontsLoaded || !!fontError || timedOut;

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
