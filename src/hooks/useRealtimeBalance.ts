
'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToWebSocketMessages, ensureWebSocketConnection, requestInitialData } from '@/lib/websocket';
import { auth } from '@/lib/firebase'; // To check auth state

export function useRealtimeBalance(): [number | null, boolean, () => void] {
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null); // Track current user ID

    // Function to request balance update via WebSocket
    const requestBalanceUpdate = useCallback(() => {
        // Only request if user is logged in
        if (userId) {
             console.log("[Balance Hook] Requesting balance update via WS...");
             setIsLoading(true); // Set loading when requesting
             setError(null);
             requestInitialData('balance'); // Request balance via WebSocket
        } else {
            console.log("[Balance Hook] Request balance update skipped: No user logged in.");
        }
    }, [userId]); // Depend on userId

    useEffect(() => {
        let unsubscribeWs: (() => void) | null = null;
        let unsubscribeAuth: (() => void) | null = null;
        let isMounted = true;

        const setupSubscription = (currentUserId: string) => {
            if (!isMounted || !currentUserId) return;

            ensureWebSocketConnection(); // Ensure connection attempt

            console.log("[Balance Hook] Setting up WebSocket subscription for balance_update.");

            // Define the callback function
            const handleBalanceUpdate = (payload: any) => {
                if (!isMounted) return;
                console.log("[Balance Hook] Received balance_update via WS:", payload);
                if (typeof payload?.balance === 'number') {
                    setBalance(payload.balance);
                    setIsLoading(false); // Update received, no longer loading
                    setError(null); // Clear previous errors
                } else {
                    console.warn("[Balance Hook] Invalid balance update payload:", payload);
                    // Optionally keep loading until valid data arrives, or show error
                    // setIsLoading(false);
                    // setError("Received invalid balance data.");
                }
            };

            // Subscribe and store the unsubscribe function
            unsubscribeWs = subscribeToWebSocketMessages('balance_update', handleBalanceUpdate);

            // Request initial balance via WebSocket after setting up listener
            requestBalanceUpdate();
        };

        // Handle Authentication State Changes
        console.log("[Balance Hook] Setting up auth listener.");
        unsubscribeAuth = auth.onAuthStateChanged(user => {
             if (!isMounted) return;
             const currentUserId = user ? user.uid : null;
             setUserId(currentUserId); // Update user ID state
             console.log(`[Balance Hook] Auth state changed. User ID: ${currentUserId}`);

            if (unsubscribeWs) { // Clean up previous subscription if user changes or logs out
                console.log("[Balance Hook] Cleaning up previous WS subscription due to auth change.");
                unsubscribeWs();
                unsubscribeWs = null;
            }

            if (currentUserId) {
                // Reset state before setting up for new user or on initial login
                setBalance(null);
                setIsLoading(true);
                setError(null);
                setupSubscription(currentUserId);
            } else {
                // User logged out
                setBalance(0); // Reset balance to 0 on logout
                setIsLoading(false);
                setError(null);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
            console.log("[Balance Hook] Cleaning up WebSocket subscription and auth listener.");
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeAuth) unsubscribeAuth();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestBalanceUpdate]); // requestBalanceUpdate is memoized and includes userId dependency

    // Manual refresh function requests update via WS
    const refreshBalance = useCallback(() => {
        console.log("[Balance Hook] Manual refresh requested.");
        // requestBalanceUpdate will check for userId internally
        requestBalanceUpdate();
    }, [requestBalanceUpdate]);

    // Return balance, loading state, and refresh function
    return [balance, isLoading, refreshBalance];
}
