
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

// Use environment variables if available, otherwise fallback to user-provided config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || userProvidedConfig.apiKey,
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
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized with effective config:", firebaseConfig);
  } else {
    app = getApps()[0];
    console.log("Firebase app already initialized.");
  }

  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Analytics only if measurementId is available and valid
  if (firebaseConfig.measurementId && firebaseConfig.measurementId.startsWith('G-')) {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } catch (error) {
      console.error("Error initializing Firebase Analytics:", error);
    }
  } else {
    console.warn("Firebase Analytics not initialized: measurementId is missing or invalid in firebaseConfig. Expected format 'G-XXXXXXXXXX'. Found:", firebaseConfig.measurementId);
  }

} else {
  // Handle server-side initialization or placeholder if needed,
  // though client-side Firebase is primary for this file.
  // This check prevents errors during server-side rendering or build.
  // @ts-ignore TODO: fix this
  app = null; 
  // @ts-ignore TODO: fix this
  auth = null;
  // @ts-ignore TODO: fix this
  db = null;
}


/**
 * Retrieves the Firebase Auth ID token for the current user.
 * @param forceRefresh Force refresh the token. Defaults to false.
 * @returns A promise that resolves with the ID token string, or null if no user is logged in.
 */
async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    // Ensure auth is initialized
    if (!auth || !auth.currentUser) {
        console.warn("[getIdToken] Auth or currentUser is not available. User might be logged out or Firebase not fully initialized on client.");
        return null;
    }
    const user = auth.currentUser;
    try {
        const token = await getFirebaseIdToken(user, forceRefresh);
        return token;
    } catch (error) {
        console.error("Error getting Firebase ID token:", error);
        // Handle error appropriately, maybe sign the user out
        // await auth.signOut();
        return null;
    }
}


export { app, auth, db, analytics, getIdToken }; // Export getIdToken and analytics

    

