import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Glow } from "@/components/Glow";

// ── Config ────────────────────────────────────────────────
// TODO: move to backend before going live
const GEMINI_API_KEY = "AIzaSyCGOi80Sm5gELWl6-3Fn1-phoHGiS1D5Xs";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ── Types ─────────────────────────────────────────────────
interface Message { role: "user" | "assistant"; content: string; }
interface CoachData { message: string; tip: string; challenge: string; emoji: string; }
interface UserStats {
  level: number; currentXp: number; streak: number;
  recentCorrect: number; recentTotal: number; lastPlayedDate: string;
}

// ── Helpers ───────────────────────────────────────────────
function getAccuracy(c: number, t: number) { return t === 0 ? 0 : Math.round((c / t) * 100); }

function buildSystemPrompt(stats: UserStats): string {
  const acc = getAccuracy(stats.recentCorrect, stats.recentTotal);
  return `You are an encouraging AI coach for a gamified piano ear training app called LIK.
The user trains by listening to piano notes and identifying them on a keyboard.
Stats: Level ${stats.level}, ${stats.streak}-day streak, ${acc}% accuracy (${stats.recentCorrect}/${stats.recentTotal}), ${stats.currentXp} XP.
Keep responses short (2-4 sentences), warm, game-like. Reference their stats when relevant.`;
}

// ── Piano key decorator ───────────────────────────────────
function PianoKeys({ isDark }: { isDark: boolean }) {
  const WHITE = "#fff";
  const BLACK = "#000";
  const GLOW  = "#58CC02";
  const whiteKeys = 10;
  const blackPositions = [0, 1, 3, 4, 5, 7, 8];

  return (
    <View style={pk.wrap}>
      <View style={[pk.glowLine, { backgroundColor: GLOW }]} />
      <View style={pk.keys}>
        {Array.from({ length: whiteKeys }).map((_, i) => (
          <View key={i} style={[pk.white, { backgroundColor: WHITE, borderColor: isDark ? "#2A3550" : "#D0D8F0" }]} />
        ))}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {blackPositions.map((pos, i) => (
            <View
              key={i}
              style={[pk.black, {
                left: `${(pos + 0.65) * (100 / whiteKeys)}%` as any,
                backgroundColor: BLACK,
                shadowColor: GLOW,
                shadowOpacity: isDark ? 0.5 : 0.2,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
              }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const pk = StyleSheet.create({
  wrap: { height: 64, marginBottom: 4, overflow: "hidden" },
  glowLine: { height: 2, width: "100%", opacity: 0.8, marginBottom: 2 },
  keys: { flex: 1, flexDirection: "row", gap: 3, paddingHorizontal: 0, position: "relative" },
  white: { flex: 1, borderRadius: 4, borderWidth: 1, borderTopWidth: 0 },
  black: { position: "absolute", width: "7%" as any, height: "68%", borderRadius: 3, top: 0, elevation: 5 },
});

// ── Gemini API calls ──────────────────────────────────────
async function geminiGenerate(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.8 },
    }),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function geminiChat(messages: Message[], systemPrompt: string): Promise<string> {
  // Gemini uses "user" and "model" roles, and supports system instruction
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
    }),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Something went wrong. Try again!";
}

async function fetchCoachCard(stats: UserStats): Promise<CoachData> {
  const acc = getAccuracy(stats.recentCorrect, stats.recentTotal);
  const prompt = `You are a game coach for a piano ear training app.
User stats: Level ${stats.level}, ${stats.streak}-day streak, ${acc}% accuracy (${stats.recentCorrect}/${stats.recentTotal}), ${stats.currentXp} XP.

Respond with JSON only, no markdown, no backticks:
{"emoji":"game emoji","message":"1-2 sentence hype message referencing their stats, Duolingo energy","tip":"1 specific practice tip based on their accuracy","challenge":"1 fun quest for today"}`;

  try {
    const text = await geminiGenerate(prompt);
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return {
      emoji: "🎹",
      message: "Keep training — your ears are getting sharper!",
      tip: "Focus on the notes you miss most.",
      challenge: "Get 5 correct answers in a row today!",
    };
  }
}

async function sendChat(messages: Message[], stats: UserStats): Promise<string> {
  return geminiChat(messages, buildSystemPrompt(stats));
}

// ── Screen ────────────────────────────────────────────────
export default function ExploreScreen() {
  const theme = useTheme();
  const { isDark } = theme;
  const [user] = useAuth();

  const [stats, setStats]               = useState<UserStats | null>(null);
  const [coach, setCoach]               = useState<CoachData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);

  const chatRef = useRef<ScrollView>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.uid) { setLoadingStats(false); return; }
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setStats({
          level: d.level ?? 1, currentXp: d.currentXp ?? 0, streak: d.streak ?? 0,
          recentCorrect: d.recentCorrect ?? 0, recentTotal: d.recentTotal ?? 0,
          lastPlayedDate: d.lastPlayedDate ?? "",
        });
      }
    } catch (e) { console.warn(e); }
    finally { setLoadingStats(false); }
  }, [user?.uid]);

  const fetchCoach = useCallback(async (s: UserStats) => {
    setLoadingCoach(true);
    try { setCoach(await fetchCoachCard(s)); }
    catch (e) { console.warn(e); }
    finally { setLoadingCoach(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (stats) fetchCoach(stats); }, [stats]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !stats || sending) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setSending(true);
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const reply = await sendChat(next, stats);
      setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Something went wrong. Try again!" }]);
    } finally {
      setSending(false);
      setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, messages, stats, sending]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchStats(); setRefreshing(false);
  }, [fetchStats]);

  if (!user) {
    return (
      <View style={[s.screen, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={s.guestWrap}>
          <Glow accent={theme.accent} />
          <PianoKeys isDark={isDark} />
          <Text style={{ fontSize: 44, marginTop: 32, marginBottom: 12 }}>🎹</Text>
          <Text style={[s.guestTitle, { color: theme.text }]}>Sign in to unlock AI Coach</Text>
          <Text style={[s.guestSub, { color: theme.subText }]}>
            Your coach listens to your data and answers your questions.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  const acc = stats ? getAccuracy(stats.recentCorrect, stats.recentTotal) : 0;
  const accColor = acc >= 80 ? "#58CC02" : acc >= 60 ? "#F0C060" : "#F85149";

  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <Glow accent={theme.accent} />
        <PianoKeys isDark={isDark} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        >
          {/* Title */}
          <View style={s.titleRow}>
            <View>
              <Text style={[s.title, { color: theme.text }]}>AI Coach</Text>
              <Text style={[s.titleSub, { color: theme.subText }]}>Your personal ear training assistant</Text>
            </View>
            <Pressable
              onPress={() => stats && fetchCoach(stats)}
              disabled={loadingCoach}
              hitSlop={8}
              style={({ pressed }) => [s.refreshBtn, { backgroundColor: theme.soft, borderColor: theme.accent + "55" }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="refresh" size={16} color={loadingCoach ? theme.subText : theme.accent} />
            </Pressable>
          </View>

          {/* Coach card */}
          <View style={[s.coachCard, {
            backgroundColor: isDark ? "#0D1420" : "#F8FAFF",
            borderColor: theme.accent + "88",
            shadowColor: theme.accent,
            shadowOpacity: isDark ? 0.35 : 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }]}>
            <View style={s.coachCardHead}>
              <View style={[s.sparkleWrap, { backgroundColor: theme.accent + "22" }]}>
                <Ionicons name="sparkles" size={16} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.coachCardTitle, { color: theme.text }]}>Today's Briefing</Text>
                <Text style={[s.coachCardSub, { color: theme.subText }]}>
                  {stats ? `Based on your last ${stats.recentTotal} attempts` : "Loading..."}
                </Text>
              </View>
            </View>

            {loadingStats || loadingCoach ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[s.loadingTxt, { color: theme.subText }]}>Reading your data...</Text>
              </View>
            ) : coach ? (
              <View style={s.coachBody}>
                <View style={[s.msgBox, { backgroundColor: theme.accent + "15", borderColor: theme.accent + "33" }]}>
                  <Text style={s.msgEmoji}>{coach.emoji}</Text>
                  <Text style={[s.msgText, { color: theme.text }]}>{coach.message}</Text>
                </View>
                <View style={[s.infoRow, { borderColor: isDark ? "#1E2A40" : "#E4EAF8" }]}>
                  <View style={[s.infoIcon, { backgroundColor: "#58A6FF18" }]}>
                    <Ionicons name="bulb-outline" size={14} color="#58A6FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.infoLabel, { color: theme.subText }]}>PRO TIP</Text>
                    <Text style={[s.infoText, { color: theme.text }]}>{coach.tip}</Text>
                  </View>
                </View>
                <View style={[s.infoRow, { borderColor: "transparent" }]}>
                  <View style={[s.infoIcon, { backgroundColor: "#F0C06018" }]}>
                    <Ionicons name="trophy-outline" size={14} color="#F0C060" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.infoLabel, { color: theme.subText }]}>TODAY'S QUEST</Text>
                    <Text style={[s.infoText, { color: theme.text }]}>{coach.challenge}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {stats && stats.recentTotal > 0 && (
              <View style={[s.miniBar, { borderTopColor: isDark ? "#1E2A40" : "#E4EAF8" }]}>
                <Text style={[s.miniBarLabel, { color: theme.subText }]}>ACCURACY</Text>
                <View style={s.miniBarRow}>
                  <View style={[s.miniTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }]}>
                    <View style={[s.miniFill, { width: `${acc}%` as any, backgroundColor: accColor }]} />
                  </View>
                  <Text style={[s.miniPct, { color: accColor }]}>{acc}%</Text>
                </View>
              </View>
            )}
          </View>

          {/* Ask your coach */}
          <View style={s.chatTitleRow}>
            <View style={[s.chatDot, { backgroundColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]} />
            <Text style={[s.chatTitle, { color: theme.text }]}>Ask your coach</Text>
          </View>

          {messages.length === 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {[
                "How can I improve?",
                "What should I practice?",
                "How to keep my streak?",
                "Why do I keep missing F#?",
              ].map((q, i) => (
                <Pressable
                  key={i}
                  onPress={() => setInput(q)}
                  style={({ pressed }) => [s.chip, {
                    backgroundColor: theme.soft,
                    borderColor: theme.accent + "55",
                    shadowColor: theme.accent,
                    shadowOpacity: pressed ? 0 : isDark ? 0.2 : 0.08,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[s.chipTxt, { color: theme.text }]}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {messages.length > 0 && (
            <ScrollView
              ref={chatRef}
              style={[s.bubbleWrap, { backgroundColor: isDark ? "#080C14" : "#F0F4FF", borderColor: isDark ? "#1E2A40" : "#D4DEFC" }]}
              contentContainerStyle={s.bubbleContent}
              nestedScrollEnabled
            >
              {messages.map((msg, i) => (
                <View key={i} style={[
                  s.bubble,
                  msg.role === "user"
                    ? [s.bubbleUser, { backgroundColor: theme.accent }]
                    : [s.bubbleAI, {
                        backgroundColor: isDark ? "#0D1420" : "#FFFFFF",
                        borderColor: theme.accent + "44",
                        shadowColor: theme.accent,
                        shadowOpacity: isDark ? 0.2 : 0.08,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                      }],
                ]}>
                  {msg.role === "assistant" && <Text style={s.bubbleEmoji}>🎹</Text>}
                  <Text style={[s.bubbleTxt, { color: msg.role === "user" ? "#000" : theme.text }]}>
                    {msg.content}
                  </Text>
                </View>
              ))}
              {sending && (
                <View style={[s.bubble, s.bubbleAI, { backgroundColor: isDark ? "#0D1420" : "#FFFFFF", borderColor: theme.accent + "44" }]}>
                  <ActivityIndicator size="small" color={theme.accent} />
                </View>
              )}
            </ScrollView>
          )}

          <View style={{ height: 12 }} />
        </ScrollView>

        {/* Input bar */}
        <View style={[s.inputBar, {
          backgroundColor: isDark ? "#080C14" : "#F0F4FF",
          borderTopColor: isDark ? "#1A2236" : "#D4DEFC",
        }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything..."
            placeholderTextColor={theme.subText}
            style={[s.input, {
              backgroundColor: isDark ? "#0D1420" : "#FFFFFF",
              borderColor: input.length > 0 ? theme.accent + "88" : (isDark ? "#1E2A40" : "#D4DEFC"),
              color: theme.text,
            }]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!sending && !!stats}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sending || !stats}
            style={({ pressed }) => [s.sendBtn, {
              backgroundColor: input.trim() && !sending ? theme.accent : (isDark ? "#1A2236" : "#E0E7FF"),
              shadowColor: input.trim() ? theme.accent : "transparent",
              shadowOpacity: 0.5,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            }, pressed && { opacity: 0.8 }]}
          >
            {sending
              ? <ActivityIndicator size="small" color={theme.subText} />
              : <Ionicons name="arrow-up" size={18} color={input.trim() && !sending ? "#000" : theme.subText} />
            }
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 14 },
  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  guestTitle: { fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  guestSub: { fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  titleSub: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  coachCard: { borderRadius: 24, borderWidth: 1.5, overflow: "hidden" },
  coachCardHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 12 },
  sparkleWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  coachCardTitle: { fontSize: 15, fontWeight: "900" },
  coachCardSub: { fontSize: 10, fontWeight: "700", marginTop: 1 },
  loadingWrap: { alignItems: "center", padding: 28, gap: 10 },
  loadingTxt: { fontSize: 12, fontWeight: "700" },
  coachBody: { paddingHorizontal: 16, paddingBottom: 4 },
  msgBox: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  msgEmoji: { fontSize: 22 },
  msgText: { fontSize: 14, fontWeight: "700", lineHeight: 20, flex: 1 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  infoIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1.2, marginBottom: 3 },
  infoText: { fontSize: 13, fontWeight: "700", lineHeight: 17 },
  miniBar: { margin: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  miniBarLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1, marginBottom: 6 },
  miniBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniTrack: { flex: 1, height: 6, borderRadius: 999, overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 999 },
  miniPct: { fontSize: 13, fontWeight: "900", width: 38, textAlign: "right" },
  chatTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatDot: { width: 8, height: 8, borderRadius: 4 },
  chatTitle: { fontSize: 16, fontWeight: "900" },
  chips: { gap: 8, paddingRight: 16 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, elevation: 3 },
  chipTxt: { fontSize: 13, fontWeight: "700" },
  bubbleWrap: { borderRadius: 20, borderWidth: 1, maxHeight: 280 },
  bubbleContent: { padding: 14, gap: 10 },
  bubble: { borderRadius: 18, padding: 12, maxWidth: "85%" },
  bubbleUser: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleAI: { alignSelf: "flex-start", borderWidth: 1, borderBottomLeftRadius: 4, elevation: 4 },
  bubbleEmoji: { fontSize: 13, marginBottom: 4 },
  bubbleTxt: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 11, fontSize: 14, fontWeight: "700" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", elevation: 6 },
});
