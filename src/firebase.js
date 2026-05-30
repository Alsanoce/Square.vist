import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqCAPMe0ROdSXzdsuGZZ6PRwmEo6RypSg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "whater-f15d4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "whater-f15d4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "whater-f15d4.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "875744692410",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:875744692410:web:4647c93c7835c61bdc1a83"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
