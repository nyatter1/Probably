import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBTc_IbTZFmUxFvxJriGrCrjtHVjdKdhO8",
  authDomain: "revix-ec415.firebaseapp.com",
  projectId: "revix-ec415",
  storageBucket: "revix-ec415.firebasestorage.app",
  messagingSenderId: "504318783779",
  appId: "1:504318783779:web:8ee3b23afac75d2d0d9c96",
  measurementId: "G-NHQLCR4TRQ"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfileData {
  uid: string;
  username: string;
  displayName: string;
  birthday?: string;
  gender?: string;
  avatarColors?: {
    head: string;
    torso: string;
    leftArm: string;
    rightArm: string;
    leftLeg: string;
    rightLeg: string;
  };
  activeShirtUrl?: string | null;
  activePantsUrl?: string | null;
  equippedBackgroundId?: string | null;
  ownedClothing?: string[];
  ownedBackgrounds?: string[];
  bio?: string;
  createdAt: string;
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  onSnapshot,
};
export type { User };
