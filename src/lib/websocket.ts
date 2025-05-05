
/**
 * @fileOverview WebSocket client utility for real-time communication with the backend.
 */
import { auth } from './firebase';

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds
let wsUrl = process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:9003'; // Default WebSocket URL
let isConnected = false;
let isAuthenticated = false;
let messageQueue: string[] = []; // Queue messages if sent before connection/auth

// Store callbacks for different message types
const messageCallbacks: Record<string, ((payload: any) => void)[]> = {};

function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket already open or connecting.");
        return;
    }

    console.log(`Attempting WebSocket connection to ${wsUrl}... (Attempt ${reconnectAttempts + 1})`);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected.");
        isConnected = true;
        reconnectAttempts = 0; // Reset attempts on successful connection
        authenticateWebSocket(); // Authenticate immediately
        // Send any queued messages
        messageQueue.forEach(msg => ws?.send(msg));
        messageQueue = [];
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data.toString());
            console.log("WebSocket message received:", message.type);

            // Handle specific message types
            if (message.type === 'auth_success') {
                console.log("WebSocket authenticated.");
                isAuthenticated = true;
                 // Send any queued messages again after auth
                messageQueue.forEach(msg => ws?.send(msg));
                messageQueue = [];
            } else if (message.type === 'auth_failed') {
                 console.error("WebSocket authentication failed:", message.payload?.message);
                 isAuthenticated = false;
                 // Handle auth failure - maybe close connection or prompt re-login?
            } else {
                // Dispatch to registered callbacks
                const callbacks = messageCallbacks[message.type];
                if (callbacks) {
                    callbacks.forEach(callback => callback(message.payload));
                } else {
                    console.warn(`No handler registered for WebSocket message type: ${message.type}`);
                }
            }
        } catch (e) {
            console.error("Error processing WebSocket message:", e);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Error handling might be done in onClose
    };

    ws.onclose = (event) => {
        console.log(`WebSocket closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
        ws = null;
        isConnected = false;
        isAuthenticated = false;
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) { // Don't retry on normal closure (1000)
            reconnectAttempts++;
            console.log(`WebSocket closed unexpectedly. Retrying connection in ${RECONNECT_DELAY / 1000}s...`);
            setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
             console.error("WebSocket max reconnect attempts reached.");
        }
    };
}

async function authenticateWebSocket() {
    if (!ws || ws.readyState !== WebSocket.OPEN || isAuthenticated) return;

    const user = auth.currentUser;
    if (user) {
        try {
            const token = await user.getIdToken();
            if (ws && ws.readyState === WebSocket.OPEN) { // Check again before sending
                console.log("Sending WebSocket authentication token...");
                ws.send(JSON.stringify({ type: 'authenticate', token }));
            }
        } catch (error) {
            console.error("Error getting token for WebSocket auth:", error);
        }
    } else {
        console.log("No user logged in for WebSocket authentication.");
    }
}

// Ensure authentication happens when auth state changes
let authUnsubscribe: (() => void) | null = null;
function setupAuthListener() {
    if (authUnsubscribe) authUnsubscribe(); // Remove previous listener if exists
    authUnsubscribe = auth.onAuthStateChanged((user) => {
        console.log("WebSocket: Auth state changed. User:", user?.uid);
        isAuthenticated = false; // Reset auth status on change
        if (user && ws && ws.readyState === WebSocket.OPEN) {
            authenticateWebSocket();
        } else if (!user && ws && ws.readyState === WebSocket.OPEN) {
             // Optional: Send logout message or close WS if user logs out?
             // ws.close(1000, "User logged out");
             console.log("WebSocket: User logged out, WS remains open but unauthenticated.");
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
        console.log("WebSocket not ready or not authenticated, queueing message:", message);
        messageQueue.push(JSON.stringify(message));
        // Attempt to connect if not already connecting/open
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            connectWebSocket();
        } else if (ws.readyState === WebSocket.OPEN && !isAuthenticated) {
             // If connected but not authenticated, try authenticating again
             authenticateWebSocket();
        }
        return false;
    }
    try {
        ws.send(JSON.stringify(message));
        console.log("WebSocket message sent:", message);
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
        messageCallbacks[messageType] = [];
    }
    messageCallbacks[messageType].push(callback);
    console.log(`Subscribed to WebSocket message type: ${messageType}`);

    // Return an unsubscribe function
    return () => {
        if (messageCallbacks[messageType]) {
            messageCallbacks[messageType] = messageCallbacks[messageType].filter(cb => cb !== callback);
            console.log(`Unsubscribed from WebSocket message type: ${messageType}`);
            if (messageCallbacks[messageType].length === 0) {
                delete messageCallbacks[messageType];
            }
        }
    };
}

// --- Initialization ---
// Initial connection attempt (consider delaying until first use?)
// connectWebSocket();
// setupAuthListener(); // Start listening for auth changes

// Function to ensure connection is established (call before first send/subscribe)
export function ensureWebSocketConnection() {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        connectWebSocket();
        if (!authUnsubscribe) { // Setup listener only once
            setupAuthListener();
        }
    } else if (ws.readyState === WebSocket.OPEN && !isAuthenticated) {
         authenticateWebSocket(); // Try authenticating if connected but not authed
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
    }
    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
    }
}
