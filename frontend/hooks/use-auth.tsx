import { auth, db } from "@/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
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

export function useAuth(): [User | undefined | null, UserProfile | undefined] {
  const [user, setUser] = useState<undefined | null | User>(undefined);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const unsub = useRef<Unsubscribe | undefined>(undefined);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (userData) => {
      // IMPORTANT: clean up previous listener
      unsub.current?.();
      unsub.current = undefined;
      setProfile(undefined);

      if (userData) {
        setUser(userData);
        const uid = userData.uid;

        unsub.current = onSnapshot(
          doc(db, "users", uid),
          (snap) => {
            setProfile(snap.data() as UserProfile);
          },
          (err) => {
            // This is where your screenshot error will land (permission-denied, etc.)
            console.warn("Firestore snapshot listener error:", err);
            // Optional: keep user signed-in but show no profile
            setProfile(undefined);
          }
        );
      } else {
        setUser(null);
      }
    });

    return () => {
      unsub.current?.();
      unsubscribeAuth();
    };
  }, []);

  return [user, profile];
}