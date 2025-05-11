/**
 * @fileOverview Service functions for managing user profile data via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { UserProfile as UserProfileClient } from './types'; // Use shared type, aliased for clarity

// Re-export for component usage
export type { UserProfileClient };

/**
 * Retrieves the user profile data for the currently logged-in user from the backend API.
 * The backend fetches/creates the profile based on the verified auth token.
 *
 * @returns A promise that resolves to the UserProfileClient object or null if fetch fails or user not logged in.
 */
export async function getCurrentUserProfile(): Promise<UserProfileClient | null> {
    console.log(`[Client Service] Fetching current user profile via API...`);
    try {
        const result = await apiClient<{ id: string } & UserProfileClient>('/users/profile');
        if (result) {
             return {
                ...result,
                createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
                updatedAt: result.updatedAt ? new Date(result.updatedAt) : undefined,
            };
        }
        return null;
    } catch (error) {
        console.error("[Client Service] Error fetching user profile via API:", error);
        return null;
    }
}

/**
 * Creates or updates user profile data via the backend API.
 *
 * @param profileData Partial profile data to update. Fields like email, KYC status might be restricted by the backend.
 * @returns A promise that resolves to the updated UserProfileClient object returned by the backend.
 * @throws Error if the update fails.
 */
export async function upsertUserProfile(profileData: Partial<Omit<UserProfileClient, 'id' | 'createdAt' | 'updatedAt' | 'email' | 'kycStatus'>>): Promise<UserProfileClient> {
    console.log(`[Client Service] Updating user profile via API:`, profileData);
    try {
        const result = await apiClient<{ message: string; profile: UserProfileClient }>('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
        console.log(`[Client Service] User profile updated via API successfully.`);
         return {
            ...result.profile,
            createdAt: result.profile.createdAt ? new Date(result.profile.createdAt) : undefined,
            updatedAt: result.profile.updatedAt ? new Date(result.updatedAt) : undefined,
        };
    } catch (error) {
        console.error("[Client Service] Error creating/updating user profile via API:", error);
        throw error;
    }
}


/**
 * Updates specific user settings via the backend API.
 * This calls the same backend endpoint as upsertUserProfile but focuses on settings fields.
 *
 * @param settings Partial settings object containing fields to update.
 * @returns A promise that resolves to the updated UserProfileClient object returned by the backend.
 * @throws Error if the update fails.
 */
export async function updateUserProfileSettings(
    settings: Partial<UserProfileClient> // Allow any partial update to UserProfileClient
): Promise<UserProfileClient> {
     console.log(`[Client Service] Updating user settings via API:`, settings);
     try {
         const result = await apiClient<{ message: string; profile: UserProfileClient }>('/users/profile', {
             method: 'PUT',
             body: JSON.stringify(settings),
         });
         console.log("[Client Service] User settings updated via API successfully.");
         return {
            ...result.profile,
            createdAt: result.profile.createdAt ? new Date(result.profile.createdAt) : undefined,
            updatedAt: result.profile.updatedAt ? new Date(result.updatedAt) : undefined,
        };
     } catch (error) {
         console.error("[Client Service] Error updating user settings via API:", error);
         throw error;
     }
}
