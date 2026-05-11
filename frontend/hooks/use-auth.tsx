import { auth, db } from "@/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, Timestamp, Unsubscribe } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

export type UserProfile = {
  currentXp: number;
  email: string;
  firstName: string;
  lastName: string;
  level: number;
  streak: number;
  uid: string;
  profilePicture: string;
};

export type UserProgress = {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: Timestamp;
  exercisesCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  weeklyCompletedDays: number[];
}

export type UseAuthInfo = {
  user: User | null | undefined,
  profile: UserProfile | undefined,
  progress: UserProgress | undefined
}

export function useAuth(): UseAuthInfo {
  const [user, setUser] = useState<undefined | null | User>(undefined);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [progress, setProgress] = useState<UserProgress | undefined>(undefined)
  const unsubProfile = useRef<Unsubscribe | undefined>(undefined);
  const unsubProgress = useRef<Unsubscribe | undefined>(undefined)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (userData) => {
      // IMPORTANT: clean up previous listener
      clearListeners()

      if (userData) {
        setUser(userData);
        const uid = userData.uid;
        listenProfile(uid)
        listenProgress(uid)
      } 
      else {
        setUser(null);
        setProfile(undefined)
        setProgress(undefined)
      }
    });

    return () => {
      clearListeners()
      unsubscribeAuth();
    };
  }, []);

  return {
    "user": user, 
    "profile": profile, 
    "progress": progress
  };

  function clearListeners() {
    unsubProfile.current?.()
    unsubProgress.current?.()
  }

  function listenProfile(uid: string) {
    unsubProfile.current = onSnapshot( doc(db, "users", uid),
      (snap) => {
        setProfile(snap.data() as UserProfile);
      },
      (err) => {
        // This is where your screenshot error will land (permission-denied, etc.)
        console.warn("Firestore snapshot listener error on profile doc:", err);
        // Optional: keep user signed-in but show no profile
        setProfile(undefined);
      }
    );
  }

  function listenProgress(uid: string) {
    unsubProgress.current = onSnapshot(
      doc(db, "progress", uid),
      (snap) => {
        setProgress(snap.data() as UserProgress);
      },
      (err) => {
        console.warn("Firestore snapshot listener error on progress doc:", err);
      }
    )
  }
}