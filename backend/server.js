
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
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const upiRoutes = require('./routes/upiRoutes');
const rechargeRoutes = require('./routes/rechargeRoutes');
const walletRoutes = require('./routes/walletRoutes');
const offerRoutes = require('./routes/offerRoutes');
const passesRoutes = require('./routes/passesRoutes');
const templeRoutes = require('./routes/templeRoutes');
const contactsRoutes = require('./routes/contactsRoutes'); // Import contacts routes
const cardsRoutes = require('./routes/cardsRoutes'); // Import cards routes
const autopayRoutes = require('./routes/autopayRoutes'); // Import autopay routes
// Add other route imports here as needed
// const travelRoutes = require('./routes/travelRoutes');
// const etc...

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
  console.log('Client connected');
  // TODO: Implement secure WebSocket authentication (e.g., using tokens passed via query params or initial message)
  // For now, just storing the connection
  const clientId = `ws-${Date.now()}`; // Simple temporary ID
  clients.set(clientId, ws);
  console.log(`Client assigned ID: ${clientId}`);

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
          // clients.set(verifiedUserId, ws); // Replace clientId with userId
          // clients.delete(clientId); // Remove temporary ID
      }
      // Example: Send periodic balance update
      if (parsedMessage.type === 'request_balance_update') {
          // Fetch balance for authenticated user and send
      }
    } catch (e) {
        console.error('Failed to parse WebSocket message or invalid message format:', message.toString());
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    // Remove the specific clientId or associated userId if implemented
    let deletedKey = clientId;
    for (let [key, value] of clients.entries()) {
        if (value === ws) {
            clients.delete(key);
            deletedKey = key;
            break;
        }
    }
     console.log(`Removed client mapping for key: ${deletedKey}`);
  });

  ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
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
    console.log(`Broadcasting message to ${clients.size} clients:`, message);
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
    const clientWs = clients.get(userId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
         const data = JSON.stringify(message);
         console.log(`Sending message to user ${userId}:`, message);
         clientWs.send(data, (err) => {
             if (err) {
                 console.error(`Error sending message to user ${userId}:`, err);
                 // Handle error, potentially remove client mapping
             }
         });
         return true; // Message sent (or attempted)
    } else {
         console.log(`User ${userId} not connected or WebSocket not open.`);
         return false; // User not connected
    }
}

// --- API Routes ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Apply auth middleware to protected routes
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/upi', authMiddleware, upiRoutes);
app.use('/api/recharge', authMiddleware, rechargeRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/offers', authMiddleware, offerRoutes);
app.use('/api/passes', authMiddleware, passesRoutes);
app.use('/api/temple', authMiddleware, templeRoutes);
app.use('/api/contacts', authMiddleware, contactsRoutes); // Mount contacts routes
app.use('/api/cards', authMiddleware, cardsRoutes); // Mount cards routes
app.use('/api/autopay', authMiddleware, autopayRoutes); // Mount autopay routes

// Mount other routes (add authMiddleware if they need protection)
// app.use('/api/travel', authMiddleware, travelRoutes);

// --- Error Handling ---
app.use(errorMiddleware); // Centralized error handler

// --- Start Server ---
const PORT = process.env.PORT || 9003;
server.listen(PORT, () => {
  console.log(`PayFriend Backend Server listening on port ${PORT}`);
});

// Export WebSocket functions if needed elsewhere (e.g., trigger updates after DB changes)
module.exports = { broadcast, sendToUser };
