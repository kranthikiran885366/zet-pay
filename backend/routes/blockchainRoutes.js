// backend/routes/blockchainRoutes.js
const express = require('express');
const blockchainController = require('../controllers/blockchainController');
const authMiddleware = require('../middleware/authMiddleware'); // Protect routes if needed
const router = express.Router();

// GET /api/blockchain/tx/:transactionId - Get details of a transaction logged on the blockchain
router.get('/tx/:transactionId', authMiddleware, blockchainController.getTransactionDetails);

// GET /api/blockchain/verify/:transactionId - Verify a transaction's validity on the blockchain
router.get('/verify/:transactionId', authMiddleware, blockchainController.verifyTransaction);

// Add other blockchain-related routes as needed

module.exports = router;
