/**
 * @fileOverview Service functions for authentication using Firebase, interacting with the backend API.
 */
import {
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged, // To observe auth state
    User, // Import User type
    signInWithPhoneNumber, // For phone auth
    RecaptchaVerifier, // For phone auth
    ConfirmationResult // For phone auth
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
 * Sends an OTP to the provided phone number using Firebase Phone Authentication.
 * @param phoneNumber The user's phone number (including country code).
 * @param appVerifier An instance of RecaptchaVerifier.
 * @returns A promise resolving to a ConfirmationResult object.
 * @throws Error if OTP sending fails.
 */
export async function sendOtpToPhoneNumber(phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    console.log(`[Auth Service] Sending OTP to phone number: ${phoneNumber}`);
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        console.log("[Auth Service] OTP sent successfully. ConfirmationResult received.");
        return confirmationResult;
    } catch (error: any) {
        console.error("[Auth Service] Firebase send OTP error:", error.code, error.message);
        let errorMessage = "Failed to send OTP. Please try again.";
        if (error.code === 'auth/invalid-phone-number') {
            errorMessage = "Invalid phone number format. Please include country code (e.g., +91).";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Too many OTP requests. Please try again later.";
        } else if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
            errorMessage = "Firebase API Key is invalid. Please check your Firebase configuration.";
        }
        // Add more specific Firebase error codes as needed
        throw new Error(errorMessage);
    }
}

/**
 * Verifies the OTP and signs in the user.
 * @param confirmationResult The ConfirmationResult object received after sending OTP.
 * @param otpCode The 6-digit OTP code entered by the user.
 * @returns A promise that resolves to the logged-in User object.
 * @throws Error if OTP verification or sign-in fails.
 */
export async function verifyOtpAndSignIn(confirmationResult: ConfirmationResult, otpCode: string): Promise<User> {
    console.log(`[Auth Service] Verifying OTP: ${otpCode}`);
    try {
        const userCredential = await confirmationResult.confirm(otpCode);
        console.log("[Auth Service] OTP verified, Firebase login successful for:", userCredential.user.uid);
        // Trigger profile creation/fetch after successful login
        await verifyTokenAndGetProfile();
        return userCredential.user;
    } catch (error: any) {
        console.error("[Auth Service] Firebase OTP verification error:", error.code, error.message);
        let errorMessage = "Login failed. Please check the OTP and try again.";
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = "Invalid OTP. Please try again.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage = "The OTP has expired. Please request a new one.";
        }
        // Add more specific Firebase error codes
        throw new Error(errorMessage);
    }
}


/* // Original email/password login - kept for reference or potential future use
export async function login(email: string, password: string): Promise<User> {
    console.log(`[Auth Service] Attempting login for email: ${email}`);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("[Auth Service] Firebase login successful for:", userCredential.user.uid);
        await verifyTokenAndGetProfile(); // Verify with backend after successful Firebase login
        return userCredential.user;
    } catch (error: any) {
        console.error("[Auth Service] Firebase login error:", error.code, error.message);
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
*/

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
         // Trigger profile creation/fetch after successful signup
        await verifyTokenAndGetProfile();
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
        } else if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
            errorMessage = "Firebase API Key is invalid. Please check your Firebase configuration.";
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
    } catch (error) {
        console.error("[Auth Service] Firebase logout error:", error);
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
        const result = await apiClient<{ user: UserProfile }>('/auth/verify');
        if (result && result.user) {
            console.log("[Auth Service] Token verified, profile received:", result.user.uid);
            return {
                ...result.user,
                createdAt: result.user.createdAt ? new Date(result.user.createdAt as string) : undefined,
                updatedAt: result.user.updatedAt ? new Date(result.user.updatedAt as string) : undefined,
            };
        } else {
            // This case should ideally be handled by apiClient throwing an error if response.ok is false
            throw new Error("Verification failed or user profile not found in API response.");
        }
    } catch (error: any) {
        console.error("[Auth Service] Error verifying token or fetching profile:", error.message);
        // Avoid throwing "User not authenticated." again if apiClient already did
        if (error.message === "User not authenticated.") {
            return null;
        }
        throw error; // Re-throw other errors
    }
}
