/**
 * @fileOverview Service functions for managing user profile data via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { UserProfile } from './types'; // Assuming a shared types file or import from backend types if possible

// Client-side interface (remains the same conceptually)
export type { UserProfile as UserProfileClient };

/**
 * Retrieves the user profile data for the currently logged-in user from the backend API.
 *
 * @returns A promise that resolves to the UserProfileClient object or null if fetch fails (API client handles errors).
 */
export async function getCurrentUserProfile(): Promise<UserProfileClient | null> {
    console.log(`Fetching current user profile via API...`);
    try {
        // Assuming UserProfile returned by API matches UserProfileClient
        const profile = await apiClient<UserProfileClient>('/users/profile');
        return profile;
    } catch (error) {
        console.error("Error fetching user profile via API:", error);
        // Return null or rethrow, depending on how calling components handle errors
        return null;
    }
}

/**
 * Creates or updates a user profile document via the backend API.
 *
 * @param profileData Partial profile data.
 * @returns A promise that resolves when the operation is complete.
 */
export async function upsertUserProfile(profileData: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    console.log(`Updating user profile via API:`, profileData);
    try {
        await apiClient<void>('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
        console.log(`User profile updated via API successfully.`);
    } catch (error) {
        console.error("Error creating/updating user profile via API:", error);
        throw error; // Re-throw the error caught by apiClient
    }
}


/**
 * Fetches a specific user's profile by their ID from the backend API (if such an endpoint exists).
 * Placeholder: Assuming no public profile endpoint for now.
 *
 * @param userId The ID of the user whose profile is needed.
 * @returns A promise that resolves to the UserProfileClient object or null if not found.
 */
export async function getUserProfileById(userId: string): Promise<UserProfileClient | null> {
     console.log(`Fetching profile for specific user ID via API: ${userId}`);
     // This endpoint likely doesn't exist or shouldn't be publicly accessible without permissions
     // If needed, create a specific backend endpoint like GET /api/users/:id/public-profile
     console.warn("getUserProfileById via API is not implemented in this example.");
     // Simulate fetch failure or return null
     // try {
     //    const profile = await apiClient<UserProfileClient>(`/users/${userId}`); // Example endpoint
     //    return profile;
     // } catch (error) {
     //    return null;
     // }
     return null;
}

/**
 * Updates specific settings fields (like bridge settings) via the backend API.
 * Combines previous update functions into one general update function.
 *
 * @param settings Partial settings object containing fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateUserProfileSettings(settings: Partial<Pick<UserProfile, 'isSmartWalletBridgeEnabled' | 'smartWalletBridgeLimit' | 'notificationsEnabled' | 'biometricEnabled' | 'appLockEnabled'>>): Promise<void> {
     console.log(`Updating user settings via API:`, settings);
     try {
         await apiClient<void>('/users/profile', { // Use the same PUT endpoint
             method: 'PUT',
             body: JSON.stringify(settings),
         });
         console.log("User settings updated via API successfully.");
     } catch (error) {
         console.error("Error updating user settings via API:", error);
         throw error; // Re-throw error
     }
}

// Remove specific update functions as they are covered by the general one above
// export async function updateSmartWalletBridgeSettings(...)
// export async function updateGeneralSettings(...)
