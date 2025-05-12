
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, getIdToken as getFirebaseIdToken, User } from 'firebase/auth'; // Import User type and getIdToken
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from "firebase/analytics"; // Added Analytics

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null; // Initialize analytics as null

if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized");
  } else {
    app = getApps()[0];
    console.log("Firebase app already initialized");
  }

  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Analytics only if measurementId is available
  if (firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } catch (error) {
      console.error("Error initializing Firebase Analytics:", error);
    }
  } else {
    console.warn("Firebase Analytics not initialized: measurementId is missing from firebaseConfig.");
  }

} else {
  // Handle server-side initialization or placeholder if needed,
  // though client-side Firebase is primary for this file.
  // For now, we can leave app, auth, db as potentially uninitialized on server.
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

    
