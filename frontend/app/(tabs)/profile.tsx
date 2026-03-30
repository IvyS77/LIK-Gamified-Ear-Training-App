import { auth, backend, uploadImage } from "@/firebaseConfig";
import { useAuth, UserProfile } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [user, profile] = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.profilePicture) {
      setAvatarUri(profile.profilePicture);
    }
  }, [profile?.profilePicture]);

  const colors = useMemo(() => ({
    pageBg: isDark ? "#0B0F14" : "#F5F6FA",
    cardBg: isDark ? "#121922" : "#FFFFFF",
    border: isDark ? "#1F2A37" : "#E2E5EE",
    text: isDark ? "#FFFFFF" : "#111111",
    subText: isDark ? "#A7B0BE" : "#555555",
    muted: isDark ? "#778195" : "#7A7A7A",
    accent: isDark ? "#38BDF8" : "#2F6BFF",
    chip: isDark ? "#0B1220" : "#F1F5FF",
    danger: isDark ? "#FF4B4B" : "#DC2626",
  }), [isDark]);

  async function updateProfile(update: Partial<UserProfile>) {
    try {
      const token = await user?.getIdToken();
      let finalUpdate = { ...update };

      if (update.profilePicture && update.profilePicture !== profile?.profilePicture) {
        const imageId = await uploadImage(update.profilePicture);
        finalUpdate.profilePicture = `https://firebasestorage.googleapis.com/v0/b/ear-training-8f082.firebasestorage.app/o/${imageId}?alt=media`;
        console.log(imageId)
      }

      const response = await fetch(`${backend}/update-profile`, {
        method: "POST",
        body: JSON.stringify({ ...finalUpdate, authToken: token }),
        headers: { "Content-type": "application/json" }
      });
      console.log(response)
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to sync profile changes.");
    }
  }

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission denied", "Allow access in settings.", [
        { text: "Settings", onPress: () => Linking.openSettings() }
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await updateProfile({ profilePicture: uri });
    }
  };

  const Pill = ({ label, value }: { label: string, value: number | string }) => (
    <View style={[styles.pill, { backgroundColor: colors.chip, borderColor: colors.border }]}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

  const StatCard = ({ title, value, icon, target }: any) => (
    <Pressable 
      onPress={() => router.push(target)}
      style={({ pressed }) => [
        styles.statCard, 
        { backgroundColor: colors.cardBg, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: isDark ? "#1A2533" : "#F0F5FF" }]}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{title}</Text>
    </Pressable>
  );

  if (user === undefined) return null;

  if (user === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="person-circle-outline" size={80} color={colors.muted} />
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 20 }}>Guest Mode</Text>
        <Text style={{ color: colors.subText, textAlign: 'center', marginTop: 10 }}>Sign in to track your progress and compete on leaderboards.</Text>
        
        <Pressable 
          onPress={() => router.push("/(auth)/login")}
          style={{ backgroundColor: colors.accent, width: '100%', padding: 16, borderRadius: 14, marginTop: 30, alignItems: 'center' }}
        >
          <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 16 }}>Sign In</Text>
        </Pressable>

        <Pressable 
          onPress={() => router.push("/(auth)/signup")}
          style={{ width: '100%', padding: 16, borderRadius: 14, marginTop: 12, alignItems: 'center', borderWidth: 2, borderColor: colors.border }}
        >
          <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 16 }}>Create Account</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <Pressable onPress={() => router.push("/(profile)/settings")}>
          <Ionicons name="settings-outline" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Pressable onPress={pickAvatar}>
            <View style={[styles.avatarFrame, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={55} color={colors.muted} />
              )}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.accent, borderColor: colors.pageBg }]}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </Pressable>
          
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ""}` : "Ivy Sun"}
          </Text>
          <Text style={{ color: colors.subText, fontSize: 15, marginTop: 4 }}>
            {user.email} · Joined 2026
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 35 }}>
          <Pill label="LEVEL" value={profile?.level ?? 1} />
          <Pill label="XP" value={profile?.currentXp ?? 0} />
          <Pill label="STREAK" value={profile?.streak ?? 0} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistics</Text>
        
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <StatCard 
            title="History" 
            value={profile?.totalSessions ?? "12"} 
            icon="time-outline" 
            target="/(profile)/history" 
          />
          <StatCard 
            title="Accuracy" 
            value={profile?.accuracy ? `${profile.accuracy}%` : "85%"} 
            icon="analytics-outline" 
            target="/(profile)/accuracy" 
          />
        </View>

        <View style={{ height: 40 }} />

        <Pressable 
          onPress={() => signOut(auth)} 
          style={[styles.logoutBtn, { backgroundColor: isDark ? "#2A1014" : "#FFF0F0", borderColor: isDark ? "#4A1B20" : "#FFD0D0" }]}
        >
          <Text style={{ color: colors.danger, fontWeight: "900", fontSize: 16 }}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: "900" },
  avatarFrame: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  avatarImg: { width: "100%", height: "100%" },
  cameraBadge: { position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: "900", marginTop: 15 },
  pill: { flex: 1, borderWidth: 2, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  pillLabel: { fontSize: 11, fontWeight: "800", color: "#7A7A7A" },
  pillValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "900", marginBottom: 15 },
  statCard: { flex: 1, padding: 20, borderRadius: 20, borderWidth: 2, alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  logoutBtn: { padding: 16, borderRadius: 16, alignItems: "center", borderWidth: 2 }
});
