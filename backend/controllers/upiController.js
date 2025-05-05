const admin = require('firebase-admin');
const db = admin.firestore();
const { getWalletBalance } = require('../services/wallet'); // Use service for wallet balance
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { scheduleRecovery } = require('../services/recoveryService'); // Import recovery scheduling
const { checkKYCAndBridgeStatus } = require('../services/userService'); // Import user checks
const upiProviderService = require('../services/upiProviderService');
const { getBankStatus } = require('../services/bankStatusService');
const upiLiteService = require('../services/upiLite'); // Import UPI Lite service

// Firestore Functions (assuming client-side SDK used for simplicity, adjust if using Admin SDK elsewhere)
const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp } = require('firebase/firestore');
const firestoreDb = admin.firestore(); // Use Admin SDK's Firestore instance

// --- Linked Bank Accounts ---

exports.getLinkedAccounts = async (req, res, next) => {
    const userId = req.user.uid;
    const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
    const q = query(accountsColRef, orderBy('isDefault', 'desc'));
    const querySnapshot = await getDocs(q);
    const accounts = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    res.status(200).json(accounts);
};

exports.linkBankAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { bankName, accountNumber } = req.body; // Basic details needed

    // --- SIMULATION ---
    // In a real app, this requires a complex flow involving:
    // 1. User selecting bank.
    // 2. Backend fetching user's mobile number associated with their profile.
    // 3. Backend initiating NPCI device binding/account fetching flow via PSP using the mobile number.
    // 4. User confirming account selection via SMS OTP sent to the registered mobile.
    // 5. PSP confirming linkage and returning account details (masked number, generated UPI ID).
    // 6. Optionally triggering UPI PIN set/reset flow if needed.
    console.log(`Simulating account linking for ${userId} with bank ${bankName}...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // --- End Simulation ---

    // Simulate successful linking and data returned by PSP
    const maskedNumber = `xxxx${accountNumber.slice(-4)}`;
    const bankDomain = bankName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 5);
    const generatedUpiId = `${userId.substring(0, 4)}${maskedNumber.slice(-4)}@ok${bankDomain}`; // Example ID format
    const pinLength = Math.random() > 0.5 ? 6 : 4; // Example PIN length

    const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
    const q = query(accountsColRef, limit(1));
    const existingAccountsSnap = await getDocs(q);
    const isFirstAccount = existingAccountsSnap.empty;

    const accountData = {
        bankName,
        accountNumber: maskedNumber, // Store masked number
        userId, // Ensure userId is stored
        upiId: generatedUpiId,
        isDefault: isFirstAccount,
        pinLength, // Store PIN length
        createdAt: Timestamp.now(), // Add creation timestamp
    };

    const docRef = await addDoc(accountsColRef, accountData);
    res.status(201).json({ id: docRef.id, ...accountData }); // Return the saved data including the ID
};

exports.removeUpiId = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.params; // Get from route param

    const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
    const q = query(accountsColRef, where('upiId', '==', upiId), limit(1));
    const accountSnapshot = await getDocs(q);

    if (accountSnapshot.empty) {
        res.status(404);
        throw new Error("UPI ID not found.");
    }

    const accountDoc = accountSnapshot.docs[0];
    if (accountDoc.data().isDefault) {
        const allAccountsSnap = await getDocs(accountsColRef);
        if (allAccountsSnap.size <= 1) {
             res.status(400);
             throw new Error("Cannot remove the only linked account.");
        }
         res.status(400);
         throw new Error("Cannot remove default account. Set another as default first.");
    }

    await deleteDoc(accountDoc.ref);
    res.status(200).json({ message: `UPI ID ${upiId} removed successfully.` });
};

exports.setDefaultAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.body; // UPI ID to set as default

    const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
    const batch = writeBatch(firestoreDb);

    const newDefaultQuery = query(accountsColRef, where('upiId', '==', upiId), limit(1));
    const newDefaultSnap = await getDocs(newDefaultQuery);
    if (newDefaultSnap.empty) {
        res.status(404);
        throw new Error("Selected UPI ID not found.");
    }
    const newDefaultDocRef = newDefaultSnap.docs[0].ref;

    const currentDefaultQuery = query(accountsColRef, where('isDefault', '==', true), limit(1));
    const currentDefaultSnap = await getDocs(currentDefaultQuery);

    // Unset current default if it exists and is different from the new one
    if (!currentDefaultSnap.empty) {
        const currentDefaultDocRef = currentDefaultSnap.docs[0].ref;
        if (currentDefaultDocRef.id !== newDefaultDocRef.id) {
            batch.update(currentDefaultDocRef, { isDefault: false });
        }
    }

    // Set the new default
    batch.update(newDefaultDocRef, { isDefault: true });
    await batch.commit();
    res.status(200).json({ message: `${upiId} set as default successfully.` });
};


// --- UPI Operations ---

exports.verifyUpiId = async (req, res, next) => {
    const { upiId } = req.query; // Get UPI ID from query parameter
    // Basic validation already done by express-validator
    const verifiedName = await upiProviderService.verifyRecipient(upiId as string); // Call PSP service
    res.status(200).json({ verifiedName });
};

exports.processUpiPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { recipientUpiId, amount, pin, note, sourceAccountUpiId } = req.body;

    let paymentResult: UpiTransactionResult = { // Initialize result object
        amount, recipientUpiId, status: 'Failed', message: 'Payment processing failed.', usedWalletFallback: false
    };
    let recipientName = 'Recipient';
    let logData: Partial<Transaction> = { // Prepare base log data
        type: 'Failed', name: recipientName, description: '', amount: -amount, status: 'Failed', userId, upiId: recipientUpiId, paymentMethodUsed: 'UPI'
    };

    try {
        // 1. Verify Recipient (Optional but Recommended)
        try {
             recipientName = await upiProviderService.verifyRecipient(recipientUpiId);
             logData.name = recipientName;
             logData.description = `UPI Payment to ${recipientName}${note ? ` - ${note}` : ''}`; // Update description early
        } catch (verifyError: any) {
             // Proceed even if verification fails? Or stop? Decided to stop.
             res.status(400);
             throw new Error(`Recipient verification failed: ${verifyError.message}`);
        }


        // 2. Check Bank Server Status for Source Account
        const bankHandle = sourceAccountUpiId.split('@')[1];
        const bankStatus = await getBankStatus(bankHandle);
        if (bankStatus === 'Down') {
             paymentResult.message = `Your bank (${sourceAccountUpiId}) server is currently down.`;
             logData.description += ` - Failed: ${paymentResult.message}`;
             throw new Error(paymentResult.message); // Go to fallback/failure handling
        }
         if (bankStatus === 'Slow') {
             // Add a warning to the response? Or just proceed?
             paymentResult.message = `Your bank (${sourceAccountUpiId}) server is slow. Payment might take longer.`;
             // Continue with payment attempt
         }


        // 3. Initiate UPI Payment via Provider
        const upiResult = await upiProviderService.initiatePayment({
            sourceUpiId: sourceAccountUpiId,
            recipientUpiId,
            amount,
            pin, // PSP handles secure PIN validation
            note: note || `Payment to ${recipientName}`
        });

        // 4. Handle UPI Result
        if (upiResult.status === 'Completed') {
             logData.type = 'Sent';
             logData.status = 'Completed';
             paymentResult.status = 'Completed';
             paymentResult.message = upiResult.message || 'Transaction Successful';
             paymentResult.transactionId = upiResult.transactionId; // Store PSP transaction ID if available
             logData.description = logData.description?.replace('Payment to', 'Paid to'); // Update description for success

             const loggedTx = await addTransaction(logData as Transaction); // Log successful transaction
             paymentResult.transactionId = loggedTx.id; // Use Firestore transaction ID for consistency in response

              // Log to blockchain (non-blocking)
             logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date(), recipient: recipientUpiId })
                 .catch(err => console.error("Blockchain log failed:", err));

             sendToUser(userId, { type: 'transaction_update', payload: { ...loggedTx, date: loggedTx.date.toISOString() } }); // Send WS update
             return res.status(200).json(paymentResult); // Respond with success

         } else {
             // UPI Failed or Pending
             paymentResult.message = upiResult.message || `Payment ${upiResult.status}.`;
             paymentResult.status = upiResult.status === 'Pending' ? 'Pending' : 'Failed'; // Map status
             logData.status = paymentResult.status; // Update log status
             logData.description += ` - ${paymentResult.status}: ${paymentResult.message}`;

             // Add ticket info if debit might have occurred
             if (upiResult.mightBeDebited) {
                 paymentResult.ticketId = `ZET_TKT_${Date.now()}`;
                 paymentResult.refundEta = format(addBusinessDays(new Date(), 3), 'PPP'); // Example ETA
                 logData.ticketId = paymentResult.ticketId;
                 logData.refundEta = paymentResult.refundEta;
                 logData.description += ` (Ticket: ${paymentResult.ticketId})`;
             }
             // Throw error to trigger fallback logic in catch block
             throw new Error(paymentResult.message);
         }

    } catch (upiError: any) { // Catch errors from verification, bank status check, or payment initiation
        console.warn("UPI Payment processing error/failure:", upiError.message);
        paymentResult.message = upiError.message || paymentResult.message; // Update message with specific error

        // --- Attempt Wallet Fallback (Smart Wallet Bridge) ---
        let fallbackAttempted = false;
        try {
            const { canUseBridge, smartWalletBridgeLimit } = await checkKYCAndBridgeStatus(userId);
            const fallbackLimit = smartWalletBridgeLimit || 0;

            // Define conditions for fallback attempt
            const shouldAttemptFallback = canUseBridge && amount <= fallbackLimit &&
                (upiError.code === 'UPI_LIMIT_EXCEEDED' || upiError.message.includes('Bank server') || upiError.message.includes('limit') || upiError.code === 'INSUFFICIENT_FUNDS'); // Add insufficient funds

            if (shouldAttemptFallback) {
                fallbackAttempted = true;
                console.log("Attempting Wallet Fallback...");
                const walletBalance = await getWalletBalance(userId); // Use service
                if (walletBalance >= amount) {
                    // Use internal wallet payment function from Wallet Service
                    const walletPaymentResult = await payViaWalletInternal(userId, recipientUpiId, amount, `Wallet Fallback: ${note || ''}`); // Using internal helper

                    if (walletPaymentResult.success && walletPaymentResult.transactionId) {
                         paymentResult.status = 'FallbackSuccess'; // Use a distinct status for tracking? Or just 'Completed'? Using Completed for history.
                         paymentResult.message = `Paid via Wallet (${upiError.message}). Recovery scheduled.`;
                         paymentResult.usedWalletFallback = true;
                         paymentResult.walletTransactionId = walletPaymentResult.transactionId; // Store wallet tx ID
                         paymentResult.transactionId = walletPaymentResult.transactionId; // Use wallet tx ID as primary ID for response
                         paymentResult.ticketId = undefined; // Clear ticket/refund info as fallback succeeded
                         paymentResult.refundEta = undefined;

                         await scheduleRecovery(userId, amount, recipientUpiId, sourceAccountUpiId);

                         // Wallet payment service already logs its transaction.
                          // We should log the *original* UPI failure though.
                         logData.status = 'Failed'; // Log original UPI attempt as failed
                         logData.description += ' (Wallet Fallback Used)';
                         await addTransaction(logData as Transaction); // Log the failed UPI attempt

                         sendToUser(userId, { type: 'transaction_update', payload: { ...(await getTransactionDetails(walletPaymentResult.transactionId)), date: new Date().toISOString()} }); // Send WS update for wallet payment
                         return res.status(200).json(paymentResult); // Return successful fallback result
                    } else {
                         paymentResult.message = `UPI failed (${upiError.message}). Wallet fallback also failed: ${walletPaymentResult.message}.`;
                         logData.description += ` - Wallet Fallback Failed: ${walletPaymentResult.message}`;
                    }
                } else {
                    paymentResult.message = `UPI failed (${upiError.message}). Insufficient wallet balance (₹${walletBalance.toFixed(2)}) for fallback.`;
                    logData.description += ' - Insufficient Wallet Balance for Fallback.';
                }
            }
        } catch (fallbackError: any) {
             console.error("Wallet Fallback logic error:", fallbackError.message);
             // Add fallback error details to the main message if fallback was attempted
             if(fallbackAttempted) {
                  paymentResult.message = `${paymentResult.message}. Fallback Error: ${fallbackError.message}`;
                  logData.description += ` - Fallback Error: ${fallbackError.message}`;
             }
        }
        // --- End Wallet Fallback ---

        // --- Final Failure Logging and Response ---
        logData.status = 'Failed'; // Ensure status is Failed
        logData.ticketId = paymentResult.ticketId; // Include ticket if generated
        logData.refundEta = paymentResult.refundEta;
        try {
             const failedTx = await addTransaction(logData as Transaction); // Log the final failure
             paymentResult.transactionId = failedTx.id; // Use ID from logged failure
             sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date.toISOString() } }); // Send WS update for failed tx
        } catch (logError) {
             console.error("Failed to log failed UPI transaction:", logError);
             // If logging fails, create a minimal object for the response
             paymentResult.transactionId = `failed_${Date.now()}`;
        }
        res.status(400).json(paymentResult); // Return final failure details
    }
};

exports.checkBalance = async (req, res, next) => {
     const userId = req.user.uid; // Ensure user is owner of upiId if needed? Backend might handle.
     const { upiId, pin } = req.body;
     const balance = await upiProviderService.checkAccountBalance(upiId, pin); // Use provider service
     res.status(200).json({ balance });
 };

// --- UPI Lite ---

exports.getUpiLiteStatus = async (req, res, next) => {
    const userId = req.user.uid;
    const status = await upiLiteService.getUpiLiteDetails(userId); // Call service function
    res.status(200).json(status);
};

exports.enableUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    const { linkedAccountUpiId } = req.body;
    const success = await upiLiteService.enableUpiLite(userId, linkedAccountUpiId); // Call service function
    if (success) {
        res.status(200).json({ success: true, message: "UPI Lite enabled successfully." });
    } else {
        // Should not happen if service throws error, but handle just in case
        res.status(500);
        throw new Error("Failed to enable UPI Lite.");
    }
};

exports.topUpUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    const { amount, fundingSourceUpiId } = req.body;
    const success = await upiLiteService.topUpUpiLite(userId, amount, fundingSourceUpiId); // Call service function
    if (success) {
        // Fetch updated balance to return
        const updatedDetails = await upiLiteService.getUpiLiteDetails(userId);
        res.status(200).json({ success: true, message: "UPI Lite top-up successful.", newBalance: updatedDetails.balance });
    } else {
        res.status(500);
        throw new Error("Failed to top-up UPI Lite.");
    }
};

exports.disableUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    const result = await upiLiteService.disableUpiLite(userId); // Call service function
    if (result.success) {
        res.status(200).json({ success: true, message: `UPI Lite disabled. Balance ${result.balanceReturned ? `₹${result.balanceReturned}` : ''} transferred back to linked account.` });
    } else {
        res.status(500);
        throw new Error("Failed to disable UPI Lite.");
    }
};


// Placeholder for PIN Set/Reset Controllers
// exports.setUpiPin = async (req, res, next) => { ... }
// exports.resetUpiPin = async (req, res, next) => { ... }

// Add internal helper import if needed elsewhere
module.exports.payViaWalletInternal = require('../services/wallet').payViaWalletInternal; // Make internal wallet payment available

// Import shared Transaction type
import type { Transaction, UpiTransactionResult } from '../services/types';
import { format, addBusinessDays } from 'date-fns'; // For refund ETA
const { sendToUser } = require('../server'); // For WebSocket updates
// Import helper from wallet service (ensure it's exported correctly)
const { payViaWalletInternal } = require('../services/wallet');
// Helper function to get transaction details (if needed for WS updates)
const getTransactionDetails = async (txId: string): Promise<Transaction | null> => {
     const txDoc = await getDoc(doc(firestoreDb, 'transactions', txId));
     if (txDoc.exists()) {
         const data = txDoc.data();
         return { id: txDoc.id, ...data, date: data.date.toDate() } as Transaction;
     }
     return null;
 }

```
  </change>
  <change>
    <file>backend/routes/userRoutes.js</file>
    <description>Wrap userController functions with asyncHandler and add validation for profile update.</description>
    <content><![CDATA[const express = require('express');
const { body, validationResult } = require('express-validator'); // Import validator
const userController = require('../controllers/userController');
const asyncHandler = require('../middleware/asyncHandler'); // Import asyncHandler
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); // Set status code
        throw new Error(`Validation Failed: ${errorMessages}`); // Throw error for asyncHandler
    }
    next();
};

// GET /api/users/profile - Fetch current user's profile
router.get('/profile', asyncHandler(userController.getUserProfile));

// PUT /api/users/profile - Update current user's profile
router.put('/profile',
    // Add optional validation rules for fields that can be updated
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
    body('phone').optional({ checkFalsy: true }).trim().isMobilePhone('en-IN').withMessage('Invalid Indian mobile number format.'),
    body('avatarUrl').optional({ checkFalsy: true }).isURL().withMessage('Invalid avatar URL.'),
    body('notificationsEnabled').optional().isBoolean().withMessage('notificationsEnabled must be true or false.'),
    body('biometricEnabled').optional().isBoolean().withMessage('biometricEnabled must be true or false.'),
    body('appLockEnabled').optional().isBoolean().withMessage('appLockEnabled must be true or false.'),
    body('isSmartWalletBridgeEnabled').optional().isBoolean().withMessage('isSmartWalletBridgeEnabled must be true or false.'),
    body('smartWalletBridgeLimit').optional({ checkFalsy: true }).isNumeric().toFloat({ min: 0 }).withMessage('Invalid smart wallet bridge limit.'),
    body('defaultPaymentMethod').optional().isString().trim(),
    body('isSeniorCitizenMode').optional().isBoolean().withMessage('isSeniorCitizenMode must be true or false.'),
    handleValidationErrors, // Apply validation check
    asyncHandler(userController.updateUserProfile)
);

// POST /api/users/kyc/initiate - Initiate KYC process (Placeholder)
// router.post('/kyc/initiate', asyncHandler(userController.initiateKyc));

// GET /api/users/kyc/status - Get KYC status (can be part of getProfile)
// router.get('/kyc/status', asyncHandler(userController.getKycStatus));

module.exports = router;
