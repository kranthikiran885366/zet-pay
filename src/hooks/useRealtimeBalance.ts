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
        if (userId) {
             console.log("[Balance Hook] Requesting balance update via WS...");
             setIsLoading(true);
             setError(null);
             ensureWebSocketConnection().then(() => { // Ensure connection before requesting
                requestInitialData('balance');
             }).catch(err => {
                console.error("[Balance Hook] WS Connection error before requesting balance:", err);
                setIsLoading(false);
                setError("WebSocket connection failed.");
             });
        } else {
            console.log("[Balance Hook] Request balance update skipped: No user logged in.");
            setBalance(0); // Reset balance if no user
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let unsubscribeWs: (() => void) | null = null;
        let unsubscribeAuth: (() => void) | null = null;
        let isMounted = true;

        const setupSubscription = (currentUserId: string) => {
            if (!isMounted || !currentUserId) return;

            ensureWebSocketConnection().then(() => {
                console.log("[Balance Hook] Setting up WebSocket subscription for balance_update.");

                const handleBalanceUpdate = (payload: any) => {
                    if (!isMounted) return;
                    console.log("[Balance Hook] Received balance_update via WS:", payload);
                    if (typeof payload?.balance === 'number') {
                        setBalance(payload.balance);
                        setIsLoading(false);
                        setError(null);
                    } else {
                        console.warn("[Balance Hook] Invalid balance update payload:", payload);
                    }
                };

                unsubscribeWs = subscribeToWebSocketMessages('balance_update', handleBalanceUpdate);
                requestInitialData('balance'); // Request initial balance after setting up listener
            }).catch(err => {
                console.error("[Balance Hook] WS Connection error during setup:", err);
                if (isMounted) {
                    setIsLoading(false);
                    setError("WebSocket connection failed.");
                }
            });
        };

        console.log("[Balance Hook] Setting up auth listener.");
        unsubscribeAuth = auth.onAuthStateChanged(user => {
             if (!isMounted) return;
             const currentUserId = user ? user.uid : null;
             setUserId(currentUserId);
             console.log(`[Balance Hook] Auth state changed. User ID: ${currentUserId}`);

            if (unsubscribeWs) {
                console.log("[Balance Hook] Cleaning up previous WS subscription due to auth change.");
                unsubscribeWs();
                unsubscribeWs = null;
            }

            if (currentUserId) {
                setBalance(null);
                setIsLoading(true);
                setError(null);
                setupSubscription(currentUserId);
            } else {
                setBalance(0); // Reset balance to 0 on logout
                setIsLoading(false);
                setError(null);
            }
        });

        return () => {
            isMounted = false;
            console.log("[Balance Hook] Cleaning up WebSocket subscription and auth listener.");
            if (unsubscribeWs) unsubscribeWs();
            if (unsubscribeAuth) unsubscribeAuth();
        };
    }, []); // Removed requestBalanceUpdate from dependencies to avoid loop, initial call is handled by auth state change

    const refreshBalance = useCallback(() => {
        console.log("[Balance Hook] Manual refresh requested.");
        requestBalanceUpdate();
    }, [requestBalanceUpdate]);

    return [balance, isLoading, refreshBalance];
}

