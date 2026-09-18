import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAY7VVFotegNS8GlpFY-5DzrDrkQpIG454",
  authDomain: "comprasplus-c2402.firebaseapp.com",
  projectId: "comprasplus-c2402",
  storageBucket: "comprasplus-c2402.firebasestorage.app",
  messagingSenderId: "1052225778682",
  appId: "1:1052225778682:web:96126783cd5407c891ea43"
};

export const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;
