
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Placeholder configuration. 
// LOCALDE ÇALIŞIRKEN KENDİ API KEYLERİNİZİ BURAYA YAZINIZ.
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "expense-tracker-1dc73.firebaseapp.com",
  databaseURL: "https://expense-tracker-1dc73-default-rtdb.firebaseio.com",
  projectId: "expense-tracker-1dc73",
  storageBucket: "expense-tracker-1dc73.firebasestorage.app",
  messagingSenderId: "523163959305",
  appId: "1:523163959305:web:d034cbfd632658f572b8d8",
  measurementId: "G-GX1V6DFQ9K"
};

// Initialize app
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
