import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  useColorScheme,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';

const MAX_LEVEL = 100;

const BASE_XP_PER_CORRECT = 5;
const RECENT_WINDOW_MAX = 20;

// Demo XP cap: max XP per day when mode=demo
const DEMO_DAILY_XP_CAP = 50;

const NOTE_SAMPLES: Record<string, any> = {
  C: require('../../assets/sounds/piano/C4.mp3'),
  D: require('../../assets/sounds/piano/D4.mp3'),
  E: require('../../assets/sounds/piano/E4.mp3'),
  F: require('../../assets/sounds/piano/F4.mp3'),
  G: require('../../assets/sounds/piano/G4.mp3'),
  A: require('../../assets/sounds/piano/A4.mp3'),
  B: require('../../assets/sounds/piano/B4.mp3'),
};

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
type WhiteKey = (typeof WHITE_KEYS)[number];

const BLACK_KEYS: Array<{ label: string; afterWhiteIndex: number }> = [
  { label: 'C#', afterWhiteIndex: 0 },
  { label: 'D#', afterWhiteIndex: 1 },
  { label: 'F#', afterWhiteIndex: 3 },
  { label: 'G#', afterWhiteIndex: 4 },
  { label: 'A#', afterWhiteIndex: 5 },
];

let currentSound: Audio.Sound | null = null;

// -------------------- Helpers (leveling + dates) --------------------

function xpToLevelUp(level: number) {
  // Level 1–20: 20 XP each (fast)
  if (level <= 20) return 20;
  // Level 21–100: 20 + (level-20)*2 (slower)
  return 20 + (level - 20) * 2;
}

function xpMultiplierFromAccuracy(acc01: number) {
  const a = Math.max(0, Math.min(1, acc01));
  if (a < 0.6) return 0.8;
  if (a < 0.8) return 1.0;
  if (a < 0.9) return 1.2;
  return 1.4;
}

function toISODate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isYesterday(prev: string, today: string) {
  if (!prev) return false;
  const [y, m, d] = prev.split('-').map(Number);
  const prevDate = new Date(y, m - 1, d);
  const [ty, tm, td] = today.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const diffDays = Math.round((todayDate.getTime() - prevDate.getTime()) / 86400000);
  return diffDays === 1;
}

// -------------------- Firestore update (single entry point) --------------------

async function applyAfterCheck(params: {
  uid: string;
  correct: boolean;
  mode: 'demo' | 'full';
}) {
  const { uid, correct, mode } = params;

  const today = toISODate();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = (snap.exists() ? snap.data() : {}) as any;

  // Existing fields (or defaults)
  let currentXp: number = Number(data.currentXp ?? 0); // XP within current level
  let level: number = Number(data.level ?? 1);
  let streak: number = Number(data.streak ?? 0);
  const lastPlayedDate: string = String(data.lastPlayedDate ?? '');

  // Accuracy bonus window fields
  let recentCorrect: number = Number(data.recentCorrect ?? 0);
  let recentTotal: number = Number(data.recentTotal ?? 0);

  // Demo cap tracking
  let demoXpToday: number = Number(data.demoXpToday ?? 0);
  const demoXpDate: string = String(data.demoXpDate ?? '');

  // --- streak update (once per day) ---
  if (lastPlayedDate !== today) {
    if (isYesterday(lastPlayedDate, today)) streak = Math.max(1, streak + 1);
    else streak = 1;
  }

  // --- reset demo daily counter if date changed ---
  if (demoXpDate !== today) {
    demoXpToday = 0;
  }

  // --- update recent accuracy counters (approx window) ---
  // When window is full, decay to keep responsiveness without storing arrays
  if (recentTotal >= RECENT_WINDOW_MAX) {
    recentTotal = Math.floor(recentTotal * 0.9);
    recentCorrect = Math.min(recentTotal, Math.floor(recentCorrect * 0.9));
  }

  recentTotal += 1;
  if (correct) recentCorrect += 1;

  const accuracy = recentTotal > 0 ? recentCorrect / recentTotal : 1;

  // --- XP award ---
  let xpGained = 0;
  let capHit = false;

  if (correct) {
    const mult = xpMultiplierFromAccuracy(accuracy);
    const intended = Math.max(1, Math.round(BASE_XP_PER_CORRECT * mult)); // usually 4..7

    if (mode === 'demo') {
      const remaining = Math.max(0, DEMO_DAILY_XP_CAP - demoXpToday);
      xpGained = Math.min(intended, remaining);
      capHit = xpGained < intended;
      demoXpToday += xpGained;
    } else {
      // full mode: no cap
      xpGained = intended;
    }

    currentXp += xpGained;
  }

  // --- level up (cap at 100) ---
  while (level < MAX_LEVEL) {
    const need = xpToLevelUp(level);
    if (currentXp < need) break;
    currentXp -= need;
    level += 1;
  }

  await setDoc(
    ref,
    {
      currentXp,
      level,
      streak,
      lastPlayedDate: today,

      recentCorrect,
      recentTotal,

      demoXpToday,
      demoXpDate: today,

      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { xpGained, capHit, accuracy, level, currentXp, demoXpToday };
}

// -------------------- Screen --------------------

export default function TrainingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params?.mode ?? 'full').toLowerCase() === 'demo' ? 'demo' : 'full';

  const isDark = useColorScheme() === 'dark';
  const [user] = useAuth();
  const isGuest = !user;

  const theme = useMemo(() => {
    const accent = '#58CC02';
    const accentDepth = '#46A302';

    return {
      bg: isDark ? '#0F1115' : '#F3F7FF',
      card: isDark ? '#171A21' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#1F2A37',
      subText: isDark ? 'rgba(255,255,255,0.75)' : '#6B7280',
      border: isDark ? 'rgba(255,255,255,0.10)' : '#E3ECFA',

      accent,
      accentDepth,
      danger: '#EF4444',

      whiteTop: isDark ? '#1B2030' : '#FFFFFF',
      whiteBorder: isDark ? 'rgba(255,255,255,0.10)' : '#D8E6FF',
      whiteDepth: isDark ? 'rgba(255,255,255,0.08)' : '#D9DDE7',

      blackTop: isDark ? '#0B0D13' : '#111827',
      blackBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.10)',
      blackDepth: isDark ? '#000000' : '#0A0F1D',
      blackText: '#FFFFFF',

      primaryDepth: '#0F172A',
      primaryTop: isDark ? '#FFFFFF' : '#111827',
      primaryText: isDark ? '#000000' : '#FFFFFF',
    };
  }, [isDark]);

  const [targetNote, setTargetNote] = useState<WhiteKey | ''>('');
  const [selectedNote, setSelectedNote] = useState<WhiteKey | null>(null);
  const [state, setState] = useState<'idle' | 'answering' | 'result'>('idle');

  const [demoCapMessage, setDemoCapMessage] = useState<string>('');

  const playNote = async (note: WhiteKey) => {
    if (!note) return;
    try {
      if (currentSound) {
        await currentSound.unloadAsync();
        currentSound = null;
      }
      const { sound } = await Audio.Sound.createAsync(NOTE_SAMPLES[note], {
        shouldPlay: true,
      });
      currentSound = sound;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn(e);
    }
  };

  const startRound = () => {
    setDemoCapMessage('');
    const next = WHITE_KEYS[Math.floor(Math.random() * WHITE_KEYS.length)];
    setTargetNote(next);
    setSelectedNote(null);
    setState('answering');
    playNote(next);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const onCheck = async () => {
    setState('result');
    setDemoCapMessage('');

    const correct = !!selectedNote && selectedNote === targetNote;

    // Guests never write progress / XP
    if (!user) return;

    // Logged-in users earn XP in BOTH demo and full; demo has daily cap.
    const res = await applyAfterCheck({
      uid: user.uid,
      correct,
      mode,
    });

    if (mode === 'demo' && correct && res.capHit) {
      setDemoCapMessage(`Demo XP cap reached (max ${DEMO_DAILY_XP_CAP} XP per day).`);
    }
  };

  const isCorrect = selectedNote && selectedNote === targetNote;

  // keyboard sizing
  const whiteKeyW = 74;
  const whiteKeyH = 150;
  const whiteKeyDepth = 6;

  const blackKeyW = 46;
  const blackKeyH = 92;
  const blackKeyDepth = 5;

  const blackKeyLeft = (afterWhiteIndex: number) =>
    afterWhiteIndex * whiteKeyW + (whiteKeyW - blackKeyW / 2);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={20}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.topTitle, { color: theme.text }]}>Pitch Training</Text>
            <Text style={[styles.topSub, { color: theme.subText }]}>
              {isGuest
                ? 'Guest (no XP)'
                : mode === 'demo'
                  ? `Demo (cap ${DEMO_DAILY_XP_CAP} XP/day)`
                  : 'Full practice'}
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Main card */}
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              {state === 'answering' ? 'Which note is this?' : 'Ready to start?'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>
              {state === 'answering'
                ? 'Use the keyboard to pick a note. Tap Listen to replay.'
                : 'Tap Start to play a note.'}
            </Text>

            {/* Listen / Start */}
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Pressable
                onPress={() =>
                  state === 'answering' ? playNote(targetNote as WhiteKey) : startRound()
                }
                style={({ pressed }) => [
                  styles.listenShadow,
                  { backgroundColor: theme.accentDepth },
                  pressed && { transform: [{ translateY: 2 }] },
                ]}
              >
                <View style={[styles.listenBtn, { backgroundColor: theme.accent }]}>
                  <Ionicons
                    name={state === 'answering' ? 'volume-high' : 'play'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.listenText}>
                    {state === 'answering' ? 'Listen' : 'Start'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Piano keyboard */}
            <View style={{ marginTop: 18 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.keyboardContainer,
                  { height: whiteKeyH + whiteKeyDepth + 8 },
                ]}
              >
                <View style={{ width: whiteKeyW * WHITE_KEYS.length }}>
                  {/* Black keys layer */}
                  <View
                    style={[styles.blackLayer, { height: blackKeyH + blackKeyDepth }]}
                    pointerEvents="box-none"
                  >
                    {BLACK_KEYS.map((k) => (
                      <Pressable
                        key={k.label}
                        disabled
                        style={[
                          styles.blackKeyShadow,
                          {
                            left: blackKeyLeft(k.afterWhiteIndex),
                            width: blackKeyW,
                            height: blackKeyH + blackKeyDepth,
                            backgroundColor: theme.blackDepth,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.blackKeyTop,
                            {
                              width: blackKeyW,
                              height: blackKeyH,
                              backgroundColor: theme.blackTop,
                              borderColor: theme.blackBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.blackKeyLabel, { color: theme.blackText }]}>
                            {k.label}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  {/* White keys layer */}
                  <View style={[styles.whiteRow, { height: whiteKeyH + whiteKeyDepth }]}>
                    {WHITE_KEYS.map((note) => {
                      const selected = selectedNote === note;

                      return (
                        <Pressable
                          key={note}
                          disabled={state !== 'answering'}
                          onPress={() => {
                            setSelectedNote(note);
                            Haptics.selectionAsync();
                          }}
                          style={({ pressed }) => [
                            styles.whiteKeyShadow,
                            {
                              width: whiteKeyW,
                              height: whiteKeyH + whiteKeyDepth,
                              backgroundColor: selected ? theme.accentDepth : theme.whiteDepth,
                            },
                            pressed && { transform: [{ translateY: 2 }] },
                          ]}
                        >
                          <View
                            style={[
                              styles.whiteKeyTop,
                              {
                                width: whiteKeyW,
                                height: whiteKeyH,
                                backgroundColor: selected ? theme.accent : theme.whiteTop,
                                borderColor: selected ? 'rgba(255,255,255,0.25)' : theme.whiteBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.whiteKeyLabel,
                                { color: selected ? '#FFFFFF' : theme.text },
                              ]}
                            >
                              {note}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <Text style={[styles.keyboardHint, { color: theme.subText }]}>
                Swipe to view the full keyboard
              </Text>
            </View>

            {/* Result */}
            {state === 'result' && (
              <>
                <View
                  style={[
                    styles.resultPill,
                    {
                      borderColor: theme.border,
                      backgroundColor: isCorrect
                        ? (isDark ? 'rgba(88,204,2,0.12)' : '#EAFBE3')
                        : (isDark ? 'rgba(239,68,68,0.12)' : '#FFE8E8'),
                    },
                  ]}
                >
                  <Ionicons
                    name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={isCorrect ? theme.accent : theme.danger}
                  />
                  <Text style={[styles.resultText, { color: theme.text }]}>
                    {isCorrect ? 'Correct!' : `Not quite — it was ${targetNote}.`}
                  </Text>
                </View>

                {demoCapMessage ? (
                  <View
                    style={[
                      styles.noticePill,
                      { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFF' },
                    ]}
                  >
                    <Ionicons name="information-circle" size={18} color={theme.subText} />
                    <Text style={[styles.noticeText, { color: theme.subText }]}>{demoCapMessage}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* Bottom action */}
        <View style={styles.footer}>
          <Pressable
            onPress={state === 'answering' ? onCheck : startRound}
            disabled={state === 'answering' && !selectedNote}
            style={({ pressed }) => [
              styles.primaryShadow,
              {
                backgroundColor:
                  state === 'answering' && !selectedNote
                    ? (isDark ? 'rgba(255,255,255,0.10)' : '#C9D7EE')
                    : theme.primaryDepth,
                opacity: state === 'answering' && !selectedNote ? 0.6 : 1,
              },
              pressed && { transform: [{ translateY: 2 }] },
            ]}
          >
            <View style={[styles.primaryBtn, { backgroundColor: theme.primaryTop }]}>
              <Text style={[styles.primaryText, { color: theme.primaryText }]}>
                {state === 'answering' ? 'Check' : 'Next'}
              </Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
  topSub: { marginTop: 2, fontSize: 12, fontWeight: '800' },

  content: { flex: 1, paddingTop: 8, paddingBottom: 12 },
  card: { flex: 1, borderRadius: 24, borderWidth: 1, padding: 16 },

  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  subtitle: { marginTop: 6, fontSize: 13, fontWeight: '700' },

  listenShadow: { width: '100%', maxWidth: 320, borderRadius: 18, paddingBottom: 4 },
  listenBtn: {
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  listenText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  keyboardContainer: { paddingHorizontal: 4, paddingVertical: 6 },

  blackLayer: { position: 'absolute', left: 0, top: 0, right: 0, zIndex: 10 },
  blackKeyShadow: { position: 'absolute', borderRadius: 12, paddingBottom: 5 },
  blackKeyTop: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  blackKeyLabel: { fontSize: 12, fontWeight: '900', opacity: 0.9 },

  whiteRow: { flexDirection: 'row', gap: 0 },
  whiteKeyShadow: { borderRadius: 18, paddingBottom: 6 },
  whiteKeyTop: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  whiteKeyLabel: { fontSize: 16, fontWeight: '900' },

  keyboardHint: { marginTop: 6, fontSize: 12, fontWeight: '700', textAlign: 'center' },

  resultPill: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: { fontSize: 14, fontWeight: '800' },

  noticePill: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: { fontSize: 12, fontWeight: '800', flex: 1 },

  footer: { paddingBottom: 18 },
  primaryShadow: { borderRadius: 18, paddingBottom: 4 },
  primaryBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
});