import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABcguF-gLkoJX2v1S7Q_bPNQaTQQFqfLM",
  authDomain: "myfitnesstracker-b7f16.firebaseapp.com",
  projectId: "myfitnesstracker-b7f16",
  storageBucket: "myfitnesstracker-b7f16.firebasestorage.app",
  messagingSenderId: "187825503361",
  appId: "1:187825503361:web:41a1e79e41a93093526180",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);