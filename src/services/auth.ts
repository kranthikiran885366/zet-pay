/**
 * @fileOverview Service functions for authentication using Firebase, interacting with the backend API.
 */
import {
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged, // To observe auth state
    User // Import User type
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import initialized Firebase auth instance
import { apiClient } from '@/lib/apiClient'; // Import API client
import type { UserProfile } from './types'; // Import shared types

// --- Auth State Observation ---

/**
 * Subscribes to Firebase Authentication state changes.
 *
 * @param callback Function to call when the auth state changes. It receives the User object or null.
 * @returns An unsubscribe function to stop listening.
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  console.log("[Auth Service] Subscribing to auth state changes...");
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log("[Auth Service] Auth state changed, user:", user?.uid || 'null');
    callback(user);
  });
  return unsubscribe;
}

// --- Core Auth Actions ---

/**
 * Logs the user in using Firebase Email/Password Authentication.
 * Verifies token with backend after successful Firebase login.
 *
 * @param email User's email.
 * @param password User's password.
 * @returns A promise that resolves to the logged-in User object.
 * @throws Error if login fails.
 */
export async function login(email: string, password: string): Promise<User> {
    console.log(`[Auth Service] Attempting login for email: ${email}`);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("[Auth Service] Firebase login successful for:", userCredential.user.uid);
        // Optionally verify token with backend immediately after login if needed
        // await apiClient('/auth/verify'); // Backend infers user from token
        return userCredential.user;
    } catch (error: any) {
        console.error("[Auth Service] Firebase login error:", error.code, error.message);
        // Provide user-friendly error messages
        let errorMessage = "Login failed. Please check your credentials.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Invalid email or password.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Too many login attempts. Please try again later or reset your password.";
        }
        throw new Error(errorMessage);
    }
}

/**
 * Signs up a new user with Firebase Email/Password Authentication.
 * Backend handles profile creation via token verification on first protected route access or explicitly.
 *
 * @param name User's full name.
 * @param email User's email.
 * @param password User's password (must be >= 6 characters).
 * @returns A promise that resolves to the newly created User object.
 * @throws Error if signup fails.
 */
export async function signup(name: string, email: string, password: string): Promise<User> {
    console.log(`[Auth Service] Attempting signup for email: ${email}`);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("[Auth Service] Firebase signup successful for:", user.uid);

        // Backend will typically create the profile on the first authenticated API call
        // (like fetching profile) or you could explicitly call a backend signup endpoint.
        // For simplicity, we assume the backend handles profile creation via token verification.
        // Example explicit call (if backend has POST /api/auth/signup):
        // await apiClient('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email }) });

        return user;
    } catch (error: any) {
        console.error("[Auth Service] Firebase signup error:", error.code, error.message);
        let errorMessage = "Signup failed. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already registered.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Password is too weak. Please use at least 6 characters.";
        }
        throw new Error(errorMessage);
    }
}


/**
 * Sends a password reset email using Firebase Authentication.
 *
 * @param email The email address to send the reset link to.
 * @returns A promise that resolves when the email is sent.
 * @throws Error if sending fails.
 */
export async function sendPasswordReset(email: string): Promise<void> {
    console.log(`[Auth Service] Sending password reset email to: ${email}`);
    try {
        await sendPasswordResetEmail(auth, email);
        console.log("[Auth Service] Password reset email sent successfully.");
    } catch (error: any) {
        console.error("[Auth Service] Password reset error:", error.code, error.message);
        let errorMessage = "Failed to send password reset email.";
        if (error.code === 'auth/user-not-found') {
             errorMessage = "No account found with this email address.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        }
        throw new Error(errorMessage);
    }
}


/**
 * Logs the user out using Firebase Authentication.
 *
 * @returns A promise that resolves when logout is complete.
 */
export async function logout(): Promise<void> {
    console.log("[Auth Service] Logging out user via Firebase...");
    try {
        await signOut(auth);
        console.log("[Auth Service] Firebase logout successful.");
        // Additional client-side cleanup (e.g., clearing user state in context/zustand)
        // should be handled by the component initiating the logout.
    } catch (error) {
        console.error("[Auth Service] Firebase logout error:", error);
        // Re-throw the error so the calling component can handle it (e.g., show toast)
        throw new Error("Logout failed. Please try again.");
    }
}

/**
 * Fetches the current user's profile data after verifying the auth token with the backend.
 * This ensures the backend has potentially created/updated the profile based on the auth token.
 *
 * @returns A promise resolving to the UserProfile object or null if not authenticated/error.
 */
export async function verifyTokenAndGetProfile(): Promise<UserProfile | null> {
    console.log("[Auth Service] Verifying token and fetching profile via API...");
    try {
        // The '/auth/verify' endpoint expects a valid Firebase ID token in the Authorization header.
        // apiClient automatically includes the token.
        // The backend controller verifies the token and returns the user's profile data.
        const result = await apiClient<{ user: UserProfile }>('/auth/verify');
        if (result && result.user) {
            console.log("[Auth Service] Token verified, profile received:", result.user.uid);
             // Convert dates if needed
            return {
                ...result.user,
                createdAt: result.user.createdAt ? new Date(result.user.createdAt) : undefined,
                updatedAt: result.user.updatedAt ? new Date(result.updatedAt) : undefined,
            };
        } else {
            throw new Error("Verification failed or user profile not found.");
        }
    } catch (error) {
        console.error("[Auth Service] Error verifying token or fetching profile:", error);
        // Handle specific errors like token expired (often handled by apiClient's 401 error)
        return null; // Return null on verification/fetch error
    }
}
