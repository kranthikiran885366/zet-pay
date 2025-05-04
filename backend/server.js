
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
// Add other route imports here as needed
// const templeRoutes = require('./routes/templeRoutes');
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
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
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
      const parsedMessage = JSON.parse(message);
      console.log('Received WebSocket message:', parsedMessage);
      // Handle incoming messages (e.g., authentication, specific actions)
      if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
          // Verify token and associate ws with userId
          // firebaseAdmin.auth().verifyIdToken(parsedMessage.token)...
          console.log(`Client ${clientId} attempted authentication (verification TBD)`);
      }
    } catch (e) {
        console.error('Failed to parse WebSocket message or invalid message format:', message);
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
    // Remove user association if implemented
  });

  ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId); // Clean up on error
  });

  ws.send(JSON.stringify({ type: 'system', message: 'Connected to PayFriend WebSocket server.' }));
});

// Function to broadcast messages (e.g., real-time updates)
function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Function to send message to a specific user (if userId association is implemented)
function sendToUser(userId, message) {
    // Find WebSocket client associated with userId and send
    console.log(`Sending message to user ${userId}:`, message, '(Implementation TBD)');
    // clients.forEach((client, key) => { ... check if client belongs to userId ... });
}

// --- API Routes ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Apply auth middleware to protected routes
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/upi', authMiddleware, upiRoutes);
app.use('/api/recharge', authMiddleware, rechargeRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/offers', authMiddleware, offerRoutes); // Offers might need auth for user-specific stuff

// Mount other routes (add authMiddleware if they need protection)
// app.use('/api/temple', authMiddleware, templeRoutes);
// app.use('/api/travel', authMiddleware, travelRoutes);

// --- Error Handling ---
app.use(errorMiddleware); // Centralized error handler

// --- Start Server ---
const PORT = process.env.PORT || 9003;
server.listen(PORT, () => {
  console.log(`PayFriend Backend Server listening on port ${PORT}`);
});

// Export broadcast function if needed elsewhere (e.g., after a DB update)
module.exports = { broadcast, sendToUser };
