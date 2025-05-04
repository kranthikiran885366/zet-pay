
/**
 * @fileOverview Service functions for managing user profile data in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Define a basic user profile structure
export interface UserProfile {
    id: string; // Corresponds to Firebase Auth UID
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    kycStatus?: 'Verified' | 'Not Verified' | 'Pending';
    createdAt: Timestamp; // Use Firestore Timestamp for storage
    updatedAt: Timestamp; // Use Firestore Timestamp for storage
    notificationsEnabled?: boolean; // For app notifications
    biometricEnabled?: boolean; // For app lock preference
    appLockEnabled?: boolean; // General app lock setting

    // Zet Pay Smart Wallet Bridge Fields
    isSmartWalletBridgeEnabled?: boolean; // User preference to enable/disable the feature
    smartWalletBridgeLimit?: number; // Max amount per fallback transaction (e.g., 5000)

     // Add other profile fields as needed
     defaultPaymentMethod?: 'upi' | 'wallet' | string; // Store default card ID?
     isSeniorCitizenMode?: boolean;
     familyGroupIds?: string[];
}

// Interface for profile data returned to the client (with JS Dates)
export interface UserProfileClient extends Omit<UserProfile, 'createdAt' | 'updatedAt'> {
    createdAt: Date;
    updatedAt: Date;
}


/**
 * Converts Firestore Timestamps in profile data to JS Date objects for client-side use.
 */
function convertTimestampsToDates(data: any): any {
    const convertedData = { ...data };
    if (convertedData.createdAt instanceof Timestamp) {
        convertedData.createdAt = convertedData.createdAt.toDate();
    }
    if (convertedData.updatedAt instanceof Timestamp) {
        convertedData.updatedAt = convertedData.updatedAt.toDate();
    }
    // Convert other Timestamp fields if added later
    return convertedData;
}

/**
 * Retrieves the user profile data for the currently logged-in user from Firestore.
 * Returns data with JS Date objects.
 *
 * @returns A promise that resolves to the UserProfileClient object or null if not found or not logged in.
 */
export async function getCurrentUserProfile(): Promise<UserProfileClient | null> {
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
            const profileWithDates = convertTimestampsToDates(data);
            return {
                id: userDocSnap.id,
                ...profileWithDates,
                // Provide defaults for fields if they might be missing from older documents
                kycStatus: data.kycStatus ?? 'Not Verified',
                notificationsEnabled: data.notificationsEnabled ?? true,
                biometricEnabled: data.biometricEnabled ?? false,
                appLockEnabled: data.appLockEnabled ?? false,
                isSmartWalletBridgeEnabled: data.isSmartWalletBridgeEnabled ?? false,
                smartWalletBridgeLimit: data.smartWalletBridgeLimit ?? 5000,
                isSeniorCitizenMode: data.isSeniorCitizenMode ?? false,
                familyGroupIds: data.familyGroupIds ?? [],
            } as UserProfileClient;
        } else {
            console.log("No profile document found for user:", userId);
            return null; // Or potentially create a default profile here upon first login attempt
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw new Error("Could not fetch user profile.");
    }
}

/**
 * Creates or updates a user profile document in Firestore.
 * Uses the currently authenticated user's ID. Ensures required fields are present.
 * Automatically handles `createdAt` and `updatedAt` timestamps.
 *
 * @param profileData Partial profile data. For creation, `name` and `email` are needed.
 * @returns A promise that resolves when the operation is complete.
 */
export async function upsertUserProfile(profileData: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>> & { name?: string, email?: string }): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to update profile.");
    }

    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    try {
        const userDocSnap = await getDoc(userDocRef);
        const now = serverTimestamp();

        // Prepare data, removing any undefined fields explicitly
        const cleanedProfileData: any = {};
        for (const key in profileData) {
            if (profileData[key as keyof typeof profileData] !== undefined) {
                cleanedProfileData[key] = profileData[key as keyof typeof profileData];
            }
        }

        if (userDocSnap.exists()) {
            // Update existing profile
            await updateDoc(userDocRef, {
                ...cleanedProfileData,
                updatedAt: now, // Update the timestamp
            });
            console.log(`User profile updated for ${userId}`);
        } else {
            // Create new profile - Ensure required fields are present
            if (!cleanedProfileData.name || !cleanedProfileData.email) {
                 throw new Error("Name and email are required to create a new profile.");
            }
            const createData = {
                // Include all required fields and defaults
                name: cleanedProfileData.name,
                email: cleanedProfileData.email,
                phone: cleanedProfileData.phone ?? null,
                avatarUrl: cleanedProfileData.avatarUrl ?? null,
                kycStatus: cleanedProfileData.kycStatus ?? 'Not Verified',
                notificationsEnabled: cleanedProfileData.notificationsEnabled ?? true,
                biometricEnabled: cleanedProfileData.biometricEnabled ?? false,
                appLockEnabled: cleanedProfileData.appLockEnabled ?? false,
                isSmartWalletBridgeEnabled: cleanedProfileData.isSmartWalletBridgeEnabled ?? false,
                smartWalletBridgeLimit: cleanedProfileData.smartWalletBridgeLimit ?? 5000,
                isSeniorCitizenMode: cleanedProfileData.isSeniorCitizenMode ?? false,
                familyGroupIds: cleanedProfileData.familyGroupIds ?? [],
                createdAt: now, // Use server timestamp for creation
                updatedAt: now,
            };
            await setDoc(userDocRef, createData);
            console.log(`User profile created for ${userId}`);
        }
    } catch (error) {
        console.error("Error creating/updating user profile:", error);
        throw new Error("Could not save user profile.");
    }
}


/**
 * Fetches a specific user's profile by their ID from Firestore.
 * Returns data with JS Date objects.
 *
 * @param userId The ID of the user whose profile is needed.
 * @returns A promise that resolves to the UserProfileClient object or null if not found.
 */
export async function getUserProfileById(userId: string): Promise<UserProfileClient | null> {
     console.log(`Fetching profile for specific user ID: ${userId}`);
     if (!userId) return null;

     try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const profileWithDates = convertTimestampsToDates(data);
            return {
                id: userDocSnap.id,
                ...profileWithDates,
                // Provide defaults for fields
                kycStatus: data.kycStatus ?? 'Not Verified',
                isSmartWalletBridgeEnabled: data.isSmartWalletBridgeEnabled ?? false,
                smartWalletBridgeLimit: data.smartWalletBridgeLimit ?? 5000,
            } as UserProfileClient;
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
 * Updates the Smart Wallet Bridge settings for the current user in Firestore.
 *
 * @param settings Partial settings to update (enabled status and/or limit).
 * @returns A promise that resolves when the update is complete.
 */
export async function updateSmartWalletBridgeSettings(settings: Partial<Pick<UserProfile, 'isSmartWalletBridgeEnabled' | 'smartWalletBridgeLimit'>>): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to update settings.");
    }
    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    // Filter out undefined values from settings
    const updateData: any = {};
    if (settings.isSmartWalletBridgeEnabled !== undefined) {
        updateData.isSmartWalletBridgeEnabled = settings.isSmartWalletBridgeEnabled;
    }
    if (settings.smartWalletBridgeLimit !== undefined) {
        // Add validation for limit if needed (e.g., positive number)
        updateData.smartWalletBridgeLimit = settings.smartWalletBridgeLimit;
    }

    if (Object.keys(updateData).length === 0) {
        console.log("No valid Smart Wallet Bridge settings provided for update.");
        return; // No changes to apply
    }


    console.log(`Updating Smart Wallet Bridge settings for user ${userId}:`, updateData);
    try {
         // Check if document exists before updating, or use set with merge:true if creation is desired
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            // Profile should have been created on signup, so this is an error state
             console.error(`User profile ${userId} does not exist. Cannot update settings.`);
             throw new Error("User profile not found. Cannot update settings.");
        } else {
            await updateDoc(userDocRef, {
                ...updateData,
                updatedAt: serverTimestamp(), // Always update the timestamp
            });
            console.log("Smart Wallet Bridge settings updated successfully.");
        }
    } catch (error) {
        console.error("Error updating Smart Wallet Bridge settings:", error);
        throw new Error("Could not update settings.");
    }
}

/**
 * Updates general user settings like notifications, biometrics, app lock.
 *
 * @param settings Partial settings containing boolean flags.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateGeneralSettings(settings: Partial<Pick<UserProfile, 'notificationsEnabled' | 'biometricEnabled' | 'appLockEnabled'>>): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to update settings.");
    }
    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    // Filter out undefined values
    const updateData: any = {};
    if (settings.notificationsEnabled !== undefined) updateData.notificationsEnabled = settings.notificationsEnabled;
    if (settings.biometricEnabled !== undefined) updateData.biometricEnabled = settings.biometricEnabled;
    if (settings.appLockEnabled !== undefined) updateData.appLockEnabled = settings.appLockEnabled;


    if (Object.keys(updateData).length === 0) {
        console.log("No general settings provided for update.");
        return;
    }

    console.log(`Updating general settings for user ${userId}:`, updateData);
    try {
        const userDocSnap = await getDoc(userDocRef);
         if (!userDocSnap.exists()) {
             throw new Error("User profile not found.");
         }
        await updateDoc(userDocRef, {
            ...updateData,
            updatedAt: serverTimestamp(),
        });
        console.log("General settings updated successfully.");
    } catch (error) {
        console.error("Error updating general settings:", error);
        throw new Error("Could not update settings.");
    }
}
