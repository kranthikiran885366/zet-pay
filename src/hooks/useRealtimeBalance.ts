
'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToWebSocketMessages, ensureWebSocketConnection, requestInitialData } from '@/lib/websocket';
// Removed: import { getWalletBalance } from '@/services/wallet';
import { auth } from '@/lib/firebase'; // To check auth state

export function useRealtimeBalance(): [number | null, boolean, () => void] {
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Function to request balance update via WebSocket
    const requestBalanceUpdate = useCallback(() => {
        console.log("[Balance Hook] Requesting balance update via WS...");
        setIsLoading(true); // Set loading when requesting
        setError(null);
        requestInitialData('balance'); // Request balance via WebSocket
    }, []);

    useEffect(() => {
        let unsubscribeWs: (() => void) | null = null;
        let unsubscribeAuth: (() => void) | null = null;
        let isMounted = true;

        const setupSubscription = () => {
            if (!isMounted) return;
            ensureWebSocketConnection(); // Ensure connection attempt

            console.log("[Balance Hook] Setting up WebSocket subscription for balance_update.");
            unsubscribeWs = subscribeToWebSocketMessages('balance_update', (payload) => {
                 if (!isMounted) return;
                console.log("[Balance Hook] Received balance_update via WS:", payload);
                if (typeof payload?.balance === 'number') {
                    setBalance(payload.balance);
                    setIsLoading(false); // Update received, no longer loading
                    setError(null); // Clear previous errors
                } else {
                    console.warn("[Balance Hook] Invalid balance update payload:", payload);
                    // Optionally set error state or keep loading until valid data arrives
                    // setIsLoading(false); // Decide if invalid payload stops loading
                    // setError("Received invalid balance data.");
                }
            });

            // Request initial balance via WebSocket after setting up listener
            requestBalanceUpdate();
        };

        // Handle Authentication State Changes
        console.log("[Balance Hook] Setting up auth listener.");
        unsubscribeAuth = auth.onAuthStateChanged(user => {
             if (!isMounted) return;
             console.log(`[Balance Hook] Auth state changed. User: ${user ? 'Present' : 'Absent'}`);
            if (user) {
                // Reset state before setting up for new user or on initial login
                setBalance(null);
                setIsLoading(true);
                setError(null);
                if (unsubscribeWs) unsubscribeWs(); // Clean up old WebSocket subscription first
                setupSubscription();
            } else {
                // User logged out
                if (unsubscribeWs) unsubscribeWs();
                unsubscribeWs = null;
                setBalance(0); // Reset balance to 0 on logout
                setIsLoading(false);
                setError(null);
            }
        });

        // Initial check in case auth state is already available
        if (auth.currentUser) {
             console.log("[Balance Hook] Initial user found, setting up subscription.");
             setupSubscription();
        } else {
             console.log("[Balance Hook] No initial user found, waiting for auth state change.");
             setIsLoading(false); // Not loading if no user initially
             setBalance(0);
        }


        // Cleanup function
        return () => {
            isMounted = false;
            console.log("[Balance Hook] Cleaning up WebSocket subscription and auth listener.");
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeAuth) unsubscribeAuth();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount/unmount

    // Manual refresh function requests update via WS
    const refreshBalance = useCallback(() => {
        console.log("[Balance Hook] Manual refresh requested.");
        if (auth.currentUser) {
             requestBalanceUpdate();
        } else {
             console.log("[Balance Hook] Manual refresh skipped: No user logged in.");
        }
    }, [requestBalanceUpdate]);

    // Return balance, loading state, and refresh function
    return [balance, isLoading, refreshBalance];
}

    