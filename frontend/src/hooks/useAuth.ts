import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = (email: string, password: string) => {
    if (!auth) return Promise.reject(new Error("Firebase not configured"));
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = (email: string, password: string) => {
    if (!auth) return Promise.reject(new Error("Firebase not configured"));
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = () => {
    if (!auth) return Promise.reject(new Error("Firebase not configured"));
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  };

  return { user, loading, loginWithEmail, registerWithEmail, loginWithGoogle, logout };
}
