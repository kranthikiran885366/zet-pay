
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, getIdToken as getFirebaseIdToken, User } from 'firebase/auth'; // Import User type and getIdToken
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from "firebase/analytics"; // Added Analytics

// User-provided Firebase configuration. This will be used directly.
const userProvidedConfig = {
  apiKey: "AIzaSyDmTwsxQyZsx27XnL8-12neJpE2xo_1988",
  authDomain: "zepto-app-e24e9.firebaseapp.com",
  projectId: "zepto-app-e24e9",
  storageBucket: "zepto-app-e24e9.firebasestorage.app",
  messagingSenderId: "791189785756",
  appId: "1:791189785756:web:3fc5bcf88667ae08407159",
  measurementId: "G-06L18DPJ3Q"
};

// Directly use the user-provided config.
// If environment variables (e.g., NEXT_PUBLIC_FIREBASE_API_KEY) are set in .env,
// they will be IGNORED by this client-side setup.
// The user must ensure the values in `userProvidedConfig` are correct for their Firebase project.
const firebaseConfig = {
  apiKey: userProvidedConfig.apiKey,
  authDomain: userProvidedConfig.authDomain,
  projectId: userProvidedConfig.projectId,
  storageBucket: userProvidedConfig.storageBucket,
  messagingSenderId: userProvidedConfig.messagingSenderId,
  appId: userProvidedConfig.appId,
  measurementId: userProvidedConfig.measurementId,
};

// Log which config is being used
if (typeof window !== 'undefined') {
  console.log(`[Firebase Setup] Initializing Firebase client. Using explicitly provided config. API Key (masked): ${firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 4) + "..." + firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4) : "N/A"}`);
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== userProvidedConfig.apiKey) {
      console.warn("[Firebase Setup] Note: Environment variable NEXT_PUBLIC_FIREBASE_API_KEY is set but IS NOT being used for client-side config. Using the hardcoded values from `userProvidedConfig` in `src/lib/firebase.ts` instead.");
  } else if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.info("[Firebase Setup] Note: NEXT_PUBLIC_FIREBASE_API_KEY environment variable is not set. Using hardcoded values from `userProvidedConfig` in `src/lib/firebase.ts`.");
  }
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
      console.log("[Firebase Setup] Firebase initialized successfully with provided config.");
    } catch (e: any) {
      console.error("[Firebase Setup] CRITICAL: Firebase initialization failed:", e.message, "Config used:", firebaseConfig);
      // Consider adding a UI notification for critical failure
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = "position:fixed;top:0;left:0;width:100%;padding:10px;background:red;color:white;text-align:center;z-index:9999;";
      errorDiv.innerText = "Error: Could not initialize Firebase. App may not work correctly. Please check console (F12).";
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
