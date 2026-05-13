import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  StyleSheet,
  useColorScheme,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useTheme } from "@/hooks/use-theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpotifyBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  uid: string | undefined;
  spotifyConnected: boolean;          // pass from profile / Firestore
  spotifyDisplayName?: string;        // e.g. "Ivy S." from Spotify profile
  onConnectionChange?: (connected: boolean) => void;
}

// ─── Spotify OAuth helpers ────────────────────────────────────────────────────
// Replace CLIENT_ID and REDIRECT_URI with your actual Spotify app credentials.

const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";
const SPOTIFY_REDIRECT_URI = "eartraining://spotify-callback";
const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-currently-playing",
].join("%20");

function buildSpotifyAuthUrl(): string {
  return (
    `https://accounts.spotify.com/authorize` +
    `?client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&scope=${SPOTIFY_SCOPES}` +
    `&show_dialog=true`
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpotifyBottomSheet({
  visible,
  onClose,
  uid,
  spotifyConnected,
  spotifyDisplayName,
  onConnectionChange,
}: SpotifyBottomSheetProps) {
  const theme = useTheme();
  const { isDark } = theme;

  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Animate in / out when visible changes
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ── Connect ──────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    const url = buildSpotifyAuthUrl();
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Error", "Could not open Spotify. Make sure it is installed.");
      return;
    }
    // Opens the Spotify auth page / app.
    // In a full implementation you would intercept the redirect URI via
    // Linking.addEventListener and extract the access_token from the URL.
    await Linking.openURL(url);

    // TODO: handle token after redirect, then call saveSpotifyConnection()
  }, []);

  // ── Save connection to Firestore ─────────────────────────────────────────────
  const saveSpotifyConnection = useCallback(
    async (connected: boolean, displayName?: string) => {
      if (!uid) return;
      setLoading(true);
      try {
        await setDoc(
          doc(db, "users", uid),
          {
            spotifyConnected: connected,
            spotifyDisplayName: displayName ?? "",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        onConnectionChange?.(connected);
      } catch (e) {
        Alert.alert("Error", "Could not update Spotify connection. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [uid, onConnectionChange]
  );

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect Spotify",
      "Your Spotify account will be unlinked. You can reconnect anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => saveSpotifyConnection(false),
        },
      ]
    );
  }, [saveSpotifyConnection]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim overlay */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          // Prevent tap-through to overlay
          onStartShouldSetResponder={() => true}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.spotifyIconWrap, { backgroundColor: isDark ? "#0D2010" : "#E8FAE8" }]}>
              {/* Spotify "S" wordmark placeholder — swap for real SVG asset if available */}
              <MaterialCommunityIcons name="spotify" size={26} color="#1DB954" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Spotify</Text>
              <Text style={[styles.sheetSub, { color: theme.subText }]}>
                {spotifyConnected
                  ? `Connected${spotifyDisplayName ? ` as ${spotifyDisplayName}` : ""}`
                  : "Not connected"}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.soft, borderColor: theme.border },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={theme.subText} />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Body — NOT connected */}
          {!spotifyConnected && (
            <View style={styles.body}>
              <FeatureRow
                icon="musical-note-outline"
                text="Train by ear with songs you already know"
                theme={theme}
              />
              <FeatureRow
                icon="albums-outline"
                text="Pick any playlist as your training source"
                theme={theme}
              />
              <FeatureRow
                icon="stats-chart-outline"
                text="See your accuracy tied to real tracks"
                theme={theme}
              />

              <View style={{ height: 20 }} />

              {/* Connect button */}
              <Pressable
                onPress={handleConnect}
                disabled={loading}
                style={({ pressed }) => [
                  styles.spotifyShadow,
                  { backgroundColor: "#158A3E", opacity: loading ? 0.7 : 1 },
                  pressed && { transform: [{ translateY: 2 }] },
                ]}
              >
                <View style={[styles.spotifyBtn, { backgroundColor: SPOTIFY_GREEN }]}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="spotify" size={20} color="#FFFFFF" />
                      <Text style={styles.spotifyBtnText}>Connect Spotify</Text>
                    </>
                  )}
                </View>
              </Pressable>

              <Text style={[styles.disclaimer, { color: theme.subText }]}>
                You'll be redirected to Spotify to authorise. We only request
                read access — we never modify your library.
              </Text>
            </View>
          )}

          {/* Body — CONNECTED */}
          {spotifyConnected && (
            <View style={styles.body}>
              {/* Status card */}
              <View
                style={[
                  styles.connectedCard,
                  { backgroundColor: isDark ? "#0D2010" : "#E8FAE8", borderColor: SPOTIFY_GREEN + "44" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={22} color={SPOTIFY_GREEN} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.connectedTitle, { color: theme.text }]}>
                    Spotify is connected
                  </Text>
                  {spotifyDisplayName ? (
                    <Text style={[styles.connectedSub, { color: theme.subText }]}>
                      {spotifyDisplayName}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ height: 16 }} />

              <FeatureRow
                icon="checkmark-circle-outline"
                text="Song-based training is unlocked"
                theme={theme}
                accent={SPOTIFY_GREEN}
              />
              <FeatureRow
                icon="checkmark-circle-outline"
                text="Pick any playlist as your training source"
                theme={theme}
                accent={SPOTIFY_GREEN}
              />

              <View style={{ height: 24 }} />

              {/* Disconnect */}
              <Pressable
                onPress={handleDisconnect}
                disabled={loading}
                style={({ pressed }) => [
                  styles.disconnectBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: isDark
                      ? "rgba(255,75,75,0.08)"
                      : "rgba(220,38,38,0.06)",
                    opacity: loading || pressed ? 0.75 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={theme.subText} />
                ) : (
                  <>
                    <Ionicons name="unlink-outline" size={18} color={theme.subText} />
                    <Text style={[styles.disconnectText, { color: theme.subText }]}>
                      Disconnect Spotify
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureRow({
  icon,
  text,
  theme,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  theme: any;
  accent?: string;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={accent ?? theme.subText} />
      <Text style={[styles.featureText, { color: theme.subText }]}>{text}</Text>
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPOTIFY_GREEN = "#1DB954";

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  spotifyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  spotifyLetter: {
    fontSize: 22,
    color: SPOTIFY_GREEN,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  sheetSub: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    marginHorizontal: 20,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  spotifyShadow: {
    borderRadius: 18,
    paddingBottom: 4,
  },
  spotifyBtn: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  spotifyBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  disclaimer: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },

  connectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  connectedTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  connectedSub: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  disconnectBtn: {
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: "900",
  },
});
