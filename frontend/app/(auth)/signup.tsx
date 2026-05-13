import React, { useRef, useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme"; 
import { Glow } from "@/components/Glow";

function friendlySignupError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "No internet connection. Check your network.";
    default:
      return "Could not create account. Please try again.";
  }
}

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isDark } = theme;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [submitting, setSubmitting] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    const emailClean = email.trim();
    const firstClean = firstName.trim();

    if (!firstClean || !emailClean || !password) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      const cred = await createUserWithEmailAndPassword(auth, emailClean, password);
      const uid = cred.user.uid;

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email: emailClean,
          firstName: firstClean,
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
      Alert.alert("Signup Error", friendlySignupError(e?.code ?? ""));
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
                  autoCapitalize="words"
                  textContentType="givenName"
                  returnKeyType="next"                              // FIX 5
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Last name</Text>
                <TextInput
                  ref={lastNameRef}
                  placeholder="Last name (optional)"
                  placeholderTextColor={theme.subText}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  textContentType="familyName"
                  returnKeyType="next"                              // FIX 5
                  onSubmitEditing={() => emailRef.current?.focus()}
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Email</Text>
                <TextInput
                  ref={emailRef}
                  placeholder="Email"
                  placeholderTextColor={theme.subText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"                              // FIX 5
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.label, { color: theme.subText }]}>Password</Text>
                {/* FIX 4: password show/hide toggle */}
                <View style={{ position: "relative" }}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor={theme.subText}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    returnKeyType="go"                              // FIX 5
                    onSubmitEditing={handleSignup}
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
                  <Text style={[styles.secondaryText, { color: theme.text }]}>
                    Already have an account? Sign in
                  </Text>
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
  passwordInput: { paddingRight: 46 },
  eyeBtn: { position: "absolute", right: 14, top: 13 },

  primaryShadow: { borderRadius: 18, paddingBottom: 4, marginTop: 6 },
  primaryBtn: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 15, fontWeight: "900" },

  secondaryBtn: { borderRadius: 18, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { fontSize: 13, fontWeight: "900", textAlign: "center" },
});
