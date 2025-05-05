'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToWebSocketMessages, ensureWebSocketConnection, requestInitialData } from '@/lib/websocket';
import { getWalletBalance } from '@/services/wallet'; // For initial fetch fallback if needed
import { auth } from '@/lib/firebase'; // To check auth state

export function useRealtimeBalance(): [number | null, boolean, () => void] {
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Renamed function to avoid conflict, now requests via WS
    const requestBalanceUpdate = useCallback(() => {
        console.log("[Balance Hook] Requesting balance update via WS...");
        setIsLoading(true);
        setError(null);
        requestInitialData('balance'); // Request balance via WebSocket
    }, []);

    // Fallback: Fetch initial balance via API if WS doesn't provide it quickly
    const fetchInitialBalanceFallback = useCallback(async () => {
        // Avoid fetching if already fetched or currently loading
        if (balance !== null || isLoading) return;

        const user = auth.currentUser;
        if (!user) {
            // console.log("[Balance Hook] Fallback fetch skipped: No user.");
            setBalance(0); // Default to 0 if not logged in
            setIsLoading(false);
            return;
        }

        console.log("[Balance Hook] Executing API fallback for initial balance...");
        setIsLoading(true); // Ensure loading state is set
        setError(null);
        try {
            const initialBalance = await getWalletBalance(user.uid);
            // Only set if balance hasn't been updated by WS in the meantime
            setBalance(prev => prev === null ? initialBalance : prev);
            console.log("[Balance Hook] Initial balance fetched via API fallback:", initialBalance);
        } catch (err: any) {
            console.error("[Balance Hook] Error fetching initial balance via API fallback:", err);
            setError(err.message || "Could not fetch balance.");
            setBalance(prev => prev === null ? null : prev); // Keep existing balance if WS update happened
        } finally {
            // Only stop loading if balance hasn't been set by WS
            setIsLoading(prevLoading => balance === null ? false : prevLoading);
        }
    }, [balance, isLoading]); // Depend on balance and isLoading


    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        let authUnsubscribe: (() => void) | null = null;
        let initialFetchTimeout: NodeJS.Timeout | null = null;

        const setupSubscription = () => {
            ensureWebSocketConnection(); // Make sure WS is connected or connecting

            unsubscribe = subscribeToWebSocketMessages('balance_update', (payload) => {
                console.log("[Balance Hook] Received balance_update via WS:", payload);
                 if (initialFetchTimeout) clearTimeout(initialFetchTimeout); // Cancel fallback if WS provides data
                if (typeof payload?.balance === 'number') {
                    setBalance(payload.balance);
                    setIsLoading(false); // Update received, no longer loading
                    setError(null); // Clear previous errors on successful update
                } else {
                    console.warn("[Balance Hook] Invalid balance update payload:", payload);
                }
            });
             // Request initial balance via WebSocket after setting up listener
            requestBalanceUpdate();
            // Set a timeout for the API fallback
             initialFetchTimeout = setTimeout(fetchInitialBalanceFallback, 3000); // e.g., wait 3 seconds
        };

        // Handle Authentication State Changes
        authUnsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                console.log("[Balance Hook] User detected, setting up subscription & requesting data.");
                // Reset state before setting up for new user
                setBalance(null);
                setIsLoading(true);
                setError(null);
                if (unsubscribe) unsubscribe(); // Clean up old subscription first
                 if (initialFetchTimeout) clearTimeout(initialFetchTimeout); // Clear old timeout
                setupSubscription();
            } else {
                console.log("[Balance Hook] User logged out, clearing balance and unsubscribing.");
                if (unsubscribe) unsubscribe();
                 if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
                unsubscribe = null;
                initialFetchTimeout = null;
                setBalance(0); // Reset balance on logout
                setIsLoading(false);
                setError(null);
            }
        });

        // Cleanup function
        return () => {
            console.log("[Balance Hook] Cleaning up WebSocket subscription and auth listener.");
            if (unsubscribe) unsubscribe();
            if (authUnsubscribe) authUnsubscribe();
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Re-run setup only on mount/unmount

    // Manual refresh function requests update via WS
    const refreshBalance = useCallback(() => {
        console.log("[Balance Hook] Manual refresh requested.");
        requestBalanceUpdate();
         // Optionally trigger API fallback immediately if needed
         // fetchInitialBalanceFallback();
    }, [requestBalanceUpdate]);

    // Return balance, loading state, and refresh function
    return [balance, isLoading, refreshBalance];
}
