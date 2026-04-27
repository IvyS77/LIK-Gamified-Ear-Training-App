import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  Flame,
  Zap,
  Trophy,
  Target,
  BookOpen,
  ChevronRight,
  Check,
  CalendarDays,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import Svg, {
  Circle as SvgCircle,
  Rect,
  Defs,
  Pattern as SvgPattern,
} from "react-native-svg";
import { loadProgressAsync, type UserProgress } from "@/lib/progression";
import { getWeeklyChallenges, type WeeklyChallenge } from "@/lib/weekly";
import XPBar from "../../components/XPBar";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Lesson groups ─────────────────────────────────────────────────────────
const LESSON_GROUPS = [
  {
    key: "basics",
    title: "Basic Notes",
    subtitle: "C · D · E",
    emoji: "🌱",
    color: "#58CC02",
    notes: 3,
  },
  {
    key: "middle",
    title: "Middle Notes",
    subtitle: "F · G · A",
    emoji: "🎵",
    color: "#3b82f6",
    notes: 3,
  },
  {
    key: "full",
    title: "Full Octave",
    subtitle: "A · B · C · D · E · F · G",
    emoji: "🎹",
    color: "#a855f7",
    notes: 7,
  },
];

// ── Dot grid background ───────────────────────────────────────────────────
function DotGrid() {
  const { width, height } = Dimensions.get("window");
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <SvgPattern id="dp" width="28" height="28" patternUnits="userSpaceOnUse">
            <SvgCircle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,0.055)" />
          </SvgPattern>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#dp)" />
      </Svg>
    </View>
  );
}

// ── Daily challenge strip ─────────────────────────────────────────────────
function DailyChallenge({ streak }: { streak: number }) {
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const router = useRouter();

  useEffect(() => {
    getWeeklyChallenges().then(setChallenges);
  }, []);

  const todayChallenge = challenges.find((c) => c.isToday);
  const todayDone = todayChallenge?.completed ?? false;
  const daysCompleted = challenges.filter((c) => c.completed).length;

  return (
    <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.dcCard}>
      {/* Card header */}
      <View style={styles.dcHeader}>
        <View style={styles.dcTitleRow}>
          <CalendarDays size={14} color="#58CC02" />
          <Text style={styles.dcTitle}>THIS WEEK</Text>
        </View>
        <View style={styles.dcStreakPill}>
          <Flame size={12} color="#ef4444" />
          <Text style={styles.dcStreakNum}>{streak}</Text>
          <Text style={styles.dcStreakLabel}>day streak</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.weekProgressTrack}>
        <View
          style={[
            styles.weekProgressFill,
            { width: `${(daysCompleted / 7) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.weekProgressLabel}>
        {daysCompleted}/7 days this week
      </Text>

      {/* Day boxes */}
      <View style={styles.daysRow}>
        {challenges.map((ch) => {
          const done = ch.completed;
          const today = ch.isToday;
          const future = ch.locked;

          let boxBg = "#12141e";
          let borderColor = "#1e2130";
          let letterColor = "#343650";

          if (done) {
            boxBg = "#58CC02";
            borderColor = "#46A302";
            letterColor = "#fff";
          } else if (today) {
            boxBg = "#171A21";
            borderColor = "#58CC02";
            letterColor = "#58CC02";
          } else if (!future) {
            // past, missed
            boxBg = "#0f1118";
            borderColor = "#1a1c28";
            letterColor = "#2a2d40";
          }

          return (
            <View
              key={ch.index}
              style={[styles.dayBox, { backgroundColor: boxBg, borderColor }]}
            >
              <Text style={[styles.dayLetter, { color: letterColor }]}>
                {ch.dayShort[0]}
              </Text>
              <View style={styles.dayStatus}>
                {done ? (
                  <Check size={10} color="#fff" strokeWidth={3.5} />
                ) : today ? (
                  <View style={styles.todayDot} />
                ) : (
                  <View style={[styles.emptyDot, { backgroundColor: borderColor }]} />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Play button */}
      <TouchableOpacity
        style={[styles.dcPlayBtn, todayDone && styles.dcPlayBtnDone]}
        activeOpacity={0.85}
        onPress={() => router.push("/pitch?daily=true")}
      >
        {todayDone ? (
          <Check size={17} color="#fff" strokeWidth={3} />
        ) : (
          <Zap size={17} color="#fff" strokeWidth={2.5} />
        )}
        <Text style={styles.dcPlayText}>
          {todayDone ? "TODAY COMPLETED" : "PLAY TODAY'S CHALLENGE"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Home screen ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadProgressAsync().then(setProgress);
  }, []);

  if (!progress) return null;

  const accuracy =
    progress.totalAnswers > 0
      ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
      : 0;

  return (
    <View style={styles.root}>
      <DotGrid />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── App header ─────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(280)}
          style={styles.header}
        >
          <View>
            <Text style={styles.appName}>EarQuest</Text>
            <Text style={styles.appSub}>Train your musical ear</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>🎵</Text>
          </View>
        </Animated.View>

        {/* ── Stat pills ─────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(280)}
          style={styles.statRow}
        >
          {[
            { icon: Flame, value: `${progress.streak}`, label: "Streak", color: "#ef4444" },
            { icon: Zap, value: `Lv ${progress.level}`, label: "Level", color: "#facc15" },
            { icon: Trophy, value: `${progress.exercisesCompleted}`, label: "Done", color: "#a855f7" },
            { icon: Target, value: `${accuracy}%`, label: "Accuracy", color: "#3b82f6" },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <s.icon size={14} color={s.color} />
              <Text style={styles.statNum}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── XP Bar ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(110).duration(280)}>
          <XPBar progress={progress} />
        </Animated.View>

        {/* ── Daily challenges ────────────────────── */}
        <DailyChallenge streak={progress.streak} />

        {/* ── Learn Notes header ──────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(340).duration(280)}
          style={styles.sectionHeader}
        >
          <BookOpen size={14} color="#58CC02" />
          <Text style={styles.sectionTitle}>Learn Notes</Text>
        </Animated.View>

        {/* ── Lesson cards ────────────────────────── */}
        <View style={styles.lessonList}>
          {LESSON_GROUPS.map((g, i) => (
            <Animated.View
              key={g.key}
              entering={FadeInDown.delay(400 + i * 70).duration(280)}
            >
              <TouchableOpacity
                style={styles.lessonCard}
                activeOpacity={0.82}
                onPress={() =>
                  router.push({
                    pathname: "/(learn)/lesson",
                    params: { group: g.key },
                  })
                }
              >
                {/* Left accent bar */}
                <View style={[styles.lessonAccent, { backgroundColor: g.color }]} />

                {/* Icon */}
                <View
                  style={[
                    styles.lessonIconBox,
                    { backgroundColor: g.color + "1C" },
                  ]}
                >
                  <Text style={styles.lessonEmoji}>{g.emoji}</Text>
                </View>

                {/* Text */}
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{g.title}</Text>
                  <Text style={styles.lessonSub}>{g.subtitle}</Text>
                </View>

                {/* Badge + arrow */}
                <View
                  style={[styles.notesBadge, { backgroundColor: g.color + "1C" }]}
                >
                  <Text style={[styles.notesBadgeText, { color: g.color }]}>
                    {g.notes}
                  </Text>
                </View>
                <ChevronRight size={15} color="#444" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* ── Free Practice ───────────────────────── */}
        <Animated.View entering={FadeInDown.delay(620).duration(280)}>
          <TouchableOpacity
            style={styles.freePlayBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/pitch")}
          >
            <View style={styles.freePlayLeft}>
              <Zap size={20} color="#facc15" strokeWidth={2.5} />
              <View>
                <Text style={styles.freePlayTitle}>Free Practice</Text>
                <Text style={styles.freePlaySub}>Train at your own pace</Text>
              </View>
            </View>
            <View style={styles.freePlayPill}>
              <Text style={styles.freePlayPillText}>PLAY</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1115",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 110,
    gap: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  headerBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#171A21",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: { fontSize: 22 },

  // Stats
  statRow: { flexDirection: "row", gap: 8 },
  statPill: {
    flex: 1,
    backgroundColor: "#171A21",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  statNum: { fontSize: 13, fontWeight: "900", color: "#fff" },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.32)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Daily challenge card
  dcCard: {
    backgroundColor: "#131620",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(88,204,2,0.18)",
    padding: 16,
    gap: 12,
  },
  dcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dcTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dcTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#58CC02",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dcStreakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1e2030",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dcStreakNum: { fontSize: 13, fontWeight: "900", color: "#fff" },
  dcStreakLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
  },

  // Week progress bar
  weekProgressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#1e2130",
    overflow: "hidden",
  },
  weekProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#58CC02",
  },
  weekProgressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.3)",
    marginTop: -4,
  },

  // Day boxes
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: "center",
    gap: 6,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  dayStatus: {
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#58CC02",
  },
  emptyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // Play button
  dcPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#58CC02",
    borderRadius: 14,
    paddingVertical: 13,
  },
  dcPlayBtnDone: {
    backgroundColor: "#2a3d1e",
  },
  dcPlayText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.4,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#58CC02",
    letterSpacing: 0.2,
  },

  // Lesson cards
  lessonList: { gap: 10 },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131620",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    paddingRight: 14,
    gap: 12,
  },
  lessonAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  lessonIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  lessonEmoji: { fontSize: 22 },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: "900", color: "#fff" },
  lessonSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    marginTop: 2,
    fontWeight: "600",
  },
  notesBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notesBadgeText: { fontSize: 12, fontWeight: "900" },

  // Free practice
  freePlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#131620",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.15)",
    padding: 16,
  },
  freePlayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  freePlayTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  freePlaySub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    marginTop: 2,
    fontWeight: "600",
  },
  freePlayPill: {
    backgroundColor: "#facc15",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  freePlayPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F1115",
  },
});
