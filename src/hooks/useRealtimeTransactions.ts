'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToWebSocketMessages, requestInitialData, ensureWebSocketConnection } from '@/lib/websocket';
import { getTransactionHistory, Transaction, TransactionFilters } from '@/services/transactions';
import { auth } from '@/lib/firebase';

const MAX_TRANSACTIONS_CLIENT_SIDE = 50;

export function useRealtimeTransactions(
    initialFilters?: TransactionFilters
): [Transaction[], boolean, (newFilters?: TransactionFilters) => void] {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFilters, setCurrentFilters] = useState<TransactionFilters | undefined>(initialFilters);
    const [userId, setUserId] = useState<string | null>(null); // Local state for userId from auth

    const fetchInitialTransactionsFallback = useCallback(async (filtersToUse?: TransactionFilters) => {
        const currentAuthUser = auth.currentUser;
        if (!currentAuthUser) {
            console.log("[Tx Hook Fallback] Fetch skipped: No user.");
            setTransactions([]);
            setIsLoading(false);
            return;
        }
        // Avoid concurrent fetches if isLoading is already true from another source
        // However, if this is a deliberate fallback, we might want to proceed.
        // For now, let's assume if isLoading is true, another process is handling it.
        // if (isLoading) {
        //     console.log("[Tx Hook Fallback] Fetch skipped: Already loading.");
        //     return;
        // }

        console.log("[Tx Hook Fallback] Executing API fallback for initial transactions with filters:", filtersToUse);
        setIsLoading(true); // Ensure loading is true for this fallback attempt
        setError(null);
        try {
            const fetchedTransactions = await getTransactionHistory(filtersToUse);
            setTransactions(fetchedTransactions.slice(0, MAX_TRANSACTIONS_CLIENT_SIDE));
            console.log("[Tx Hook Fallback] Initial transactions fetched via API fallback:", fetchedTransactions.length);
        } catch (err: any) {
            console.error("[Tx Hook Fallback] Error fetching initial transactions via API fallback:", err);
            setError(err.message || "Could not fetch transactions.");
            setTransactions([]);
        } finally {
            // Only set isLoading to false if this fallback call initiated it.
            // Avoid race conditions if another loading process is active.
            setIsLoading(false);
        }
    }, []); // Add dependencies if getTransactionHistory or auth change in a way that affects this.

    useEffect(() => {
        let isMounted = true;
        let cleanupAuthListener: (() => void) | null = null;
        let cleanupWsForCurrentUser: (() => void) | null = null;

        // This function sets up WebSocket and returns a cleanup specific to that setup.
        const setupWebSocketSubscription = (currentUserId: string, filters?: TransactionFilters): (() => void) => {
            if (!isMounted || !currentUserId) return () => {};

            let unsubUpdate: (() => void) | null = null;
            let unsubInitial: (() => void) | null = null;
            let initialFetchTimeoutId: NodeJS.Timeout | null = null;
            let localIsLoading = true; // Track loading state for this specific setup

            console.log("[Tx Hook] Setting up WS subscription for user:", currentUserId, "Filters:", filters);
            setIsLoading(true); // Set global loading true for this setup attempt
            setTransactions([]); // Clear previous transactions for new user/filter

            ensureWebSocketConnection().then(() => {
                if (!isMounted) return;

                const handleTransactionUpdate = (payload: any) => {
                    if (!isMounted) return;
                    if (initialFetchTimeoutId) clearTimeout(initialFetchTimeoutId);
                    setError(null);

                    let newTransactions: Transaction[];
                    if (Array.isArray(payload)) {
                        newTransactions = payload.map((tx: any) => ({
                            ...tx,
                            date: new Date(tx.date),
                            avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
                            createdAt: tx.createdAt ? new Date(tx.createdAt) : undefined,
                            updatedAt: tx.updatedAt ? new Date(tx.updatedAt) : undefined,
                        })).sort((a, b) => b.date.getTime() - a.date.getTime());
                        setTransactions(newTransactions.slice(0, MAX_TRANSACTIONS_CLIENT_SIDE));
                        console.log("[Tx Hook] WS: Updated state with initial/full list via WS:", newTransactions.length);
                    } else if (payload && typeof payload === 'object' && payload.id && payload.date) {
                        const newTransaction: Transaction = {
                            ...payload,
                            date: new Date(payload.date),
                            avatarSeed: payload.avatarSeed || payload.name?.toLowerCase().replace(/\s+/g, '') || payload.id,
                            createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
                            updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : undefined,
                        };
                        setTransactions(prev => {
                            const existingIndex = prev.findIndex(t => t.id === newTransaction.id);
                            let updatedList;
                            if (existingIndex > -1) updatedList = prev.map(t => t.id === newTransaction.id ? newTransaction : t);
                            else updatedList = [newTransaction, ...prev];
                            return updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_TRANSACTIONS_CLIENT_SIDE);
                        });
                        console.log("[Tx Hook] WS: Processed single transaction update:", newTransaction.id);
                    } else {
                        console.warn("[Tx Hook] WS: Received unexpected payload format:", payload);
                    }
                    if(localIsLoading) setIsLoading(false); // Set global loading false once data is received
                    localIsLoading = false;
                };

                unsubUpdate = subscribeToWebSocketMessages('transaction_update', handleTransactionUpdate);
                unsubInitial = subscribeToWebSocketMessages('initial_transactions', handleTransactionUpdate);

                requestInitialData('transactions', filters);

                initialFetchTimeoutId = setTimeout(() => {
                    if (isMounted && localIsLoading) {
                        console.log("[Tx Hook] WS: Initial data timeout. Attempting API fallback.");
                        fetchInitialTransactionsFallback(filters);
                    }
                }, 7000);

            }).catch(err => {
                if (isMounted) {
                    console.error("[Tx Hook] WS: Connection error during setup:", err);
                    setError("WebSocket connection failed. Trying API fallback.");
                    fetchInitialTransactionsFallback(filters);
                }
            });
            
            return () => { // Cleanup for this specific WebSocket setup
                console.log("[Tx Hook] WS: Cleaning up WebSocket specific subscriptions for user/filters.");
                if (unsubUpdate) unsubUpdate();
                if (unsubInitial) unsubInitial();
                if (initialFetchTimeoutId) clearTimeout(initialFetchTimeoutId);
            };
        };

        cleanupAuthListener = auth.onAuthStateChanged(user => {
            if (!isMounted) return;
            
            const newUserId = user ? user.uid : null;
            setUserId(previousUserId => {
                // Only re-setup if userId actually changes
                if (previousUserId !== newUserId) {
                    // Clean up previous user's subscription before setting up new one
                    if (cleanupWsForCurrentUser) {
                        console.log("[Tx Hook] Auth: Cleaning up WS for old user:", previousUserId);
                        cleanupWsForCurrentUser();
                    }

                    if (newUserId) {
                        console.log("[Tx Hook] Auth: New user detected, setting up subscription:", newUserId);
                        cleanupWsForCurrentUser = setupWebSocketSubscription(newUserId, currentFilters);
                    } else {
                        console.log("[Tx Hook] Auth: User logged out, clearing transactions.");
                        setTransactions([]);
                        setIsLoading(false);
                        setError(null);
                        cleanupWsForCurrentUser = null;
                    }
                }
                return newUserId;
            });
        });

        // Initial setup if user is already logged in when hook mounts
        // The onAuthStateChanged will also fire, so this might be redundant if not handled carefully
        // Let's ensure setup is only called once per userId/filter combination by managing userId in state.
        // The logic inside onAuthStateChanged already handles the initial user state.

        return () => {
            isMounted = false;
            console.log("[Tx Hook] Main useEffect: Cleaning up auth listener and any active WS subscription.");
            if (cleanupAuthListener) cleanupAuthListener();
            if (cleanupWsForCurrentUser) cleanupWsForCurrentUser();
        };
    // currentFilters changes should trigger a re-subscription *if* userId is present.
    // This is now implicitly handled: when currentFilters changes, this effect re-runs.
    // If userId is set, onAuthStateChanged might not fire again, so we need to explicitly call setup here.
    // The useEffect's dependency on 'userId' (which is set by onAuthStateChanged) and `currentFilters` will handle this.
    // When `currentFilters` changes, and `userId` is already set, this effect re-runs.
    // The `setUserId` inside `onAuthStateChanged` will cause a re-render and this effect will run again.
    // The logic inside `onAuthStateChanged` will handle cleaning up the old `cleanupWsForCurrentUser` and setting up a new one.
    }, [currentFilters, fetchInitialTransactionsFallback]);


    const refreshTransactions = useCallback((newFilters?: TransactionFilters) => {
        console.log("[Tx Hook] Refresh triggered. New filters:", newFilters);
        // Update currentFilters, which will trigger the useEffect to re-subscribe
        setCurrentFilters(prevFilters => ({ ...(prevFilters || {}), ...(newFilters || {}) }));
        // No need to directly call setIsLoading or setTransactions here; useEffect handles it.
    }, []);

    return [transactions, isLoading, refreshTransactions];
}
