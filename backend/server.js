
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
require('./config/firebaseAdmin');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

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

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Middleware ---
app.use(cors());
app.use(helmet()); // Basic security headers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging HTTP requests

// Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // Limit each IP to 200 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(limiter); // Apply rate limiting to all requests

// --- WebSocket Setup ---
// Store clients mapped by authenticated userId -> WebSocket connection
const authenticatedClients = new Map();

// Function to verify Firebase ID token for WebSocket connection
async function verifyWsToken(token) {
    if (!token) return null;
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('WebSocket Auth Error:', error.message);
        return null;
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    let userId = null; // Initially unauthenticated
    let isAlive = true;

    // Heartbeat mechanism
    ws.on('pong', () => {
        isAlive = true;
    });

    ws.on('message', async (message) => {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.toString());
            console.log('Received WebSocket message:', parsedMessage);
        } catch (e) {
            console.error('Failed to parse WebSocket message:', message.toString());
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
            return;
        }

        // Handle Authentication Message
        if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
            const authenticatedUserId = await verifyWsToken(parsedMessage.token);
            if (authenticatedUserId) {
                userId = authenticatedUserId;
                // Remove any previous connection for this user to prevent duplicates
                const existingWs = authenticatedClients.get(userId);
                 if (existingWs && existingWs !== ws) {
                     console.log(`Closing previous WebSocket connection for user ${userId}`);
                     existingWs.terminate(); // Use terminate for forceful closure
                 }
                authenticatedClients.set(userId, ws);
                console.log(`WebSocket client authenticated and mapped to user: ${userId}`);
                ws.send(JSON.stringify({ type: 'auth_success', userId: userId }));
                 // Send any initial data needed after auth (e.g., initial balance)
                 // sendBalanceUpdate(userId); // Example
            } else {
                ws.send(JSON.stringify({ type: 'auth_failed', message: 'Invalid authentication token.' }));
                ws.close(1008, 'Authentication failed'); // Close connection if auth fails
            }
        }
        // Handle other authenticated messages
        else if (userId) { // Check if user is authenticated
            // Example: Handle balance request (can be done via API too, but useful for push updates)
            if (parsedMessage.type === 'request_balance_update') {
                console.log(`Balance update requested by user ${userId}`);
                // Trigger sending the current balance back (implementation in walletController/service)
                 // sendBalanceUpdate(userId);
                 // For now, just acknowledge
                 ws.send(JSON.stringify({ type: 'info', message: 'Balance update acknowledged. Will push updates.' }));
            }
            // Add handlers for other message types here (e.g., subscribe to specific notifications)
            else {
                 ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type or not authenticated.' }));
            }
        } else {
             ws.send(JSON.stringify({ type: 'error', message: 'Please authenticate first.' }));
        }
    });

    ws.on('close', () => {
        if (userId) {
            // Only remove if the closing socket is the one currently mapped
             if (authenticatedClients.get(userId) === ws) {
                 authenticatedClients.delete(userId);
                 console.log(`WebSocket client disconnected. Removed mapping for user: ${userId}`);
             } else {
                 console.log(`WebSocket client for user ${userId} closed, but was not the primary mapped socket.`);
             }
        } else {
             console.log('Unauthenticated WebSocket client disconnected.');
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId || 'unauthenticated'}:`, error);
        // Clean up on error, similar to close
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
             console.log(`Removed client mapping due to error for user: ${userId}`);
        }
    });

     ws.send(JSON.stringify({ type: 'system', message: 'Connected. Please authenticate.' }));
});

// Heartbeat interval to check for dead connections
const interval = setInterval(() => {
    authenticatedClients.forEach((ws, userId) => {
        if (ws.isAlive === false) {
            console.log(`Terminating inactive WebSocket connection for user: ${userId}`);
            authenticatedClients.delete(userId);
            return ws.terminate();
        }
        ws.isAlive = false; // Mark as potentially dead, will be marked alive on pong
        ws.ping(() => {}); // Send ping
    });
}, 30000); // Check every 30 seconds

wss.on('close', () => {
    clearInterval(interval); // Clear interval when server closes
});


// Function to broadcast messages to ALL authenticated clients (use sparingly)
function broadcast(message) {
    const data = JSON.stringify(message);
    console.log(`Broadcasting WebSocket message to ${authenticatedClients.size} authenticated clients:`, message);
    authenticatedClients.forEach((clientWs) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, (err) => {
                if (err) console.error('Error sending broadcast message to a client:', err);
            });
        }
    });
}

// Function to send message to a specific user ID
function sendToUser(targetUserId, message) {
    const clientWs = authenticatedClients.get(targetUserId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        const data = JSON.stringify(message);
        console.log(`Sending WebSocket message to user ${targetUserId}:`, message);
        clientWs.send(data, (err) => {
            if (err) {
                console.error(`Error sending WebSocket message to user ${targetUserId}:`, err);
                // Optional: Attempt removal if send fails? Could be temporary issue.
                // authenticatedClients.delete(targetUserId);
            }
        });
        return true; // Message sent (or attempted)
    } else {
        console.log(`WebSocket client for user ${targetUserId} not connected or not open.`);
        return false; // User not connected
    }
}


// --- API Routes ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() }));

// Public or non-user specific routes
app.use('/api/live', liveTrackingRoutes);
// Endpoint to fetch bank status (could be public or protected)
app.use('/api/banks', require('./routes/bankStatusRoutes')); // Assuming you create this route

// Apply auth middleware to protected routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/upi', authMiddleware, upiRoutes);
app.use('/api/recharge', authMiddleware, rechargeRoutes);
app.use('/api/bills', authMiddleware, billsRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/offers', authMiddleware, offerRoutes); // Rewards/offers also need auth
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
app.use('/api/cash-withdrawal', authMiddleware, cashWithdrawalRoutes); // Added cash withdrawal routes
app.use('/api/bnpl', authMiddleware, bnplRoutes); // Added BNPL routes

// --- Error Handling ---
// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});
// Central Error Handler
app.use(errorMiddleware);

// --- Start Server ---
const PORT = process.env.PORT || 9003;
server.listen(PORT, () => {
  console.log(`PayFriend Backend Server listening on port ${PORT}`);
  console.log(`WebSocket server started on the same port.`);
});

// Export WebSocket functions for use in controllers/services
module.exports = { broadcast, sendToUser };
    
        
