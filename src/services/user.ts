/**
 * @fileOverview Service functions for managing user profile data via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { UserProfile as UserProfileClient } from './types'; // Use shared type, aliased for clarity

// Re-export for component usage
export type { UserProfileClient as UserProfile }; // Keep original name for export

/**
 * Retrieves the user profile data for the currently logged-in user from the backend API.
 * The backend fetches/creates the profile based on the verified auth token.
 *
 * @returns A promise that resolves to the UserProfileClient object or null if fetch fails or user not logged in.
 */
export async function getCurrentUserProfile(): Promise<UserProfileClient | null> {
    console.log(`[Client Service] Fetching current user profile via API...`);
    try {
        // Backend infers user from token
        const result = await apiClient<{ id: string } & UserProfileClient>('/users/profile');
        if (result) {
             // Convert date strings from API to Date objects for client-side consistency
             return {
                ...result,
                createdAt: result.createdAt ? new Date(result.createdAt as string) : undefined,
                updatedAt: result.updatedAt ? new Date(result.updatedAt as string) : undefined,
            };
        }
        console.warn("[Client Service] No user profile data returned from API.");
        return null;
    } catch (error: any) {
        console.error("[Client Service] Error fetching user profile via API:", error.message);
        // If it's specifically an "User not authenticated" error from apiClient, we might want to return null silently.
        if (error.message === "User not authenticated.") {
            return null;
        }
        // For other errors (network, server-side issues), re-throw so UI can handle appropriately.
        throw error;
    }
}

/**
 * Creates or updates user profile data via the backend API.
 * The backend typically uses the authenticated user's UID from the token.
 *
 * @param profileData Partial profile data to update. Fields like email, kycStatus might be restricted by the backend.
 * @returns A promise that resolves to the updated UserProfileClient object returned by the backend.
 * @throws Error if the update fails.
 */
export async function upsertUserProfile(
    profileData: Partial<Omit<UserProfileClient, 'id' | 'createdAt' | 'updatedAt' | 'email'>>
): Promise<UserProfileClient> {
    console.log(`[Client Service] Upserting user profile via API:`, profileData);
    try {
        // Backend /api/users/profile (PUT) handles upserting based on authenticated user's UID
        const result = await apiClient<{ message: string; profile: UserProfileClient }>('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
        console.log(`[Client Service] User profile upserted via API successfully.`);
         // Convert date strings from API response
         return {
            ...result.profile,
            createdAt: result.profile.createdAt ? new Date(result.profile.createdAt as string) : undefined,
            updatedAt: result.profile.updatedAt ? new Date(result.profile.updatedAt as string) : undefined,
        };
    } catch (error: any) {
        console.error("[Client Service] Error creating/updating user profile via API:", error);
        throw new Error(error.message || "Could not update profile. Please try again.");
    }
}


/**
 * Updates specific user settings via the backend API.
 * This calls the same backend endpoint as upsertUserProfile but focuses on settings fields.
 *
 * @param settings Partial settings object containing fields to update (e.g., notificationsEnabled, appLockEnabled).
 * @returns A promise that resolves to the updated UserProfileClient object returned by the backend.
 * @throws Error if the update fails.
 */
export async function updateUserProfileSettings(
    settings: Partial<UserProfileClient>
): Promise<UserProfileClient> {
     console.log(`[Client Service] Updating user settings via API:`, settings);
     try {
         const result = await apiClient<{ message: string; profile: UserProfileClient }>('/users/profile', {
             method: 'PUT', // Same endpoint as full upsert, backend handles partial update
             body: JSON.stringify(settings),
         });
         console.log("[Client Service] User settings updated via API successfully.");
         // Convert date strings
         return {
            ...result.profile,
            createdAt: result.profile.createdAt ? new Date(result.profile.createdAt as string) : undefined,
            updatedAt: result.profile.updatedAt ? new Date(result.profile.updatedAt as string) : undefined,
        };
     } catch (error: any) {
         console.error("[Client Service] Error updating user settings via API:", error);
         throw new Error(error.message || "Could not update settings. Please try again.");
     }
}
