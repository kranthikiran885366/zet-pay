
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, getIdToken as getFirebaseIdToken, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from "firebase/analytics";

// User-provided Firebase configuration.
const userProvidedConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_FALLBACK_API_KEY", // Use ENV var or fallback
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-project-id.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Validate that essential config values are present
if (userProvidedConfig.apiKey === "YOUR_FALLBACK_API_KEY" || userProvidedConfig.projectId === "your-project-id") {
  if (typeof window !== 'undefined') { // Only log in browser
    console.warn(
      "[Firebase Setup] Using fallback Firebase config values. " +
      "Please ensure your NEXT_PUBLIC_FIREBASE_ environment variables are correctly set in your .env.local file " +
      "or update the hardcoded values in src/lib/firebase.ts for development if preferred."
    );
  }
}

const firebaseConfig = userProvidedConfig;

if (typeof window !== 'undefined') {
  console.log(
    `[Firebase Setup] Initializing Firebase client. Using ${
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "environment variables" : "hardcoded fallback values"
    }. API Key (masked): ${
      firebaseConfig.apiKey
        ? firebaseConfig.apiKey.substring(0, 4) + "..." + firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4)
        : "NOT SET"
    }`
  );
}


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') { 
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("[Firebase Setup] Firebase initialized successfully.");
    } catch (e: any) {
      console.error("[Firebase Setup] CRITICAL: Firebase initialization failed:", e.message, "Config used:", firebaseConfig);
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = "position:fixed;top:0;left:0;width:100%;padding:10px;background:red;color:white;text-align:center;z-index:9999;";
      errorDiv.innerText = "Error: Could not initialize Firebase. App may not work correctly. Please check console (F12) and your Firebase configuration in .env.local or src/lib/firebase.ts.";
      document.body.prepend(errorDiv);
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
