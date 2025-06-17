
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const morgan = require('morgan'); // HTTP request logger
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Basic rate limiting
const admin = require('firebase-admin'); 
// Ensure .ts files are correctly imported if you're mixing JS/TS in backend (might need tsc-watch or similar for dev)
const { getTransactionHistory } = require('./controllers/transactionController.ts'); 
const { getWalletBalance } = require('./controllers/walletController.ts'); 

// Initialize Firebase Admin SDK
try {
    require('./config/firebaseAdmin'); // This initializes and exports admin, db, authAdmin
    console.log("[Server] Firebase Admin SDK initialized successfully via config/firebaseAdmin.js.");
} catch (e) {
    console.error("[Server] CRITICAL: Failed to initialize Firebase Admin SDK. Ensure config/firebaseAdmin.js is correct and environment variables (GOOGLE_APPLICATION_CREDENTIALS or Firebase project vars) are set.");
    process.exit(1); // Exit if Firebase Admin is critical
}

// Initialize Redis Client
const redisClient = require('./config/redisClient'); // Assuming this exports the configured client

// Middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const asyncHandler = require('./middleware/asyncHandler'); // Utility for cleaner async route handlers

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes.ts'); // Use .ts extension if applicable
const upiRoutes = require('./routes/upiRoutes');
const rechargeRoutes = require('./routes/rechargeRoutes');
const billsRoutes = require('./routes/billsRoutes');
const walletRoutes = require('./routes/walletRoutes.ts'); // Use .ts extension
const offerRoutes = require('./routes/offerRoutes'); // Using original offerRoutes.js
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
const serviceRoutes = require('./routes/serviceRoutes');
const supportRoutes = require('./routes/supportRoutes');
const entertainmentRoutes = require('./routes/entertainmentRoutes');
const shoppingRoutes = require('./routes/shoppingRoutes');
const scanRoutes = require('./routes/scanRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const chatRoutes = require('./routes/chatRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const reminderRoutes = require('./routes/reminderRoutes'); // Added reminder routes

const app = express();
const server = http.createServer(app);
// For production scaling of WebSockets, consider dedicated services like Socket.IO, Pusher, or Firebase Cloud Messaging.
const wss = new WebSocket.Server({ server });

// --- Express Middlewares ---
app.use(cors()); // Enable CORS for all origins (configure appropriately for production)
app.use(helmet()); // Set various security HTTP headers
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(morgan('dev')); // HTTP request logging

// --- Rate Limiting ---
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Max requests per window per IP
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' }, // Custom message
    keyGenerator: (req) => req.ip, // Use IP address for rate limiting
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(options.statusCode).json(options.message);
    }
});
app.use('/api/', apiLimiter); // Apply to all /api routes

// --- WebSocket Server ---
const authenticatedClients = new Map(); // Map userId to WebSocket connection

// Function to verify WebSocket token (Firebase ID Token)
async function verifyWsToken(token) {
    if (!token) {
        console.log("[WS Server] WebSocket authentication attempt with no token.");
        return null;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error(`[WS Server] WebSocket Auth Error: ${error.code || error.message}`);
        return null;
    }
}

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS Server] Client connected from IP: ${ip}`);
    let userId = null; // Will be set upon successful authentication
    ws.isAlive = true; // For heartbeat mechanism

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (message) => {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.toString());
        } catch (e) {
            console.error(`[WS Server] Failed to parse WebSocket message from ${ip}:`, message.toString());
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format.' } }));
            return;
        }
        // console.log(`[WS Server] Received type '${parsedMessage.type}' from ${userId || ip}`);

        try {
            if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
                const authenticatedUserId = await verifyWsToken(parsedMessage.token);
                if (authenticatedUserId) {
                    userId = authenticatedUserId;
                    // If user already has an active connection, terminate the old one
                    const existingWs = authenticatedClients.get(userId);
                    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
                        console.log(`[WS Server] Terminating previous WebSocket connection for user ${userId}`);
                        existingWs.terminate();
                    }
                    authenticatedClients.set(userId, ws);
                    ws.userId = userId; // Attach userId to ws object for easier identification
                    console.log(`[WS Server] Client authenticated and mapped: ${userId}`);
                    ws.send(JSON.stringify({ type: 'auth_success', payload: { userId: userId } }));
                    // Send initial data immediately after successful authentication
                    sendInitialData(ws, userId, parsedMessage.payload || {}); // Send any client-side filters
                } else {
                    console.log(`[WS Server] WebSocket Auth Failed for client from ${ip}. Token: ${parsedMessage.token ? 'Present (Invalid)' : 'Missing'}`);
                    ws.send(JSON.stringify({ type: 'auth_failed', payload: { message: 'Invalid authentication token.' } }));
                    ws.close(1008, 'Authentication failed'); // Policy Violation
                }
            } else if (userId) { // Message from an authenticated client
                // Handle other message types like 'request_initial_transactions', 'request_initial_balance'
                // These are now primarily handled by sendInitialData on auth
                if (parsedMessage.type === 'request_initial_transactions') {
                    await sendInitialTransactions(ws, userId, parsedMessage.payload);
                } else if (parsedMessage.type === 'request_initial_balance') {
                    await sendInitialBalance(ws, userId);
                } else if (parsedMessage.type === 'chat_message_client') { // Example for chat
                    console.log(`[WS Server] Client message from ${userId}: ${parsedMessage.payload.text} (To be handled by API)`);
                    // Chat messages should ideally go through HTTP API and then broadcasted by backend if needed.
                } else if (parsedMessage.type === 'ping') { // Client-side heartbeat
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
                // Add more specific message handlers if client needs to PULL data via WS
            } else { // Message from unauthenticated client (after initial connection)
                console.log(`[WS Server] Message from unauthenticated client (${ip}). Type: ${parsedMessage.type}`);
                ws.send(JSON.stringify({ type: 'error', payload: { message: 'Please authenticate first.' } }));
            }
        } catch(handlerError) {
             console.error(`[WS Server] Error handling message type ${parsedMessage?.type} from ${userId || ip}:`, handlerError);
             ws.send(JSON.stringify({ type: 'error', payload: { message: 'Error processing your request.' } }));
        }
    });

    ws.on('close', (code, reason) => {
        const reasonString = reason ? reason.toString() : 'No reason';
         console.log(`[WS Server] Client disconnected. Code: ${code}, Reason: ${reasonString}, User: ${userId || 'unauth'}, IP: ${ip}`);
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
            console.log(`[WS Server] Removed client mapping for: ${userId}`);
        }
    });

    ws.on('error', (error) => {
        console.error(`[WS Server] Error for user ${userId || 'unauth'} (IP: ${ip}):`, error);
        // Ensure client is removed if an error leads to disconnection
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
        }
    });
});

// Heartbeat interval to clean up dead connections
const interval = setInterval(() => {
    authenticatedClients.forEach((ws, userId) => {
        if (!ws.isAlive) {
            console.log(`[WS Server] Terminating inactive WebSocket connection for user: ${userId}`);
            authenticatedClients.delete(userId);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {}); // Send ping to client
    });
}, 30000); // Every 30 seconds

wss.on('close', () => {
    console.log("[WS Server] Server closing, clearing heartbeat interval.");
    clearInterval(interval);
});

// Function to send initial data to a newly connected/authenticated client
async function sendInitialData(ws, userId, clientFilters = {}) {
    console.log(`[WS Server] Sending initial data to ${userId}, Client Filters:`, clientFilters);
    await sendInitialTransactions(ws, userId, (clientFilters as any).transactions); // Cast if needed
    await sendInitialBalance(ws, userId);
}

// Function to send initial transaction history
async function sendInitialTransactions(ws, userId, clientSideFilters = {}) {
    console.log(`[WS Server] Preparing initial transactions for ${userId} with filters:`, clientSideFilters);
    let transactions = [];
    try {
        const firestoreDb = admin.firestore();
        let q = firestoreDb.collection('transactions').where('userId', '==', userId);
        
        // Apply client-side filters if provided (though backend filtering is more efficient)
        // This is a simplified example; robust filtering should be on the DB query.
        if ((clientSideFilters as any).type && (clientSideFilters as any).type !== 'all') q = q.where('type', '==', (clientSideFilters as any).type);
        if ((clientSideFilters as any).status && (clientSideFilters as any).status !== 'all') q = q.where('status', '==', (clientSideFilters as any).status);

        // Example: If client sends dateRange: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD'}
        if ((clientSideFilters as any).dateRange?.from) q = q.where('date', '>=', Timestamp.fromDate(new Date((clientSideFilters as any).dateRange.from)));
        if ((clientSideFilters as any).dateRange?.to) q = q.where('date', '<=', Timestamp.fromDate(new Date((clientSideFilters as any).dateRange.to)));
        // TODO: Add searchTerm server-side filtering if possible, or note it's client-filtered for now.

        const querySnapshot = await q.orderBy('date', 'desc').limit((clientSideFilters as any).limit || 20).get();
        transactions = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: data.date.toDate().toISOString(), // Send ISO string
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
            };
        });
        console.log(`[WS Server] Sending ${transactions.length} initial transactions to ${userId}`);
    } catch (error) {
        console.error(`[WS Server] Error fetching initial transactions for ${userId}:`, error);
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'initial_transactions', payload: transactions }));
}

// Function to send initial wallet balance
async function sendInitialBalance(ws, userId) {
    console.log(`[WS Server] Preparing initial balance for ${userId}`);
    let balance = 0;
    try {
        const walletDocRef = admin.firestore().collection('wallets').doc(userId);
        const walletDocSnap = await walletDocRef.get();
        if (walletDocSnap.exists()) {
            balance = walletDocSnap.data().balance || 0;
        } else {
            // Create wallet if it doesn't exist (idempotent)
            await walletDocRef.set({ userId: userId, balance: 0, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
        }
         console.log(`[WS Server] Sending initial balance ${balance} to ${userId}`);
    } catch (error) {
        console.error(`[WS Server] Error fetching initial balance for ${userId}:`, error);
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'balance_update', payload: { balance } }));
}


// Function to send a message to a specific user
function sendToUser(targetUserId, message) {
    const clientWs = authenticatedClients.get(targetUserId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        try {
            const data = JSON.stringify(message);
            // console.log(`[WS Server] Sending type '${message.type}' to user ${targetUserId}`);
            clientWs.send(data);
            return true; // Message sent
        } catch (error) {
            console.error(`[WS Server] Error sending message to user ${targetUserId}:`, error);
            return false; // Send failed
        }
    }
    // console.log(`[WS Server] User ${targetUserId} not connected or WS not open. Message type '${message.type}' not sent.`);
    return false; // Client not found or not open
}

// Function to broadcast a message to all authenticated clients
function broadcast(message) {
    if (authenticatedClients.size === 0) return; // No clients to broadcast to
    try {
        const data = JSON.stringify(message);
        console.log(`[WS Server] Broadcasting type '${message.type}' to ${authenticatedClients.size} clients.`);
        authenticatedClients.forEach((clientWs, userId) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data, (err) => {
                    if (err) console.error(`[WS Server] Error broadcasting to user ${userId}:`, err);
                });
            }
        });
    } catch (error) {
         console.error("[WS Server] Error broadcasting message:", error);
    }
}

module.exports = { broadcast, sendToUser, sendInitialData, redisClient }; // Export redisClient

// --- API Routes ---
app.get('/api/health', asyncHandler(async (req, res) => {
    // Check Redis connection status
    let redisStatus = 'disconnected';
    if (redisClient.isReady) {
        try {
            await redisClient.ping();
            redisStatus = 'connected';
        } catch (e) {
            redisStatus = 'ping_failed';
        }
    }
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime(), redis: redisStatus });
}));

// Public routes (no authMiddleware)
app.use('/api/live', liveTrackingRoutes);
app.use('/api/banks', bankStatusRoutes); 
app.use('/api/shopping', shoppingRoutes); // Some shopping routes might be public (browsing)
app.use('/api/auth', authRoutes); // Auth routes are public by nature

// Authenticated routes (authMiddleware applied here or within route files)
// It's generally cleaner to apply middleware at the router level if all routes in a file need it.
// If some are public and some private within a file, apply selectively in the route file.
// For ZetPay, most feature APIs will require authentication.
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
app.use('/api/services', authMiddleware, serviceRoutes); // Generic services, ensure auth if needed
app.use('/api/support', authMiddleware, supportRoutes); // Support might have some public (FAQ) and private (chat)
app.use('/api/entertainment', authMiddleware, entertainmentRoutes); 
app.use('/api/scan', authMiddleware, scanRoutes);
app.use('/api/vault', authMiddleware, vaultRoutes);
app.use('/api/chat', authMiddleware, chatRoutes); 
app.use('/api/favorites', authMiddleware, favoritesRoutes);
app.use('/api/reminders', authMiddleware, reminderRoutes); // Added reminder routes


// --- Fallback & Error Handling ---
// Handle 404 for API routes not found
app.use('/api/*', (req, res, next) => {
    const error = new Error(`API Endpoint Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
});

// Global error handler (must be last)
app.use(errorMiddleware);

const PORT = process.env.PORT || 9003;

// Function to start the server
async function startServer() {
    try {
        if (!redisClient.isOpen) { // Check if client is open, not just ready
            console.log("[Server Startup] Connecting to Redis...");
            await redisClient.connect();
        }
        server.listen(PORT, () => {
            console.log(`[Server] PayFriend Backend listening on port ${PORT}`);
            console.log(`[WS Server] WebSocket server started on the same port.`);
            if (redisClient.isReady) {
                console.log("[Redis] Client is ready.");
            } else if (redisClient.isOpen) {
                 console.warn("[Redis] Client is open but not ready. Waiting for 'ready' event.");
            } else {
                console.error("[Redis] Client failed to connect or is not open.");
            }
        });
    } catch (err) {
        console.error('[Server Startup] Failed to connect to Redis or start server:', err);
        process.exit(1); // Exit if critical services like Redis fail to connect on startup
    }
}

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`[Server] ${signal} signal received: closing HTTP server.`);
    clearInterval(interval); // Stop WebSocket heartbeat

    server.close(async () => {
        console.log('[Server] HTTP server closed.');
        
        // Close WebSocket server and terminate clients
        wss.close(() => {
            console.log("[WS Server] WebSocket server closed.");
        });
        // Give clients a moment to disconnect cleanly before terminating
        const terminateClientsTimeout = setTimeout(() => {
            console.log("[Server] Forcing remaining WebSocket client connections closed.");
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.terminate();
            });
        }, 2000); // 2 seconds grace period

        // Disconnect Redis client
        if (redisClient.isOpen) {
            try {
                await redisClient.quit();
                console.log('[Redis] Client disconnected successfully.');
            } catch (err) {
                console.error('[Redis] Error during quit:', err);
            }
        }
        clearTimeout(terminateClientsTimeout);
        process.exit(0); // Exit process
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```
  </change>
</changes>