const admin = require('firebase-admin');
const db = admin.firestore();
const { getWalletBalance } = require('../services/wallet'); // Use service for wallet balance
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { scheduleRecovery } = require('../services/recoveryService'); // Import recovery scheduling
const { checkKYCAndBridgeStatus } = require('../services/user'); // Import user checks
const upiProviderService = require('../services/upiProviderService');
const { getBankStatus } = require('../services/bankStatusService');
const upiLiteService = require('../services/upiLite'); // Import UPI Lite service
const { format, addBusinessDays } = require('date-fns'); // For refund ETA
const { sendToUser } = require('../server'); // For WebSocket updates
// Import helper from wallet service (ensure it's exported correctly)
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet function

// Import shared Transaction type definition (adjust path as needed)
// Assuming types.ts exists in services directory
// const { Transaction, UpiTransactionResult, BankAccount } = require('../services/types'); // Use require if needed or define inline for JS

// Define types inline if not using TS require
/**
 * @typedef {import('../services/types').Transaction} Transaction
 * @typedef {import('../services/types').UpiTransactionResult} UpiTransactionResult
 * @typedef {import('../services/types').BankAccount} BankAccount
 */


// Firestore Functions (assuming client-side SDK used for simplicity, adjust if using Admin SDK elsewhere)
const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp, updateDoc } = require('firebase/firestore'); // Added updateDoc
const firestoreDb = admin.firestore(); // Use Admin SDK's Firestore instance

// --- Linked Bank Accounts ---

exports.getLinkedAccounts = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, orderBy('isDefault', 'desc'));
        const querySnapshot = await getDocs(q);
        const accounts = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        res.status(200).json(accounts);
    } catch (error) {
         next(error);
    }
};

exports.linkBankAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { bankName, accountNumber } = req.body; // Basic details needed
    if (!bankName || !accountNumber) {
        res.status(400);
        return next(new Error("Bank Name and Account Number are required."));
    }

    try {
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
        const maskedNumber = `xxxx${String(accountNumber).slice(-4)}`; // Ensure string
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
    } catch (error) {
         next(error);
    }
};

exports.removeUpiId = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.params; // Get from route param
     if (!upiId) {
        res.status(400);
        return next(new Error("UPI ID parameter is required."));
    }

    try {
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

        // TODO: Call PSP to deregister UPI ID if required by integration
        console.log(`[PSP Sim] Simulating deregistration for UPI ID: ${upiId}`);

        await deleteDoc(accountDoc.ref);
        res.status(200).json({ message: `UPI ID ${upiId} removed successfully.` });
    } catch (error) {
         next(error);
    }
};

exports.setDefaultAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.body; // UPI ID to set as default
     if (!upiId) {
        res.status(400);
        return next(new Error("UPI ID is required in the request body."));
    }

    try {
        const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
        const batch = writeBatch(firestoreDb);

        const newDefaultQuery = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const newDefaultSnap = await getDocs(newDefaultQuery);
        if (newDefaultSnap.empty) {
            res.status(404);
            throw new Error("Selected UPI ID not found.");
        }
        const newDefaultDocRef = newDefaultSnap.docs[0].ref;

        const currentDefaultQuery = query(accountsColRef, where('isDefault', '==', true));
        const currentDefaultSnap = await getDocs(currentDefaultQuery);

        // Unset current default if it exists and is different from the new one
        currentDefaultSnap.forEach(docSnap => {
             if (docSnap.id !== newDefaultDocRef.id) {
                 batch.update(docSnap.ref, { isDefault: false });
             }
        });

        // Set the new default
        batch.update(newDefaultDocRef, { isDefault: true });
        await batch.commit();
        res.status(200).json({ message: `${upiId} set as default successfully.` });
    } catch (error) {
         next(error);
    }
};


// --- UPI Operations ---

exports.verifyUpiId = async (req, res, next) => {
    const { upiId } = req.query; // Get UPI ID from query parameter
     if (!upiId || typeof upiId !== 'string' || !upiId.includes('@')) {
        res.status(400);
        return next(new Error("Valid UPI ID query parameter is required."));
    }
    try {
        // Check blacklist first
        const blacklistRefByUpi = doc(firestoreDb, 'blacklisted_qrs', upiId); // Using upiId as doc id
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
            // Return a specific response indicating blacklisted status
             res.status(403).json({ verifiedName: null, isBlacklisted: true, reason: blacklistSnapByUpi.data()?.reason || 'Flagged as suspicious' });
             return;
        }
        // Proceed with PSP verification if not blacklisted
        const verifiedName = await upiProviderService.verifyRecipient(upiId); // Call PSP service
        res.status(200).json({ verifiedName, isBlacklisted: false });
    } catch (error) {
         // Handle specific verification errors if PSP provides codes
         if (error.message?.includes("not found") || error.message?.includes("Invalid")) {
            res.status(404); // Not Found
         } else {
             res.status(500); // Generic server error from PSP
         }
         next(error);
    }
};

exports.processUpiPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { recipientUpiId, amount, pin, note, sourceAccountUpiId } = req.body;

    // Basic Validation (already handled by router, but double check)
    if (!recipientUpiId || !amount || amount <= 0 || !pin || !sourceAccountUpiId) {
         res.status(400);
         return next(new Error("Missing required fields: recipientUpiId, amount, pin, sourceAccountUpiId."));
    }


    /** @type {UpiTransactionResult} */
    let paymentResult = { // Initialize result object
        amount, recipientUpiId, status: 'Failed', message: 'Payment processing failed initially.', usedWalletFallback: false
    };
    let recipientName = 'Recipient'; // Default name
    let verificationStatus = 'unverified'; // Default verification status
    /** @type {Partial<Transaction>} */
    let logData = { // Prepare base log data
        type: 'Failed', name: recipientName, description: '', amount: -amount, status: 'Failed', userId, upiId: recipientUpiId, paymentMethodUsed: 'UPI'
    };
    let finalTransactionId = null; // Will hold the Firestore transaction ID

    try {
         // --- Step 0: Check Recipient Blacklist/Verification ---
        const blacklistRef = doc(firestoreDb, 'blacklisted_qrs', recipientUpiId);
        const blacklistSnap = await getDoc(blacklistRef);
        if (blacklistSnap.exists()) {
            verificationStatus = 'blacklisted';
            paymentResult.message = "Payment blocked: Recipient UPI ID is blacklisted.";
            paymentResult.status = 'Failed';
            logData.status = 'Failed';
            logData.description = `Payment to ${recipientUpiId} blocked (Blacklisted)`;
            logData.type = 'Failed';
            throw new Error(paymentResult.message); // Go directly to failure handling
        }

        // --- Step 1: Verify Recipient Name (Optional but Recommended) ---
        try {
             recipientName = await upiProviderService.verifyRecipient(recipientUpiId);
             logData.name = recipientName;
             logData.description = `UPI Payment to ${recipientName}${note ? ` - ${note}` : ''}`;
             // Check if verified against internal list (Optional)
             const verifiedRef = doc(firestoreDb, 'verified_merchants', recipientUpiId);
             const verifiedSnap = await getDoc(verifiedRef);
             verificationStatus = verifiedSnap.exists() ? 'verified' : 'unverified';
             logData.description += verificationStatus === 'unverified' ? ' (Unverified Payee)' : ' (Verified Payee)';
        } catch (verifyError) {
             console.warn(`Recipient verification failed for ${recipientUpiId}: ${verifyError.message} - Proceeding anyway...`);
             recipientName = recipientUpiId;
             logData.name = recipientName;
             logData.description = `UPI Payment to ${recipientName}${note ? ` - ${note}` : ''} (Verification Failed)`;
             verificationStatus = 'unverified';
        }

        // --- Step 2: Check Bank Server Status for Source Account ---
        const bankHandle = sourceAccountUpiId.split('@')[1];
        const bankStatus = await getBankStatus(bankHandle);
        if (bankStatus === 'Down') {
             paymentResult.message = `Your bank (${sourceAccountUpiId}) server is currently down.`;
             logData.description += ` - Failed: ${paymentResult.message}`;
             throw new Error(paymentResult.message); // Go to fallback/failure handling
        }
         if (bankStatus === 'Slow') {
             paymentResult.message = `Your bank (${sourceAccountUpiId}) server is slow. Payment might take longer.`;
             // Continue with payment attempt
         }

        // --- Step 3: Initiate UPI Payment via Provider ---
        const upiResult = await upiProviderService.initiatePayment({
            sourceUpiId: sourceAccountUpiId,
            recipientUpiId,
            amount,
            pin, // PSP handles secure PIN validation
            note: note || `Payment to ${recipientName}`
        });

        // --- Step 4: Handle UPI Result - Success ---
        if (upiResult.status === 'Completed') {
             logData.type = 'Sent';
             logData.status = 'Completed';
             paymentResult.status = 'Completed';
             paymentResult.message = upiResult.message || 'Transaction Successful';
             paymentResult.pspTransactionId = upiResult.transactionId; // Store PSP transaction ID
             logData.description = logData.description?.replace('Payment to', 'Paid to');

             // Add successful transaction to Firestore
             const loggedTx = await addTransaction(logData);
             finalTransactionId = loggedTx.id;
             paymentResult.transactionId = finalTransactionId; // Use Firestore ID

             // Blockchain log (non-blocking)
             logTransactionToBlockchain(finalTransactionId, loggedTx)
                 .catch(err => console.error("Blockchain log failed:", err));

             sendToUser(userId, { type: 'transaction_update', payload: loggedTx });
             return res.status(200).json(paymentResult); // Respond with success

        } else {
             // --- Step 4b: Handle UPI Result - Pending ---
             if (upiResult.status === 'Pending') {
                 paymentResult.message = upiResult.message || 'Transaction Pending Confirmation';
                 paymentResult.status = 'Pending';
                 logData.status = 'Pending';
                 logData.description += ` - Pending: ${paymentResult.message}`;
                 paymentResult.pspTransactionId = upiResult.transactionId; // Store PSP transaction ID

                 // Log pending transaction to Firestore
                 const loggedTx = await addTransaction(logData);
                 finalTransactionId = loggedTx.id;
                 paymentResult.transactionId = finalTransactionId; // Use Firestore ID

                 sendToUser(userId, { type: 'transaction_update', payload: loggedTx });
                 // Return 202 Accepted for Pending status
                 return res.status(202).json(paymentResult);
             }
             // --- Step 4c: Handle UPI Result - Failure (Throw to trigger fallback/error handling) ---
             else {
                paymentResult.message = upiResult.message || `Payment failed. Status: ${upiResult.status}`;
                paymentResult.status = 'Failed';
                paymentResult.errorCode = upiResult.code; // Store error code if provided by PSP
                logData.status = 'Failed';
                logData.description += ` - Failed: ${paymentResult.message}`;

                // Add ticket info if debit might have occurred
                if (upiResult.mightBeDebited) {
                    paymentResult.ticketId = `ZET_TKT_${Date.now()}`; // Generate ticket ID
                    paymentResult.refundEta = format(addBusinessDays(new Date(), 3), 'PPP'); // Calculate ETA
                    logData.ticketId = paymentResult.ticketId;
                    logData.refundEta = paymentResult.refundEta;
                    logData.description += ` (Ticket: ${paymentResult.ticketId})`;
                    console.log(`[UPI Ctrl] Debit might have occurred for failed Tx. Ticket: ${paymentResult.ticketId}, Refund ETA: ${paymentResult.refundEta}`);
                }
                // Throw error to trigger fallback logic
                const error = new Error(paymentResult.message);
                error.code = upiResult.code; // Attach code to error object
                error.mightBeDebited = upiResult.mightBeDebited; // Attach mightBeDebited flag
                throw error;
            }
         }

    } catch (upiError) { // Catch errors from verification, bank status check, or payment initiation
        console.warn("[UPI Ctrl] UPI Payment processing error/failure:", upiError.message, "Code:", upiError.code);
        // Use error message or default if not set
        paymentResult.message = upiError.message || paymentResult.message;
        paymentResult.errorCode = upiError.code || paymentResult.errorCode; // Keep error code

        // --- Step 5: Attempt Wallet Fallback (Smart Wallet Bridge) ---
        let fallbackAttempted = false;
        let fallbackSuccess = false;
        let fallbackTxId = null;
        let recoveryScheduled = false;

        try {
            const { canUseBridge, smartWalletBridgeLimit } = await checkKYCAndBridgeStatus(userId);
            const fallbackLimit = smartWalletBridgeLimit || 0;

            // Define conditions for fallback attempt (e.g., specific error codes, user enabled bridge, amount within limit)
            const fallbackErrorCodes = ['UPI_LIMIT_EXCEEDED', 'INSUFFICIENT_FUNDS', 'BANK_NETWORK_ERROR', 'TRANSACTION_TIMEOUT', 'BANK_DECLINED']; // Add codes that trigger fallback
            const shouldAttemptFallback = canUseBridge && amount <= fallbackLimit &&
                (fallbackErrorCodes.includes(upiError.code) || paymentResult.message.toLowerCase().includes('limit') || paymentResult.message.toLowerCase().includes('server is down'));

            if (shouldAttemptFallback) {
                fallbackAttempted = true;
                console.log("[UPI Ctrl] Attempting Wallet Fallback for UPI failure...");
                // Use internal wallet function directly
                const walletPaymentResult = await payViaWalletInternal(userId, recipientUpiId, amount, `Wallet Fallback: ${note || ''}`, 'Sent'); // Use internal helper

                if (walletPaymentResult.success && walletPaymentResult.transactionId) {
                     fallbackSuccess = true;
                     fallbackTxId = walletPaymentResult.transactionId;
                     paymentResult.message = `Paid via Wallet (UPI Failed: ${upiError.message}). Recovery scheduled.`;
                     paymentResult.status = 'Completed'; // Final status is Completed (via fallback)
                     paymentResult.usedWalletFallback = true;
                     paymentResult.transactionId = fallbackTxId; // Use wallet transaction ID as the primary ID
                     paymentResult.walletTransactionId = fallbackTxId; // Store specifically as well
                     paymentResult.ticketId = undefined; // Clear UPI failure ticket info
                     paymentResult.refundEta = undefined;

                     // Schedule recovery
                     await scheduleRecovery(userId, amount, recipientUpiId, sourceAccountUpiId);
                     recoveryScheduled = true;

                     // Log the *original* UPI failure attempt separately if desired, or update its description
                      logData.status = 'Failed'; // Log original UPI attempt as failed
                      logData.description += ' (Wallet Fallback Used)';
                      // Assign ticket/ETA info ONLY if original UPI failure might cause debit
                      logData.ticketId = upiError.mightBeDebited ? `ZET_TKT_${Date.now()}` : undefined;
                      logData.refundEta = logData.ticketId ? format(addBusinessDays(new Date(), 3), 'PPP') : undefined;
                     await addTransaction(logData); // Log the failed UPI attempt

                     // Wallet payment service already logged the successful fallback transaction.
                     // Send WebSocket update for the successful fallback transaction
                     const finalTxDoc = await getDoc(doc(firestoreDb, 'transactions', fallbackTxId));
                     if (finalTxDoc.exists()) {
                          const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
                          sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
                     }

                     // Return 200 OK with fallback success details
                     return res.status(200).json(paymentResult);
                } else {
                     paymentResult.message = `UPI failed (${upiError.message}). Wallet fallback also failed: ${walletPaymentResult.message}.`;
                     logData.description += ` - Wallet Fallback Failed: ${walletPaymentResult.message}`;
                }

            } else {
                 console.log(`[UPI Ctrl] Fallback not attempted. CanUseBridge: ${canUseBridge}, Amount ${amount} <= Limit ${fallbackLimit}: ${amount <= fallbackLimit}, ErrorCode Check: ${fallbackErrorCodes.includes(upiError.code)}`);
            }
        } catch (fallbackError) {
             console.error("[UPI Ctrl] Wallet Fallback logic error:", fallbackError.message);
             // Add fallback error details to the main message if fallback was attempted
             if (fallbackAttempted) {
                  paymentResult.message += `. Fallback Error: ${fallbackError.message}`;
                  logData.description += ` - Fallback Error: ${fallbackError.message}`;
             }
        }
        // --- End Wallet Fallback ---

        // --- Step 6: Final Failure Logging and Response (if fallback didn't succeed) ---
        logData.status = 'Failed'; // Ensure status is Failed
        // Assign ticket ID and ETA only if the original UPI error indicated potential debit
        logData.ticketId = upiError.mightBeDebited ? `ZET_TKT_${Date.now()}` : undefined;
        logData.refundEta = logData.ticketId ? format(addBusinessDays(new Date(), 3), 'PPP') : undefined;
        paymentResult.ticketId = logData.ticketId; // Update result object
        paymentResult.refundEta = logData.refundEta;

        try {
             const failedTx = await addTransaction(logData); // Log the final failure
             finalTransactionId = failedTx.id;
             paymentResult.transactionId = finalTransactionId; // Use ID from logged failure
             sendToUser(userId, { type: 'transaction_update', payload: failedTx });
        } catch (logError) {
             console.error("[UPI Ctrl] Failed to log failed UPI transaction:", logError);
             paymentResult.transactionId = `failed_${Date.now()}`; // Create placeholder ID if logging fails
        }
        // Return appropriate error status (e.g., 400 Bad Request, 503 Service Unavailable for bank down)
        let statusCode = 400; // Default bad request
        if (upiError.message === "Payment blocked: Recipient UPI ID is blacklisted.") {
            statusCode = 403; // Forbidden
        } else if (upiError.code === 'BANK_NETWORK_ERROR' || paymentResult.message.includes('server is down')) {
             statusCode = 503; // Service Unavailable
        } else if (upiError.code === 'UPI_INCORRECT_PIN') {
             statusCode = 401; // Unauthorized (wrong PIN)
        }
        res.status(statusCode).json(paymentResult); // Return final failure details
    }
};

exports.checkBalance = async (req, res, next) => {
     const userId = req.user.uid;
     const { upiId, pin } = req.body;
      if (!upiId || !pin) {
        res.status(400);
        return next(new Error("UPI ID and PIN are required."));
    }
     try {
        const balance = await upiProviderService.checkAccountBalance(upiId, pin); // Use provider service
        res.status(200).json({ balance });
     } catch (error) {
          next(error);
     }
 };

// --- UPI Lite ---

exports.getUpiLiteStatus = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const status = await upiLiteService.getUpiLiteDetails(userId); // Call service function
        res.status(200).json(status);
    } catch (error) {
         next(error);
    }
};

exports.enableUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    const { linkedAccountUpiId } = req.body;
     if (!linkedAccountUpiId) {
        res.status(400);
        return next(new Error("Linked Account UPI ID is required."));
    }
    try {
        const result = await upiLiteService.enableUpiLite(userId, linkedAccountUpiId); // Call service function
        res.status(200).json(result); // Send back success/message from service
    } catch (error) {
        next(error);
    }
};

exports.topUpUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    const { amount, fundingSourceUpiId } = req.body;
     if (!amount || amount <= 0 || !fundingSourceUpiId) {
        res.status(400);
        return next(new Error("Valid amount and funding source UPI ID are required."));
    }
    try {
        const result = await upiLiteService.topUpUpiLite(userId, amount, fundingSourceUpiId); // Call service function
        // Fetch updated balance to return
        const updatedDetails = await upiLiteService.getUpiLiteDetails(userId);
        res.status(200).json({ ...result, newBalance: updatedDetails.balance }); // Send back success/message and new balance
    } catch (error) {
        next(error);
    }
};

exports.disableUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const result = await upiLiteService.disableUpiLite(userId); // Call service function
        res.status(200).json(result); // Send back success/message from service
    } catch (error) {
        next(error);
    }
};


// Placeholder for PIN Set/Reset Controllers
// exports.setUpiPin = async (req, res, next) => { ... }
// exports.resetUpiPin = async (req, res, next) => { ... }


// Helper function to convert Firestore doc to Transaction type for WS updates
function convertFirestoreDocToTransaction(docSnap) {
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: (data.date instanceof Timestamp) ? data.date.toDate() : new Date(), // Convert Timestamp
        // Ensure other potential timestamps are converted
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
    }; // Basic assertion, refine if using TS interfaces strictly
}
