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

    // Function to fetch initial transactions via API (as fallback or initial load)
    const fetchInitialTransactionsFallback = useCallback(async (filters?: TransactionFilters) => {
         // Avoid fetching if already fetched or currently loading
         if (transactions.length > 0 || isLoading) return;

        const user = auth.currentUser;
        if (!user) {
            // console.log("[Tx Hook] Fallback fetch skipped: No user.");
            setTransactions([]);
            setIsLoading(false);
            return;
        }

        console.log("[Tx Hook] Executing API fallback for initial transactions with filters:", filters);
        setIsLoading(true); // Ensure loading state is set
        setError(null);
        try {
            const initialTransactions = await getTransactionHistory(filters);
             // Only set if transactions haven't been updated by WS in the meantime
             setTransactions(prev => prev.length === 0 ? initialTransactions : prev);
            console.log("[Tx Hook] Initial transactions fetched via API fallback:", initialTransactions.length);
        } catch (err: any) {
            console.error("[Tx Hook] Error fetching initial transactions via API fallback:", err);
            setError(err.message || "Could not fetch transactions.");
            setTransactions(prev => prev.length === 0 ? [] : prev); // Keep existing if WS update happened
        } finally {
             // Only stop loading if transactions haven't been set by WS
             setIsLoading(prevLoading => transactions.length === 0 ? false : prevLoading);
        }
    }, [isLoading, transactions]);

    // Effect to handle subscriptions and initial data requests
    useEffect(() => {
        let unsubscribeAuth: (() => void) | null = null;
        let unsubscribeWs: (() => void) | null = null;
        let unsubscribeInitialWs: (() => void) | null = null;
        let initialFetchTimeout: NodeJS.Timeout | null = null;
        let isMounted = true; // Track mount status

        const setupSubscription = (filters?: TransactionFilters) => {
            if (!isMounted || isSubscribed) return; // Prevent setup if unmounted or already subscribed

            console.log("[Tx Hook] Setting up WS subscription with filters:", filters);
            ensureWebSocketConnection(); // Make sure WS is connected/connecting/authenticating
            setIsSubscribed(true);

            const handleTransactionUpdate = (payload: any) => {
                 if (!isMounted) return; // Don't update state if unmounted
                 if (initialFetchTimeout) clearTimeout(initialFetchTimeout); // Cancel fallback if WS provides data

                console.log("[Tx Hook] Received transaction update via WS. Type:", Array.isArray(payload) ? 'list' : 'single');
                setIsLoading(false); // Got data, no longer loading initial
                setError(null); // Clear errors

                if (Array.isArray(payload)) {
                     // Handle full list update (e.g., initial data)
                     const newTransactions = payload.map((tx: any) => ({
                         ...tx,
                         date: new Date(tx.date),
                         avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
                     }));
                     setTransactions(newTransactions.slice(0, MAX_TRANSACTIONS_CLIENT_SIDE));
                 } else if (payload && typeof payload === 'object' && payload.id && payload.date) {
                     // Handle single transaction update
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
                             updatedList = [...prev];
                             updatedList[existingIndex] = newTransaction;
                         } else {
                             // Prepend new
                             updatedList = [newTransaction, ...prev];
                         }
                         // Sort (optional, if order matters beyond prepending) and slice
                          return updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_TRANSACTIONS_CLIENT_SIDE);
                     });
                 } else {
                     console.warn("[Tx Hook] Received unexpected payload format for transaction update:", payload);
                 }
            };

            // Subscribe to WebSocket messages for general updates and initial data response
            unsubscribeWs = subscribeToWebSocketMessages('transaction_update', handleTransactionUpdate);
            unsubscribeInitialWs = subscribeToWebSocketMessages('initial_transactions', handleTransactionUpdate);

            // Request initial data via WebSocket
            requestInitialData('transactions', filters);

            // Set a timeout for the API fallback
            initialFetchTimeout = setTimeout(() => fetchInitialTransactionsFallback(filters), 5000); // e.g., wait 5 seconds

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
             let cleanupWs: (() => void) | null = null;
             if (user) {
                 console.log("[Tx Hook] User detected, setting up subscription & requesting data.");
                 // Reset state before setting up for new user or new filters
                 setTransactions([]);
                 setIsLoading(true);
                 setError(null);
                 cleanupWs = setupSubscription(currentFilters); // Setup with current filters
             } else {
                 console.log("[Tx Hook] User logged out, clearing transactions and unsubscribing.");
                 setTransactions([]);
                 setIsLoading(false);
                 setError(null);
                 // Ensure any active WS subscriptions are cleaned up
                 if (unsubscribeWs) unsubscribeWs();
                 if (unsubscribeInitialWs) unsubscribeInitialWs();
                 if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
                 setIsSubscribed(false);
             }
             // Store cleanup function if needed (though component unmount handles final cleanup)
             // wsCleanupRef.current = cleanupWs;
        });


        // Initial check & setup if user is already logged in
        if (auth.currentUser) {
             setupSubscription(currentFilters);
        } else {
             setIsLoading(false); // Not logged in, stop loading
        }

        // Cleanup function for the main effect
        return () => {
            isMounted = false; // Mark as unmounted
            console.log("[Tx Hook] Cleaning up auth listener and WS subscription on unmount.");
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeInitialWs) unsubscribeInitialWs();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
        };
    }, [currentFilters, fetchInitialTransactionsFallback, isSubscribed]); // Rerun if filters change

    // Function to manually refresh or apply new filters
    const refreshTransactions = useCallback((newFilters?: TransactionFilters) => {
        console.log("[Tx Hook] Refresh triggered with new filters:", newFilters);
        // Update the filter state, which will trigger the useEffect to re-subscribe/re-fetch
        setCurrentFilters(prevFilters => ({ ...(prevFilters || {}), ...(newFilters || {}) }));
        // Reset state immediately for refresh effect
        setTransactions([]);
        setIsLoading(true);
        setError(null);
        setIsSubscribed(false); // Allow useEffect to re-subscribe
        // The useEffect hook will handle requesting data with the new filters
    }, []);

    return [transactions, isLoading, refreshTransactions];
}
