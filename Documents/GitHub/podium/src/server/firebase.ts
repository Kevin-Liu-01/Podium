import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_fs467RYrR7HFPfL58YoHK7J3g71iym4",
  authDomain: "hackprinceton-judging.firebaseapp.com",
  projectId: "hackprinceton-judging",
  storageBucket: "hackprinceton-judging.firebasestorage.app",
  messagingSenderId: "166324752015",
  appId: "1:166324752015:web:11d7855047e03eb36ceafa",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
