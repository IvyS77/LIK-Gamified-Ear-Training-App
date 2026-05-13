import React, { useState, useEffect } from "react";
import { View, Text, Switch, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const router = useRouter();
  const [privacy, setPrivacy] = useState({ analytics: true, location: false });

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("user_privacy");
      if (saved) setPrivacy(JSON.parse(saved));
    })();
  }, []);

  const toggle = async (key: string, val: boolean) => {
    const updated = { ...privacy, [key]: v };
    setPrivacy(updated);
    await AsyncStorage.setItem("user_privacy", JSON.stringify(updated));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA' }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
        <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></Pressable>
        <Text style={{ marginLeft: 20, fontSize: 18, fontWeight: '800' }}>Privacy Settings</Text>
      </View>
      <ScrollView>
        <Text style={{ padding: 16, fontSize: 13, fontWeight: '800', color: '#AAA' }}>DATA & PRIVACY</Text>
        <View style={{ backgroundColor: '#FFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '600' }}>Usage Analytics</Text></View>
            <Switch trackColor={{ true: "#2F6BFF" }} value={privacy.analytics} onValueChange={(v) => toggle('analytics', v)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '600' }}>Location Services</Text></View>
            <Switch trackColor={{ true: "#2F6BFF" }} value={privacy.location} onValueChange={(v) => toggle('location', v)} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
