import { Stack } from "expo-router";
import { useEffect } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  useEffect(() => {
    AsyncStorage.getItem("earquest-theme").then((val) => {
      if (val === "dark" || val === "light") {
        Appearance.setColorScheme(val);
      }
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
