
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, getIdToken as getFirebaseIdToken, User } from 'firebase/auth'; // Import User type and getIdToken
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from "firebase/analytics"; // Added Analytics

// User-provided Firebase configuration as fallbacks
const userProvidedConfig = {
  apiKey: "AIzaSyDmTwsxQyZsx27XnL8-12neJpE2xo_1988",
  authDomain: "zepto-app-e24e9.firebaseapp.com",
  projectId: "zepto-app-e24e9",
  storageBucket: "zepto-app-e24e9.firebasestorage.app",
  messagingSenderId: "791189785756",
  appId: "1:791189785756:web:3fc5bcf88667ae08407159",
  measurementId: "G-06L18DPJ3Q"
};

// Determine API key source and log it
let apiKeySource = "fallback";
let effectiveApiKey = userProvidedConfig.apiKey;

if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  effectiveApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  apiKeySource = "environment variable (NEXT_PUBLIC_FIREBASE_API_KEY)";
} else {
  console.warn("[Firebase Setup] NEXT_PUBLIC_FIREBASE_API_KEY not found, using hardcoded fallback API key.");
}

const firebaseConfig = {
  apiKey: effectiveApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || userProvidedConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || userProvidedConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || userProvidedConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || userProvidedConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || userProvidedConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || userProvidedConfig.measurementId,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null; // Initialize analytics as null

if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side
  console.log(`[Firebase Setup] Initializing Firebase with API key from: ${apiKeySource}. Key (masked): ${effectiveApiKey ? effectiveApiKey.substring(0, 4) + "..." + effectiveApiKey.substring(effectiveApiKey.length - 4) : "N/A"}`);
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("[Firebase Setup] Firebase initialized successfully.");
    } catch (e: any) {
      console.error("[Firebase Setup] CRITICAL: Firebase initialization failed:", e.message, "Config used:", firebaseConfig);
      // Display a more prominent error to the user if initialization fails
      // For example, by setting a global error state or directly manipulating the DOM
      // This part depends on how you want to handle critical init failures in your UI.
      // For now, we'll just log it heavily.
    }
  } else {
    app = getApps()[0];
    console.log("[Firebase Setup] Firebase app already initialized.");
  }
  // @ts-ignore
  auth = getAuth(app);
  // @ts-ignore
  db = getFirestore(app);
  
  if (firebaseConfig.measurementId && firebaseConfig.measurementId.startsWith('G-')) {
    try {
        // @ts-ignore
      analytics = getAnalytics(app);
      console.log("[Firebase Setup] Firebase Analytics initialized");
    } catch (error) {
      console.error("[Firebase Setup] Error initializing Firebase Analytics:", error);
    }
  } else {
    console.warn(`[Firebase Setup] Firebase Analytics not initialized: measurementId is missing or invalid. Expected format 'G-XXXXXXXXXX'. Found: ${firebaseConfig.measurementId}`);
  }

} else {
  // @ts-ignore
  app = null; 
  // @ts-ignore
  auth = null;
  // @ts-ignore
  db = null;
}


/**
 * Retrieves the Firebase Auth ID token for the current user.
 * @param forceRefresh Force refresh the token. Defaults to false.
 * @returns A promise that resolves with the ID token string, or null if no user is logged in.
 */
async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    if (!auth || !auth.currentUser) {
        console.warn("[getIdToken] Auth or currentUser is not available. User might be logged out or Firebase not fully initialized on client.");
        return null;
    }
    const user = auth.currentUser;
    try {
        const token = await getFirebaseIdToken(user, forceRefresh);
        return token;
    } catch (error) {
        console.error("[getIdToken] Error getting Firebase ID token:", error);
        return null;
    }
}


export { app, auth, db, analytics, getIdToken };
