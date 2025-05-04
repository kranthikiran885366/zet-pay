/**
 * @fileOverview Service functions for managing user contacts/payees via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { PayeeClient, Payee } from './types'; // Use shared type definition

// Re-export types if needed by components
export type { PayeeClient, Payee };

// **IMPORTANT**: Real-time subscription using Firestore `onSnapshot` is removed.
// If real-time updates are needed, the backend must provide a WebSocket or SSE endpoint.
// The `subscribeToContacts` function is now removed or needs complete reimplementation
// to connect to a real-time backend endpoint.

/*
// Removed Firestore real-time subscription logic
export function subscribeToContacts(
  onUpdate: (contacts: PayeeClient[]) => void,
  onError: (error: Error) => void,
  searchTerm?: string
): Unsubscribe | null {
  // ... Firestore onSnapshot logic removed ...
  console.warn("Real-time contact subscription via Firestore 'onSnapshot' is removed. Implement WebSocket/SSE for real-time updates.");
  // Return a no-op unsubscribe function or null
  return null;
}
*/

/**
 * Asynchronously retrieves a list of the current user's saved contacts/payees from the backend API.
 * Optionally filters by search term via query parameter.
 *
 * @param searchTerm Optional search term to filter contacts by name or identifier.
 * @returns A promise that resolves to an array of PayeeClient objects.
 */
export async function getContacts(searchTerm?: string): Promise<PayeeClient[]> {
  console.log(`Fetching contacts via API ${searchTerm ? `matching "${searchTerm}"` : ''}`);

  const params = new URLSearchParams();
  if (searchTerm) {
    params.append('q', searchTerm); // Use 'q' for query parameter, adjust if backend expects differently
  }
  const queryString = params.toString();
  const endpoint = `/contacts${queryString ? `?${queryString}` : ''}`; // Assuming '/contacts' endpoint

  try {
    const contacts = await apiClient<PayeeClient[]>(endpoint);
    // Convert date strings to Date objects if necessary (API might return ISO strings)
    return contacts.map(p => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
         avatarSeed: p.avatarSeed || p.name?.toLowerCase().replace(/\s+/g, '') || p.id, // Ensure avatarSeed client-side
    }));
  } catch (error) {
    console.error("Error fetching contacts via API:", error);
    return []; // Return empty array on error
  }
}

/**
 * Asynchronously retrieves details for a specific payee ID from the backend API.
 *
 * @param payeeId The ID of the payee to retrieve.
 * @returns A promise that resolves to the PayeeClient object or null if not found or not accessible.
 */
export async function getPayeeDetails(payeeId: string): Promise<PayeeClient | null> {
     console.log(`Fetching details for payee ID via API: ${payeeId}`);
     const endpoint = `/contacts/${payeeId}`; // Assuming endpoint structure

     try {
        const payee = await apiClient<PayeeClient>(endpoint);
         return {
             ...payee,
             createdAt: payee.createdAt ? new Date(payee.createdAt) : undefined,
             updatedAt: payee.updatedAt ? new Date(payee.updatedAt) : undefined,
             avatarSeed: payee.avatarSeed || payee.name?.toLowerCase().replace(/\s+/g, '') || payee.id,
         };
    } catch (error: any) {
         // Handle 404 specifically if possible, otherwise treat as null
        if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
             console.log("Payee not found via API:", payeeId);
             return null;
        }
        console.error("Error fetching payee details via API:", error);
         throw error; // Re-throw other errors
    }
}

/**
 * Asynchronously saves a new payee via the backend API.
 *
 * @param payeeData The details of the payee to save (excluding id, userId, avatarSeed, timestamps).
 * @returns A promise that resolves to the newly created PayeeClient object returned by the backend.
 */
export async function savePayee(payeeData: Omit<Payee, 'id' | 'userId' | 'avatarSeed' | 'createdAt' | 'updatedAt'>): Promise<PayeeClient> {
    console.log("Saving new payee via API:", payeeData);
    try {
        // Backend handles assigning ID, userId, timestamps, and potentially avatarSeed
        const savedPayee = await apiClient<PayeeClient>('/contacts', {
            method: 'POST',
            body: JSON.stringify(payeeData),
        });
        console.log("Payee saved via API with ID:", savedPayee.id);
        // Convert dates if needed
         return {
             ...savedPayee,
             createdAt: savedPayee.createdAt ? new Date(savedPayee.createdAt) : undefined,
             updatedAt: savedPayee.updatedAt ? new Date(savedPayee.updatedAt) : undefined,
             avatarSeed: savedPayee.avatarSeed || savedPayee.name?.toLowerCase().replace(/\s+/g, '') || savedPayee.id,
         };
    } catch (error) {
        console.error("Error saving payee via API:", error);
        throw error; // Re-throw
    }
}


/**
 * Asynchronously updates an existing payee via the backend API.
 *
 * @param payeeId The ID of the payee to update.
 * @param updateData The partial data to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updatePayee(payeeId: string, updateData: Partial<Omit<Payee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    console.log(`Updating payee ${payeeId} via API`);
    const endpoint = `/contacts/${payeeId}`; // Assuming endpoint structure
    try {
        await apiClient<void>(endpoint, {
            method: 'PUT', // Or PATCH depending on backend implementation
            body: JSON.stringify(updateData),
        });
        console.log("Payee updated successfully via API.");
    } catch (error) {
        console.error("Error updating payee via API:", error);
        throw error; // Re-throw
    }
}

/**
 * Asynchronously deletes a payee via the backend API.
 *
 * @param payeeId The ID of the payee to delete.
 * @returns A promise that resolves when deletion is complete.
 */
export async function deletePayee(payeeId: string): Promise<void> {
    console.log(`Deleting payee ID via API: ${payeeId}`);
    const endpoint = `/contacts/${payeeId}`; // Assuming endpoint structure
     try {
        await apiClient<void>(endpoint, {
            method: 'DELETE',
        });
        console.log("Payee deleted successfully via API.");
    } catch (error) {
        console.error("Error deleting payee via API:", error);
        throw error; // Re-throw
    }
}

// Add shared types to a separate file (e.g., src/services/types.ts)
// and import them here and in other service files.
// Example in types.ts:
// export interface Payee { ... }
// export interface PayeeClient extends Omit<Payee, ...> { ... }
// export type { Payee as PayeeFirestore } // Alias if needed
import type { Timestamp } from 'firebase/firestore'; // Keep if type definition uses it
