import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your actual Firebase config
  authDomain: "hackprinceton-judging.firebaseapp.com",
  projectId: "hackprinceton-judging",
  storageBucket: "hackprinceton-judging.firebasestorage.app",
  messagingSenderId: "166324752015",
  appId: "1:166324752015:web:11d7855047e03eb36ceafa",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
