/**
 * @fileOverview WebSocket client utility for real-time communication with the backend.
 */
import { auth, getIdToken } from './firebase'; // Import getIdToken directly

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds
let wsUrl = process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:9003'; // Default WebSocket URL
let isConnecting = false; // Flag to prevent multiple connection attempts
let isConnected = false;
let isAuthenticated = false;
let messageQueue: string[] = []; // Queue messages if sent before connection/auth
let reconnectTimeoutId: NodeJS.Timeout | null = null; // Store reconnect timeout ID

// Store callbacks for different message types
const messageCallbacks: Record<string, Set<(payload: any) => void>> = {}; // Use Set for easier unsubscribe

function connectWebSocket() {
    // Prevent multiple concurrent connection attempts
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
        // console.log("[WS Client] Connection attempt skipped (already connecting or open).");
        return;
    }

    // Clear any pending reconnect timeouts
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }

    // Reset state for new connection attempt
    isConnecting = true;
    isConnected = false;
    isAuthenticated = false; // Reset auth status on new connection attempt

    console.log(`[WS Client] Attempting connection to ${wsUrl}... (Attempt ${reconnectAttempts + 1})`);
    try {
        ws = new WebSocket(wsUrl);
    } catch (error) {
         console.error("[WS Client] WebSocket constructor failed:", error);
         isConnecting = false; // Allow retry attempt from onClose/onError simulation
         scheduleReconnect(); // Schedule a retry if constructor fails
         return;
    }


    ws.onopen = () => {
        console.log("[WS Client] Connected.");
        isConnected = true;
        isConnecting = false;
        reconnectAttempts = 0; // Reset attempts on successful connection
        authenticateWebSocket(); // Authenticate immediately if user is logged in
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data.toString());
            // console.log("[WS Client] Message received:", message.type); // Log only type for brevity

            // Handle specific message types
            if (message.type === 'auth_success') {
                console.log("[WS Client] Authenticated.");
                isAuthenticated = true;
                // Send any queued messages again after auth
                sendQueuedMessages();
            } else if (message.type === 'auth_failed') {
                 console.error("[WS Client] Authentication failed:", message.payload?.message);
                 isAuthenticated = false;
                 // Handle auth failure - maybe close connection or prompt re-login?
                 // Consider closing if auth fails: ws?.close(1008, "Authentication Failed");
            } else if (message.type === 'error') {
                 console.error("[WS Client] Server error message:", message.payload);
                 // Optionally display a toast to the user
            } else if (message.type === 'pong') {
                 // Handle server pong if needed for custom heartbeat
                 // console.log("Received pong from server.");
            } else {
                // Dispatch to registered callbacks
                const callbackSet = messageCallbacks[message.type];
                if (callbackSet) {
                    // console.log(`[WS Client] Dispatching type ${message.type} to ${callbackSet.size} listeners.`);
                    callbackSet.forEach(callback => {
                        try {
                            callback(message.payload)
                        } catch (callbackError) {
                            console.error(`[WS Client] Error in callback for type ${message.type}:`, callbackError);
                        }
                    });
                } else {
                    // console.warn(`[WS Client] No handler for message type: ${message.type}`);
                }
            }
        } catch (e) {
            console.error("[WS Client] Error processing message:", e, "Raw data:", event.data);
        }
    };

    ws.onerror = (error) => {
        console.error("[WS Client] Error event:", error);
        // Error handling is tricky here, onClose usually follows for cleanup/retry
        // Ensure connecting flag is reset if an error occurs during connection attempt
        if (isConnecting) {
            isConnecting = false;
        }
        // The 'onclose' event will handle scheduling the reconnect.
    };

    ws.onclose = (event) => {
        console.log(`[WS Client] Closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
        const wasConnecting = isConnecting; // Store if we were in the middle of connecting
        ws = null;
        isConnected = false;
        isAuthenticated = false;
        isConnecting = false; // Reset connecting flag

        // Schedule reconnect if appropriate
        scheduleReconnect(event.code);
    };
}

function scheduleReconnect(closeCode?: number) {
     // Retry logic: Don't retry on normal closure (1000) or policy violation (1008), or if max attempts reached
    if (closeCode !== 1000 && closeCode !== 1008 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        if (!reconnectTimeoutId) { // Prevent scheduling multiple reconnects
            reconnectAttempts++;
            const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
            console.log(`[WS Client] Connection lost or failed. Retrying in ${delay / 1000}s (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            reconnectTimeoutId = setTimeout(() => {
                reconnectTimeoutId = null; // Clear the timeout ID before attempting connection
                connectWebSocket();
            }, delay);
        } else {
            // console.log("[WS Client] Reconnect already scheduled.");
        }
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
         console.error("[WS Client] Max reconnect attempts reached. Stopping retries.");
    } else {
         console.log(`[WS Client] Closed with code ${closeCode}. Not retrying.`);
    }
}

async function authenticateWebSocket() {
    const currentUser = auth.currentUser;
    // Check WS state *before* getting token
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log("[WS Client] Auth skipped: WS not open.");
        return;
    }
    if (isAuthenticated) {
         console.log("[WS Client] Auth skipped: Already authenticated.");
         return;
    }
     if (!currentUser) {
        console.log("[WS Client] Auth skipped: No user logged in.");
        return;
    }


    console.log("[WS Client] Attempting authentication...");
    try {
        const token = await getIdToken(true); // Force refresh token for auth
        // Check WS state *again* before sending, as it might have closed
        if (token && ws && ws.readyState === WebSocket.OPEN) {
            console.log("[WS Client] Sending auth token...");
            ws.send(JSON.stringify({ type: 'authenticate', token }));
        } else if (!token) {
             console.warn("[WS Client] Could not get auth token for WebSocket authentication.");
             // Maybe close the connection if auth token is essential?
             // ws?.close(1008, "Auth token unavailable");
        } else {
             console.log("[WS Client] Auth skipped: WS closed before token could be sent.");
        }
    } catch (error) {
        console.error("[WS Client] Error getting token for WebSocket auth:", error);
        // Optionally close the connection on token error
        // ws?.close(1008, "Auth token error");
    }
}

function sendQueuedMessages() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
        // console.log("[WS Client] Cannot send queued messages (WS not ready or not authenticated).");
        return;
    }
    if (messageQueue.length > 0) {
        console.log(`[WS Client] Sending ${messageQueue.length} queued messages...`);
        let currentQueue = [...messageQueue]; // Copy queue before clearing
        messageQueue = []; // Clear queue optimistically
        currentQueue.forEach(msg => {
            try {
                ws?.send(msg);
            } catch (sendError) {
                console.error("[WS Client] Error sending queued message:", sendError, "Message:", msg);
                 messageQueue.push(msg); // Re-queue on error? Risky, could lead to loops. Check error type.
            }
        });
        // Check if re-queued items exist
        if (messageQueue.length > 0) {
             console.warn(`[WS Client] ${messageQueue.length} messages failed to send and were re-queued.`);
        }
    }
}


// Ensure authentication happens when auth state changes
let authUnsubscribe: (() => void) | null = null;
function setupAuthListener() {
    if (authUnsubscribe) return; // Setup only once
    authUnsubscribe = auth.onAuthStateChanged((user) => {
        console.log("[WS Client] Auth state changed. User:", user?.uid || 'null');
        const needsReAuth = isAuthenticated && !user; // If we were authed, but user is now null
        const needsAuth = !isAuthenticated && user; // If we weren't authed, but user exists now

        isAuthenticated = !!user; // Update auth status

        if (needsReAuth) {
            console.log("[WS Client] User logged out, WS remains open but unauthenticated.");
            messageQueue = []; // Clear queue if user logs out
            // Optional: Close connection on logout? ws?.close(1000, "User logged out");
        } else if (needsAuth && ws && ws.readyState === WebSocket.OPEN) {
            authenticateWebSocket(); // Authenticate if connection is open and user logged in
        } else if (needsAuth && (!ws || ws.readyState !== WebSocket.OPEN)) {
            console.log("[WS Client] User logged in, ensuring WS connection for authentication.");
             ensureWebSocketConnection(); // Make sure connection attempt happens if not open
        }
    });
    console.log("[WS Client] Auth state listener set up.");
}

/**
 * Sends a JSON message through the WebSocket.
 * Queues message if connection is not ready or not authenticated.
 * @param message The message object to send.
 * @returns True if sent immediately, false if queued or failed to queue/send.
 */
export function sendWebSocketMessage(message: object): boolean {
    const messageString = JSON.stringify(message);
    // Queue if not connected OR not authenticated
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
        console.log("[WS Client] Not ready or not authenticated, queueing message:", (message as any)?.type);
        messageQueue.push(messageString);
        // Attempt to connect if not already connecting/open
        ensureWebSocketConnection(); // This handles connection/authentication attempts
        return false; // Queued, not sent immediately
    }
    try {
        ws.send(messageString);
        // console.log("[WS Client] WebSocket message sent:", (message as any)?.type); // Less verbose logging
        return true;
    } catch (error) {
        console.error("[WS Client] Error sending message:", error, "Message:", messageString);
        // Optional: Re-queue message on specific send errors?
        // messageQueue.push(messageString);
        return false; // Send failed
    }
}

/**
 * Registers a callback function for a specific message type.
 * @param messageType The type of message to listen for.
 * @param callback The function to execute when a message of that type is received.
 * @returns An unsubscribe function.
 */
export function subscribeToWebSocketMessages(messageType: string, callback: (payload: any) => void): () => void {
    if (!messageCallbacks[messageType]) {
        messageCallbacks[messageType] = new Set();
    }
    if (messageCallbacks[messageType].has(callback)) {
        // console.warn(`[WS Client] Callback already registered for message type: ${messageType}`);
        // Return a no-op unsubscribe function if already registered
        return () => {};
    }

    messageCallbacks[messageType].add(callback);
    // console.log(`[WS Client] Subscribed to message type: ${messageType}`);

    // Return an unsubscribe function
    return () => {
        if (messageCallbacks[messageType]) {
            messageCallbacks[messageType].delete(callback);
            // console.log(`[WS Client] Unsubscribed from message type: ${messageType}`);
            if (messageCallbacks[messageType].size === 0) {
                delete messageCallbacks[messageType];
                // console.log(`[WS Client] No listeners remaining for type: ${messageType}`);
            }
        }
    };
}

// --- Initialization ---

/**
 * Ensures WebSocket connection is established or being attempted.
 * Sets up the auth listener if not already done.
 */
export function ensureWebSocketConnection() {
    // Setup auth listener if needed (safe to call multiple times due to internal check)
    setupAuthListener();

    if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
        connectWebSocket();
    }
    // Also try authenticating if connected but not authed (e.g., after page load before auth state change)
    else if (ws?.readyState === WebSocket.OPEN && !isAuthenticated && auth.currentUser) {
         authenticateWebSocket();
    }
}

/**
 * @deprecated Use sendWebSocketMessage instead. Client-side cannot target specific users.
 */
export function sendToUser(userId: string, message: any): boolean {
    console.warn("sendToUser called on client-side. Use sendWebSocketMessage instead.");
    return sendWebSocketMessage(message);
}

/**
 * Explicitly closes the WebSocket connection and cleans up listeners.
 */
export function closeWebSocket() {
    console.log("[WS Client] Explicitly closing connection...");
    if (reconnectTimeoutId) { // Cancel any pending reconnect attempts
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent retries after explicit close

    if (ws) {
        ws.close(1000, "Client requested closure"); // Use normal closure code
        ws = null;
    }

    isConnected = false;
    isAuthenticated = false;
    isConnecting = false;

    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
        console.log("[WS Client] Auth listener cleaned up.");
    }
    // Clear all callbacks on explicit close
    Object.keys(messageCallbacks).forEach(key => delete messageCallbacks[key]);
    messageQueue = []; // Clear message queue
    console.log("[WS Client] Connection closed and resources cleaned up.");
}

/**
 * Requests initial data for a specific type via WebSocket.
 * Ensures the connection is active before sending.
 * @param dataType e.g., 'transactions', 'balance'
 * @param filters Optional filters for the request.
 */
export function requestInitialData(dataType: string, filters?: any) {
    console.log(`[WS Client] Requesting initial data for type: ${dataType}`);
    ensureWebSocketConnection(); // Make sure we're connected/connecting/authenticating
    sendWebSocketMessage({
        type: `request_initial_${dataType}`,
        payload: filters || {}
    });
}
