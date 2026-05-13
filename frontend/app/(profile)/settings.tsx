import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  const MenuItem = ({ label, target }: { label: string, target: string }) => (
    <Pressable 
      onPress={() => router.push(target as any)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
        backgroundColor: pressed ? '#F5F5F5' : '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
      })}
    >
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#111' }}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
        <Pressable onPress={() => router.back()}><Ionicons name="close" size={28} color="#111" /></Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', marginRight: 28 }}>Settings</Text>
      </View>

      <ScrollView>
        <Text style={{ padding: 16, fontSize: 13, fontWeight: '800', color: '#AAA' }}>ACCOUNT</Text>
        <MenuItem label="Preferences" target="/(profile)/settings/preferences" />
        <MenuItem label="Profile" target="/(profile)/settings/profile-edit" />
        <MenuItem label="Notifications" target="/(profile)/settings/notifications" />
        <MenuItem label="Linked Accounts" target="/(profile)/settings/linked" />
        <MenuItem label="Privacy Settings" target="/(profile)/settings/privacy" />
      </ScrollView>
    </SafeAreaView>
  );
}
