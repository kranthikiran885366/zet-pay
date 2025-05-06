/**
 * @fileOverview Service functions for managing transaction history via the backend API and WebSockets.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Import shared type
import type { DateRange } from "react-day-picker";
import { auth } from '@/lib/firebase'; // Keep auth for user ID if needed client-side
import { ensureWebSocketConnection, subscribeToWebSocketMessages, requestInitialData } from '@/lib/websocket'; // Import WebSocket utility

export type { Transaction }; // Re-export for convenience

export interface TransactionFilters {
    type?: string;
    status?: string;
    dateRange?: DateRange;
    searchTerm?: string;
    limit?: number; // Add limit to filters
}

/**
 * Fetches transaction history for the current user from the backend API (primarily for initial load or fallback).
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

/**
 * Subscribes to real-time updates for the current user's transaction history using WebSockets.
 * Requests initial data via WebSocket after connection/authentication.
 *
 * @param onUpdate Callback function triggered with the updated list of transactions (can be initial list or single update).
 * @param onError Callback function triggered on error.
 * @param filters Optional filters to apply for the subscription and initial request.
 * @param count Optional limit.
 * @returns A cleanup function to unsubscribe from WebSocket messages, or null if user is not logged in.
 */
export function subscribeToTransactionHistory(
    onUpdate: (transactions: Transaction[]) => void,
    onError: (error: Error) => void,
    filters?: TransactionFilters,
    count?: number
): (() => void) | null {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to subscribe to transaction history.");
        // Return null instead of calling onError here, let the component handle it
        return null; // Return null if no user
    }
    const userId = currentUser.uid;
    const limit = filters?.limit || count;
    const subscriptionFilters = { ...filters, limit };

    console.log("Setting up transaction history subscription for user:", userId, "Filters:", subscriptionFilters);

    // Ensure WebSocket connection is attempted
    ensureWebSocketConnection();

    // Define handler for incoming transaction updates
    const handleTransactionUpdate = (payload: any) => {
        let updatedTransactions: Transaction[] = [];
         if (Array.isArray(payload)) {
             // Handle full list update (e.g., initial data)
             console.log("[Tx Subscribe] Received initial/full transaction list update via WS.");
             updatedTransactions = payload.map((tx: any) => ({
                 ...tx,
                 date: new Date(tx.date), // Convert timestamp string/object to Date
                 avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
             }));
             // Sort by date descending for consistent display
             updatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
             onUpdate(updatedTransactions);
         } else if (payload && typeof payload === 'object' && payload.id && payload.date) {
             // Handle single transaction update
             console.log("[Tx Subscribe] Received single transaction update via WS:", payload.id);
             const newTransaction: Transaction = {
                 ...payload,
                 date: new Date(payload.date), // Convert timestamp string/object to Date
                 avatarSeed: payload.avatarSeed || payload.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
             };
             // Instead of managing the list here, pass the single update to the hook/component
             // The hook/component will decide how to merge it (prepend, update, etc.)
             onUpdate([newTransaction]);
         } else {
             console.warn("Received unexpected payload format for transaction update:", payload);
             onError(new Error("Received invalid transaction update data."));
         }
    };

    // Subscribe to WebSocket messages for general updates and initial data response
    const wsUnsubscribeUpdate = subscribeToWebSocketMessages('transaction_update', handleTransactionUpdate);
    const wsUnsubscribeInitial = subscribeToWebSocketMessages('initial_transactions', handleTransactionUpdate);

    // Request initial data once WebSocket is connected and authenticated
    requestInitialData('transactions', subscriptionFilters);


    // Return cleanup function
    return () => {
        console.log("Cleaning up transaction subscription (WebSocket)...");
        wsUnsubscribeUpdate(); // Unsubscribe from 'transaction_update'
        wsUnsubscribeInitial(); // Unsubscribe from 'initial_transactions'
    };
}


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

// Keep TransactionFilters interface if used by components
export type { TransactionFilters };