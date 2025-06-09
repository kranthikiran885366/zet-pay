require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin'); 
const { getTransactionHistory } = require('./controllers/transactionController.ts'); 
const { getWalletBalance } = require('./controllers/walletController.ts'); 

// Initialize Firebase Admin
try {
    require('./config/firebaseAdmin');
    console.log("[Server] Firebase Admin SDK initialized successfully.");
} catch (e) {
    console.error("[Server] CRITICAL: Failed to initialize Firebase Admin SDK. Check config/firebaseAdmin.js and environment variables.");
    process.exit(1);
}

// Initialize Redis Client
const redisClient = require('./config/redisClient');

const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const asyncHandler = require('./middleware/asyncHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes.ts');
const upiRoutes = require('./routes/upiRoutes');
const rechargeRoutes = require('./routes/rechargeRoutes');
const billsRoutes = require('./routes/billsRoutes');
const walletRoutes = require('./routes/walletRoutes.ts');
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
const serviceRoutes = require('./routes/serviceRoutes');
const supportRoutes = require('./routes/supportRoutes');
const entertainmentRoutes = require('./routes/entertainmentRoutes');
const shoppingRoutes = require('./routes/shoppingRoutes');
const scanRoutes = require('./routes/scanRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const chatRoutes = require('./routes/chatRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: process.env.NODE_ENV === 'development' ? 1000 : 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    keyGenerator: (req) => req.ip,
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(options.statusCode).json(options.message);
    }
});
app.use('/api/', limiter);

const authenticatedClients = new Map();

async function verifyWsToken(token) {
    if (!token) {
        console.log("[WS Server] Auth attempt with no token.");
        return null;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error(`[WS Server] Auth Error: ${error.code || error.message}`);
        return null;
    }
}

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS Server] Client connected from IP: ${ip}`);
    let userId = null;
    ws.isAlive = true;

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
        console.log(`[WS Server] Received type '${parsedMessage.type}' from ${userId || ip}`);

        try {
            if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
                const authenticatedUserId = await verifyWsToken(parsedMessage.token);
                if (authenticatedUserId) {
                    userId = authenticatedUserId;
                    const existingWs = authenticatedClients.get(userId);
                    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
                        console.log(`[WS Server] Terminating previous WebSocket connection for user ${userId}`);
                        existingWs.terminate();
                    }
                    authenticatedClients.set(userId, ws);
                    ws.userId = userId;
                    console.log(`[WS Server] Client authenticated and mapped: ${userId}`);
                    ws.send(JSON.stringify({ type: 'auth_success', payload: { userId: userId } }));
                    sendInitialData(ws, userId, parsedMessage.payload || {}); 
                } else {
                    console.log(`[WS Server] WebSocket Auth Failed for client from ${ip}.`);
                    ws.send(JSON.stringify({ type: 'auth_failed', payload: { message: 'Invalid authentication token.' } }));
                    ws.close(1008, 'Authentication failed');
                }
            } else if (userId) { 
                if (parsedMessage.type === 'request_initial_transactions') {
                    await sendInitialTransactions(ws, userId, parsedMessage.payload);
                } else if (parsedMessage.type === 'request_initial_balance') {
                    await sendInitialBalance(ws, userId);
                } else if (parsedMessage.type === 'chat_message_client') { 
                    console.log(`[WS Server] Client message from ${userId}: ${parsedMessage.payload.text} (To be handled by API)`);
                } else if (parsedMessage.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                } else {
                    console.log(`[WS Server] Unhandled message type '${parsedMessage.type}' from ${userId}`);
                }
            } else { 
                console.log(`[WS Server] Unauth client (${ip}). Type: ${parsedMessage.type}`);
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
        if (userId && authenticatedClients.get(userId) === ws) {
            authenticatedClients.delete(userId);
        }
    });
});

const interval = setInterval(() => {
    authenticatedClients.forEach((ws, userId) => {
        if (!ws.isAlive) {
            console.log(`[WS Server] Terminating inactive WebSocket connection for user: ${userId}`);
            authenticatedClients.delete(userId);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

wss.on('close', () => {
    console.log("[WS Server] Server closing, clearing heartbeat interval.");
    clearInterval(interval);
});

async function sendInitialData(ws, userId, filters = {}) {
    await sendInitialTransactions(ws, userId, (filters).transactions);
    await sendInitialBalance(ws, userId);
}

async function sendInitialTransactions(ws, userId, clientFilters = {}) {
    console.log(`[WS Server] Preparing initial transactions for ${userId} with filters:`, clientFilters);
    let transactions = [];
    try {
        const firestoreDb = admin.firestore();
        let q = firestoreDb.collection('transactions').where('userId', '==', userId);
        
        if ((clientFilters).type && (clientFilters).type !== 'all') q = q.where('type', '==', (clientFilters).type);
        if ((clientFilters).status && (clientFilters).status !== 'all') q = q.where('status', '==', (clientFilters).status);

        const querySnapshot = await q.orderBy('date', 'desc').limit((clientFilters).limit || 20).get();
        transactions = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: data.date.toDate().toISOString(), 
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

async function sendInitialBalance(ws, userId) {
    console.log(`[WS Server] Preparing initial balance for ${userId}`);
    let balance = 0;
    try {
        const walletDocRef = admin.firestore().collection('wallets').doc(userId);
        const walletDocSnap = await walletDocRef.get();
        if (walletDocSnap.exists()) {
            balance = walletDocSnap.data().balance || 0;
        } else {
            await walletDocRef.set({ userId: userId, balance: 0, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
        }
         console.log(`[WS Server] Sending initial balance ${balance} to ${userId}`);
    } catch (error) {
        console.error(`[WS Server] Error fetching initial balance for ${userId}:`, error);
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'balance_update', payload: { balance } }));
}


function sendToUser(targetUserId, message) {
    const clientWs = authenticatedClients.get(targetUserId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        try {
            const data = JSON.stringify(message);
            console.log(`[WS Server] Sending type '${message.type}' to user ${targetUserId}`);
            clientWs.send(data);
            return true;
        } catch (error) {
            console.error(`[WS Server] Error sending to user ${targetUserId}:`, error);
            return false;
        }
    }
    return false;
}

function broadcast(message) {
    if (authenticatedClients.size === 0) return;
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

app.get('/api/health', asyncHandler(async (req, res) => {
    let redisStatus = 'disconnected';
    if (redisClient.isOpen) {
        try {
            await redisClient.ping();
            redisStatus = 'connected';
        } catch (e) {
            redisStatus = 'ping_failed';
        }
    }
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime(), redis: redisStatus });
}));

// Apply authMiddleware to routes that require authentication
app.use('/api/live', liveTrackingRoutes);
app.use('/api/banks', bankStatusRoutes);
app.use('/api/shopping', shoppingRoutes); 
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
app.use('/api/services', authMiddleware, serviceRoutes); 
app.use('/api/support', authMiddleware, supportRoutes);
app.use('/api/entertainment', authMiddleware, entertainmentRoutes); 
app.use('/api/scan', authMiddleware, scanRoutes);
app.use('/api/vault', authMiddleware, vaultRoutes);
app.use('/api/chat', authMiddleware, chatRoutes); 
app.use('/api/favorites', authMiddleware, favoritesRoutes);


app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 9003;

// Function to start the server
async function startServer() {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
        server.listen(PORT, () => {
            console.log(`[Server] PayFriend Backend listening on port ${PORT}`);
            console.log(`[WS Server] WebSocket server started on the same port.`);
        });
    } catch (err) {
        console.error('[Server Startup] Failed to connect to Redis or start server:', err);
        process.exit(1); // Exit if critical services fail to start
    }
}

startServer();


const shutdown = async (signal) => {
    console.log(`[Server] ${signal} signal received: closing HTTP server.`);
    clearInterval(interval);
    server.close(async () => {
        console.log('[Server] HTTP server closed.');
        wss.close(() => {
            console.log("[WS Server] WebSocket server closed.");
        });
        if (redisClient.isOpen) {
            try {
                await redisClient.quit();
                console.log('[Redis] Client disconnected successfully.');
            } catch (err) {
                console.error('[Redis] Error during quit:', err);
            }
        }
        // Allow time for WebSocket server to close clients
        setTimeout(() => {
             console.log("[Server] Forcing remaining client connections closed (if any).");
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.terminate();
            });
            process.exit(0);
        }, 5000); 
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
