import React, { useState, useEffect } from "react";
// Add Platform to the import list below
import { View, Text, Switch, Pressable, ScrollView, Platform } from "react-native"; 
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Preferences() {
  const router = useRouter();
  const [switches, setSwitches] = useState({ sound: true, haptic: true, listening: true });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem("user_prefs");
      if (saved) setSwitches(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load settings.");
    }
  };

  const toggleSwitch = async (key: string, val: boolean) => {
    // Fixed: changed 'v' to 'val' to match the parameter
    const updated = { ...switches, [key]: val }; 
    setSwitches(updated);
    try {
      await AsyncStorage.setItem("user_prefs", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save settings.");
    }
  };

  const Row = ({ label, val, keyId }: { label: string, val: boolean, keyId: string }) => (
    <View style={{ 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: 16, 
      backgroundColor: '#FFF', 
      borderBottomWidth: 1, 
      borderBottomColor: '#EEE' 
    }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111' }}>{label}</Text>
      <Switch 
        trackColor={{ false: "#E5E5E5", true: "#2F6BFF" }}
        // Platform is now imported, so this won't crash
        thumbColor={Platform.OS === 'ios' ? undefined : '#FFF'} 
        value={val} 
        onValueChange={(v) => toggleSwitch(keyId, v)} 
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA' }} edges={['top']}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 16, 
        backgroundColor: '#FFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEE' 
      }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={{ marginLeft: 20, fontSize: 18, fontWeight: '800', color: '#111' }}>Preferences</Text>
      </View>

      <ScrollView>
        <Text style={{ padding: 16, color: '#AAA', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>
          Learning Experience
        </Text>
        <Row label="Sound Effects" val={switches.sound} keyId="sound" />
        <Row label="Haptic Feedback" val={switches.haptic} keyId="haptic" />
        <Row label="Listening Exercises" val={switches.listening} keyId="listening" />
      </ScrollView>
    </SafeAreaView>
  );
}
