import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "@/firebaseConfig";
import { useTheme } from "@/hooks/use-theme";
import { Glow } from "@/components/Glow";

function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-email":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "No internet connection. Check your network.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Login failed. Please try again.";
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isDark } = theme;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleLogin = async () => {
    const emailClean = email.trim();
    if (!emailClean || !password) {
      showMessage("Missing fields", "Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, emailClean, password);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      showMessage("Login Error", friendlyAuthError(error?.code ?? ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <Glow accent={theme.accent} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>

            <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.iconRing, { borderColor: theme.border, backgroundColor: theme.soft }]}>
                <View style={[styles.iconTop, { backgroundColor: theme.accent }]}>
                  <Ionicons name="log-in" size={22} color="#FFFFFF" />
                </View>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>Sign in</Text>
              <Text style={[styles.subTitle, { color: theme.subText }]}>
                Welcome back. Let's train your ear.
              </Text>

              {/* Piano key form card */}
              <View style={[styles.pianoCard, { backgroundColor: theme.soft, borderColor: theme.border }]}>
                <View style={[styles.blackNotch, { backgroundColor: isDark ? "#0B0D13" : "#111827" }]} />

                <Text style={[styles.label, { color: theme.subText }]}>Email</Text>
                <TextInput
                  placeholder="Enter email"
                  placeholderTextColor={theme.subText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => { /* focus password */ }}
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Password</Text>
                {/* FIX 2: password visibility toggle */}
                <View style={{ position: "relative" }}>
                  <TextInput
                    placeholder="Enter password"
                    placeholderTextColor={theme.subText}
                    value={password}
                    secureTextEntry={!showPassword}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    returnKeyType="go"                        
                    onSubmitEditing={handleLogin}
                    style={[
                      styles.input,
                      styles.passwordInput,
                      { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                    ]}
                  />
                  <Pressable
                    onPress={() => setShowPassword(v => !v)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.subText}
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.primaryShadow,
                    { backgroundColor: theme.primaryDepth, opacity: submitting ? 0.7 : 1 },
                    pressed && { transform: [{ translateY: 2 }] },
                  ]}
                >
                  <View style={[styles.primaryBtn, { backgroundColor: theme.primaryTop }]}>
                    <Text style={[styles.primaryText, { color: theme.primaryText }]}>
                      {submitting ? "Signing in..." : "Sign in"}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(auth)/signup")}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.secondaryText, { color: theme.text }]}>Create account</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  scroll: { paddingTop: 10, paddingBottom: 24 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8 },

  heroCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  iconRing: { width: 72, height: 72, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  iconTop: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },

  title: { marginTop: 12, fontSize: 24, fontWeight: "900", textAlign: "center" },
  subTitle: { marginTop: 8, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },

  pianoCard: { marginTop: 16, borderRadius: 22, borderWidth: 1, padding: 14 },
  blackNotch: { width: 70, height: 14, borderRadius: 8, alignSelf: "center", marginBottom: 12, opacity: 0.9 },

  label: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, fontSize: 16, fontWeight: "700" },
  passwordInput: { paddingRight: 46 },  // make room for eye icon
  eyeBtn: { position: "absolute", right: 14, top: 13 },

  primaryShadow: { borderRadius: 18, paddingBottom: 4, marginTop: 6 },
  primaryBtn: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 15, fontWeight: "900" },

  secondaryBtn: { height: 50, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { fontSize: 15, fontWeight: "900" },
});
