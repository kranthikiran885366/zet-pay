'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToWebSocketMessages, ensureWebSocketConnection } from '@/lib/websocket';
import { getWalletBalance } from '@/services/wallet'; // For initial fetch
import { auth } from '@/lib/firebase'; // To check auth state

export function useRealtimeBalance(): [number | null, boolean, () => void] {
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInitialBalance = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const user = auth.currentUser;
        if (!user) {
            // console.log("useRealtimeBalance: No user logged in for initial fetch.");
            setBalance(0); // Default to 0 if not logged in
            setIsLoading(false);
            return;
        }
        try {
            console.log("useRealtimeBalance: Fetching initial balance via API...");
            const initialBalance = await getWalletBalance(user.uid);
            setBalance(initialBalance);
            console.log("useRealtimeBalance: Initial balance fetched:", initialBalance);
        } catch (err: any) {
            console.error("useRealtimeBalance: Error fetching initial balance:", err);
            setError(err.message || "Could not fetch balance.");
            setBalance(null); // Indicate error state
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        let authUnsubscribe: (() => void) | null = null;

        const setupSubscription = () => {
            ensureWebSocketConnection(); // Make sure WS is connected or connecting

            unsubscribe = subscribeToWebSocketMessages('balance_update', (payload) => {
                console.log("useRealtimeBalance: Received balance_update via WS:", payload);
                if (typeof payload?.balance === 'number') {
                    setBalance(payload.balance);
                    setIsLoading(false); // Update received, no longer loading
                    setError(null); // Clear previous errors on successful update
                } else {
                    console.warn("useRealtimeBalance: Invalid balance update payload received:", payload);
                }
            });
        };

        // Handle Authentication State Changes
        authUnsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                console.log("useRealtimeBalance: User detected, fetching initial balance and setting up WS subscription.");
                fetchInitialBalance(); // Fetch initial balance on login
                if (!unsubscribe) { // Set up subscription only if not already set up
                    setupSubscription();
                }
            } else {
                console.log("useRealtimeBalance: User logged out, clearing balance and unsubscribing.");
                setBalance(0); // Reset balance on logout
                setIsLoading(false);
                setError(null);
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
            }
        });

        // Initial check
        if (auth.currentUser) {
            fetchInitialBalance();
             if (!unsubscribe) { // Set up subscription only if not already set up
                 setupSubscription();
             }
        } else {
            setIsLoading(false); // Not logged in, stop loading
            setBalance(0);
        }


        // Cleanup function
        return () => {
            console.log("useRealtimeBalance: Cleaning up WebSocket subscription and auth listener.");
            if (unsubscribe) {
                unsubscribe();
            }
            if (authUnsubscribe) {
                authUnsubscribe();
            }
        };
    }, [fetchInitialBalance]);

    // Manual refresh function
    const refreshBalance = useCallback(() => {
        console.log("useRealtimeBalance: Manual refresh requested.");
        fetchInitialBalance();
    }, [fetchInitialBalance]);

    // Return balance, loading state, and refresh function
    return [balance, isLoading, refreshBalance];
}