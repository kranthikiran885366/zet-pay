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
    const [userId, setUserId] = useState<string | null>(null);

    const fetchInitialTransactionsFallback = useCallback(async (filters?: TransactionFilters) => {
        const currentAuthUser = auth.currentUser; // Use auth.currentUser directly
        if (!currentAuthUser) {
            console.log("[Tx Hook] Fallback fetch skipped: No user.");
            setTransactions([]);
            setIsLoading(false);
            return;
        }
        if (isLoading) {
            console.log("[Tx Hook] Fallback fetch skipped: Already loading.");
            return;
        }

        console.log("[Tx Hook] Executing API fallback for initial transactions with filters:", filters);
        setIsLoading(true);
        setError(null);
        try {
            const initialTransactions = await getTransactionHistory(filters);
            setTransactions(initialTransactions.slice(0, MAX_TRANSACTIONS_CLIENT_SIDE));
            console.log("[Tx Hook] Initial transactions fetched via API fallback:", initialTransactions.length);
        } catch (err: any) {
            console.error("[Tx Hook] Error fetching initial transactions via API fallback:", err);
            setError(err.message || "Could not fetch transactions.");
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        let unsubscribeAuth: (() => void) | null = null;
        let unsubscribeWs: (() => void) | null = null;
        let unsubscribeInitialWs: (() => void) | null = null;
        let initialFetchTimeout: NodeJS.Timeout | null = null;
        let isMounted = true;

        const setupSubscription = (currentUserId: string, filters?: TransactionFilters) => {
            if (!isMounted || !currentUserId) return;

            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeInitialWs) unsubscribeInitialWs();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);

            console.log("[Tx Hook] Setting up WS subscription with filters:", filters);
            
            ensureWebSocketConnection().then(() => { // Ensure connection before requesting
                const handleTransactionUpdate = (payload: any) => {
                    if (!isMounted) return;
                    console.log("[Tx Hook] Received transaction update via WS. Type:", Array.isArray(payload) ? 'list' : 'single');
                    if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
                    setError(null);

                    if (Array.isArray(payload)) {
                        const newTransactions = payload.map((tx: any) => ({
                            ...tx,
                            date: new Date(tx.date),
                            avatarSeed: tx.avatarSeed || tx.name?.toLowerCase().replace(/\s+/g, '') || tx.id,
                            createdAt: tx.createdAt ? new Date(tx.createdAt) : undefined,
                            updatedAt: tx.updatedAt ? new Date(tx.updatedAt) : undefined,
                        })).sort((a, b) => b.date.getTime() - a.date.getTime());
                        setTransactions(newTransactions.slice(0, MAX_TRANSACTIONS_CLIENT_SIDE));
                        setIsLoading(false);
                        console.log("[Tx Hook] Updated state with initial/full list via WS:", newTransactions.length);
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
                            if (existingIndex > -1) {
                                updatedList = [...prev];
                                updatedList[existingIndex] = newTransaction;
                            } else {
                                updatedList = [newTransaction, ...prev];
                            }
                            return updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_TRANSACTIONS_CLIENT_SIDE);
                        });
                    } else {
                        console.warn("[Tx Hook] Received unexpected payload format for transaction update:", payload);
                    }
                };

                unsubscribeWs = subscribeToWebSocketMessages('transaction_update', handleTransactionUpdate);
                unsubscribeInitialWs = subscribeToWebSocketMessages('initial_transactions', handleTransactionUpdate);

                console.log("[Tx Hook] Requesting initial transactions via WS with filters:", filters);
                requestInitialData('transactions', filters);

                initialFetchTimeout = setTimeout(() => {
                    if (!transactions.length && isLoading && isMounted) { // Check if still loading and no data received
                        console.log("[Tx Hook] WebSocket initial data timeout reached. Attempting API fallback.");
                        fetchInitialTransactionsFallback(filters);
                    }
                }, 7000);
            }).catch(err => {
                console.error("[Tx Hook] WS Connection error during setup:", err);
                if (isMounted) {
                    setIsLoading(false);
                    setError("WebSocket connection failed. Trying API fallback.");
                    fetchInitialTransactionsFallback(filters);
                }
            });
            
            return () => {
                console.log("[Tx Hook] Cleaning up specific WS subscription.");
                if (unsubscribeWs) unsubscribeWs();
                if (unsubscribeInitialWs) unsubscribeInitialWs();
                if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
            };
        };
        
        unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (!isMounted) return;
            const currentAuthUserId = user ? user.uid : null;
            setUserId(currentAuthUserId);

            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeInitialWs) unsubscribeInitialWs();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
            unsubscribeWs = null;
            unsubscribeInitialWs = null;
            initialFetchTimeout = null;

            if (currentAuthUserId) {
                console.log("[Tx Hook] User detected, setting up subscription & requesting data.");
                setTransactions([]);
                setIsLoading(true);
                setError(null);
                setupSubscription(currentAuthUserId, currentFilters);
            } else {
                console.log("[Tx Hook] User logged out, clearing transactions.");
                setTransactions([]);
                setIsLoading(false);
                setError(null);
            }
        });

        return () => {
            isMounted = false;
            console.log("[Tx Hook] Cleaning up auth listener and WS subscription on unmount.");
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeInitialWs) unsubscribeInitialWs();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
        };
    }, [currentFilters, fetchInitialTransactionsFallback, isLoading, transactions.length]);

    const refreshTransactions = useCallback((newFilters?: TransactionFilters) => {
        console.log("[Tx Hook] Refresh triggered with new filters:", newFilters);
        setCurrentFilters(prevFilters => ({ ...(prevFilters || {}), ...(newFilters || {}) }));
        setTransactions([]);
        setIsLoading(true);
        setError(null);
        // The useEffect will re-trigger due to currentFilters change
    }, []);

    return [transactions, isLoading, refreshTransactions];
}
