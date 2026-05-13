import React, { useState } from "react";
import { View, Text, Switch, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function LinkedAccounts() {
  const router = useRouter();
  const [linked, setLinked] = useState({ apple: true, google: false });

  const Row = ({ icon, label, val, keyId, color }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
      <Ionicons name={icon} size={24} color={color} style={{ marginRight: 15 }} />
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      <Switch value={val} onValueChange={(v) => setLinked({...linked, [keyId]: v})} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
       <View style={{ padding: 50, backgroundColor: '#FFF' }}>
        <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></Pressable>
      </View>
      <Text style={{ padding: 16, color: '#AAA', fontWeight: '800' }}>LINKED ACCOUNTS</Text>
      <Row icon="logo-apple" label="Apple" val={linked.apple} keyId="apple" color="#000" />
      <Row icon="logo-google" label="Google" val={linked.google} keyId="google" color="#EA4335" />
    </View>
  );
}
