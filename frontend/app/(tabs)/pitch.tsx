import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function PitchLandingScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [user, profile] = useAuth();
  const isGuest = !user;

  const theme = useMemo(() => {
    const accent = '#58CC02';

    const bg = isDark ? '#0F1115' : '#F3F7FF';
    const card = isDark ? '#171A21' : '#FFFFFF';
    const text = isDark ? '#FFFFFF' : '#111827';
    const subText = isDark ? 'rgba(255,255,255,0.72)' : '#6B7280';
    const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.08)';

    return {
      bg,
      card,
      text,
      subText,
      border,
      accent,
      softAccent: isDark ? 'rgba(88,204,2,0.18)' : 'rgba(88,204,2,0.12)',
      softPanel: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFF',

      whiteKey: '#FFFFFF',
      whiteKeyBorder: '#D0D0D0',
      blackKey: '#1a1a1a',
      blackKeyBorder: 'rgba(255,255,255,0.12)',

      primaryDepth: '#0F172A',
      primaryTop: isDark ? '#FFFFFF' : '#111827',
      primaryText: isDark ? '#000000' : '#FFFFFF',
    };
  }, [isDark]);

  const xpLabel = isGuest ? 'Locked' : profile ? `${profile.currentXp ?? 0}` : '—';
  const levelLabel = isGuest ? 'Locked' : profile ? `${profile.level ?? 1}` : '—';
  const streakLabel = isGuest ? 'Locked' : profile ? `${profile.streak ?? 0}d` : '—';

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Soft green glow */}
        <View pointerEvents="none" style={styles.glowWrap}>
          <View style={[styles.glow1, { backgroundColor: theme.accent }]} />
          <View style={[styles.glow2, { backgroundColor: theme.accent }]} />
        </View>

        <View style={styles.content}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatChip icon={isGuest ? 'lock-closed' : 'flash'} label="XP" value={xpLabel} theme={theme} locked={isGuest} />
            <StatChip icon={isGuest ? 'lock-closed' : 'ribbon'} label="Level" value={levelLabel} theme={theme} locked={isGuest} />
            <StatChip icon={isGuest ? 'lock-closed' : 'flame'} label="Streak" value={streakLabel} theme={theme} locked={isGuest} />
          </View>

          {/* Main card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Hero */}
              <View style={styles.hero}>
                <View style={[styles.iconRing, { borderColor: theme.border, backgroundColor: theme.softAccent }]}>
                  <View style={[styles.iconTop, { backgroundColor: theme.accent }]}>
                    <Ionicons name="musical-notes" size={30} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>Master your pitch</Text>
                <Text style={[styles.subtitle, { color: theme.subText }]}>
                  Listen to a note and tap the matching key. Short rounds, fast feedback.
                </Text>
              </View>

              {/* Account (guest only) */}
              {isGuest && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.subText }]}>ACCOUNT</Text>
                  <View style={[styles.panel, { borderColor: theme.border, backgroundColor: theme.softPanel }]}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <View style={[styles.panelIcon, { backgroundColor: theme.softAccent }]}>
                        <Ionicons name="lock-closed" size={16} color={theme.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.panelTitle, { color: theme.text }]}>Sign in to save progress</Text>
                        <Text style={[styles.panelDesc, { color: theme.subText }]}>
                          Guests can practice, but XP and Spotify are available only after login.
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => router.push('/login')}
                      style={({ pressed }) => [
                        styles.secondaryCta,
                        { borderColor: theme.border, backgroundColor: theme.card },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="log-in" size={16} color={theme.subText} />
                      <Text style={[styles.secondaryCtaText, { color: theme.subText }]}>Go to login</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Piano strip */}
              <Text style={[styles.sectionLabel, { color: theme.subText }]}>KEYBOARD</Text>
              <View style={[styles.pianoWrap, { borderColor: theme.border, backgroundColor: theme.softPanel }]}>
                <PianoStrip theme={theme} />
                <Text style={[styles.pianoHint, { color: theme.subText }]}>
                  Practice on a clean piano layout (white + black keys).
                </Text>
              </View>

              {/* Features */}
              <Text style={[styles.sectionLabel, { color: theme.subText }]}>FEATURES</Text>
              <View style={{ gap: 12 }}>
                <FeatureRow icon="checkmark-circle" title="Instant feedback" desc="Earn XP for correct answers (sign-in required)." theme={theme} />
                <FeatureRow icon="grid" title="Piano layout" desc="Keyboard UI that feels natural to use." theme={theme} />
                <FeatureRow icon="musical-note" title="Spotify (coming soon)" desc="Connect to choose songs for training." theme={theme} />
              </View>
            </ScrollView>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => router.push('/(pitch)/training')}
            style={({ pressed }) => [
              styles.primaryShadow,
              { backgroundColor: theme.primaryDepth },
              pressed && { transform: [{ translateY: 2 }] },
            ]}
          >
            <View style={[styles.primaryBtn, { backgroundColor: theme.primaryTop }]}>
              <Text style={[styles.primaryText, { color: theme.primaryText }]}>Start training</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: '/(pitch)/training', params: { mode: 'demo' } })}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="play-circle" size={18} color={theme.subText} />
            <Text style={[styles.secondaryText, { color: theme.subText }]}>Quick demo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PianoStrip({ theme }: { theme: any }) {
  const whiteCount = 7;
  const blackKeys = [
    { idx: 0, label: 'C#' },
    { idx: 1, label: 'D#' },
    { idx: 3, label: 'F#' },
    { idx: 4, label: 'G#' },
    { idx: 5, label: 'A#' },
  ];

  return (
    <View style={styles.piano}>
      <View style={styles.blackLayer} pointerEvents="none">
        {blackKeys.map((k) => (
          <View
            key={k.label}
            style={[
              styles.blackKey,
              {
                left: `${(k.idx + 1) * (100 / whiteCount) - 6}%`,
                backgroundColor: theme.blackKey,
                borderColor: theme.blackKeyBorder,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.whiteRow}>
        {Array.from({ length: whiteCount }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.whiteKey,
              { backgroundColor: theme.whiteKey, borderColor: theme.whiteKeyBorder },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function StatChip({
  icon,
  label,
  value,
  theme,
  locked,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: any;
  locked?: boolean;
}) {
  return (
    <View style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: theme.softAccent }]}>
        <Ionicons name={icon} size={16} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statLabel, { color: theme.subText }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.statValue, { color: locked ? theme.subText : theme.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  theme: any;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: theme.softAccent }]}>
        <Ionicons name={icon} size={16} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: theme.subText }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  safeArea: { flex: 1 },

  glowWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glow1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -170,
    left: -100,
    opacity: 0.16,
  },
  glow2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -150,
    right: -120,
    opacity: 0.10,
  },

  content: { flex: 1, paddingTop: 6, paddingBottom: 12 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statChip: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { marginTop: 2, fontSize: 15, fontWeight: '900' },

  card: { flex: 1, borderRadius: 24, borderWidth: 1, padding: 16 },
  scrollContent: { paddingBottom: 6 },

  hero: { alignItems: 'center', paddingTop: 2, paddingBottom: 8 },
  iconRing: {
    width: 86,
    height: 86,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconTop: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  sectionLabel: { marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: '900', letterSpacing: 1.0 },

  panel: { borderRadius: 18, borderWidth: 1, padding: 12, gap: 10 },
  panelIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { fontSize: 14, fontWeight: '900' },
  panelDesc: { marginTop: 2, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  secondaryCta: {
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCtaText: { fontSize: 13, fontWeight: '800' },

  pianoWrap: { borderRadius: 18, borderWidth: 1, padding: 12 },
  piano: { height: 64, justifyContent: 'flex-end' },
  whiteRow: { flexDirection: 'row', gap: 6 },
  whiteKey: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1 },
  blackLayer: { position: 'absolute', left: 0, right: 0, top: 0, height: 44 },
  blackKey: { position: 'absolute', width: 24, height: 34, borderRadius: 8, borderWidth: 1 },
  pianoHint: { marginTop: 10, fontSize: 12, fontWeight: '700' },

  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  featureIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '900' },
  featureDesc: { marginTop: 2, fontSize: 12, fontWeight: '700', lineHeight: 16 },

  footer: { paddingBottom: 18, gap: 10 },
  primaryShadow: { borderRadius: 18, paddingBottom: 4 },
  primaryBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },

  secondaryBtn: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: { fontSize: 14, fontWeight: '800' },
});