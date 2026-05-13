import { useAuth } from "@/hooks/use-auth";
import { loadProgressAsync, type UserProgress } from "@/lib/progression";
import { getWeeklyChallenges, type WeeklyChallenge } from "@/lib/weekly";
import { useRouter } from "expo-router";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, {
  Defs,
  Rect,
  Circle as SvgCircle,
  Pattern as SvgPattern,
} from "react-native-svg";
import XPBar from "../../components/XPBar";

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
function DotGrid({ isDark }: { isDark: boolean }) {
  const { width, height } = Dimensions.get("window");
  const dotColor = isDark ? "rgba(56,189,248,0.04)" : "rgba(17,24,39,0.05)";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <SvgPattern id="dp" width="28" height="28" patternUnits="userSpaceOnUse">
            <SvgCircle cx="2" cy="2" r="1.2" fill={dotColor} />
          </SvgPattern>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#dp)" />
      </Svg>
    </View>
  );
}

// ── Daily challenge strip ─────────────────────────────────────────────────
function DailyChallenge({ streak, theme }: { streak: number; theme: any }) {
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const router = useRouter();
  const {progress} = useAuth()
  const [todayDone, setTodayDone] = useState<Boolean>(false)
  const [weeklyProgress, setWeeklyProgress] = useState<number[]>([])

  useEffect(() => {
    getWeeklyChallenges().then(setChallenges);
    if (progress?.lastPlayedDate) {
      const dayLastPlayed = progress?.lastPlayedDate.toDate().getUTCDate()
      const today = new Date().getUTCDate()

      if (dayLastPlayed == today){
        setTodayDone(true)
      }
    }
    else {
      setTodayDone(false)
    }
    setWeeklyProgress(progress?.weeklyCompletedDays ?? [])

  }, [progress?.lastPlayedDate, progress?.weeklyCompletedDays]);

  // const todayChallenge = challenges.find((c) => c.isToday);
  // const todayDone = todayChallenge?.completed ?? false;
  // const daysCompleted = challenges.filter((c) => c.completed).length;
  const daysCompleted = weeklyProgress.length

  return (
    <Animated.View
      entering={FadeInDown.delay(180).duration(320)}
      style={[styles.dcCard, { backgroundColor: theme.card, borderColor: theme.accentBorder }]}
    >
      {/* Card header */}
      <View style={styles.dcHeader}>
        <View style={styles.dcTitleRow}>
          <CalendarDays size={14} color="#58CC02" />
          <Text style={styles.dcTitle}>THIS WEEK</Text>
        </View>
        <View style={[styles.dcStreakPill, { backgroundColor: theme.pillBg }]}>
          <Flame size={12} color="#ef4444" />
          <Text style={[styles.dcStreakNum, { color: theme.text }]}>{streak}</Text>
          <Text style={[styles.dcStreakLabel, { color: theme.subText }]}>day streak</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.weekProgressTrack, { backgroundColor: theme.trackBg }]}>
        <View
          style={[
            styles.weekProgressFill,
            { width: `${(daysCompleted / 7) * 100}%` },
          ]}
        />
      </View>
      <Text style={[styles.weekProgressLabel, { color: theme.subText }]}>
        {daysCompleted}/7 days this week
      </Text>

      {/* Day boxes */}
      <View style={styles.daysRow}>
        {challenges.map((ch, i) => {
          // const done = ch.completed;
          const done = weeklyProgress.includes(i)
          const today = ch.isToday;
          const future = ch.locked;

          let boxBg = theme.dayDefault;
          let borderColor = theme.dayDefaultBorder;
          let letterColor = theme.dayDefaultText;

          if (done) {
            boxBg = "#58CC02";
            borderColor = "#46A302";
            letterColor = "#fff";
          } else if (today) {
            boxBg = theme.dayToday;
            borderColor = "#58CC02";
            letterColor = "#58CC02";
          } else if (!future) {
            boxBg = theme.dayMissed;
            borderColor = theme.dayMissedBorder;
            letterColor = theme.dayMissedText;
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
        onPress={() => router.push("/daily")}
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
  const isDark = useColorScheme() === "dark";

  const theme = {
    bg: isDark ? "#0F1115" : "#F3F7FF",
    card: isDark ? "#121922" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#111827",
    subText: isDark ? "rgba(255,255,255,0.38)" : "#6B7280",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(17,24,39,0.08)",
    accentBorder: isDark ? "rgba(88,204,2,0.2)" : "rgba(88,204,2,0.25)",
    pillBg: isDark ? "#1A2535" : "#F3F4F6",
    trackBg: isDark ? "#1A2535" : "#E5E7EB",
    // Day box states
    dayDefault: isDark ? "#0E1520" : "#F9FAFB",
    dayDefaultBorder: isDark ? "#1A2535" : "#E5E7EB",
    dayDefaultText: isDark ? "#2E4060" : "#D1D5DB",
    dayToday: isDark ? "#121922" : "#F0FDF4",
    dayMissed: isDark ? "#0B0F14" : "#F3F4F6",
    dayMissedBorder: isDark ? "#151D28" : "#E5E7EB",
    dayMissedText: isDark ? "#243040" : "#CBD5E1",
    // Free practice border
    freePlayBorder: isDark ? "rgba(250,204,21,0.18)" : "rgba(250,204,21,0.4)",
    freePlayPillText: isDark ? "#0B0F14" : "#0B0F14",
  };

  useEffect(() => {
    loadProgressAsync().then(setProgress);
  }, []);

  if (!progress) return null;

  const accuracy =
    progress.totalAnswers > 0
      ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
      : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <DotGrid isDark={isDark} />
      <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stat pills ─────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(280)}
          style={styles.statRow}
        >
          {[
            { icon: Flame, value: `${progress.streak}`, label: "Streak", color: "#ef4444" },
            { icon: Zap, value: `Lv ${progress.level}`, label: "Level", color: "#facc15" },
            { icon: Trophy, value: `${progress.exercisesCompleted}`, label: "Done", color: "#a855f7" },
            { icon: Target, value: `${accuracy}%`, label: "Accuracy", color: "#3b82f6" },
          ].map((s) => (
            <View
              key={s.label}
              style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <s.icon size={14} color={s.color} />
              <Text style={[styles.statNum, { color: theme.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── XP Bar ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(280)}>
          <XPBar progress={progress} />
        </Animated.View>

        {/* ── Daily challenges ────────────────────── */}
        <DailyChallenge streak={progress.streak} theme={theme} />

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
                style={[styles.lessonCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.82}
                onPress={() =>
                  router.push({
                    pathname: "/(learn)/lesson",
                    params: { group: g.key },
                  })
                }
              >
                <View style={[styles.lessonAccent, { backgroundColor: g.color }]} />
                <View style={[styles.lessonIconBox, { backgroundColor: g.color + "1C" }]}>
                  <Text style={styles.lessonEmoji}>{g.emoji}</Text>
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTitle, { color: theme.text }]}>{g.title}</Text>
                  <Text style={[styles.lessonSub, { color: theme.subText }]}>{g.subtitle}</Text>
                </View>
                <View style={[styles.notesBadge, { backgroundColor: g.color + "1C" }]}>
                  <Text style={[styles.notesBadgeText, { color: g.color }]}>{g.notes}</Text>
                </View>
                <ChevronRight size={15} color={isDark ? "#444" : "#CBD5E1"} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* ── Free Practice ───────────────────────── */}
        <Animated.View entering={FadeInDown.delay(620).duration(280)}>
          <TouchableOpacity
            style={[styles.freePlayBtn, { backgroundColor: theme.card, borderColor: theme.freePlayBorder }]}
            activeOpacity={0.85}
            onPress={() => router.push("/pitch")}
          >
            <View style={styles.freePlayLeft}>
              <Zap size={20} color="#facc15" strokeWidth={2.5} />
              <View>
                <Text style={[styles.freePlayTitle, { color: theme.text }]}>Free Practice</Text>
                <Text style={[styles.freePlaySub, { color: theme.subText }]}>Train at your own pace</Text>
              </View>
            </View>
            <View style={styles.freePlayPill}>
              <Text style={[styles.freePlayPillText, { color: theme.freePlayPillText }]}>PLAY</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },

  // Stats
  statRow: { flexDirection: "row", gap: 8 },
  statPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  statNum: { fontSize: 13, fontWeight: "900" },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Daily challenge card
  dcCard: {
    borderRadius: 20,
    borderWidth: 1,
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
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dcStreakNum: { fontSize: 13, fontWeight: "900" },
  dcStreakLabel: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Week progress bar
  weekProgressTrack: {
    height: 5,
    borderRadius: 999,
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
    backgroundColor: "#1E3B14",
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
    borderRadius: 16,
    borderWidth: 1,
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
  lessonTitle: { fontSize: 14, fontWeight: "900" },
  lessonSub: {
    fontSize: 11,
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  freePlayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  freePlayTitle: { fontSize: 15, fontWeight: "800" },
  freePlaySub: {
    fontSize: 11,
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
  },
});
