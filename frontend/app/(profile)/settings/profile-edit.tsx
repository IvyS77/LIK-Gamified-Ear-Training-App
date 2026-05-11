import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  Pressable, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileEditScreen() {
  const router = useRouter();
  const {user, profile} = useAuth();

  // Local state for form inputs
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: ""
  });

  // Load initial data from profile or local storage
  useEffect(() => {
    const loadProfileData = async () => {
      const savedData = await AsyncStorage.getItem("temp_profile_data");
      if (savedData) {
        setFormData(JSON.parse(savedData));
      } else if (profile) {
        setFormData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          username: profile.username || user?.email?.split('@')[0] || "",
          email: user?.email || "",
          phone: profile.phone || "",
          password: "••••••••" // Placeholder for security
        });
      }
    };
    loadProfileData();
  }, [profile, user]);

  const handleSave = async () => {
    try {
      // Save to local storage so UI updates immediately
      await AsyncStorage.setItem("temp_profile_data", JSON.stringify(formData));
      
      // Logic for Luigi's eventual API call would go here
      // await updateProfileOnServer(formData);

      Alert.alert("Success", "Profile updated locally.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log("Account deletion requested") }
      ]
    );
  };

  const InputField = ({ label, value, onChange, placeholder, secure = false, type = "default" }: any) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#AAA', marginBottom: 8, textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: '#FFF',
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#EEE',
          fontSize: 16,
          color: '#111'
        }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        secureTextEntry={secure}
        keyboardType={type}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: '#F7F8FA' }}
    >
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingTop: 60, 
        paddingBottom: 16, 
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
      }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#2F6BFF', fontWeight: '600' }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111' }}>Edit Profile</Text>
        <Pressable onPress={handleSave}>
          <Text style={{ fontSize: 16, color: '#2F6BFF', fontWeight: '800' }}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <InputField 
          label="First Name" 
          value={formData.firstName} 
          onChange={(text: string) => setFormData({...formData, firstName: text})} 
        />
        <InputField 
          label="Last Name" 
          value={formData.lastName} 
          onChange={(text: string) => setFormData({...formData, lastName: text})} 
        />
        <InputField 
          label="Username" 
          value={formData.username} 
          onChange={(text: string) => setFormData({...formData, username: text})} 
        />
        <InputField 
          label="Email" 
          value={formData.email} 
          type="email-address"
          onChange={(text: string) => setFormData({...formData, email: text})} 
        />
        <InputField 
          label="Phone Number" 
          value={formData.phone} 
          type="phone-pad"
          onChange={(text: string) => setFormData({...formData, phone: text})} 
        />
        <InputField 
          label="Password" 
          value={formData.password} 
          secure={true}
          onChange={(text: string) => setFormData({...formData, password: text})} 
        />

        <View style={{ height: 20 }} />

        <Pressable 
          onPress={handleDeleteAccount}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backgroundColor: pressed ? '#FFF0F0' : '#FFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#FFE0E0'
          })}
        >
          <Ionicons name="trash-outline" size={20} color="#FF4B4B" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FF4B4B', fontWeight: '700', fontSize: 16 }}>Delete Account</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
