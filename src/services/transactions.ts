
/**
 * @fileOverview Service functions for managing transaction history via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Import shared type
import type { DateRange } from "react-day-picker";
import { auth } from '@/lib/firebase'; // Keep auth for user ID if needed client-side
import { Unsubscribe } from 'firebase/firestore'; // Keep type for potential fallback

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
        onError(new Error("User not logged in."));
        return () => {}; // No-op cleanup
    }
    const userId = currentUser.uid;
    let ws: WebSocket | null = null;
    let pollingIntervalId: NodeJS.Timeout | null = null;
    const limit = filters?.limit || count;
    const updatedFilters = { ...filters, limit };

    const wsUrl = process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:9003';

    const connectWebSocket = () => {
        console.log(`Attempting WebSocket connection to ${wsUrl} for transaction updates...`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WebSocket connected for transaction updates.");
            // Clear polling interval if WS connects successfully
            if (pollingIntervalId) {
                 clearInterval(pollingIntervalId);
                 pollingIntervalId = null;
                 console.log("WebSocket connected, cleared polling interval.");
            }
            // Authenticate WebSocket connection
            currentUser.getIdToken().then(token => {
                if (token && ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'authenticate', token }));
                     // Optionally request initial data after auth
                     // ws.send(JSON.stringify({ type: 'request_initial_transactions', limit: limit || 5 }));
                }
            }).catch(tokenError => {
                 console.error("Error getting token for WS auth:", tokenError);
                 onError(new Error("WebSocket authentication failed."));
                 ws?.close();
            });
             // Fetch initial data via API while WS connects/authenticates
             fetchAndPoll();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data.toString());
                 console.log("WebSocket message received (transactions):", message);
                if (message.type === 'transaction_update' || message.type === 'initial_transactions') {
                    // Process payload: could be a single transaction or an array
                    let updatedTransactions: Transaction[] = [];
                    if (Array.isArray(message.payload)) {
                         updatedTransactions = message.payload.map((tx: any) => ({
                             ...tx,
                             date: new Date(tx.date),
                             avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
                         }));
                    } else if (message.payload && typeof message.payload === 'object') {
                         // Handle single transaction update - more complex state management needed here
                         // For simplicity, we'll refetch the whole list on single update via WS for now
                         console.log("Received single transaction update via WS, refetching list...");
                         fetchAndPoll(); // Refetch list on single update
                         return; // Avoid calling onUpdate with single item for now
                    }
                    onUpdate(updatedTransactions);
                } else if (message.type === 'auth_success') {
                    console.log("Transaction WebSocket authenticated.");
                    // If not already fetched, request initial transactions
                    // ws?.send(JSON.stringify({ type: 'request_initial_transactions', limit: limit || 5 }));
                }
            } catch (e) {
                console.error("Error processing WebSocket message for transactions:", e);
                onError(new Error("Received invalid real-time data."));
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error for transactions:", error);
            onError(new Error("Real-time connection error. Trying polling fallback."));
            // Fallback to polling if WebSocket fails
            if (!pollingIntervalId) { // Start polling only if not already polling
                fetchAndPoll(true); // Start polling immediately on WS error
            }
        };

        ws.onclose = (event) => {
            console.log("WebSocket closed for transactions:", event.code, event.reason);
            ws = null; // Clear instance
            // Fallback to polling if closed unexpectedly and not already polling
             if (!event.wasClean && !pollingIntervalId) {
                 console.log("WebSocket closed unexpectedly. Falling back to polling.");
                 fetchAndPoll(true); // Start polling
             }
        };
    }

    // Function to fetch data via API and set up polling
    const fetchAndPoll = async (startPolling = false) => {
        try {
            const transactions = await getTransactionHistory(updatedFilters);
            onUpdate(transactions);
             // Set up polling only if specifically requested (e.g., on WS error/close)
             if (startPolling && !pollingIntervalId) {
                 console.log("Starting polling for transaction updates (interval: 30s)");
                 pollingIntervalId = setInterval(async () => {
                     try {
                         const polledTransactions = await getTransactionHistory(updatedFilters);
                         onUpdate(polledTransactions);
                     } catch (pollError) {
                         console.error("Polling error:", pollError);
                         onError(new Error("Failed to update transactions."));
                     }
                 }, 30000); // Poll every 30 seconds
             }
        } catch (error: any) {
            onError(error);
        }
    };

    // Initial attempt to connect WebSocket
    connectWebSocket();

    // Return cleanup function
    return () => {
        console.log("Cleaning up transaction subscription (WebSocket and Polling)...");
        if (ws) {
            ws.close(1000, "Client unmounted"); // Close WS with normal closure code
            ws = null;
        }
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
        }
    };
}


// **REMOVE or COMMENT OUT** the client-side `addTransaction`
// It's handled by the backend now.
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
        