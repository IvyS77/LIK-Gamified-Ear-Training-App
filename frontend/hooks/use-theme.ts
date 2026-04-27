import { useMemo } from "react";
import { useColorScheme } from "react-native";

/**
 * Shared theme hook — use this in ALL screens instead of
 * copy-pasting the useMemo block everywhere.
 *
 * Usage:
 *   const theme = useTheme();
 *   const { isDark } = useTheme();
 */
export function useTheme() {
  const isDark = useColorScheme() === "dark";

  const theme = useMemo(() => {
    const accent = "#58CC02";
    return {
      isDark,
      bg: isDark ? "#0F1115" : "#F3F7FF",
      card: isDark ? "#171A21" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#111827",
      subText: isDark ? "rgba(255,255,255,0.72)" : "#6B7280",
      border: isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.08)",
      soft: isDark ? "rgba(255,255,255,0.04)" : "#F7FAFF",
      accent,
      danger: isDark ? "#FF6B6B" : "#DC2626",
      primaryDepth: "#0F172A",
      primaryTop: isDark ? "#FFFFFF" : "#111827",
      primaryText: isDark ? "#000000" : "#FFFFFF",
    };
  }, [isDark]);

  return theme;
}
