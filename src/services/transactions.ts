
/**
 * @fileOverview Service functions for managing transaction history via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Import shared type
import type { DateRange } from "react-day-picker";
import { auth } from '@/lib/firebase'; // Keep auth for user ID if needed client-side
import { Unsubscribe } from 'firebase/firestore'; // Keep type for potential fallback
import { ensureWebSocketConnection, subscribeToWebSocketMessages, sendWebSocketMessage } from '@/lib/websocket'; // Import WebSocket utility

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

/**
 * Subscribes to real-time updates for the current user's transaction history using WebSockets.
 * Includes fallback to polling via `getTransactionHistory` if WebSocket connection fails.
 *
 * @param onUpdate Callback function triggered with the updated list of transactions.
 * @param onError Callback function triggered on error.
 * @param filters Optional filters.
 * @param count Optional limit.
 * @returns A cleanup function to close the WebSocket connection and clear any polling interval.
 */
export function subscribeToTransactionHistory(
    onUpdate: (transactions: Transaction[]) => void,
    onError: (error: Error) => void,
    filters?: TransactionFilters,
    count?: number
): () => void {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to subscribe to transaction history.");
        onError(new Error("User not logged in."));
        return () => {}; // No-op cleanup
    }
    const userId = currentUser.uid;
    let pollingIntervalId: NodeJS.Timeout | null = null;
    const limit = filters?.limit || count;
    const updatedFilters = { ...filters, limit };

    // Ensure WebSocket connection is attempted
    ensureWebSocketConnection();

    // Define handler for transaction updates
    const handleTransactionUpdate = (payload: any) => {
        let updatedTransactions: Transaction[] = [];
         if (Array.isArray(payload)) {
             updatedTransactions = payload.map((tx: any) => ({
                 ...tx,
                 date: new Date(tx.date),
                 avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
             }));
             onUpdate(updatedTransactions);
         } else if (payload && typeof payload === 'object' && payload.id) {
             // Handle single transaction update: Let the component merge it
             const newTransaction = {
                 ...payload,
                 date: new Date(payload.date),
                 avatarSeed: payload.avatarSeed || payload.name?.toLowerCase().replace(/\s+/g, '') || payload.id,
             };
             onUpdate([newTransaction]); // Pass only the new one
         } else {
             console.warn("Received unexpected payload format for transaction update:", payload);
         }
    };

    // Subscribe to WebSocket messages
    const wsUnsubscribe = subscribeToWebSocketMessages('transaction_update', handleTransactionUpdate);
    const wsInitialUnsubscribe = subscribeToWebSocketMessages('initial_transactions', handleTransactionUpdate);

    // Function to fetch data via API and set up polling (used as fallback)
    const fetchAndPoll = async (startPolling = false) => {
        try {
            console.log("Polling for transactions...");
            const transactions = await getTransactionHistory(updatedFilters);
            onUpdate(transactions);
            // Set up polling only if specifically requested
            if (startPolling && !pollingIntervalId) {
                console.log("Starting polling interval (30s) for transactions...");
                pollingIntervalId = setInterval(async () => {
                    try {
                        const polledTransactions = await getTransactionHistory(updatedFilters);
                        onUpdate(polledTransactions);
                    } catch (pollError) {
                        console.error("Polling error:", pollError);
                        onError(new Error("Failed to update transactions via polling."));
                        // Consider stopping polling after too many errors?
                        // clearInterval(pollingIntervalId!);
                        // pollingIntervalId = null;
                    }
                }, 30000); // Poll every 30 seconds
            }
        } catch (error: any) {
            onError(error);
        }
    };

     // Fetch initial data via REST API immediately for faster loading
     getTransactionHistory(updatedFilters).then(initialTxs => onUpdate(initialTxs)).catch(err => onError(err));
     // Rely on WebSocket 'initial_transactions' or polling fallback for subsequent updates

    // Return cleanup function
    return () => {
        console.log("Cleaning up transaction subscription (WebSocket and Polling)...");
        wsUnsubscribe(); // Unsubscribe from WebSocket messages
        wsInitialUnsubscribe(); // Unsubscribe from initial data message
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
        }
        // Note: We don't close the WebSocket connection here, as it might be used by other subscriptions.
        // Connection closure should be handled globally or when the app closes.
    };
}


// **REMOVE** client-side `addTransaction` function as backend handles it.
// export async function addTransaction(...) { ... }

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


// **REMOVE** client-side blockchain logging.
// export async function logTransactionToBlockchain(...) { ... }

// Keep TransactionFilters interface if used by components
export type { TransactionFilters };
