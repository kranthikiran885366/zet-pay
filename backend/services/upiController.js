
// backend/controllers/upiController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { getWalletBalance, payViaWalletInternal } = require('../services/wallet.ts'); // Corrected import path
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger.ts'); // Use backend logger
const { scheduleRecovery } = require('../services/recoveryService.ts'); // Corrected import path
const { checkKYCAndBridgeStatus } = require('../services/user.js'); // Corrected import path
const upiProviderService = require('../services/upiProviderService.js');
const { getBankStatus } = require('../services/bankStatusService.js');
const upiLiteService = require('../services/upiLite.js');
const { format, addBusinessDays } = require('date-fns');
const { sendToUser } = require('../server'); // For WebSocket updates

const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp, serverTimestamp, updateDoc } = require('firebase/firestore'); // serverTimestamp added
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
            createdAt: serverTimestamp(), // Use server timestamp
        };

        const docRef = await addDoc(accountsColRef, accountData);
        // Fetch to get resolved timestamp for response
        const savedDoc = await getDoc(docRef);
        const responseData = { ...savedDoc.data(), id: docRef.id, createdAt: savedDoc.data().createdAt.toDate().toISOString() };
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
        // Check against verified merchants
        const verifiedMerchantRef = doc(firestoreDb, 'verified_merchants', upiId);
        const verifiedMerchantSnap = await getDoc(verifiedMerchantRef);
        if (verifiedMerchantSnap.exists()) {
            res.status(200).json({ 
                verifiedName: verifiedMerchantSnap.data().merchantName, 
                isVerifiedMerchant: true,
                isBlacklisted: false 
            });
            return;
        }

        const blacklistRefByUpi = doc(firestoreDb, 'blacklisted_qrs', upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
             res.status(200).json({ // Return 200 with status for client to handle warning
                verifiedName: null, 
                isBlacklisted: true, 
                reason: blacklistSnapByUpi.data()?.reason || 'Flagged as suspicious' 
            });
             return;
        }
        const verifiedName = await upiProviderService.verifyRecipient(upiId);
        res.status(200).json({ verifiedName, isBlacklisted: false, isVerifiedMerchant: false });
    } catch (error) {
         if (error.message?.includes("not found") || error.message?.includes("Invalid")) {
            res.status(404); // 404 if UPI provider says not found
         } else {
             res.status(500);
         }
         next(error);
    }
};

exports.processUpiPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { recipientUpiId, amount, pin, note, sourceAccountUpiId } = req.body;
    let pspTransactionId; // To store PSP's transaction ID

    if (!recipientUpiId || !amount || amount <= 0 || !pin || !sourceAccountUpiId) {
         res.status(400);
         return next(new Error("Missing required fields: recipientUpiId, amount, pin, sourceAccountUpiId."));
    }

    let paymentResultFromPSP = { success: false, status: 'Failed', message: 'Payment processing error', transactionId: null, usedWalletFallback: false, walletTransactionId: null, ticketId: null, refundEta: null, errorCode: null, mightBeDebited: false };
    let loggedTx; // Our system's transaction object

    try {
        const transferResult = await upiProviderService.initiatePayment({ sourceUpiId, recipientUpiId, amount, pin, note });
        pspTransactionId = transferResult.transactionId; // Store PSP ID early
        paymentResultFromPSP.success = transferResult.status === 'Completed';
        paymentResultFromPSP.status = transferResult.status;
        paymentResultFromPSP.message = transferResult.message;
        paymentResultFromPSP.errorCode = transferResult.code;
        paymentResultFromPSP.mightBeDebited = transferResult.mightBeDebited || false;

        loggedTx = await addTransaction({ // Use backend logger
            type: paymentResultFromPSP.status === 'Completed' ? 'Sent' : paymentResultFromPSP.status === 'Pending' ? 'Pending' : 'Failed',
            name: recipientUpiId,
            description: `${note || `Payment to ${recipientUpiId}`} (UPI)`,
            amount: -amount,
            status: paymentResultFromPSP.status,
            userId: userId,
            upiId: recipientUpiId,
            originalTransactionId: pspTransactionId,
            paymentMethodUsed: 'UPI',
            pspTransactionId: pspTransactionId, // Log PSP ID explicitly
            failureReason: !paymentResultFromPSP.success ? paymentResultFromPSP.message : null,
        });
        paymentResultFromPSP.transactionId = loggedTx.id; // Use our system's transaction ID for client response

        if (paymentResultFromPSP.status === 'Completed') {
            res.status(200).json(paymentResultFromPSP);
        } else if (paymentResultFromPSP.status === 'Pending') {
            res.status(202).json(paymentResultFromPSP); // Accepted but pending
        }
        else {
            const isLimitError = paymentResultFromPSP.errorCode === 'UPI_LIMIT_EXCEEDED';
            if (isLimitError) {
                const kycBridgeStatus = await checkKYCAndBridgeStatus(userId);
                if (kycBridgeStatus.canUseBridge && amount <= kycBridgeStatus.smartWalletBridgeLimit) {
                    console.log(`UPI limit exceeded for ${userId}. Attempting Smart Wallet Bridge for ₹${amount}`);
                     // Use payViaWalletInternal which handles logging
                    const walletResult = await payViaWalletInternal(userId, recipientUpiId, amount, `${note || 'Payment'} (Wallet Fallback)`, 'Sent');
                    if (walletResult.success) {
                        await scheduleRecovery(userId, amount, recipientUpiId, sourceAccountUpiId);
                        // Update original failed UPI log's description to indicate fallback
                        await updateDoc(doc(db, 'transactions', loggedTx.id), { description: `${loggedTx.description} - Failed (Limit), Paid via Wallet Fallback. Wallet TxID: ${walletResult.transactionId}`, updatedAt: serverTimestamp() });
                        
                        paymentResultFromPSP.usedWalletFallback = true;
                        paymentResultFromPSP.walletTransactionId = walletResult.transactionId;
                        paymentResultFromPSP.status = 'FallbackSuccess'; // Custom status for client
                        paymentResultFromPSP.message = `UPI Limit Exceeded. Payment successful via Wallet. Wallet TxID: ${walletResult.transactionId}`;
                        return res.status(200).json(paymentResultFromPSP);
                    } else {
                         paymentResultFromPSP.message = `UPI Limit Exceeded. Wallet fallback failed: ${walletResult.message}`;
                         // Update original UPI transaction log with wallet fallback failure
                         await updateDoc(doc(db, 'transactions', loggedTx.id), { failureReason: paymentResultFromPSP.message, updatedAt: serverTimestamp() });
                         throw new Error(paymentResultFromPSP.message);
                    }
                } else {
                     // Update original UPI transaction log with limit error and no fallback
                     await updateDoc(doc(db, 'transactions', loggedTx.id), { failureReason: `${paymentResultFromPSP.message} Wallet fallback not available/eligible.`, updatedAt: serverTimestamp() });
                     throw new Error(paymentResultFromPSP.message + " Wallet fallback not available or limit exceeded.");
                }
            }
             // For other failures (not 'Pending' or 'Completed')
             const error = new Error(paymentResultFromPSP.message || 'UPI Payment Failed');
             if(paymentResultFromPSP.errorCode) (error as any).code = paymentResultFromPSP.errorCode;
             if(paymentResultFromPSP.mightBeDebited) (error as any).mightBeDebited = true;
             throw error;
        }
    } catch (error) {
        const errorMessage = error.message || 'UPI Payment failed or was cancelled.';
        const errorCode = error.code;
        const mightBeDebited = error.mightBeDebited;

        // Ensure a transaction log exists if it failed before initial logging
        if (!loggedTx || !loggedTx.id) {
            try {
                loggedTx = await addTransaction({
                    type: 'Failed', name: recipientUpiId, description: `Payment to ${recipientUpiId} (UPI) - Error: ${errorMessage}`,
                    amount: -amount, status: 'Failed', userId: userId, upiId: recipientUpiId, paymentMethodUsed: 'UPI', pspTransactionId: pspTransactionId, failureReason: errorMessage,
                });
                paymentResultFromPSP.transactionId = loggedTx.id;
            } catch (logError) {
                console.error("[UPI Ctrl] CRITICAL: Failed to log initial failed UPI transaction:", logError);
                // If logging fails, we still need to inform the client.
                // Use a placeholder ID or handle absence of ID gracefully in client.
                 paymentResultFromPSP.transactionId = `local-failure-${Date.now()}`;
            }
        } else {
            // Update existing log if it was created but then an error occurred
             try {
                await updateDoc(doc(db, 'transactions', loggedTx.id), { status: 'Failed', failureReason: errorMessage, updatedAt: serverTimestamp() });
             } catch (updateError) {
                 console.error(`[UPI Ctrl] Failed to update existing transaction ${loggedTx.id} to Failed:`, updateError);
             }
        }

        paymentResultFromPSP.status = 'Failed';
        paymentResultFromPSP.message = errorMessage;
        paymentResultFromPSP.errorCode = errorCode;
        paymentResultFromPSP.mightBeDebited = mightBeDebited || false;

        if (paymentResultFromPSP.mightBeDebited) {
            const ticketId = `SPT_${Date.now()}`;
            const refundDate = addBusinessDays(new Date(), 3);
            paymentResultFromPSP.ticketId = ticketId;
            paymentResultFromPSP.refundEta = format(refundDate, 'PP');
             try {
                await addDoc(collection(firestoreDb, 'supportTickets'), {
                    userId,
                    transactionId: paymentResultFromPSP.transactionId,
                    pspTransactionId: pspTransactionId,
                    issue: 'Payment Failed, Amount Debited (UPI)',
                    status: 'Open',
                    amount,
                    recipientUpiId,
                    refundEta: paymentResultFromPSP.refundEta,
                    createdAt: serverTimestamp(),
                });
                console.log(`Support ticket ${ticketId} created for failed-but-debited UPI Tx ${paymentResultFromPSP.transactionId}`);
             } catch (ticketError) {
                 console.error(`[UPI Ctrl] Failed to create support ticket for ${paymentResultFromPSP.transactionId}:`, ticketError);
             }
        }
        res.status(400).json(paymentResultFromPSP);
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
        // Log balance check event (optional, for auditing if needed)
        // await addTransaction({ type: 'Balance Check', name: upiId, description: 'UPI Balance Enquiry', amount: 0, status: 'Completed', userId });
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
        // The service `topUpUpiLite` should now handle logging the transaction
        // and returning newBalance if possible, or trigger a separate call.
        // For simplicity, assuming service handles it or we refetch.
        const updatedDetails = await upiLiteService.getUpiLiteDetails(userId); // Refetch to ensure consistent state
        res.status(200).json({ ...result, newBalance: updatedDetails.balance });
    } catch (error) {
        next(error);
    }
};

exports.disableUpiLite = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const result = await upiLiteService.disableUpiLite(userId);
        // Service `disableUpiLite` should handle logging the balance transfer.
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
