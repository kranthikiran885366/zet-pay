
const express = require('express');
const { body } = require('express-validator');
const walletController = require('../controllers/walletController');
const router = express.Router();

// GET /api/wallet/balance - Get current user's wallet balance
router.get('/balance', walletController.getWalletBalance);

// POST /api/wallet/topup - Add funds to the wallet
router.post('/topup',
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('fundingSourceInfo').isString().notEmpty().withMessage('Funding source information is required.'),
    walletController.topUpWallet
);

// Maybe add routes for wallet history if needed (separate from main transactions)
// router.get('/history', walletController.getWalletHistory);

module.exports = router;
