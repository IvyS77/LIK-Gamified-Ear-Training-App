import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// ── Audio ─────────────────────────────────────────────────────────────────
const NOTE_SAMPLES: Record<string, any> = {
  C: require('../../assets/sounds/piano/C4.mp3'),
  D: require('../../assets/sounds/piano/D4.mp3'),
  E: require('../../assets/sounds/piano/E4.mp3'),
  F: require('../../assets/sounds/piano/F4.mp3'),
  G: require('../../assets/sounds/piano/G4.mp3'),
  A: require('../../assets/sounds/piano/A4.mp3'),
  B: require('../../assets/sounds/piano/B4.mp3'),
};

let currentSound: Audio.Sound | null = null;
let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
  });
  audioModeReady = true;
}

async function playNote(note: string) {
  try {
    await ensureAudioMode();
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }
    const { sound } = await Audio.Sound.createAsync(NOTE_SAMPLES[note], { shouldPlay: true });
    currentSound = sound;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    console.warn(e);
  }
}

// ── Note data ─────────────────────────────────────────────────────────────
const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63, D: 293.66, E: 329.63,
  F: 349.23, G: 392.00, A: 440.00, B: 493.88,
};

const NOTE_DESCRIPTIONS: Record<string, string> = {
  C: 'Root of the major scale. Stable and grounded — the home base.',
  D: 'Bright and open. The 2nd degree, full of forward energy.',
  E: 'Warm and expressive. The 3rd degree, heart of major chords.',
  F: 'The 4th degree. Slightly tense — always wants to resolve.',
  G: 'Strong and resonant. The 5th, the most natural harmony.',
  A: 'The 6th degree. Melancholic yet beautiful. The tuning standard at 440 Hz.',
  B: 'Bright and leading. The 7th — always pulls home.',
};

// Cycles visible in the waveform viewport per note (relative to frequency)
const NOTE_WAVE_CYCLES: Record<string, number> = {
  C: 2.0, D: 2.25, E: 2.5, F: 2.65, G: 3.0, A: 3.35, B: 3.75,
};

const ALL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// ── Lesson groups ─────────────────────────────────────────────────────────
const LESSON_GROUPS: Record<string, {
  title: string; emoji: string; notes: string[]; color: string; depth: string;
}> = {
  basics: {
    title: 'Basic Notes',
    emoji: '🌱',
    notes: ['C', 'D', 'E'],
    color: '#58CC02',
    depth: '#46A302',
  },
  middle: {
    title: 'Middle Notes',
    emoji: '🎵',
    notes: ['F', 'G', 'A'],
    color: '#3b82f6',
    depth: '#2563eb',
  },
  full: {
    title: 'Full Octave',
    emoji: '🎹',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    color: '#a855f7',
    depth: '#9333ea',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function getChoices(correct: string): string[] {
  const pool = ALL_NOTES.filter((n) => n !== correct);
  const distractors = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return [...distractors, correct].sort(() => Math.random() - 0.5);
}

// ── Waveform ──────────────────────────────────────────────────────────────
function WaveformVisualizer({
  isPlaying,
  color,
  note,
}: {
  isPlaying: boolean;
  color: string;
  note: string;
}) {
  const { width: screenW } = Dimensions.get('window');
  const W = screenW - 72;
  const H = 80;
  const phaseRef = useRef(0);
  const [paths, setPaths] = useState<{ main: string; shadow: string }>({ main: '', shadow: '' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cycles = NOTE_WAVE_CYCLES[note] ?? 2;

  const buildPath = (amp: number, phase: number) => {
    const mid = H / 2;
    let d = '';
    for (let x = 0; x <= W; x += 3) {
      const y = mid + amp * Math.sin((x / W) * Math.PI * 2 * cycles + phase);
      d += x === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  };

  useEffect(() => {
    phaseRef.current = 0;

    const render = () => {
      setPaths({
        main: buildPath(28, phaseRef.current),
        shadow: buildPath(16, phaseRef.current + 0.8),
      });
    };

    render(); // render static frame immediately

    if (isPlaying) {
      const tick = () => {
        phaseRef.current += 0.18;
        render();
        timerRef.current = setTimeout(tick, 28);
      };
      timerRef.current = setTimeout(tick, 28);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, note, W]);

  return (
    <View style={styles.waveContainer}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="waveFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.15" stopColor={color} stopOpacity="1" />
            <Stop offset="0.85" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Shadow wave */}
        <Path d={paths.shadow} stroke={color} strokeWidth={2} fill="none" strokeOpacity={0.25} />
        {/* Main wave */}
        <Path d={paths.main} stroke="url(#waveFade)" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      </Svg>
      <Text style={[styles.freqLabel, { color }]}>
        {NOTE_FREQUENCIES[note].toFixed(2)} Hz
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────
export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ group?: string }>();
  const groupKey = params?.group ?? 'basics';
  const group = LESSON_GROUPS[groupKey] ?? LESSON_GROUPS.basics;

  const isDark = useColorScheme() === 'dark';
  const theme = {
    bg: isDark ? '#0F1115' : '#F3F7FF',
    card: isDark ? '#171A21' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1F2A37',
    subText: isDark ? 'rgba(255,255,255,0.60)' : '#6B7280',
    border: isDark ? 'rgba(255,255,255,0.10)' : '#E3ECFA',
    trackBg: isDark ? '#1a1d2a' : '#e5e7eb',
  };

  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<'answering' | 'result'>('answering');
  const [isPlaying, setIsPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const playTimer = useRef<NodeJS.Timeout | null>(null);

  const currentNote = group.notes[step];
  const isLast = step + 1 >= group.notes.length;
  const isCorrect = selected === currentNote;

  const triggerPlay = (note: string) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setIsPlaying(true);
    playNote(note);
    playTimer.current = setTimeout(() => setIsPlaying(false), 2200);
  };

  // Setup each step
  useEffect(() => {
    setChoices(getChoices(currentNote));
    setSelected(null);
    setPhase('answering');
    triggerPlay(currentNote);
    return () => {
      if (playTimer.current) clearTimeout(playTimer.current);
    };
  }, [step]);

  const handleCheck = () => {
    if (!selected) return;
    setPhase('result');
    if (selected === currentNote) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setDone(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  const progress = step / group.notes.length;

  // ── Completion screen ──────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={styles.flex}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.completionWrap}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={[styles.completionTitle, { color: theme.text }]}>Lesson Complete!</Text>
            <Text style={[styles.completionSub, { color: theme.subText }]}>
              You've learned all {group.notes.length} notes in {group.title}
            </Text>
            <View style={[styles.noteChips, { marginTop: 20 }]}>
              {group.notes.map((n) => (
                <View key={n} style={[styles.noteChip, { backgroundColor: group.color + '22', borderColor: group.color + '66' }]}>
                  <Text style={[styles.noteChipText, { color: group.color }]}>{n}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: group.color, shadowColor: group.depth }]}
              onPress={() => router.back()}
            >
              <Text style={styles.doneBtnText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Lesson screen ──────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={styles.flex}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="close" size={20} color={theme.subText} />
          </TouchableOpacity>

          <View style={[styles.progressTrack, { backgroundColor: theme.trackBg }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: group.color,
                  width: `${Math.max(4, progress * 100)}%`,
                },
              ]}
            />
          </View>

          <Text style={[styles.stepLabel, { color: theme.subText }]}>
            {step + 1}/{group.notes.length}
          </Text>
        </View>

        {/* Prompt */}
        <Animated.Text
          entering={FadeInDown.delay(60).duration(260)}
          key={`prompt-${step}`}
          style={[styles.prompt, { color: theme.text }]}
        >
          Which note is being played?
        </Animated.Text>

        {/* Mascot + Speech bubble */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(280)}
          key={`mascot-${step}`}
          style={styles.mascotRow}
        >
          {/* Character */}
          <View style={[styles.mascotCircle, { backgroundColor: group.color + '1A', borderColor: group.color + '55' }]}>
            <Text style={styles.mascotEmoji}>🎵</Text>
          </View>

          {/* Speech bubble */}
          <TouchableOpacity
            onPress={() => triggerPlay(currentNote)}
            style={[styles.speechBubble, { backgroundColor: theme.card, borderColor: theme.border }]}
            activeOpacity={0.75}
          >
            {/* Triangle tail */}
            <View style={[styles.bubbleTail, { borderRightColor: theme.card }]} />
            <Ionicons
              name={isPlaying ? 'volume-high' : 'volume-medium'}
              size={22}
              color={group.color}
            />
            <Text style={[styles.bubbleHint, { color: theme.subText }]}>
              {isPlaying ? 'Playing...' : 'Tap to replay'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Waveform card */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(300)}
          key={`wave-${step}`}
          style={[styles.waveCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <WaveformVisualizer isPlaying={isPlaying} color={group.color} note={currentNote} />
          {/* Only reveal note info after the user has answered */}
          {phase === 'result' && (
            <Animated.View entering={FadeInUp.duration(220)} style={styles.noteReveal}>
              <Text style={[styles.noteRevealName, { color: group.color }]}>{currentNote}</Text>
              <Text style={[styles.noteDescription, { color: theme.subText }]}>
                {NOTE_DESCRIPTIONS[currentNote]}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Answer tiles */}
        <Animated.View
          entering={FadeInUp.delay(150).duration(300)}
          key={`tiles-${step}`}
          style={styles.tilesGrid}
        >
          {choices.map((note) => {
            const isSelected = selected === note;
            const showResult = phase === 'result';
            const isRight = note === currentNote;

            let tileBg = theme.card;
            let tileBorder = theme.border;
            let tileText = theme.text;

            if (showResult) {
              if (isRight) {
                tileBg = '#58CC0218';
                tileBorder = '#58CC02';
                tileText = '#58CC02';
              } else if (isSelected) {
                tileBg = '#EF444418';
                tileBorder = '#EF4444';
                tileText = '#EF4444';
              }
            } else if (isSelected) {
              tileBg = group.color + '1A';
              tileBorder = group.color;
              tileText = group.color;
            }

            return (
              <TouchableOpacity
                key={note}
                disabled={phase === 'result'}
                onPress={() => {
                  setSelected(note);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.75}
                style={[styles.tile, { backgroundColor: tileBg, borderColor: tileBorder }]}
              >
                <Text style={[styles.tileText, { color: tileText }]}>{note}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Result banner */}
        {phase === 'result' && (
          <Animated.View
            entering={FadeInUp.duration(200)}
            style={[
              styles.resultBanner,
              {
                backgroundColor: isCorrect ? '#58CC0215' : '#EF444415',
                borderColor: isCorrect ? '#58CC02' : '#EF4444',
              },
            ]}
          >
            <View style={styles.resultRow}>
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={26}
                color={isCorrect ? '#58CC02' : '#EF4444'}
              />
              <Text style={[styles.resultTitle, { color: isCorrect ? '#58CC02' : '#EF4444' }]}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
            </View>
            {!isCorrect && (
              <Text style={[styles.resultAnswer, { color: theme.subText }]}>
                Correct Answer:{' '}
                <Text style={{ color: theme.text, fontWeight: '900' }}>{currentNote}</Text>
              </Text>
            )}
          </Animated.View>
        )}

        {/* Bottom button */}
        <View style={styles.footer}>
          {phase === 'answering' ? (
            <View style={[styles.btnShadow, { backgroundColor: selected ? group.depth : theme.trackBg }]}>
              <TouchableOpacity
                onPress={handleCheck}
                disabled={!selected}
                style={[
                  styles.actionBtn,
                  { backgroundColor: selected ? group.color : theme.trackBg, opacity: selected ? 1 : 0.55 },
                ]}
              >
                <Text style={[styles.actionBtnText, { color: selected ? '#fff' : theme.subText }]}>
                  CHECK
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.btnShadow, { backgroundColor: isCorrect ? '#46A302' : '#B91C1C' }]}>
              <TouchableOpacity
                onPress={handleNext}
                style={[styles.actionBtn, { backgroundColor: isCorrect ? '#58CC02' : '#EF4444' }]}
              >
                <Text style={styles.actionBtnText}>
                  {isLast ? 'FINISH' : isCorrect ? 'NEXT' : 'GOT IT'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 20 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'right',
  },

  // Prompt
  prompt: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 18,
    letterSpacing: -0.3,
  },

  // Mascot row
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  mascotCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotEmoji: { fontSize: 36 },
  speechBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    left: -10,
    top: 18,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bubbleHint: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Waveform
  waveCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  waveContainer: {
    alignItems: 'center',
    width: '100%',
  },
  freqLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  noteReveal: {
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  noteRevealName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  noteDescription: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Tiles
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  tile: {
    width: '47%',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Result banner
  resultBanner: {
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultTitle: { fontSize: 17, fontWeight: '900' },
  resultAnswer: { fontSize: 14, fontWeight: '700', marginLeft: 36 },

  // Footer
  footer: { paddingBottom: 20 },
  btnShadow: { borderRadius: 18, paddingBottom: 5 },
  actionBtn: {
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Completion
  completionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  completionEmoji: { fontSize: 72 },
  completionTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  completionSub: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  noteChips: { flexDirection: 'row', gap: 8 },
  noteChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteChipText: { fontSize: 16, fontWeight: '900' },
  doneBtn: {
    marginTop: 16,
    width: '100%',
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 5,
  },
  doneBtnText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});
