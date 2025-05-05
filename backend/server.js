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
    console.log("Firebase Admin SDK seems initialized.");
} catch (e) {
    console.error("CRITICAL: Failed to initialize Firebase Admin SDK in server.js. Check config/firebaseAdmin.js and environment variables.");
    process.exit(1); // Exit if Firebase Admin fails to initialize
}


// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const asyncHandler = require('./middleware/asyncHandler'); // Import asyncHandler

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const upiRoutes = require('./routes/upiRoutes');
const rechargeRoutes = require('./routes/rechargeRoutes');
const walletRoutes = require('./routes/walletRoutes');
const offerRoutes = require('./routes/offerRoutes');
const passesRoutes = require('./routes/passesRoutes');
const templeRoutes = require('./routes/templeRoutes');
const contactsRoutes = require('./routes/contactsRoutes');
const cardsRoutes = require('./routes/cardsRoutes');
const autopayRoutes = require('./routes/autopayRoutes');
const billsRoutes = require('./routes/billsRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const hyperlocalRoutes = require('./routes/hyperlocalRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const liveTrackingRoutes = require('./routes/liveTrackingRoutes');
const blockchainRoutes = require('./routes/blockchainRoutes');
const loanRoutes = require('./routes/loanRoutes');
const pocketMoneyRoutes = require('./routes/pocketMoneyRoutes');
const cashWithdrawalRoutes = require('./routes/cashWithdrawalRoutes');
const bnplRoutes = require('./routes/bnplRoutes'); // Added BNPL routes
const bankStatusRoutes = require('./routes/bankStatusRoutes'); // Added Bank Status routes

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Middleware ---
app.use(cors()); // Consider configuring origins in production
app.use(helmet()); // Basic security headers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging HTTP requests

// Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: process.env.NODE_ENV === 'development' ? 1000 : 200, // Higher limit for dev
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes',
    // keyGenerator: (req) => req.ip, // Default key generator
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});
app.use('/api/', limiter); // Apply rate limiting only to API routes

// --- WebSocket Setup ---
const authenticatedClients = new Map<string, WebSocket>(); // Map userId to WebSocket

// Function to verify Firebase ID token for WebSocket connection
async function verifyWsToken(token: string): Promise<string | null> {
    if (!token) {
        console.log("WS Auth attempt with no token.");
        return null;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error: any) { // Type error as any
        console.error(`WebSocket Auth Error: ${error.code || error.message}`);
        return null;
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    let userId: string | null = null;
    ws.isAlive = true; // For heartbeat

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async (message) => {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.toString());
            // console.log('Received WebSocket message:', parsedMessage.type); // Log only type for brevity
        } catch (e) {
            console.error('Failed to parse WebSocket message:', message.toString());
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format.' } }));
            return;
        }

        try {
            // Handle Authentication Message
            if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
                const authenticatedUserId = await verifyWsToken(parsedMessage.token);
                if (authenticatedUserId) {
                    userId = authenticatedUserId;
                    // Clean up old connection if user reconnects
                    const existingWs = authenticatedClients.get(userId);
                    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
                        console.log(`Terminating previous WebSocket connection for user ${userId}`);
                        existingWs.terminate();
                    }
                    authenticatedClients.set(userId, ws);
                    ws.userId = userId; // Attach userId to ws object for easier cleanup
                    console.log(`WebSocket client authenticated and mapped to user: ${userId}`);
                    ws.send(JSON.stringify({ type: 'auth_success', payload: { userId: userId } }));
                    // Trigger initial data push if needed, e.g., balance
                    // sendBalanceUpdate(userId, await getWalletBalanceInternal(userId));
                } else {
                    console.log("WebSocket Authentication Failed.");
                    ws.send(JSON.stringify({ type: 'auth_failed', payload: { message: 'Invalid authentication token.' } }));
                    ws.close(1008, 'Authentication failed');
                }
            }
            // Handle other authenticated messages
            else if (userId) {
                if (parsedMessage.type === 'request_initial_transactions') {
                     console.log(`WS: Received request for initial transactions from ${userId}`);
                     // Fetch and send initial transactions (implement this logic)
                     // const transactions = await fetchRecentTransactions(userId, parsedMessage.filters);
                     // ws.send(JSON.stringify({ type: 'initial_transactions', payload: transactions }));
                 }
                 else if (parsedMessage.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' })); // Respond to client ping
                 }
                // Add handlers for other message types (e.g., subscribing to specific updates)
                else {
                    console.log(`WS: Received unknown/unhandled message type ${parsedMessage.type} from user ${userId}`);
                    // ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unknown message type or not authenticated.' } }));
                }
            } else {
                console.log("WS: Received message from unauthenticated client.");
                ws.send(JSON.stringify({ type: 'error', payload: { message: 'Please authenticate first.' } }));
            }
        } catch(handlerError: any) {
             console.error(`Error handling WebSocket message type ${parsedMessage?.type}:`, handlerError);
             ws.send(JSON.stringify({ type: 'error', payload: { message: 'Error processing your request.' } }));
        }
    });

    ws.on('close', (code, reason) => {
        const reasonString = reason ? reason.toString() : 'No reason specified';
         console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reasonString}, User: ${userId || 'unauthenticated'}`);
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
            console.log(`Removed client mapping for user: ${userId}`);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId || 'unauthenticated'}:`, error);
        // Clean up on error, similar to close
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
             console.log(`Removed client mapping due to error for user: ${userId}`);
        }
        // Don't automatically close on error unless necessary, connection might recover
    });
});

// Heartbeat interval
const interval = setInterval(() => {
    authenticatedClients.forEach((ws: any, userId) => { // Add 'any' type temporarily if ws.isAlive isn't recognized
        if (ws.isAlive === false) {
            console.log(`Terminating inactive WebSocket connection for user: ${userId}`);
            authenticatedClients.delete(userId);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000); // Check every 30 seconds

wss.on('close', () => {
    console.log("WebSocket Server closing, clearing heartbeat interval.");
    clearInterval(interval);
});


// --- WebSocket Helper Functions ---

/**
 * Sends a message to a specific connected user.
 * @param {string} targetUserId - The Firebase UID of the target user.
 * @param {any} message - The message object to send (must be JSON-serializable).
 * @returns {boolean} True if the message was sent, false otherwise.
 */
function sendToUser(targetUserId: string, message: any): boolean {
    const clientWs = authenticatedClients.get(targetUserId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        try {
            const data = JSON.stringify(message);
            // console.log(`Sending WebSocket message to user ${targetUserId}:`, message.type);
            clientWs.send(data);
            return true;
        } catch (error) {
            console.error(`Error sending WebSocket message to user ${targetUserId}:`, error);
             // Optional: Remove client on send error? Could be temporary issue.
             // authenticatedClients.delete(targetUserId);
            return false;
        }
    } else {
        // console.log(`WebSocket client for user ${targetUserId} not connected or not open.`);
        return false; // User not connected
    }
}

/**
 * Broadcasts a message to all connected and authenticated clients.
 * Use sparingly to avoid unnecessary traffic.
 * @param {any} message - The message object to broadcast.
 */
function broadcast(message: any) {
    if (authenticatedClients.size === 0) return;
    try {
        const data = JSON.stringify(message);
        console.log(`Broadcasting WebSocket message to ${authenticatedClients.size} clients:`, message.type);
        authenticatedClients.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data, (err) => {
                    if (err) console.error('Error sending broadcast message to a client:', err);
                });
            }
        });
    } catch (error) {
         console.error("Error broadcasting WebSocket message:", error);
    }
}

// Export functions for use in controllers/services
module.exports = { broadcast, sendToUser };


// --- API Routes ---
app.get('/api/health', asyncHandler(async (req, res) => { // Wrap simple routes too
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
}));

// Public or non-user specific routes (apply asyncHandler)
app.use('/api/live', liveTrackingRoutes); // Assumes routes inside use asyncHandler
app.use('/api/banks', bankStatusRoutes); // Assumes routes inside use asyncHandler

// Protected routes (apply authMiddleware then use asyncHandler implicitly via route files)
app.use('/api/auth', authRoutes);
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


// --- Error Handling ---
// 404 Handler (after all other routes)
app.use((req, res, next) => {
    const error: any = new Error(`Not Found - ${req.originalUrl}`); // Create an error object
    error.statusCode = 404;
    next(error); // Pass error to the central handler
});

// Central Error Handler (Must be the LAST middleware)
app.use(errorMiddleware);

// --- Start Server ---
const PORT = process.env.PORT || 9003;
server.listen(PORT, () => {
  console.log(`PayFriend Backend Server listening on port ${PORT}`);
  console.log(`WebSocket server started on the same port.`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    // Close WebSocket server connections
     wss.close(() => {
         console.log("WebSocket server closed.");
         process.exit(0); // Exit after cleanup
     });
     // Force close remaining WS connections after a timeout
     setTimeout(() => {
         wss.clients.forEach(client => client.terminate());
         process.exit(0);
     }, 5000);
  })
})

process.on('SIGINT', () => {
     console.log('SIGINT signal received: closing servers');
     // Trigger SIGTERM handling
     process.emit('SIGTERM', 'SIGINT');
});
