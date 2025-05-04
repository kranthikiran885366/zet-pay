
/**
 * @fileOverview Service functions for managing user profile data in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Define a basic user profile structure
export interface UserProfile {
    id: string; // Corresponds to Firebase Auth UID
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    kycStatus?: 'Verified' | 'Not Verified' | 'Pending';
    createdAt: Date;
    updatedAt: Date;
    // Add other profile fields as needed

    // Zet Pay Smart Wallet Bridge Fields
    isSmartWalletBridgeEnabled?: boolean; // User preference to enable/disable the feature
    smartWalletBridgeLimit?: number; // Max amount per fallback transaction (e.g., 5000)
}

/**
 * Retrieves the user profile data for the currently logged-in user.
 * Assumes user is already authenticated via Firebase Auth.
 *
 * @returns A promise that resolves to the UserProfile object or null if not found or not logged in.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to get profile.");
        return null;
    }

    const userId = currentUser.uid;
    console.log(`Fetching profile for user ID: ${userId}`);
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Convert Firestore Timestamps to JS Dates
            return {
                id: userDocSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                // Provide defaults for new fields if they don't exist
                isSmartWalletBridgeEnabled: data.isSmartWalletBridgeEnabled ?? false, // Default disabled
                smartWalletBridgeLimit: data.smartWalletBridgeLimit ?? 5000, // Default limit
            } as UserProfile;
        } else {
            console.log("No profile document found for user:", userId);
            // Optionally create a basic profile if it doesn't exist
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw new Error("Could not fetch user profile.");
    }
}

/**
 * Creates or updates a user profile document in Firestore.
 * Uses the currently authenticated user's ID.
 *
 * @param profileData Partial profile data to update or create. Must include at least email and name for creation.
 * @returns A promise that resolves when the operation is complete.
 */
export async function upsertUserProfile(profileData: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>> & { name: string, email: string }): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to update profile.");
    }

    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    try {
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            // Update existing profile
            await updateDoc(userDocRef, {
                ...profileData,
                updatedAt: serverTimestamp(),
            });
            console.log(`User profile updated for ${userId}`);
        } else {
            // Create new profile
            await setDoc(userDocRef, {
                ...profileData, // Should include name and email
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Set default values for other fields if needed
                kycStatus: 'Not Verified',
                isSmartWalletBridgeEnabled: false, // Default disabled on creation
                smartWalletBridgeLimit: 5000, // Default limit on creation
            });
            console.log(`User profile created for ${userId}`);
        }
    } catch (error) {
        console.error("Error creating/updating user profile:", error);
        throw new Error("Could not save user profile.");
    }
}

/**
 * Fetches a specific user's profile by their ID.
 * (Useful for displaying payee info if only ID is stored initially).
 *
 * @param userId The ID of the user whose profile is needed.
 * @returns A promise that resolves to the UserProfile object or null if not found.
 */
export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
     console.log(`Fetching profile for specific user ID: ${userId}`);
     try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            return {
                id: userDocSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                 // Provide defaults for new fields if they don't exist
                isSmartWalletBridgeEnabled: data.isSmartWalletBridgeEnabled ?? false,
                smartWalletBridgeLimit: data.smartWalletBridgeLimit ?? 5000,
            } as UserProfile;
        } else {
            console.log("No profile document found for user:", userId);
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile by ID:", error);
        throw new Error("Could not fetch user profile.");
    }
}

/**
 * Updates the Smart Wallet Bridge settings for the current user.
 *
 * @param settings Partial settings to update (enabled status and/or limit).
 * @returns A promise that resolves when the update is complete.
 */
export async function updateSmartWalletBridgeSettings(settings: Pick<UserProfile, 'isSmartWalletBridgeEnabled' | 'smartWalletBridgeLimit'>): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to update settings.");
    }
    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    console.log(`Updating Smart Wallet Bridge settings for user ${userId}:`, settings);
    try {
        await updateDoc(userDocRef, {
            ...settings,
            updatedAt: serverTimestamp(),
        });
        console.log("Smart Wallet Bridge settings updated successfully.");
    } catch (error) {
        console.error("Error updating Smart Wallet Bridge settings:", error);
        throw new Error("Could not update settings.");
    }
}
