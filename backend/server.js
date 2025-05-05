
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize Firebase Admin (Ensure this runs before other modules that need it)
require('./config/firebaseAdmin');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes'); // Added auth routes
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
const billsRoutes = require('./routes/billsRoutes'); // Added bills routes
const bookingRoutes = require('./routes/bookingRoutes'); // Added booking routes
const hyperlocalRoutes = require('./routes/hyperlocalRoutes'); // Added hyperlocal routes
const investmentRoutes = require('./routes/investmentRoutes'); // Added investment routes
const paymentRoutes = require('./routes/paymentRoutes'); // Added payment routes
const liveTrackingRoutes = require('./routes/liveTrackingRoutes'); // Added live tracking routes
const blockchainRoutes = require('./routes/blockchainRoutes'); // Added blockchain routes
// Add other route imports here as needed (e.g., loans, pocket money)
// const loanRoutes = require('./routes/loanRoutes');
// const pocketMoneyRoutes = require('./routes/pocketMoneyRoutes');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(helmet()); // Basic security headers
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // Increased limit slightly
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(limiter);

// --- WebSocket Setup ---
const clients = new Map(); // Store clients with user IDs

wss.on('connection', (ws, req) => {
  console.log('Client connected via WebSocket');
  // TODO: Implement secure WebSocket authentication (e.g., using tokens passed via query params or initial message)
  // For now, just storing the connection
  const clientId = `ws-${Date.now()}`; // Simple temporary ID
  clients.set(clientId, ws);
  console.log(`WebSocket client assigned temporary ID: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString()); // Ensure message is string
      console.log('Received WebSocket message:', parsedMessage);
      // Handle incoming messages (e.g., authentication, specific actions)
      if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
          // Verify token and associate ws with userId
          // firebaseAdmin.auth().verifyIdToken(parsedMessage.token)...
          console.log(`Client ${clientId} attempted authentication (verification TBD)`);
          // Example: Associate user ID after verification
          // const userId = await verifyWsToken(parsedMessage.token);
          // if (userId) {
          //    clients.set(userId, ws); // Replace clientId with userId
          //    clients.delete(clientId); // Remove temporary ID
          //    ws.send(JSON.stringify({ type: 'auth_success', userId }));
          // } else {
          //     ws.send(JSON.stringify({ type: 'auth_failed' }));
          // }
      }
      // Example: Send periodic balance update
      if (parsedMessage.type === 'request_balance_update') {
          // Fetch balance for authenticated user and send
           // const userId = getUserIdFromWs(ws); // Need a way to map ws back to userId
           // if (userId) sendBalanceUpdate(userId);
      }
    } catch (e) {
        console.error('Failed to parse WebSocket message or invalid message format:', message.toString());
    }
  });

  ws.on('close', () => {
    // Remove the specific clientId or associated userId if implemented
    let deletedKey = clientId; // Start assuming it's the temporary ID
    for (let [key, value] of clients.entries()) {
        if (value === ws) {
            clients.delete(key);
            deletedKey = key; // Found the actual key (might be userId or temp ID)
            break;
        }
    }
     console.log(`WebSocket client disconnected. Removed mapping for key: ${deletedKey}`);
  });

  ws.on('error', (error) => {
      console.error(`WebSocket error associated with key ${clientId}:`, error);
      // Clean up on error, similar to close
      let deletedKey = clientId;
       for (let [key, value] of clients.entries()) {
        if (value === ws) {
            clients.delete(key);
            deletedKey = key;
            break;
        }
    }
     console.log(`Removed client mapping due to error for key: ${deletedKey}`);
  });

  ws.send(JSON.stringify({ type: 'system', message: 'Connected to PayFriend WebSocket server.' }));
});

// Function to broadcast messages (e.g., system-wide announcements)
function broadcast(message) {
    const data = JSON.stringify(message);
    console.log(`Broadcasting WebSocket message to ${clients.size} clients:`, message);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data, (err) => {
                if (err) {
                    console.error('Error sending broadcast message to a client:', err);
                    // Handle error, potentially remove client
                }
            });
        }
    });
}

// Function to send message to a specific user
function sendToUser(userId, message) {
    const clientWs = clients.get(userId); // Assumes map key is userId after auth
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
         const data = JSON.stringify(message);
         console.log(`Sending WebSocket message to user ${userId}:`, message);
         clientWs.send(data, (err) => {
             if (err) {
                 console.error(`Error sending WebSocket message to user ${userId}:`, err);
                 // Handle error, potentially remove client mapping
             }
         });
         return true; // Message sent (or attempted)
    } else {
         console.log(`WebSocket client for user ${userId} not connected or not open.`);
         return false; // User not connected
    }
}

// --- API Routes ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Public or non-user specific routes
app.use('/api/live', liveTrackingRoutes); // Public tracking routes

// Apply auth middleware to protected routes
app.use('/api/auth', authRoutes); // Auth routes (might have public/protected within)
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/upi', authMiddleware, upiRoutes);
app.use('/api/recharge', authMiddleware, rechargeRoutes);
app.use('/api/bills', authMiddleware, billsRoutes); // Added bills routes
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/offers', authMiddleware, offerRoutes);
app.use('/api/passes', authMiddleware, passesRoutes);
app.use('/api/temple', authMiddleware, templeRoutes);
app.use('/api/contacts', authMiddleware, contactsRoutes);
app.use('/api/cards', authMiddleware, cardsRoutes);
app.use('/api/autopay', authMiddleware, autopayRoutes);
app.use('/api/bookings', authMiddleware, bookingRoutes); // Added booking routes
app.use('/api/hyperlocal', authMiddleware, hyperlocalRoutes); // Added hyperlocal routes
app.use('/api/invest', authMiddleware, investmentRoutes); // Added investment routes
app.use('/api/payments', authMiddleware, paymentRoutes); // Added payment routes
app.use('/api/blockchain', authMiddleware, blockchainRoutes); // Added blockchain routes (protected example)
// app.use('/api/loans', authMiddleware, loanRoutes); // Mount loan routes
// app.use('/api/pocket-money', authMiddleware, pocketMoneyRoutes); // Mount pocket money routes

// --- Error Handling ---
// Catch 404 and forward to error handler
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
});
// Centralized error handler (ensure it's the last middleware)
app.use(errorMiddleware);

// --- Start Server ---
const PORT = process.env.PORT || 9003;
server.listen(PORT, () => {
  console.log(`PayFriend Backend Server listening on port ${PORT}`);
});

// Export WebSocket functions if needed elsewhere (e.g., trigger updates after DB changes)
module.exports = { broadcast, sendToUser };
