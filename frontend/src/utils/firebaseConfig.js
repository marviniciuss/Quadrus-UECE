import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration using Vite VITE_ prefix environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "DEVELOPMENT_MOCK_API_KEY_REPLACE_IN_PRODUCTION",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "quadrus-uece.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "quadrus-uece",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "quadrus-uece.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:123456abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

export { app, auth };
export default firebaseConfig;
