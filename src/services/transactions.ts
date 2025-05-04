/**
 * @fileOverview Service functions for managing transaction history via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Import shared type
import type { DateRange } from "react-day-picker";
import { auth } from '@/lib/firebase'; // Keep auth for user ID if needed client-side

export type { Transaction }; // Re-export for convenience

export interface TransactionFilters {
    type?: string;
    status?: string;
    dateRange?: DateRange;
    searchTerm?: string;
    limit?: number; // Add limit to filters
}

/**
 * Fetches transaction history for the current user from the backend API.
 *
 * @param filters Optional filters for transaction type, status, date range, and search term.
 * @returns A promise that resolves to an array of Transaction objects.
 */
export async function getTransactionHistory(filters?: TransactionFilters): Promise<Transaction[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to get transaction history.");
        return [];
    }
    console.log(`Fetching transaction history via API with filters:`, filters);

    // Construct query parameters from filters
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.dateRange?.from) params.append('startDate', filters.dateRange.from.toISOString());
    if (filters?.dateRange?.to) params.append('endDate', filters.dateRange.to.toISOString());
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;

    try {
        const transactions = await apiClient<Transaction[]>(endpoint);
        // Convert date strings to Date objects
        return transactions.map(tx => ({
            ...tx,
            date: new Date(tx.date),
            // Ensure avatarSeed exists client-side if needed
            avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
        }));
    } catch (error) {
        console.error("Error fetching transaction history via API:", error);
        // Don't re-throw, let the caller handle the empty array or show error
        return [];
    }
}

// **IMPORTANT**: Real-time subscription (subscribeToTransactionHistory)
// needs a WebSocket connection or Server-Sent Events (SSE) from the backend.
// The previous Firestore `onSnapshot` logic is removed as we now rely on the backend API.
// We will keep the function signature but make it call the one-time fetch for now,
// or return an error indicating real-time is not implemented via the standard API client.

/**
 * **(Placeholder)** Subscribes to real-time updates for the current user's transaction history.
 * NOTE: This currently calls the one-time fetch `getTransactionHistory`.
 * Real-time functionality requires WebSocket or SSE backend implementation.
 *
 * @param onUpdate Callback function triggered with the updated list of transactions.
 * @param onError Callback function triggered on error.
 * @param filters Optional filters.
 * @param count Optional limit.
 * @returns A cleanup function (currently does nothing).
 */
export function subscribeToTransactionHistory(
    onUpdate: (transactions: Transaction[]) => void,
    onError: (error: Error) => void,
    filters?: TransactionFilters,
    count?: number
): () => void {
     console.warn("Real-time transaction subscription using Firestore 'onSnapshot' is replaced. Using one-time fetch via API. For real-time, implement WebSocket/SSE.");
     const currentUser = auth.currentUser;
     if (!currentUser) {
         onError(new Error("User not logged in."));
         return () => {}; // Return no-op cleanup
     }

     const fetchAndUpdate = async () => {
         try {
             // Use the count from filters if provided, otherwise use the separate count param
             const limit = filters?.limit || count;
             const updatedFilters = { ...filters, limit };
             const transactions = await getTransactionHistory(updatedFilters);
             onUpdate(transactions);
         } catch (error: any) {
             onError(error);
         }
     };

     // Initial fetch
     fetchAndUpdate();

     // Simulate periodic polling as a fallback for real-time (adjust interval as needed)
     // In a production app, use WebSockets or SSE instead.
     const intervalId = setInterval(fetchAndUpdate, 60000); // Poll every 60 seconds

     // Return a function to clear the interval
     return () => {
         console.log("Clearing transaction polling interval.");
         clearInterval(intervalId);
     };
}


// **IMPORTANT**: `addTransaction` should now primarily be handled by the backend.
// When a payment/recharge is processed via the backend API, the backend service
// itself should be responsible for creating the transaction record in the database.
// Client-side `addTransaction` might only be needed for purely client-side events
// that need logging, which is less common in this architecture.

// **REMOVE or COMMENT OUT** the client-side `addTransaction` unless specifically needed.
/*
export async function addTransaction(...) { ... }
*/

/**
 * Attempts to cancel a recently completed or processing recharge transaction via the backend API.
 *
 * @param transactionId The ID of the recharge transaction to cancel.
 * @returns A promise resolving to an object indicating success and a message.
 */
export async function cancelRecharge(transactionId: string): Promise<{ success: boolean; message: string }> {
     console.log(`Requesting cancellation for recharge transaction via API: ${transactionId}`);
     try {
         // The backend endpoint handles permission checks and external API calls
         const result = await apiClient<{ success: boolean; message: string }>(`/recharge/cancel/${transactionId}`, {
             method: 'POST',
         });
         return result;
     } catch (error: any) {
         console.error("Error cancelling recharge via API:", error);
         // Return a generic failure object based on the caught error
         return { success: false, message: error.message || "Could not cancel recharge." };
     }
}


// **IMPORTANT**: Blockchain logging should be handled securely on the backend.
// Remove the client-side `logTransactionToBlockchain` function.
/*
export async function logTransactionToBlockchain(...) { ... }
*/

// Keep TransactionFilters interface if used by components
export type { TransactionFilters };
