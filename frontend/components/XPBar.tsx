import { View, Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useEffect } from "react";
import { xpForCurrentLevel, type UserProgress } from "@/lib/progression";

export default function XPBar({ progress }: { progress: UserProgress }) {
  const needed = xpForCurrentLevel(progress);
  const pct = Math.min((progress.xp / needed) * 100, 100);

  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 700 });
  }, [pct]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.container}>

      {/* Level bubble */}
      <View style={styles.levelBubble}>
        <Text style={styles.levelText}>{progress.level}</Text>
      </View>

      {/* XP bar track */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedStyle]} />
      </View>

      {/* XP label */}
      <Text style={styles.xpLabel}>
        {progress.xp}/{needed} XP
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#facc15",
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1e1e2e",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#facc15",
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#facc15",
  },
});