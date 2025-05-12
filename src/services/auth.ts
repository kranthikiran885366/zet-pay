/**
 * @fileOverview Service functions for authentication using Firebase, interacting with the backend API.
 */
import {
    signOut,
    // signInWithEmailAndPassword, // Kept for reference if email/password login is ever re-enabled
    // createUserWithEmailAndPassword, // Kept for reference
    sendPasswordResetEmail,
    onAuthStateChanged,
    User,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    ConfirmationResult,
    updateProfile as updateFirebaseProfile // To update Firebase Auth user profile (name, photoURL)
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiClient } from '@/lib/apiClient';
import type { UserProfile } from './types';
import { upsertUserProfile } from './user'; // Import the client-side user service function

// --- Auth State Observation ---

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  console.log("[Auth Service] Subscribing to auth state changes...");
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log("[Auth Service] Auth state changed, user:", user?.uid || 'null');
    callback(user);
  });
  return unsubscribe;
}

// --- Core Auth Actions ---

export async function sendOtpToPhoneNumber(phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    console.log(`[Auth Service] Sending OTP to phone number: ${phoneNumber}`);
    try {
        // signInWithPhoneNumber will create a user if one doesn't exist with this phone number.
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        console.log("[Auth Service] OTP send initiated successfully. ConfirmationResult received.");
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
        throw new Error(errorMessage);
    }
}

interface VerifyOtpResult {
    user: User;
    isNewUser: boolean;
}

export async function verifyOtpAndSignIn(confirmationResult: ConfirmationResult, otpCode: string): Promise<VerifyOtpResult> {
    console.log(`[Auth Service] Verifying OTP: ${otpCode}`);
    try {
        const userCredential = await confirmationResult.confirm(otpCode);
        const user = userCredential.user;
        console.log("[Auth Service] OTP verified, Firebase login successful for:", user.uid);

        const creationTime = new Date(user.metadata.creationTime!).getTime();
        const lastSignInTime = new Date(user.metadata.lastSignInTime!).getTime();
        // If creationTime and lastSignInTime are very close, it's likely a new user's first sign-in.
        // A small tolerance (e.g., 5000ms) accounts for minor delays.
        const isNewUser = Math.abs(lastSignInTime - creationTime) < 5000;
        console.log(`[Auth Service] User metadata: creationTime=${creationTime}, lastSignInTime=${lastSignInTime}. Is new user: ${isNewUser}`);

        // Ensure backend profile is created/synced
        await verifyTokenAndGetProfile();

        return { user, isNewUser };
    } catch (error: any) {
        console.error("[Auth Service] Firebase OTP verification error:", error.code, error.message);
        let errorMessage = "Login failed. Please check the OTP and try again.";
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = "Invalid OTP. Please try again.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage = "The OTP has expired. Please request a new one.";
        }
        throw new Error(errorMessage);
    }
}

/**
 * Updates the profile for a new user (name, email) in Firebase Auth and Firestore.
 * @param user The Firebase User object.
 * @param name The user's full name.
 * @param email The user's email address.
 * @returns A promise that resolves when the profile is updated.
 */
export async function updateNewUserProfile(user: User, name: string, email: string): Promise<void> {
    console.log(`[Auth Service] Updating profile for new user ${user.uid}: Name=${name}, Email=${email}`);
    try {
        // Update Firebase Auth profile (displayName, email)
        await updateFirebaseProfile(user, { displayName: name, /* email can't be updated directly here if not primary, consider email verification flow */ });
        console.log("[Auth Service] Firebase Auth profile updated with name.");

        // Update Firestore profile via upsertUserProfile (which calls backend)
        await upsertUserProfile({ name, email, phone: user.phoneNumber || undefined }); // Pass phone number from auth if available
        console.log("[Auth Service] Firestore profile updated via user service.");

    } catch (error: any) {
        console.error("[Auth Service] Error updating new user profile:", error);
        throw new Error(error.message || "Could not update user profile.");
    }
}


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

export async function verifyTokenAndGetProfile(): Promise<UserProfile | null> {
    console.log("[Auth Service] Verifying token and fetching profile via API...");
    try {
        // Ensure API client correctly handles cases where result or result.user might be undefined
        const result = await apiClient<{ user?: UserProfile }>('/auth/verify');
        if (result && result.user) {
            console.log("[Auth Service] Token verified, profile received:", result.user.id);
            return {
                ...result.user,
                createdAt: result.user.createdAt ? new Date(result.user.createdAt as string) : undefined,
                updatedAt: result.user.updatedAt ? new Date(result.user.updatedAt as string) : undefined,
            };
        } else {
            // This indicates an issue with the backend response or API client logic.
            console.warn("[Auth Service] Verification successful but user profile not found in API response.");
            return null;
        }
    } catch (error: any) {
        console.error("[Auth Service] Error verifying token or fetching profile:", error.message);
        if (error.message === "User not authenticated.") {
            return null;
        }
        // Re-throw other errors for higher-level handling
        throw error;
    }
}

// Kept for reference or future use if email/password sign-up is re-enabled
export async function signup(name: string, email: string, password: string): Promise<User> {
    console.log(`[Auth Service] Attempting signup for email: ${email}`);
    try {
        const { createUserWithEmailAndPassword } = await import('firebase/auth'); // Dynamic import
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("[Auth Service] Firebase signup successful for:", user.uid);
        
        // Update Firebase Auth profile
        await updateFirebaseProfile(user, { displayName: name });
        console.log("[Auth Service] Firebase Auth profile (displayName) updated.");

        // Create/Update Firestore profile via our backend
        await upsertUserProfile({ name, email, phone: user.phoneNumber || undefined });
        console.log("[Auth Service] Firestore profile upserted via user service for new signup.");
        
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
