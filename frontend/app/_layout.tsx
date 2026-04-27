import { useEffect } from "react";
import { Stack } from "expo-router";
import { Linking } from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";

// ─── Spotify token handler ────────────────────────────────────────────────────
// When Spotify redirects back to the app, the URL looks like:
//   eartraining://spotify-callback#access_token=XXX&token_type=Bearer&expires_in=3600
//
// We extract the token, fetch the Spotify user profile, then save to Firestore.

async function handleSpotifyCallback(url: string) {
  if (!url.includes("spotify-callback")) return;

  // Spotify puts the token in the URL *hash* (#), not query params (?)
  const hash = url.split("#")[1];
  if (!hash) return;

  const params = Object.fromEntries(
    hash.split("&").map((pair) => pair.split("="))
  );

  const accessToken = params["access_token"];
  if (!accessToken) return;

  // Fetch Spotify user profile with the token
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const spotifyUser = await res.json();

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Save connection to Firestore
    await setDoc(
      doc(db, "users", uid),
      {
        spotifyConnected: true,
        spotifyDisplayName: spotifyUser.display_name ?? "",
        spotifyAccessToken: accessToken,  // store if you need it later for playback
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Spotify profile fetch failed:", e);
  }
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  useEffect(() => {
    // 1. Handle the case where the app was opened FROM a cold start via the redirect URL
    Linking.getInitialURL().then((url) => {
      if (url) handleSpotifyCallback(url);
    });

    // 2. Handle the case where the app was already open and gets the redirect
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleSpotifyCallback(url);
    });

    return () => subscription.remove();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
