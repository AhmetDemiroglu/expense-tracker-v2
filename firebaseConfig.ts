
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8tzJ-ByET-_eQD4PyF68uTqLsiaIAhlg",
  authDomain: "expense-tracker-v2-f5a0b.firebaseapp.com",
  projectId: "expense-tracker-v2-f5a0b",
  storageBucket: "expense-tracker-v2-f5a0b.firebasestorage.app",
  messagingSenderId: "774300681132",
  appId: "1:774300681132:web:7a76bc298443638c5b3009",
  measurementId: "G-DW40K8BL6P"
};

// Initialize app
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
