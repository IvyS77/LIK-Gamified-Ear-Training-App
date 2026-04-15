import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const theme = useMemo(() => {
    const accent = "#58CC02";
    return {
      bg: isDark ? "#0F1115" : "#F3F7FF",
      card: isDark ? "#171A21" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#111827",
      subText: isDark ? "rgba(255,255,255,0.72)" : "#6B7280",
      border: isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.08)",
      soft: isDark ? "rgba(255,255,255,0.04)" : "#F7FAFF",
      accent,
      primaryDepth: "#0F172A",
      primaryTop: isDark ? "#FFFFFF" : "#111827",
      primaryText: isDark ? "#000000" : "#FFFFFF",
    };
  }, [isDark]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password || !firstName.trim()) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          level: 1,
          currentXp: 0,
          streak: 0,
          profilePicture: "",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.replace("/(tabs)/profile");
    } catch (e: any) {
      Alert.alert("Signup Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <Glow accent={theme.accent} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]} hitSlop={10}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>

            <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.iconRing, { borderColor: theme.border, backgroundColor: theme.soft }]}>
                <View style={[styles.iconTop, { backgroundColor: theme.accent }]}>
                  <Ionicons name="person-add" size={22} color="#FFFFFF" />
                </View>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>Create account</Text>
              <Text style={[styles.subTitle, { color: theme.subText }]}>
                Your progress will be saved across devices.
              </Text>

              <View style={[styles.pianoCard, { backgroundColor: theme.soft, borderColor: theme.border }]}>
                <View style={[styles.blackNotch, { backgroundColor: isDark ? "#0B0D13" : "#111827" }]} />

                <Text style={[styles.label, { color: theme.subText }]}>First name</Text>
                <TextInput
                  placeholder="First name"
                  placeholderTextColor={theme.subText}
                  value={firstName}
                  onChangeText={setFirstName}
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Last name</Text>
                <TextInput
                  placeholder="Last name (optional)"
                  placeholderTextColor={theme.subText}
                  value={lastName}
                  onChangeText={setLastName}
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Email</Text>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={theme.subText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Password</Text>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={theme.subText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Pressable
                  onPress={handleSignup}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.primaryShadow,
                    { backgroundColor: theme.primaryDepth, opacity: submitting ? 0.7 : 1 },
                    pressed && { transform: [{ translateY: 2 }] },
                  ]}
                >
                  <View style={[styles.primaryBtn, { backgroundColor: theme.primaryTop }]}>
                    {submitting ? (
                      <ActivityIndicator color={theme.primaryText} />
                    ) : (
                      <Text style={[styles.primaryText, { color: theme.primaryText }]}>Create account</Text>
                    )}
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(auth)/login")}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.secondaryText, { color: theme.text }]}>Already have an account? Sign in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Glow({ accent }: { accent: string }) {
  return (
    <View pointerEvents="none" style={styles.glowWrap}>
      <View style={[styles.glow1, { backgroundColor: accent }]} />
      <View style={[styles.glow2, { backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },

  glowWrap: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  glow1: { position: "absolute", width: 340, height: 340, borderRadius: 170, top: -170, left: -100, opacity: 0.16 },
  glow2: { position: "absolute", width: 280, height: 280, borderRadius: 140, top: -150, right: -120, opacity: 0.10 },

  scroll: { paddingTop: 10, paddingBottom: 24 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8 },

  heroCard: { borderRadius: 24, borderWidth: 1, padding: 16 },

  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  iconTop: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },

  title: { marginTop: 12, fontSize: 24, fontWeight: "900", textAlign: "center" },
  subTitle: { marginTop: 8, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },

  pianoCard: { marginTop: 16, borderRadius: 22, borderWidth: 1, padding: 14 },
  blackNotch: { width: 70, height: 14, borderRadius: 8, alignSelf: "center", marginBottom: 12, opacity: 0.9 },

  label: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, fontSize: 16, fontWeight: "700" },

  primaryShadow: { borderRadius: 18, paddingBottom: 4, marginTop: 6 },
  primaryBtn: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 15, fontWeight: "900" },

  secondaryBtn: { borderRadius: 18, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { fontSize: 13, fontWeight: "900", textAlign: "center" },
});