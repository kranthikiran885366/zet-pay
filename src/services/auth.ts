
/**
 * @fileOverview Service functions for authentication using Firebase.
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
import { upsertUserProfile } from './user'; // To create profile on signup

// --- Auth State Observation ---

/**
 * Subscribes to Firebase Authentication state changes.
 *
 * @param callback Function to call when the auth state changes. It receives the User object or null.
 * @returns An unsubscribe function to stop listening.
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  console.log("Subscribing to auth state changes...");
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed, user:", user?.uid || 'null');
    callback(user);
  });
  return unsubscribe;
}

// --- Core Auth Actions ---

/**
 * Logs the user in using Firebase Email/Password Authentication.
 *
 * @param email User's email.
 * @param password User's password.
 * @returns A promise that resolves to the logged-in User object.
 * @throws Error if login fails.
 */
export async function login(email: string, password: string): Promise<User> {
    console.log(`Attempting login for email: ${email}`);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Firebase login successful for:", userCredential.user.uid);
        return userCredential.user;
    } catch (error: any) {
        console.error("Firebase login error:", error.code, error.message);
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
 * Creates a basic user profile document in Firestore upon successful signup.
 *
 * @param name User's full name.
 * @param email User's email.
 * @param password User's password (must be >= 6 characters).
 * @returns A promise that resolves to the newly created User object.
 * @throws Error if signup fails.
 */
export async function signup(name: string, email: string, password: string): Promise<User> {
    console.log(`Attempting signup for email: ${email}`);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Firebase signup successful for:", user.uid);

        // Create initial user profile in Firestore
        // Ensure upsertUserProfile handles both creation and update safely
        await upsertUserProfile({ name, email }); // Pass required fields
        console.log(`Initial user profile created/updated for ${user.uid}`);

        return user;
    } catch (error: any) {
        console.error("Firebase signup error:", error.code, error.message);
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
    console.log(`Sending password reset email to: ${email}`);
    try {
        await sendPasswordResetEmail(auth, email);
        console.log("Password reset email sent successfully.");
    } catch (error: any) {
        console.error("Password reset error:", error.code, error.message);
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
    console.log("Logging out user via Firebase...");
    try {
        await signOut(auth);
        console.log("Firebase logout successful.");
        // Additional client-side cleanup (e.g., clearing user state in context/zustand)
        // should be handled by the component initiating the logout.
    } catch (error) {
        console.error("Firebase logout error:", error);
        // Re-throw the error so the calling component can handle it (e.g., show toast)
        throw new Error("Logout failed. Please try again.");
    }
}
