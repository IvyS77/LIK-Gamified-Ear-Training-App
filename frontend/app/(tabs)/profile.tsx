import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, backend, uploadImage, db } from "@/firebaseConfig";
import { useAuth, UserProfile } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Glow } from "@/components/Glow";
import SpotifyBottomSheet from "@/components/SpotifyBottom";

const DEMO_DAILY_XP_CAP = 50;

function xpToLevelUp(level: number) {
  if (level <= 20) return 20;
  return 20 + (level - 20) * 2;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function formatErr(e: any) {
  const code = e?.code ? String(e.code) : "";
  const msg = e?.message ? String(e.message) : String(e);
  return code ? `${code}: ${msg}` : msg;
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();           // ← was: inline useMemo block
  const { isDark } = theme;

  const {user, profile} = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [spotifySheetVisible, setSpotifySheetVisible] = useState(false);

  useEffect(() => {
    if (profile?.profilePicture) setAvatarUri(profile.profilePicture);
  }, [profile?.profilePicture]);

  // FIX 1: wrapped in useCallback so reference is stable across renders
  const updateProfile = useCallback(async (update: Partial<UserProfile>) => {
    const uid = user?.uid;
    if (!uid) {
      Alert.alert("Error", "Not signed in.");
      throw new Error("Not signed in");
    }

    // 1) Firestore write (required)
    try {
      await setDoc(
        doc(db, "users", uid),
        { ...update, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error("Firestore setDoc failed:", e);
      Alert.alert("Error", `Failed to save profile changes.\n\n${formatErr(e)}`);
      throw e;
    }

    // 2) Backend sync (best-effort)
    try {
      const token = await user.getIdToken();
      await fetch(`${backend}/update-profile`, {
        method: "POST",
        body: JSON.stringify({ ...update, authToken: token }),
        headers: { "Content-type": "application/json" },
      });
    } catch (e) {
      console.warn("Backend sync failed (ignored):", e);
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission denied", "Allow access in settings.", [
        { text: "Settings", onPress: () => Linking.openSettings() },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const localUri = result.assets[0].uri;
      const prev = avatarUri;
      setAvatarUri(localUri);

      try {
        setSavingAvatar(true);
        const downloadURL = await uploadImage(localUri);
        await updateProfile({ profilePicture: downloadURL });
        setAvatarUri(downloadURL);
      } catch (e) {
        console.error("pickAvatar failed:", e);
        setAvatarUri(prev ?? profile?.profilePicture ?? null);
      } finally {
        setSavingAvatar(false);
      }
    }
  };

  // FIX 2: signOut with proper error handling
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  if (user === undefined) return null;

  // ── Guest profile ──────────────────────────────────────────
  if (user === null) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <Glow accent={theme.accent} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.guestScroll}
          >
            <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View
                style={[
                  styles.heroIconRing,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.soft,
                    shadowColor: "#000",
                    shadowOpacity: isDark ? 0.25 : 0.10,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                  },
                ]}
              >
                <View style={[styles.heroIconTop, { backgroundColor: theme.accent }]}>
                  <Ionicons name="person" size={28} color="#FFFFFF" />
                </View>
              </View>

              <Text style={[styles.heroTitle, { color: theme.text }]}>Guest profile</Text>
              <Text style={[styles.heroDesc, { color: theme.subText }]}>
                Sign in to save XP, streaks, and your avatar across devices.
              </Text>

              <View style={{ height: 18 }} />

              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={({ pressed }) => [
                  styles.primaryShadow,
                  { backgroundColor: theme.primaryDepth },
                  pressed && { transform: [{ translateY: 2 }] },
                ]}
              >
                <View style={[styles.primaryBtn, { backgroundColor: theme.primaryTop }]}>
                  <Text style={[styles.primaryText, { color: theme.primaryText }]}>Sign in</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(auth)/signup")}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: theme.border, backgroundColor: theme.card, marginTop: 14 },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.secondaryText, { color: theme.text }]}>Create account</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Signed-in profile ──────────────────────────────────────
  const displayName =
    profile?.firstName
      ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
      : "Your profile";

  const level = Number(profile?.level ?? 1);
  const currentXp = Number(profile?.currentXp ?? 0);
  const streak = Number(profile?.streak ?? 0);

  const need = xpToLevelUp(level);
  const progress01 = clamp01(need > 0 ? currentXp / need : 0);
  const xpRemaining = Math.max(0, need - currentXp);

  // FIX 3: removed "as any" — these fields should be in UserProfile type
  // (add accuracy, totalSessions, demoXpToday to your UserProfile type in use-auth.ts)
  const demoXpToday = Number(profile?.demoXpToday ?? 0);
  const demoCap01 = clamp01(DEMO_DAILY_XP_CAP > 0 ? demoXpToday / DEMO_DAILY_XP_CAP : 0);
  const accuracy = profile?.accuracy;
  const totalSessions = profile?.totalSessions;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <Glow accent={theme.accent} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.heroRow}>
              <Pressable onPress={savingAvatar ? undefined : pickAvatar} style={{ alignItems: "center" }}>
                <View style={[styles.avatarRing, { borderColor: theme.border, backgroundColor: theme.soft }]}>
                  <View style={[styles.avatarFrame, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                    ) : (
                      <Ionicons name="person" size={38} color={theme.subText} />
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.cameraBadge,
                    { backgroundColor: theme.accent, borderColor: theme.soft, opacity: savingAvatar ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name={savingAvatar ? "cloud-upload" : "camera"} size={14} color="#FFFFFF" />
                </View>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
                <Text style={[styles.email, { color: theme.subText }]} numberOfLines={1}>{user.email}</Text>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => router.push("/(profile)/settings")}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: theme.soft, borderColor: theme.border },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Ionicons name="settings-outline" size={16} color={theme.text} />
                    <Text style={[styles.actionText, { color: theme.text }]}>Settings</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.pillsRow}>
              <Pill label="LEVEL" value={level} theme={theme} />
              <Pill label="XP" value={currentXp} theme={theme} />
              <Pill label="STREAK" value={`${streak}d`} theme={theme} />
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.subText }]}>PROGRESS</Text>
            <View style={styles.progressHeader}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Level {level}</Text>
              <Text style={[styles.panelDesc, { color: theme.subText }]}>{xpRemaining} XP to level up</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.08)" }]}>
              <View style={[styles.progressFill, { width: `${progress01 * 100}%`, backgroundColor: theme.accent }]} />
            </View>
            <View style={styles.miniRow}>
              <Text style={[styles.miniLabel, { color: theme.subText }]}>Demo cap</Text>
              <Text style={[styles.miniValue, { color: theme.subText }]}>{demoXpToday}/{DEMO_DAILY_XP_CAP} XP</Text>
            </View>
            <View style={[styles.miniTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.08)" }]}>
              <View style={[styles.miniFill, { width: `${demoCap01 * 100}%`, backgroundColor: theme.accent }]} />
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.subText }]}>STATS</Text>
            <View style={styles.grid}>
              <MetricCard title="Sessions" value={totalSessions ?? "—"} icon="time-outline" theme={theme} onPress={() => router.push("/(profile)/history")} />
              <MetricCard title="Accuracy" value={accuracy != null ? `${accuracy}%` : "—"} icon="analytics-outline" theme={theme} onPress={() => router.push("/(profile)/accuracy")} />
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.subText }]}>ACCOUNT</Text>

            {/* Spotify connect button */}
            <Pressable
              onPress={() => setSpotifySheetVisible(true)}
              style={({ pressed }) => [
                styles.spotifyBtn,
                { borderColor: theme.border, backgroundColor: theme.soft },
                pressed && { opacity: 0.75 },
              ]}
            >
              <MaterialCommunityIcons name="spotify" size={20} color="#1DB954" />
              <Text style={[styles.spotifyText, { color: theme.text }]}>
                {profile?.spotifyConnected ? "Spotify  ·  Connected" : "Connect Spotify"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.subText} style={{ marginLeft: "auto" }} />
            </Pressable>

            {/* FIX 2: signOut now has error handling */}
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.dangerBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark ? "rgba(255, 75, 75, 0.10)" : "rgba(220, 38, 38, 0.08)",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.dangerText, { color: theme.danger }]}>Log out</Text>
            </Pressable>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Spotify bottom sheet */}
      <SpotifyBottomSheet
        visible={spotifySheetVisible}
        onClose={() => setSpotifySheetVisible(false)}
        uid={user?.uid}
        spotifyConnected={profile?.spotifyConnected ?? false}
        spotifyDisplayName={profile?.spotifyDisplayName}
      />
    </View>
  );
}

function Pill({ label, value, theme }: { label: string; value: number | string; theme: any }) {
  return (
    <View style={[styles.pill, { backgroundColor: theme.soft, borderColor: theme.border }]}>
      <Text style={[styles.pillLabel, { color: theme.subText }]}>{label}</Text>
      <Text style={[styles.pillValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function MetricCard({
  title, value, icon, onPress, theme,
}: {
  title: string; value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void; theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        { backgroundColor: theme.soft, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <Text style={[styles.metricValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricTitle, { color: theme.subText }]} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  scroll: { paddingTop: 6, paddingBottom: 12, gap: 12 },
  guestScroll: { paddingTop: 10, paddingBottom: 16, gap: 12 },

  heroCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  heroRow: { flexDirection: "row", gap: 14, alignItems: "center" },

  avatarRing: { width: 92, height: 92, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarFrame: { width: 74, height: 74, borderRadius: 22, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%" },
  cameraBadge: { position: "absolute", right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: "center", justifyContent: "center" },

  name: { fontSize: 18, fontWeight: "900" },
  email: { marginTop: 2, fontSize: 13, fontWeight: "700" },

  actionRow: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionBtn: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: { fontSize: 13, fontWeight: "900" },

  pillsRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  pill: { flex: 1, borderRadius: 18, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  pillLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  pillValue: { marginTop: 4, fontSize: 18, fontWeight: "900" },

  panel: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "900", letterSpacing: 1.0 },
  panelTitle: { fontSize: 14, fontWeight: "900" },
  panelDesc: { marginTop: 2, fontSize: 12, fontWeight: "700", lineHeight: 16 },

  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressTrack: { height: 10, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },

  miniRow: { marginTop: 4, flexDirection: "row", justifyContent: "space-between" },
  miniLabel: { fontSize: 12, fontWeight: "800" },
  miniValue: { fontSize: 12, fontWeight: "800" },
  miniTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 999 },

  grid: { flexDirection: "row", gap: 12 },
  metricCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 14 },
  metricIcon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  metricValue: { marginTop: 10, fontSize: 18, fontWeight: "900" },
  metricTitle: { marginTop: 2, fontSize: 12, fontWeight: "800" },

  dangerBtn: { height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  dangerText: { fontSize: 14, fontWeight: "900" },

  spotifyBtn: { height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  spotifyText: { fontSize: 14, fontWeight: "900" },

  heroIconRing: { width: 86, height: 86, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 10 },
  heroIconTop: { width: 62, height: 62, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  heroDesc: { marginTop: 8, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },

  primaryShadow: { borderRadius: 18, paddingBottom: 4 },
  primaryBtn: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 15, fontWeight: "900" },
  secondaryBtn: { height: 50, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 15, fontWeight: "900" },
});
