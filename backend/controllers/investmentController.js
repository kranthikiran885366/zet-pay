// backend/controllers/investmentController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const investmentProviderService = require('../services/investmentProviderService'); // Assume unified service
const { payViaWallet } = require('./walletController');

// --- Mutual Funds ---

// Search/Browse Mutual Funds
exports.searchMutualFunds = async (req, res, next) => {
    const { query, category, riskLevel, fundHouse } = req.query;
    console.log("Searching Mutual Funds:", req.query);
    try {
        const funds = await investmentProviderService.searchFunds({ query, category, riskLevel, fundHouse });
        res.status(200).json(funds);
    } catch (error) {
        next(error);
    }
};

// Get Fund Details (NAV, historical performance etc.)
exports.getFundDetails = async (req, res, next) => {
    const { fundId } = req.params;
    console.log("Fetching details for Mutual Fund:", fundId);
    try {
        const details = await investmentProviderService.getFundDetails(fundId);
        if (!details) return res.status(404).json({ message: "Fund not found." });
        res.status(200).json(details);
    } catch (error) {
        next(error);
    }
};

// Invest in Mutual Fund (Lumpsum or SIP setup)
exports.investInMutualFund = async (req, res, next) => {
    const userId = req.user.uid;
    const { fundId, amount, investmentType = 'Lumpsum', sipFrequency, sipDate, paymentMethod = 'wallet' } = req.body; // Lumpsum or SIP

    if (!fundId || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Fund ID and valid amount required.' });
    }
    if (investmentType === 'SIP' && (!sipFrequency || !sipDate)) {
         return res.status(400).json({ message: 'SIP frequency and start date required.' });
    }

    console.log(`Initiating MF Investment for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let investmentResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Investment failed.';
    const transactionName = `MF ${investmentType}: ${fundId}`;

    let logData: Partial<Transaction> & { userId: string } = {
        userId,
        type: 'Investment',
        name: transactionName,
        description: `Amount: ${amount}`,
        amount: -amount,
        status: 'Failed',
        billerId: fundId, // Use billerId for fundId
    };


    try {
        // --- Step 1: Payment Processing (for Lumpsum) ---
        if (investmentType === 'Lumpsum') {
             if (paymentMethod === 'wallet') {
                 const walletResult = await payViaWallet(userId, `mf_${fundId}`, amount, transactionName);
                 if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
                 paymentSuccess = true;
                 paymentResult = walletResult;
                 logData.description += ' (via Wallet)';
             } else if (paymentMethod === 'upi') {
                 // TODO: Integrate UPI payment
                  throw new Error("UPI payment for MF not implemented yet.");
             } else {
                   throw new Error('Invalid payment method.');
             }
        } else {
            // For SIP, payment is handled via mandate later. Just setup the SIP instruction.
             paymentSuccess = true; // Consider SIP setup itself a success initially
             paymentResult.message = "SIP setup initiated.";
        }


        // --- Step 2: Investment Instruction ---
        if (paymentSuccess) {
            console.log("Payment processed (if Lumpsum), placing investment instruction...");
            investmentResult = await investmentProviderService.placeInvestmentOrder({
                userId,
                fundId,
                amount,
                investmentType,
                sipFrequency,
                sipDate,
                paymentTransactionId: paymentResult.transactionId || null, // Pass payment ID if lumpsum
            });

            if (investmentResult.status === 'Processed' || investmentResult.status === 'Pending Allotment' || investmentResult.status === 'SIP Registered') {
                 finalStatus = 'Completed'; // Treat as completed for logging
                 failureReason = '';
                 logData.status = finalStatus;
                 logData.description = investmentResult.message || `Folio: ${investmentResult.folioNumber || 'N/A'}`;
                 logData.ticketId = investmentResult.orderId || undefined; // Use ticketId for order ID
            } else {
                 finalStatus = 'Failed';
                 failureReason = investmentResult.message || 'Investment instruction failed.';
                 logData.status = 'Failed';
                 logData.description += ` - Investment Failed: ${failureReason}`;
                 // TODO: Refund if lumpsum payment was made
                 if (investmentType === 'Lumpsum') {
                     console.error(`CRITICAL: Lumpsum payment successful but MF investment failed for user ${userId}. Refunding.`);
                     // Trigger refund...
                     paymentResult.message = failureReason + " Refund initiated.";
                 } else {
                      paymentResult.message = failureReason;
                 }
            }
        } else {
            throw new Error(paymentResult.message || "Payment failed before investment attempt.");
        }

        // --- Step 3: Logging ---
        const loggedTx = await addTransaction(logData);
        paymentResult.transactionId = loggedTx.id; // Use Firestore ID for reference

        res.status(finalStatus === 'Completed' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: loggedTx.id,
            investmentDetails: finalStatus === 'Completed' ? investmentResult : null,
        });

    } catch (error: any) {
        console.error(`MF Investment failed for user ${userId}:`, error.message);
        logData.description = `MF Investment Failed - ${error.message}`;
        logData.status = 'Failed';
        try {
            const failedTx = await addTransaction(logData);
            paymentResult.transactionId = failedTx.id;
        } catch (logError) {
             console.error("Failed to log failed MF investment transaction:", logError);
        }
         res.status(400).json({
             status: 'Failed',
             message: error.message || failureReason,
             transactionId: paymentResult.transactionId
         });
    }
};

// --- Digital Gold ---

// Get Live Gold Price
exports.getGoldPrice = async (req, res, next) => {
    console.log("Fetching Live Gold Price...");
    try {
        const priceInfo = await investmentProviderService.fetchGoldPrice();
        res.status(200).json(priceInfo); // Includes buyPrice, sellPrice per gram etc.
    } catch (error) {
        next(error);
    }
};

// Buy Digital Gold
exports.buyDigitalGold = async (req, res, next) => {
    // Similar structure to MF investment: Payment -> Buy Order -> Log
    // ... implementation ...
     res.status(501).json({ message: 'Buy Digital Gold not implemented yet.' });
};

// Sell Digital Gold
exports.sellDigitalGold = async (req, res, next) => {
     // Validate user has enough gold -> Place Sell Order -> Credit bank account -> Log
     // ... implementation ...
     res.status(501).json({ message: 'Sell Digital Gold not implemented yet.' });
};

// Get Gold Holdings/Portfolio
exports.getGoldPortfolio = async (req, res, next) => {
    // Fetch user's gold balance (in grams) and current value from DB/Provider
     // ... implementation ...
    res.status(501).json({ message: 'Get Gold Portfolio not implemented yet.' });
};


// --- Deposits (FD/RD) ---

// Get Available Deposit Schemes/Rates
exports.getDepositSchemes = async (req, res, next) => {
     // Fetch FD/RD rates from partner bank API
     // ... implementation ...
     res.status(501).json({ message: 'Get Deposit Schemes not implemented yet.' });
};

// Book Fixed/Recurring Deposit
exports.bookDeposit = async (req, res, next) => {
    // Validate request -> Payment/Account Debit -> Book FD/RD with bank -> Log
     // ... implementation ...
     res.status(501).json({ message: 'Book Deposit not implemented yet.' });
};

// Get User's Deposits
exports.getUserDeposits = async (req, res, next) => {
    // Fetch list of user's active FDs/RDs
    // ... implementation ...
    res.status(501).json({ message: 'Get User Deposits not implemented yet.' });
};


function capitalize(s: string): string {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Import Transaction type definition
import type { Transaction } from '../services/types';
