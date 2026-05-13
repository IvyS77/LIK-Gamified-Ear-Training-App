import React from "react";
import { View, StyleSheet } from "react-native";

/**
 * Shared decorative glow — used on Profile, Login, Signup screens.
 * Import instead of copy-pasting the component + styles everywhere.
 *
 * Usage:
 *   <Glow accent={theme.accent} />
 */
export function Glow({ accent }: { accent: string }) {
  return (
    <View pointerEvents="none" style={styles.glowWrap}>
      <View style={[styles.glow1, { backgroundColor: accent }]} />
      <View style={[styles.glow2, { backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glowWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  glow1: { position: "absolute", width: 340, height: 340, borderRadius: 170, top: -170, left: -100, opacity: 0.16 },
  glow2: { position: "absolute", width: 280, height: 280, borderRadius: 140, top: -150, right: -120, opacity: 0.10 },
});
