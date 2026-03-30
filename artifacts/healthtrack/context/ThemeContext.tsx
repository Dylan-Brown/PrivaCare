import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

export type SchemeOverride = "light" | "dark" | "system";

const THEME_KEY = "@privacre_theme";

type ThemeContextType = {
  colorSchemeOverride: SchemeOverride;
  setColorSchemeOverride: (scheme: SchemeOverride) => Promise<void>;
  isDark: boolean;
  colors: typeof Colors.light;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<SchemeOverride>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(v => {
        if (v === "light" || v === "dark" || v === "system") setOverride(v);
      })
      .catch(() => {});
  }, []);

  const isDark = override === "system" ? system === "dark" : override === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const setColorSchemeOverride = async (scheme: SchemeOverride) => {
    setOverride(scheme);
    await AsyncStorage.setItem(THEME_KEY, scheme);
  };

  return (
    <ThemeContext.Provider value={{ colorSchemeOverride: override, setColorSchemeOverride, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used inside ThemeProvider");
  return ctx;
}
