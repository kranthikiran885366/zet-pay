
const admin = require('firebase-admin');

try {
    if (!admin.apps.length) {
        console.log("Initializing Firebase Admin SDK...");
        let serviceAccount;

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Option 1: Use Service Account Key file path
            serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
             admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Add storage bucket if using Storage Admin SDK
            });
             console.log("Firebase Admin SDK initialized using Service Account file.");
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            // Option 2: Use environment variables (ensure private key format is correct)
             const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
             admin.initializeApp({
                 credential: admin.credential.cert({
                     projectId: process.env.FIREBASE_PROJECT_ID,
                     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                     privateKey: privateKey,
                 }),
                 storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Add storage bucket
             });
            console.log("Firebase Admin SDK initialized using environment variables.");
        } else {
             console.warn("Firebase Admin SDK credentials not found. Attempting default initialization (may fail without proper setup)...");
             admin.initializeApp({ // Try default initialization (e.g., for Google Cloud environments)
                 storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Add storage bucket
             });
             console.log("Firebase Admin SDK initialized using default app credentials.");
        }
    } else {
        console.log("Firebase Admin SDK already initialized.");
    }
} catch (error) {
    console.error("FATAL: Error initializing Firebase Admin SDK:", error);
    console.error("Ensure you have set either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.");
    console.error("Also ensure FIREBASE_STORAGE_BUCKET is set if using Firebase Storage.");
    // Exit process if Firebase Admin is critical
    process.exit(1);
}

const db = admin.firestore();
const authAdmin = admin.auth();
const storageAdmin = admin.storage(); // Initialize Storage Admin SDK

module.exports = { admin, db, authAdmin, storageAdmin }; // Export all necessary components

