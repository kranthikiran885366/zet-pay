
'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToWebSocketMessages, requestInitialData, ensureWebSocketConnection } from '@/lib/websocket';
import { getTransactionHistory, Transaction, TransactionFilters } from '@/services/transactions'; // Import types and API function
import { auth } from '@/lib/firebase'; // To check auth state

const MAX_TRANSACTIONS_CLIENT_SIDE = 50; // Limit stored transactions client-side

export function useRealtimeTransactions(
    initialFilters?: TransactionFilters
): [Transaction[], boolean, (newFilters?: TransactionFilters) => void] {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFilters, setCurrentFilters] = useState<TransactionFilters | undefined>(initialFilters);
    const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false); // Track initial load
    const [userId, setUserId] = useState<string | null>(null); // Track current user ID

    // Function to fetch initial transactions via API (as fallback or initial load)
    const fetchInitialTransactionsFallback = useCallback(async (filters?: TransactionFilters) => {
        // Avoid fetching if already fetched (initialLoadComplete is true) or currently loading
        if (initialLoadComplete || isLoading) {
             console.log("[Tx Hook] Fallback fetch skipped: Load complete or already loading.");
             return;
        }

        const currentUserId = userId; // Use state userId
        if (!currentUserId) {
            console.log("[Tx Hook] Fallback fetch skipped: No user.");
            setTransactions([]);
            setIsLoading(false);
            setInitialLoadComplete(true); // Mark initial load attempt as complete even if no user
            return;
        }

        console.log("[Tx Hook] Executing API fallback for initial transactions with filters:", filters);
        setIsLoading(true); // Ensure loading state is set
        setError(null);
        try {
            const initialTransactions = await getTransactionHistory(filters);
             // Only set if transactions haven't been updated by WS in the meantime AND initial load isn't marked complete
            if (!initialLoadComplete) {
                 setTransactions(prev => prev.length === 0 ? initialTransactions : prev); // Avoid overwriting WS data
                 setInitialLoadComplete(true); // Mark initial load complete after successful fetch
                 console.log("[Tx Hook] Initial transactions fetched via API fallback:", initialTransactions.length);
            } else {
                 console.log("[Tx Hook] API fallback received but initial load already complete (likely via WS). Ignoring API data.");
            }
        } catch (err: any) {
            console.error("[Tx Hook] Error fetching initial transactions via API fallback:", err);
            setError(err.message || "Could not fetch transactions.");
             if (!initialLoadComplete) { // Only update if initial load not done
                setTransactions([]);
                setInitialLoadComplete(true); // Mark attempt complete even on error
             }
        } finally {
            // Only stop loading if initial load is now marked complete
            // Check isLoading as well to prevent flicker if WS finishes first
            if (initialLoadComplete && isLoading) {
                setIsLoading(false);
            }
        }
    }, [userId, initialLoadComplete, isLoading]); // Depend on userId, initialLoadComplete and isLoading


    // Effect to handle subscriptions and initial data requests
    useEffect(() => {
        let unsubscribeAuth: (() => void) | null = null;
        let unsubscribeWs: (() => void) | null = null;
        let unsubscribeInitialWs: (() => void) | null = null;
        let initialFetchTimeout: NodeJS.Timeout | null = null;
        let isMounted = true; // Track mount status

        const setupSubscription = (currentUserId: string, filters?: TransactionFilters) => {
            if (!isMounted || !currentUserId) return; // Need user to subscribe

            // Cleanup previous subscriptions before starting new ones
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeInitialWs) unsubscribeInitialWs();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);

            console.log("[Tx Hook] Setting up WS subscription with filters:", filters);
            ensureWebSocketConnection(); // Make sure WS is connected/connecting/authenticating
            setIsSubscribed(true);
            setInitialLoadComplete(false); // Reset initial load flag on new subscription setup

            const handleTransactionUpdate = (payload: any) => {
                 if (!isMounted) return; // Don't update state if unmounted

                console.log("[Tx Hook] Received transaction update via WS. Type:", Array.isArray(payload) ? 'list' : 'single');
                 if (initialFetchTimeout) clearTimeout(initialFetchTimeout); // Cancel fallback if WS provides data

                // Ensure loading is false *only* after the initial full list is processed
                // Don't set loading false on single updates.

                setError(null); // Clear errors on successful data receipt

                if (Array.isArray(payload)) {
                     // Handle full list update (e.g., initial data)
                     const newTransactions = payload.map((tx: any) => ({
                         ...tx,
                         date: new Date(tx.date), // Convert timestamp string/object
                         avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
                     })).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort immediately

                     setTransactions(newTransactions.slice(0, MAX_TRANSACTIONS_CLIENT_SIDE));
                     setInitialLoadComplete(true); // Mark initial load complete
                     setIsLoading(false); // Stop loading *after* initial load
                     console.log("[Tx Hook] Updated state with initial/full list via WS:", newTransactions.length);
                 } else if (payload && typeof payload === 'object' && payload.id && payload.date) {
                      // Handle single transaction update only AFTER initial load is complete
                      if (initialLoadComplete) {
                          console.log("[Tx Hook] Processing single transaction update:", payload.id);
                          const newTransaction = {
                              ...payload,
                              date: new Date(payload.date),
                              avatarSeed: payload.avatarSeed || payload.name?.toLowerCase().replace(/\s+/g, '') || payload.id,
                          };
                          // Add or update the transaction in the list
                          setTransactions(prev => {
                              const existingIndex = prev.findIndex(t => t.id === newTransaction.id);
                              let updatedList;
                              if (existingIndex > -1) {
                                  // Update existing
                                  console.log(`[Tx Hook] Updating existing transaction ${newTransaction.id}`);
                                  updatedList = [...prev];
                                  updatedList[existingIndex] = newTransaction;
                              } else {
                                  // Prepend new
                                  console.log(`[Tx Hook] Prepending new transaction ${newTransaction.id}`);
                                  updatedList = [newTransaction, ...prev];
                              }
                              // Sort and slice
                               return updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_TRANSACTIONS_CLIENT_SIDE);
                          });
                      } else {
                           console.log("[Tx Hook] Received single update before initial list, queueing/ignoring until initial load completes.");
                           // Optionally queue single updates received before initial load
                      }
                 } else {
                     console.warn("[Tx Hook] Received unexpected payload format for transaction update:", payload);
                 }
            };

            // Subscribe to WebSocket messages for general updates and initial data response
            unsubscribeWs = subscribeToWebSocketMessages('transaction_update', handleTransactionUpdate);
            unsubscribeInitialWs = subscribeToWebSocketMessages('initial_transactions', handleTransactionUpdate);

            // Request initial data via WebSocket
            console.log("[Tx Hook] Requesting initial transactions via WS with filters:", filters);
            requestInitialData('transactions', filters);

            // Set a timeout for the API fallback in case WS fails to provide initial data
            initialFetchTimeout = setTimeout(() => {
                 console.log("[Tx Hook] WebSocket initial data timeout reached. Attempting API fallback.");
                 fetchInitialTransactionsFallback(filters);
             }, 7000); // e.g., wait 7 seconds

            // Return cleanup function for this specific subscription setup
             return () => {
                console.log("[Tx Hook] Cleaning up specific WS subscription.");
                if (unsubscribeWs) unsubscribeWs();
                if (unsubscribeInitialWs) unsubscribeInitialWs();
                if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
                setIsSubscribed(false);
             };
        };

        // Handle Authentication State Changes
        unsubscribeAuth = auth.onAuthStateChanged(user => {
             if (!isMounted) return;
             const currentUserId = user ? user.uid : null;
             setUserId(currentUserId); // Update user ID state

             // Cleanup previous subscriptions if user changes or logs out
             if (unsubscribeWs) unsubscribeWs();
             if (unsubscribeInitialWs) unsubscribeInitialWs();
             if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
             unsubscribeWs = null;
             unsubscribeInitialWs = null;
             initialFetchTimeout = null;
             setIsSubscribed(false); // Reset subscription flag

             if (currentUserId) {
                 console.log("[Tx Hook] User detected, setting up subscription & requesting data.");
                 // Reset state before setting up for new user or new filters
                 setTransactions([]);
                 setIsLoading(true);
                 setError(null);
                 setInitialLoadComplete(false); // Reset initial load flag
                 setupSubscription(currentUserId, currentFilters); // Setup with current filters
             } else {
                 console.log("[Tx Hook] User logged out, clearing transactions.");
                 setTransactions([]);
                 setIsLoading(false);
                 setError(null);
                 setInitialLoadComplete(false); // Reset flag
             }
        });


        // Cleanup function for the main effect
        return () => {
            isMounted = false; // Mark as unmounted
            console.log("[Tx Hook] Cleaning up auth listener and WS subscription on unmount.");
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeInitialWs) unsubscribeInitialWs();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
        };
    // Only re-run if filters change, fetchInitialTransactionsFallback is memoized
    }, [currentFilters, fetchInitialTransactionsFallback]);

    // Function to manually refresh or apply new filters
    const refreshTransactions = useCallback((newFilters?: TransactionFilters) => {
        console.log("[Tx Hook] Refresh triggered with new filters:", newFilters);
        // Update the filter state, which will trigger the useEffect to re-subscribe/re-fetch
        setCurrentFilters(prevFilters => ({ ...(prevFilters || {}), ...(newFilters || {}) }));
        // Reset state immediately for refresh effect
        setTransactions([]);
        setIsLoading(true);
        setError(null);
        setInitialLoadComplete(false); // Reset initial load flag for refresh
        setIsSubscribed(false); // Allow useEffect to re-subscribe
    }, []);

    return [transactions, isLoading, refreshTransactions];
}
