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

// Store callbacks for different message types
const messageCallbacks: Record<string, Set<(payload: any) => void>> = {}; // Use Set for easier unsubscribe

function connectWebSocket() {
    // Prevent multiple concurrent connection attempts
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
        console.log("WebSocket connection attempt skipped (already connecting or open).");
        return;
    }

    // Reset state for new connection attempt
    isConnecting = true;
    isConnected = false;
    isAuthenticated = false;

    console.log(`Attempting WebSocket connection to ${wsUrl}... (Attempt ${reconnectAttempts + 1})`);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected.");
        isConnected = true;
        isConnecting = false;
        reconnectAttempts = 0; // Reset attempts on successful connection
        authenticateWebSocket(); // Authenticate immediately
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data.toString());
            // console.log("WebSocket message received:", message.type); // Log less verbosely

            // Handle specific message types
            if (message.type === 'auth_success') {
                console.log("WebSocket authenticated.");
                isAuthenticated = true;
                // Send any queued messages again after auth
                sendQueuedMessages();
            } else if (message.type === 'auth_failed') {
                 console.error("WebSocket authentication failed:", message.payload?.message);
                 isAuthenticated = false;
                 // Handle auth failure - maybe close connection or prompt re-login?
                 // Consider closing if auth fails: ws?.close(1008, "Authentication Failed");
            } else if (message.type === 'error') {
                 console.error("WebSocket server error message:", message.payload);
                 // Optionally display a toast to the user
            } else if (message.type === 'pong') {
                 // Handle server pong if needed for custom heartbeat
                 console.log("Received pong from server.");
            } else {
                // Dispatch to registered callbacks
                const callbackSet = messageCallbacks[message.type];
                if (callbackSet) {
                    console.log(`Dispatching message type ${message.type} to ${callbackSet.size} listeners.`);
                    callbackSet.forEach(callback => {
                        try {
                            callback(message.payload)
                        } catch (callbackError) {
                            console.error(`Error in WebSocket callback for type ${message.type}:`, callbackError);
                        }
                    });
                } else {
                    console.warn(`No handler registered for WebSocket message type: ${message.type}`);
                }
            }
        } catch (e) {
            console.error("Error processing WebSocket message:", e, "Raw data:", event.data);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error event:", error);
        // Error handling is tricky here, onClose usually follows for cleanup/retry
        isConnecting = false; // Allow retry attempt from onClose
    };

    ws.onclose = (event) => {
        console.log(`WebSocket closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
        const wasConnecting = isConnecting; // Store if we were in the middle of connecting
        ws = null;
        isConnected = false;
        isAuthenticated = false;
        isConnecting = false; // Reset connecting flag

        // Retry logic: Don't retry on normal closure (1000) or policy violation (1008), or if max attempts reached
        if (event.code !== 1000 && event.code !== 1008 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`WebSocket connection lost or failed ${wasConnecting ? 'during connection' : 'unexpectedly'}. Retrying in ${RECONNECT_DELAY / 1000}s...`);
            setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
             console.error("WebSocket max reconnect attempts reached. Stopping retries.");
        } else {
             console.log("WebSocket closed normally or due to unrecoverable error. Not retrying.");
        }
    };
}

async function authenticateWebSocket() {
    if (!ws || ws.readyState !== WebSocket.OPEN || isAuthenticated || !auth.currentUser) {
        console.log("WebSocket auth skipped (not open, already authed, or no user).");
        return;
    }

    console.log("Attempting WebSocket authentication...");
    try {
        // Use the specific getIdToken function which handles refresh internally
        const token = await getIdToken(true); // Force refresh token for auth
        if (token && ws && ws.readyState === WebSocket.OPEN) { // Check again before sending
            console.log("Sending WebSocket authentication token...");
            ws.send(JSON.stringify({ type: 'authenticate', token }));
        } else if (!token) {
             console.warn("Could not get auth token for WebSocket authentication.");
             // Maybe close the connection if auth token is essential?
             // ws?.close(1008, "Auth token unavailable");
        }
    } catch (error) {
        console.error("Error getting token for WebSocket auth:", error);
        // Optionally close the connection on token error
        // ws?.close(1008, "Auth token error");
    }
}

function sendQueuedMessages() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) return;
    if (messageQueue.length > 0) {
        console.log(`Sending ${messageQueue.length} queued WebSocket messages...`);
        messageQueue.forEach(msg => {
            try {
                ws?.send(msg);
            } catch (sendError) {
                console.error("Error sending queued WebSocket message:", sendError, "Message:", msg);
            }
        });
        messageQueue = [];
    }
}


// Ensure authentication happens when auth state changes
let authUnsubscribe: (() => void) | null = null;
function setupAuthListener() {
    if (authUnsubscribe) authUnsubscribe(); // Remove previous listener if exists
    authUnsubscribe = auth.onAuthStateChanged((user) => {
        console.log("WebSocket: Auth state changed. User:", user?.uid || 'null');
        isAuthenticated = false; // Reset auth status on change
        if (user && ws && ws.readyState === WebSocket.OPEN) {
            authenticateWebSocket();
        } else if (!user && ws && ws.readyState === WebSocket.OPEN) {
             // Optional: Send logout message or close WS if user logs out?
             // ws.close(1000, "User logged out");
             console.log("WebSocket: User logged out, WS remains open but unauthenticated.");
             messageQueue = []; // Clear queue if user logs out
        }
    });
}

/**
 * Sends a JSON message through the WebSocket.
 * Queues message if connection is not ready or not authenticated.
 * @param message The message object to send.
 * @returns True if sent immediately, false if queued or failed.
 */
export function sendWebSocketMessage(message: object): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
        const messageString = JSON.stringify(message);
        console.log("WebSocket not ready or not authenticated, queueing message:", messageString);
        messageQueue.push(messageString);
        // Attempt to connect if not already connecting/open
        ensureWebSocketConnection(); // This handles connection/authentication attempts
        return false;
    }
    try {
        const messageString = JSON.stringify(message);
        ws.send(messageString);
        // console.log("WebSocket message sent:", message); // Less verbose logging
        return true;
    } catch (error) {
        console.error("Error sending WebSocket message:", error);
        return false;
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
    messageCallbacks[messageType].add(callback);
    console.log(`Subscribed to WebSocket message type: ${messageType}`);

    // Return an unsubscribe function
    return () => {
        if (messageCallbacks[messageType]) {
            messageCallbacks[messageType].delete(callback);
            console.log(`Unsubscribed from WebSocket message type: ${messageType}`);
            if (messageCallbacks[messageType].size === 0) {
                delete messageCallbacks[messageType];
            }
        }
    };
}

// --- Initialization ---

// Function to ensure connection is established (call before first send/subscribe or on demand)
export function ensureWebSocketConnection() {
    if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
        connectWebSocket();
        if (!authUnsubscribe) { // Setup listener only once
            setupAuthListener();
        }
    } else if (ws.readyState === WebSocket.OPEN && !isAuthenticated && auth.currentUser) {
         // Try authenticating if connected but not authed and user exists
         authenticateWebSocket();
    }
}

// Export a function similar to the one in server.js for consistency, but uses the client-side WebSocket
export function sendToUser(userId: string, message: any): boolean {
    // On the client, we don't target a specific user, we just send from the current user's connection
    console.warn("sendToUser called on client-side. Use sendWebSocketMessage instead.");
    // If you need to send a message that *should* be targeted server-side,
    // structure your message payload accordingly.
    // Example: return sendWebSocketMessage({ type: 'direct_message', targetUserId: userId, payload: message });
    return sendWebSocketMessage(message);
}

// Optional: Function to explicitly close the connection
export function closeWebSocket() {
    if (ws) {
        ws.close(1000, "Client requested closure");
        ws = null;
        isConnected = false;
        isAuthenticated = false;
        isConnecting = false;
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent retries after explicit close
    }
    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
    }
    // Clear all callbacks on explicit close
    Object.keys(messageCallbacks).forEach(key => delete messageCallbacks[key]);
    messageQueue = []; // Clear message queue
    console.log("WebSocket connection explicitly closed.");
}

// Example of requesting initial data via WebSocket after authentication
export function requestInitialData(dataType: string, filters?: any) {
    sendWebSocketMessage({
        type: `request_initial_${dataType}`,
        payload: filters || {}
    });
}