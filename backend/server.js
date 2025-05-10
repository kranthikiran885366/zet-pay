
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin'); // Import Firebase Admin

// Initialize Firebase Admin (Ensure this runs before other modules that need it)
try {
    require('./config/firebaseAdmin');
    console.log("[Server] Firebase Admin SDK initialized successfully.");
} catch (e) {
    console.error("[Server] CRITICAL: Failed to initialize Firebase Admin SDK. Check config/firebaseAdmin.js and environment variables.");
    process.exit(1); // Exit if Firebase Admin fails to initialize
}

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const asyncHandler = require('./middleware/asyncHandler'); // Import asyncHandler

// Import routes - Ensure all route files exist and are correctly named
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes.ts'); // Use .ts extension if applicable
const upiRoutes = require('./routes/upiRoutes');
const rechargeRoutes = require('./routes/rechargeRoutes');
const billsRoutes = require('./routes/billsRoutes');
const walletRoutes = require('./routes/walletRoutes.ts'); // Use .ts extension if applicable
const offerRoutes = require('./routes/offerRoutes');
const passesRoutes = require('./routes/passesRoutes');
const templeRoutes = require('./routes/templeRoutes');
const contactsRoutes = require('./routes/contactsRoutes');
const cardsRoutes = require('./routes/cardsRoutes');
const autopayRoutes = require('./routes/autopayRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const hyperlocalRoutes = require('./routes/hyperlocalRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const liveTrackingRoutes = require('./routes/liveTrackingRoutes');
const blockchainRoutes = require('./routes/blockchainRoutes');
const loanRoutes = require('./routes/loanRoutes');
const pocketMoneyRoutes = require('./routes/pocketMoneyRoutes');
const cashWithdrawalRoutes = require('./routes/cashWithdrawalRoutes');
const bnplRoutes = require('./routes/bnplRoutes');
const bankStatusRoutes = require('./routes/bankStatusRoutes');
const serviceRoutes = require('./routes/serviceRoutes'); // Generic service routes if any
const supportRoutes = require('./routes/supportRoutes'); // Add support routes if created
const entertainmentRoutes = require('./routes/entertainmentRoutes');
const shoppingRoutes = require('./routes/shoppingRoutes'); // Added shopping routes
const scanRoutes = require('./routes/scanRoutes'); // Added scan routes
const vaultRoutes = require('./routes/vaultRoutes'); // Added vault routes


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Middleware ---
app.use(cors()); // Configure origins in production: app.use(cors({ origin: 'YOUR_FRONTEND_URL' }));
app.use(helmet()); // Basic security headers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging HTTP requests

// Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Adjusted limit for production
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' }, // Send JSON response
    keyGenerator: (req) => req.ip, // Default key generator
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(options.statusCode).json(options.message); // Ensure JSON response on rate limit
    }
});
app.use('/api/', limiter); // Apply rate limiting to all API routes

// --- WebSocket Setup ---
const authenticatedClients = new Map(); // Map userId to WebSocket

// Function to verify Firebase ID token for WebSocket connection
async function verifyWsToken(token) {
    if (!token) {
        console.log("[WS Server] Auth attempt with no token.");
        return null;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) { // Type error as any
        console.error(`[WS Server] Auth Error: ${error.code || error.message}`);
        return null;
    }
}

wss.on('connection', (ws, req) => {
    // Extract IP for logging/debugging
    const ip = req.socket.remoteAddress;
    console.log(`[WS Server] Client connected from IP: ${ip}`);
    let userId = null; // Keep userId scoped to the connection
    ws.isAlive = true; // For heartbeat

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async (message) => {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.toString());
             console.log(`[WS Server] Received message type '${parsedMessage.type}' from ${userId || ip}`);
        } catch (e) {
            console.error(`[WS Server] Failed to parse WebSocket message from ${ip}:`, message.toString());
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format.' } }));
            return;
        }

        try {
            // Handle Authentication Message
            if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
                const authenticatedUserId = await verifyWsToken(parsedMessage.token);
                if (authenticatedUserId) {
                    userId = authenticatedUserId;
                    // Clean up old connection if user reconnects from same session but different WS instance
                    const existingWs = authenticatedClients.get(userId);
                    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
                        console.log(`[WS Server] Terminating previous WebSocket connection for user ${userId}`);
                        existingWs.terminate();
                    }
                    authenticatedClients.set(userId, ws);
                    ws.userId = userId; // Attach userId to ws object for easier cleanup
                    console.log(`[WS Server] Client authenticated and mapped to user: ${userId}`);
                    ws.send(JSON.stringify({ type: 'auth_success', payload: { userId: userId } }));
                    // Trigger initial data push if needed upon successful auth
                    // e.g., sendBalanceUpdate(userId, await getWalletBalanceInternal(userId));
                } else {
                    console.log(`[WS Server] WebSocket Authentication Failed for client from ${ip}.`);
                    ws.send(JSON.stringify({ type: 'auth_failed', payload: { message: 'Invalid authentication token.' } }));
                    ws.close(1008, 'Authentication failed');
                }
            }
            // Handle other authenticated messages
            else if (userId) {
                // Handle requests for initial data (e.g., transactions, balance)
                 if (parsedMessage.type === 'request_initial_transactions') {
                     console.log(`[WS Server] Received request for initial transactions from ${userId}`);
                     // TODO: Implement logic to fetch initial transactions based on payload filters
                     // const filters = parsedMessage.payload;
                     // const transactions = await fetchRecentTransactionsForUser(userId, filters);
                     // ws.send(JSON.stringify({ type: 'initial_transactions', payload: transactions }));
                     ws.send(JSON.stringify({ type: 'initial_transactions', payload: [] })); // Send empty for now
                 } else if (parsedMessage.type === 'request_initial_balance') {
                    console.log(`[WS Server] Received request for initial balance from ${userId}`);
                    // TODO: Implement logic to fetch current balance
                    // const balance = await fetchUserBalance(userId);
                    // ws.send(JSON.stringify({ type: 'balance_update', payload: { balance } }));
                     ws.send(JSON.stringify({ type: 'balance_update', payload: { balance: Math.random() * 1000 } })); // Send random for now
                 }
                 else if (parsedMessage.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' })); // Respond to client ping
                 }
                else {
                    console.log(`[WS Server] Received unhandled message type '${parsedMessage.type}' from user ${userId}`);
                    // ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unknown message type.' } }));
                }
            } else {
                console.log(`[WS Server] Received message from unauthenticated client (${ip}). Type: ${parsedMessage.type}`);
                ws.send(JSON.stringify({ type: 'error', payload: { message: 'Please authenticate first.' } }));
            }
        } catch(handlerError) {
             console.error(`[WS Server] Error handling message type ${parsedMessage?.type} from ${userId || ip}:`, handlerError);
             ws.send(JSON.stringify({ type: 'error', payload: { message: 'Error processing your request.' } }));
        }
    });

    ws.on('close', (code, reason) => {
        const reasonString = reason ? reason.toString() : 'No reason specified';
         console.log(`[WS Server] Client disconnected. Code: ${code}, Reason: ${reasonString}, User: ${userId || 'unauthenticated'}, IP: ${ip}`);
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
            console.log(`[WS Server] Removed client mapping for user: ${userId}`);
        }
    });

    ws.on('error', (error) => {
        console.error(`[WS Server] Error for user ${userId || 'unauthenticated'} (IP: ${ip}):`, error);
        // Clean up on error, similar to close
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
             console.log(`[WS Server] Removed client mapping due to error for user: ${userId}`);
        }
    });
});

// Heartbeat interval to check for dead connections
const interval = setInterval(() => {
    authenticatedClients.forEach((ws, userId) => {
        if (ws.isAlive === false) {
            console.log(`[WS Server] Terminating inactive WebSocket connection for user: ${userId}`);
            authenticatedClients.delete(userId);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {}); // Send ping
    });
}, 30000); // Check every 30 seconds

wss.on('close', () => {
    console.log("[WS Server] Server closing, clearing heartbeat interval.");
    clearInterval(interval);
});


// --- WebSocket Helper Functions ---

/**
 * Sends a message to a specific connected and authenticated user.
 * @param {string} targetUserId - The Firebase UID of the target user.
 * @param {any} message - The message object to send (must be JSON-serializable).
 * @returns {boolean} True if the message was sent, false otherwise.
 */
function sendToUser(targetUserId, message) {
    const clientWs = authenticatedClients.get(targetUserId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        try {
            const data = JSON.stringify(message);
             console.log(`[WS Server] Sending message type '${message.type}' to user ${targetUserId}`);
            clientWs.send(data);
            return true;
        } catch (error) {
            console.error(`[WS Server] Error sending message to user ${targetUserId}:`, error);
            // Optional: Remove client on send error? Could be temporary issue.
            // authenticatedClients.delete(targetUserId);
            return false;
        }
    } else {
         // console.log(`[WS Server] Client for user ${targetUserId} not connected or not open.`);
        return false; // User not connected
    }
}

/**
 * Broadcasts a message to all connected and authenticated clients.
 * Use sparingly to avoid unnecessary traffic.
 * @param {any} message - The message object to broadcast.
 */
function broadcast(message) {
    if (authenticatedClients.size === 0) return;
    try {
        const data = JSON.stringify(message);
        console.log(`[WS Server] Broadcasting message type '${message.type}' to ${authenticatedClients.size} clients.`);
        authenticatedClients.forEach((clientWs, userId) => { // Added userId for logging
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data, (err) => {
                    if (err) console.error(`[WS Server] Error sending broadcast message to user ${userId}:`, err);
                });
            }
        });
    } catch (error) {
         console.error("[WS Server] Error broadcasting message:", error);
    }
}

// Export functions for use in controllers/services
// Make sure these are required correctly in the files that need them
module.exports = { broadcast, sendToUser };


// --- API Routes ---
app.get('/api/health', asyncHandler(async (req, res) => { // Wrap simple routes too
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
}));

// Public or non-user specific routes (apply asyncHandler implicitly via route files if used there)
app.use('/api/live', liveTrackingRoutes);
app.use('/api/banks', bankStatusRoutes);
app.use('/api/shopping', shoppingRoutes); // Add public shopping routes (categories, products)

// Auth routes (typically public, authentication happens within controllers)
app.use('/api/auth', authRoutes);

// Protected routes (apply authMiddleware first)
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/upi', authMiddleware, upiRoutes);
app.use('/api/recharge', authMiddleware, rechargeRoutes);
app.use('/api/bills', authMiddleware, billsRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/offers', authMiddleware, offerRoutes);
app.use('/api/passes', authMiddleware, passesRoutes);
app.use('/api/temple', authMiddleware, templeRoutes);
app.use('/api/contacts', authMiddleware, contactsRoutes);
app.use('/api/cards', authMiddleware, cardsRoutes);
app.use('/api/autopay', authMiddleware, autopayRoutes);
app.use('/api/bookings', authMiddleware, bookingRoutes);
app.use('/api/hyperlocal', authMiddleware, hyperlocalRoutes);
app.use('/api/invest', authMiddleware, investmentRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/blockchain', authMiddleware, blockchainRoutes);
app.use('/api/loans', authMiddleware, loanRoutes);
app.use('/api/pocket-money', authMiddleware, pocketMoneyRoutes);
app.use('/api/cash-withdrawal', authMiddleware, cashWithdrawalRoutes);
app.use('/api/bnpl', authMiddleware, bnplRoutes);
app.use('/api/services', authMiddleware, serviceRoutes); // Generic services
app.use('/api/support', authMiddleware, supportRoutes); // Support endpoint
app.use('/api/entertainment', authMiddleware, entertainmentRoutes);
app.use('/api/shopping/orders', authMiddleware, shoppingRoutes); // Protected shopping order routes
app.use('/api/scan', authMiddleware, scanRoutes);
app.use('/api/vault', authMiddleware, vaultRoutes); // Add Vault routes


// --- Error Handling ---
// 404 Handler (after all other routes)
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`); // Create an error object
    error.statusCode = 404;
    next(error); // Pass error to the central handler
});

// Central Error Handler (Must be the LAST middleware)
app.use(errorMiddleware);

// --- Start Server ---
const PORT = process.env.PORT || 9003;
server.listen(PORT, () => {
  console.log(`[Server] PayFriend Backend listening on port ${PORT}`);
  console.log(`[WS Server] WebSocket server started on the same port.`);
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log(`[Server] ${signal} signal received: closing HTTP server.`);
    clearInterval(interval); // Stop heartbeat
    server.close(() => {
        console.log('[Server] HTTP server closed.');
        // Close WebSocket server connections
        wss.close(() => {
            console.log("[WS Server] WebSocket server closed.");
            // Close Firebase Admin connection if necessary (optional)
            // admin.app().delete().then(() => console.log('Firebase Admin closed.'));
            process.exit(0); // Exit after cleanup
        });
        // Force close remaining WS connections after a timeout
        setTimeout(() => {
             console.log("[WS Server] Forcing remaining client connections closed.");
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.terminate();
                }
            });
            process.exit(0);
        }, 5000); // 5 second timeout
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
