/**
 * @fileOverview Service functions for authentication using Firebase.
 */
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import initialized Firebase auth instance

/**
 * Logs the user out using Firebase Authentication.
 *
 * @returns A promise that resolves when logout is complete.
 */
export async function logout(): Promise<void> {
    console.log("Logging out user via Firebase...");
    try {
        await signOut(auth);
        console.log("Firebase logout successful.");
        // Additional client-side cleanup (e.g., clearing user state) might be needed here
        // Redirection should happen in the component calling this service.
    } catch (error) {
        console.error("Firebase logout error:", error);
        // Re-throw the error so the calling component can handle it (e.g., show toast)
        throw new Error("Logout failed. Please try again.");
    }
}

// TODO: Implement login, signup, password reset functions using Firebase Auth as needed.
// e.g., signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail
