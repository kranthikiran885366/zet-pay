
const express = require('express');
const transactionController = require('../controllers/transactionController');
const router = express.Router();

// GET /api/transactions - Fetch transaction history with optional filters
router.get('/', transactionController.getTransactionHistory);

// GET /api/transactions/:id - Fetch details of a specific transaction (Implement in controller if needed)
// router.get('/:id', transactionController.getTransactionDetails);

// POST /api/transactions/:id/cancel - Request cancellation (Implement in controller if needed)
// router.post('/:id/cancel', transactionController.cancelTransactionRequest);

module.exports = router;
