
// backend/controllers/upiController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { getWalletBalance, payViaWalletInternal } = require('../services/wallet'); // Use service for wallet balance and internal payment
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { scheduleRecovery } = require('../services/recoveryService');
const { checkKYCAndBridgeStatus } = require('../services/user');
const upiProviderService = require('../services/upiProviderService');
const { getBankStatus } = require('../services/bankStatusService');
const upiLiteService = require('../services/upiLite');
const { format, addBusinessDays } = require('date-fns');
const { sendToUser } = require('../server'); // For WebSocket updates

const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp, updateDoc } = require('firebase/firestore');
const firestoreDb = admin.firestore();

exports.getLinkedAccounts = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, orderBy('isDefault', 'desc'));
        const querySnapshot = await getDocs(q);
        const accounts = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate().toISOString() : undefined,
        }));
        res.status(200).json(accounts);
    } catch (error) {
         next(error);
    }
};

exports.linkBankAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { bankName, accountNumber } = req.body;
    if (!bankName || !accountNumber) {
        res.status(400);
        return next(new Error("Bank Name and Account Number are required."));
    }
    try {
        console.log(`Simulating account linking for ${userId} with bank ${bankName}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const maskedNumber = `xxxx${String(accountNumber).slice(-4)}`;
        const bankDomain = bankName.toLowerCase().replace(/\s+/g, '').substring(0, 5);
        const generatedUpiId = `${userId.substring(0, 4)}${maskedNumber.slice(-4)}@ok${bankDomain}`;
        const pinLength = Math.random() > 0.5 ? 6 : 4;

        const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, limit(1));
        const existingAccountsSnap = await getDocs(q);
        const isFirstAccount = existingAccountsSnap.empty;

        const accountData = {
            bankName,
            accountNumber: maskedNumber,
            userId,
            upiId: generatedUpiId,
            isDefault: isFirstAccount,
            pinLength,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(accountsColRef, accountData);
        // Convert Timestamp to ISO string for response consistency
        const responseData = { ...accountData, id: docRef.id, createdAt: accountData.createdAt.toDate().toISOString() };
        res.status(201).json(responseData);
    } catch (error) {
         next(error);
    }
};

exports.removeUpiId = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.params;
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
        console.log(`[PSP Sim] Simulating deregistration for UPI ID: ${upiId}`);
        await deleteDoc(accountDoc.ref);
        res.status(200).json({ message: `UPI ID ${upiId} removed successfully.` });
    } catch (error) {
         next(error);
    }
};

exports.setDefaultAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.body;
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
        currentDefaultSnap.forEach(docSnap => {
             if (docSnap.id !== newDefaultDocRef.id) {
                 batch.update(docSnap.ref, { isDefault: false });
             }
        });
        batch.update(newDefaultDocRef, { isDefault: true });
        await batch.commit();
        res.status(200).json({ message: `${upiId} set as default successfully.` });
    } catch (error) {
         next(error);
    }
};

exports.verifyUpiId = async (req, res, next) => {
    const { upiId } = req.query;
     if (!upiId || typeof upiId !== 'string' || !upiId.includes('@')) {
        res.status(400);
        return next(new Error("Valid UPI ID query parameter is required."));
    }
    try {
        const blacklistRefByUpi = doc(firestoreDb, 'blacklisted_qrs', upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
             res.status(403).json({ verifiedName: null, isBlacklisted: true, reason: blacklistSnapByUpi.data()?.reason || 'Flagged as suspicious' });
             return;
        }
        const verifiedName = await upiProviderService.verifyRecipient(upiId);
        res.status(200).json({ verifiedName, isBlacklisted: false });
    } catch (error) {
         if (error.message?.includes("not found") || error.message?.includes("Invalid")) {
            res.status(404);
         } else {
             res.status(500);
         }
         next(error);
    }
};

exports.processUpiPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { recipientUpiId, amount, pin, note, sourceAccountUpiId } = req.body;

    if (!recipientUpiId || !amount || amount <= 0 || !pin || !sourceAccountUpiId) {
         res.status(400);
         return next(new Error("Missing required fields: recipientUpiId, amount, pin, sourceAccountUpiId."));
    }

    let paymentResult = { success: false, status: 'Failed', message: 'Payment processing error', transactionId: null, usedWalletFallback: false, walletTransactionId: null, ticketId: null, refundEta: null };
    let loggedTx;

    try {
        const transferResult = await upiProviderService.initiatePayment({ sourceUpiId, recipientUpiId, amount, pin, note });
        paymentResult.success = transferResult.status === 'Completed';
        paymentResult.status = transferResult.status;
        paymentResult.message = transferResult.message;
        paymentResult.transactionId = transferResult.transactionId;

        loggedTx = await addTransaction({
            type: paymentResult.success ? 'Sent' : 'Failed',
            name: recipientUpiId,
            description: `${note || `Payment to ${recipientUpiId}`} (UPI)`,
            amount: -amount,
            status: paymentResult.status, // Use status from PSP
            userId: userId,
            upiId: recipientUpiId,
            originalTransactionId: transferResult.transactionId, // PSP transaction ID
            paymentMethodUsed: 'UPI',
        });
        paymentResult.transactionId = loggedTx.id; // Use our system's transaction ID now

        if (paymentResult.success) {
            res.status(200).json({ ...paymentResult, transactionId: loggedTx.id });
        } else {
            // Consider UPI Limit Exceeded Fallback only for specific error codes
            const isLimitError = transferResult.code === 'UPI_LIMIT_EXCEEDED'; // Example error code
            if (isLimitError) {
                const kycBridgeStatus = await checkKYCAndBridgeStatus(userId);
                if (kycBridgeStatus.canUseBridge && amount <= kycBridgeStatus.smartWalletBridgeLimit) {
                    console.log(`UPI limit exceeded for ${userId}. Attempting Smart Wallet Bridge for ₹${amount}`);
                    const walletResult = await payViaWalletInternal(userId, recipientUpiId, amount, `${note || 'Payment'} (Wallet Fallback)`);
                    if (walletResult.success) {
                        await scheduleRecovery(userId, amount, recipientUpiId, sourceAccountUpiId);
                        // Update original failed UPI log description and create new wallet log
                        await updateDoc(doc(db, 'transactions', loggedTx.id), { description: `${loggedTx.description} - Failed (Limit), Paid via Wallet Fallback`, updatedAt: serverTimestamp() });
                        // `payViaWalletInternal` already logs its own transaction
                        paymentResult.usedWalletFallback = true;
                        paymentResult.walletTransactionId = walletResult.transactionId;
                        paymentResult.status = 'FallbackSuccess';
                        paymentResult.message = `UPI Limit Exceeded. Payment successful via Wallet. Wallet TxID: ${walletResult.transactionId}`;
                        return res.status(200).json({ ...paymentResult, transactionId: loggedTx.id });
                    } else {
                         paymentResult.message = `UPI Limit Exceeded. Wallet fallback failed: ${walletResult.message}`;
                         throw new Error(paymentResult.message); // Throw to trigger failure path
                    }
                }
            }
             // If not a limit error or fallback not possible/failed
             // Send detailed error from PSP if available
             const error = new Error(paymentResult.message || 'UPI Payment Failed');
             if(transferResult.code) error.code = transferResult.code;
             if(transferResult.mightBeDebited) error.mightBeDebited = true;
             throw error;
        }
    } catch (error) {
        // Log failure if not already logged or update status if logged
        if (loggedTx && loggedTx.id) {
             await updateDoc(doc(db, 'transactions', loggedTx.id), { status: 'Failed', description: `${loggedTx.description} - Error: ${error.message}`, updatedAt: serverTimestamp() });
             // Fetch updated doc to send via WS
             const updatedFailedTxSnap = await getDoc(doc(db, 'transactions', loggedTx.id));
             if (updatedFailedTxSnap.exists()) {
                 const updatedFailedTxData = { id: updatedFailedTxSnap.id, ...updatedFailedTxSnap.data(), date: updatedFailedTxSnap.data().date.toDate().toISOString() };
                 sendToUser(userId, { type: 'transaction_update', payload: updatedFailedTxData });
             }
        } else {
            // Log a new failed transaction if initial PSP call failed before logging
            const newFailedTx = await addTransaction({
                type: 'Failed', name: recipientUpiId, description: `Payment to ${recipientUpiId} (UPI) - Error: ${error.message}`,
                amount: -amount, status: 'Failed', userId: userId, upiId: recipientUpiId, paymentMethodUsed: 'UPI',
            });
            paymentResult.transactionId = newFailedTx.id; // Set for response
        }

        paymentResult.status = 'Failed';
        paymentResult.message = error.message || 'UPI Payment failed.';
        paymentResult.errorCode = error.code; // Include error code from PSP if available
        paymentResult.mightBeDebited = error.mightBeDebited; // Flag if debit might have happened

        // Create support ticket if payment failed but might be debited
        if (error.mightBeDebited) {
            const ticketId = `SPT_${Date.now()}`;
            const refundDate = addBusinessDays(new Date(), 3); // Example: 3 business days
            paymentResult.ticketId = ticketId;
            paymentResult.refundEta = format(refundDate, 'PP');
            await addDoc(collection(firestoreDb, 'supportTickets'), {
                userId,
                transactionId: paymentResult.transactionId, // Our system's failed tx ID
                pspTransactionId: transferResult.transactionId, // PSP's original tx ID
                issue: 'Payment Failed, Amount Debited (UPI)',
                status: 'Open',
                amount,
                recipientUpiId,
                refundEta: paymentResult.refundEta,
                createdAt: serverTimestamp(),
            });
            console.log(`Support ticket ${ticketId} created for failed-but-debited UPI Tx ${paymentResult.transactionId}`);
        }
        res.status(400).json(paymentResult); // Send full result with error details
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
        const balance = await upiProviderService.checkAccountBalance(upiId, pin);
        res.status(200).json({ balance });
     } catch (error) {
          next(error);
     }
 };

exports.getUpiLiteStatus = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const status = await upiLiteService.getUpiLiteDetails(userId);
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
        const result = await upiLiteService.enableUpiLite(userId, linkedAccountUpiId);
        res.status(200).json(result);
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
        const result = await upiLiteService.topUpUpiLite(userId, amount, fundingSourceUpiId);
        const updatedDetails = await upiLiteService.getUpiLiteDetails(userId);
        res.status(200).json({ ...result, newBalance: updatedDetails.balance });
    } catch (error) {
        next(error);
    }
};

exports.disableUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const result = await upiLiteService.disableUpiLite(userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Placeholder for PIN Set/Reset Controllers
// exports.setUpiPin = async (req, res, next) => { ... }
// exports.resetUpiPin = async (req, res, next) => { ... }

