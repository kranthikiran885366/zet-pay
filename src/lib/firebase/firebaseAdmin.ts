/**
 * @fileOverview Firebase Admin SDK Initialization (Server-side).
 */
import * as admin from 'firebase-admin';

// Ensure Firebase Admin SDK is initialized only once
if (!admin.apps.length) {
    console.log("Initializing Firebase Admin SDK...");
    try {
        let serviceAccount;

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Option 1: Use Service Account Key file path (recommended for local dev)
            serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS); // Use require for JSON
             admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
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
                 })
             });
            console.log("Firebase Admin SDK initialized using environment variables.");
        } else {
             console.warn("Firebase Admin SDK credentials not found in environment variables. Attempting default initialization (may fail without proper setup)...");
             admin.initializeApp(); // Try default initialization (e.g., for Google Cloud environments with ADC)
             console.log("Firebase Admin SDK initialized using default credentials.");
        }
    } catch (error) {
        console.error("FATAL: Error initializing Firebase Admin SDK:", error);
        console.error("Ensure you have set either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.");
        // Exit the process if Firebase Admin is critical for the backend to function
        process.exit(1);
    }
} else {
    console.log("Firebase Admin SDK already initialized.");
}

const db = admin.firestore();
const authAdmin = admin.auth();
const storageAdmin = admin.storage(); // If using Firebase Storage Admin

export { admin, db, authAdmin, storageAdmin };
