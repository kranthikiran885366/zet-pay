
// backend/controllers/upiController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { getWalletBalance, payViaWalletInternal } = require('../services/wallet.ts');
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger.ts');
const { scheduleRecovery } = require('../services/recoveryService.ts');
const { checkKYCAndBridgeStatus } = require('../services/user.js');
const upiProviderService = require('../services/upiProviderService.js');
const { getBankStatus } = require('../services/bankStatusService.js');
const upiLiteService = require('../services/upiLite.js');
const { format, addBusinessDays } = require('date-fns');
const { sendToUser } = require('../server'); // For WebSocket updates

const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp, serverTimestamp, updateDoc } = require('firebase/firestore');
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
    const { bankName, accountNumber, accountType, ifsc } = req.body; // Added accountType, ifsc
    if (!bankName || !accountNumber || !accountType || !ifsc) {
        res.status(400);
        return next(new Error("Bank Name, Account Number, Account Type, and IFSC are required."));
    }
    try {
        console.log(`[UPI Ctrl] Simulating account linking for ${userId} with bank ${bankName}...`);
        // Simulate PSP interaction for account verification and UPI ID generation
        const pspResponse = await upiProviderService.linkAccountWithPsp({ userId, bankName, accountNumber, accountType, ifsc });

        if (!pspResponse.success || !pspResponse.upiId) {
            throw new Error(pspResponse.message || "Failed to link account with UPI provider.");
        }

        const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, limit(1));
        const existingAccountsSnap = await getDocs(q);
        const isFirstAccount = existingAccountsSnap.empty;

        const accountData = {
            bankName,
            accountNumber: pspResponse.maskedAccountNumber || `xxxx${String(accountNumber).slice(-4)}`,
            accountType, // Store account type
            ifsc, // Store IFSC
            userId,
            upiId: pspResponse.upiId,
            isDefault: isFirstAccount,
            pinLength: pspResponse.pinLength || (Math.random() > 0.5 ? 6 : 4),
            createdAt: serverTimestamp(),
            mpinSet: false, // Initially MPIN is not set
        };

        const docRef = await addDoc(accountsColRef, accountData);
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
        await upiProviderService.deregisterUpiId(upiId); // Inform PSP
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
        const batch = writeBatch(firestoreDb); // Use admin.firestore().batch() if db is from admin
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
        // 1. Check internal verified merchants
        const verifiedMerchantRef = doc(firestoreDb, 'verified_merchants', upiId);
        const verifiedMerchantSnap = await getDoc(verifiedMerchantRef);
        if (verifiedMerchantSnap.exists() && verifiedMerchantSnap.data().isVerified) {
            res.status(200).json({
                verifiedName: verifiedMerchantSnap.data().merchantName,
                isVerifiedMerchant: true,
                isBlacklisted: false
            });
            return;
        }

        // 2. Check internal blacklist
        const blacklistRefByUpi = doc(firestoreDb, 'blacklisted_qrs', upiId); // Assuming ID is upiId for blacklist
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
             res.status(200).json({ // Return 200 with status for client to handle warning
                verifiedName: null,
                isVerifiedMerchant: false,
                isBlacklisted: true,
                reason: blacklistSnapByUpi.data()?.reason || 'Flagged as suspicious'
            });
             return;
        }

        // 3. Call PSP for verification
        const pspVerificationResult = await upiProviderService.verifyRecipient(upiId);
        res.status(200).json({
            verifiedName: pspVerificationResult.accountHolderName, // Use consistent field name
            isVerifiedMerchant: pspVerificationResult.isMerchant, // If PSP returns this
            isBlacklisted: false // Not blacklisted by us if reached here
        });
    } catch (error) {
         if (error.code === 'UPI_ID_NOT_FOUND' || error.code === 'UPI_ID_NOT_REGISTERED' || error.code === 'UPI_INVALID_ID_FORMAT') {
            res.status(404);
         } else {
             res.status(500);
         }
         next(error);
    }
};

const FALLBACK_ELIGIBLE_ERROR_CODES = [
    'U09', // UPI_LIMIT_EXCEEDED (Example NPCI code)
    'U16', // BANK_SERVER_DOWN
    'M1',  // BANK_INSUFFICIENT_FUNDS
    'U69', // BANK_NETWORK_ERROR
    'BT',  // TRANSACTION_TIMEOUT (PSP specific)
    'X0',  // GENERIC_DECLINE (Can be bank decline for various reasons)
];

exports.processUpiPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { recipientUpiId, amount, pin, note, sourceAccountUpiId, stealthScan, originatingScanLogId } = req.body;
    let pspTransactionId;
    let loggedTx;

    if (!recipientUpiId || !amount || amount <= 0 || !pin || !sourceAccountUpiId) {
         res.status(400);
         return next(new Error("Missing required fields: recipientUpiId, amount, pin, sourceAccountUpiId."));
    }

    let paymentResultFromPSP = {
        success: false,
        status: 'Failed',
        message: 'Payment processing error',
        transactionId: null, // Our system's transaction ID
        pspTransactionId: null,
        usedWalletFallback: false,
        walletTransactionId: null,
        ticketId: null,
        refundEta: null,
        errorCode: null,
        mightBeDebited: false
    };

    try {
        const transferResult = await upiProviderService.initiatePayment({ userId, sourceUpiId, recipientUpiId, amount, pin, note });
        pspTransactionId = transferResult.pspTransactionId;
        paymentResultFromPSP.pspTransactionId = pspTransactionId;
        paymentResultFromPSP.success = transferResult.status === 'Completed';
        paymentResultFromPSP.status = transferResult.status; // e.g., 'Completed', 'Pending', 'Failed'
        paymentResultFromPSP.message = transferResult.message;
        paymentResultFromPSP.errorCode = transferResult.npciErrorCode || transferResult.pspErrorCode; // Prioritize NPCI code
        paymentResultFromPSP.mightBeDebited = transferResult.mightBeDebited || false;

        loggedTx = await addTransaction({
            type: paymentResultFromPSP.status === 'Completed' ? 'Sent' : paymentResultFromPSP.status === 'Pending' ? 'Pending' : 'Failed',
            name: recipientUpiId,
            description: `${note || `Payment to ${recipientUpiId}`} (UPI)`,
            amount: -amount,
            status: paymentResultFromPSP.status,
            userId: userId,
            upiId: recipientUpiId,
            paymentMethodUsed: 'UPI',
            pspTransactionId: pspTransactionId,
            failureReason: !paymentResultFromPSP.success ? `${paymentResultFromPSP.errorCode ? `(${paymentResultFromPSP.errorCode}) ` : ''}${paymentResultFromPSP.message}` : null,
            stealthScan: stealthScan || false,
            originalTransactionId: originatingScanLogId, // Link to scan log if it's from scan & pay
        });
        paymentResultFromPSP.transactionId = loggedTx.id;

        if (originatingScanLogId && paymentResultFromPSP.success) {
            try {
                const scanLogRef = doc(firestoreDb, 'scan_logs', originatingScanLogId);
                await updateDoc(scanLogRef, {
                    paymentMade: true,
                    paymentTransactionId: loggedTx.id,
                    updatedAt: serverTimestamp()
                });
                console.log(`[UPI Ctrl] Updated scan_log ${originatingScanLogId} for successful payment.`);
            } catch (scanLogError) {
                console.error(`[UPI Ctrl] Failed to update scan_log ${originatingScanLogId}:`, scanLogError);
            }
        }

        sendToUser(userId, { type: 'transaction_update', payload: { ...loggedTx, date: loggedTx.date.toISOString() } });


        if (paymentResultFromPSP.status === 'Completed') {
            return res.status(200).json(paymentResultFromPSP);
        } else if (paymentResultFromPSP.status === 'Pending') {
            return res.status(202).json(paymentResultFromPSP);
        } else {
            const canTryFallback = FALLBACK_ELIGIBLE_ERROR_CODES.includes(paymentResultFromPSP.errorCode) && !paymentResultFromPSP.mightBeDebited;

            if (canTryFallback) {
                const kycBridgeStatus = await checkKYCAndBridgeStatus(userId);
                if (kycBridgeStatus.canUseBridge && amount <= kycBridgeStatus.smartWalletBridgeLimit) {
                    const walletBalance = await getWalletBalance(userId);
                    if (walletBalance >= amount) {
                        console.log(`[UPI Ctrl] UPI Failed (${paymentResultFromPSP.errorCode}). Attempting Smart Wallet Bridge for ₹${amount}`);
                        const walletPaymentResult = await payViaWalletInternal(userId, recipientUpiId, amount, `${note || 'Payment'} (Wallet Fallback - ${paymentResultFromPSP.errorCode})`, 'Sent');

                        if (walletPaymentResult.success && walletPaymentResult.transactionId) {
                            await scheduleRecovery(userId, amount, recipientUpiId, sourceAccountUpiId);
                            await updateDoc(doc(db, 'transactions', loggedTx.id), {
                                status: 'FallbackSuccess',
                                description: `${loggedTx.description} - Failed (${paymentResultFromPSP.errorCode}), Paid via Wallet Fallback. Wallet TxID: ${walletPaymentResult.transactionId}`,
                                failureReason: `UPI Failed (${paymentResultFromPSP.errorCode}), then paid via Wallet.`,
                                updatedAt: serverTimestamp()
                            });
                            paymentResultFromPSP.usedWalletFallback = true;
                            paymentResultFromPSP.walletTransactionId = walletPaymentResult.transactionId;
                            paymentResultFromPSP.status = 'FallbackSuccess';
                            paymentResultFromPSP.message = `UPI Payment Failed (${paymentResultFromPSP.errorCode}). Successfully paid via Wallet.`;

                            const updatedTxDoc = await getDoc(doc(db, 'transactions', loggedTx.id));
                            if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: { ...updatedTxDoc.data(), id: updatedTxDoc.id, date: updatedTxDoc.data().date.toDate().toISOString() } });

                            return res.status(200).json(paymentResultFromPSP);
                        } else {
                            paymentResultFromPSP.message = `UPI Failed (${paymentResultFromPSP.errorCode}). Wallet fallback also failed: ${walletPaymentResult.message}`;
                            await updateDoc(doc(db, 'transactions', loggedTx.id), { failureReason: paymentResultFromPSP.message, updatedAt: serverTimestamp() });
                        }
                    } else {
                        paymentResultFromPSP.message = `UPI Failed (${paymentResultFromPSP.errorCode}). Insufficient wallet balance (₹${walletBalance}) for fallback.`;
                         await updateDoc(doc(db, 'transactions', loggedTx.id), { failureReason: paymentResultFromPSP.message, updatedAt: serverTimestamp() });
                    }
                } else {
                     const bridgeReason = !kycBridgeStatus.canUseBridge ? "Smart Wallet Bridge not active/eligible." : `Amount ₹${amount} exceeds bridge limit ₹${kycBridgeStatus.smartWalletBridgeLimit}.`;
                     paymentResultFromPSP.message = `UPI Failed (${paymentResultFromPSP.errorCode}). Wallet fallback not attempted: ${bridgeReason}`;
                      await updateDoc(doc(db, 'transactions', loggedTx.id), { failureReason: paymentResultFromPSP.message, updatedAt: serverTimestamp() });
                }
            }
            const error = new Error(paymentResultFromPSP.message || 'UPI Payment Failed');
            if(paymentResultFromPSP.errorCode) (error).code = paymentResultFromPSP.errorCode;
            if(paymentResultFromPSP.mightBeDebited) (error).mightBeDebited = true;
            throw error;
        }
    } catch (error) {
        const errorMessage = error.message || 'UPI Payment failed or was cancelled.';
        const errorCode = error.code;
        const mightBeDebited = error.mightBeDebited || false;

        if (loggedTx && loggedTx.id && loggedTx.status !== 'Failed') {
             await updateDoc(doc(db, 'transactions', loggedTx.id), { status: 'Failed', failureReason: `${errorCode ? `(${errorCode}) ` : ''}${errorMessage}`, updatedAt: serverTimestamp() });
        } else if (!loggedTx) {
            try {
                loggedTx = await addTransaction({
                    type: 'Failed', name: recipientUpiId, description: `Payment to ${recipientUpiId} (UPI) - Error: ${errorCode ? `(${errorCode}) ` : ''}${errorMessage}`,
                    amount: -amount, status: 'Failed', userId: userId, upiId: recipientUpiId, paymentMethodUsed: 'UPI', pspTransactionId: pspTransactionId, failureReason: `${errorCode ? `(${errorCode}) ` : ''}${errorMessage}`,
                    stealthScan: stealthScan || false,
                });
                paymentResultFromPSP.transactionId = loggedTx.id;
            } catch (logError) {
                console.error("[UPI Ctrl] CRITICAL: Failed to log initial failed UPI transaction:", logError);
                 paymentResultFromPSP.transactionId = `local-failure-${Date.now()}`;
            }
        }
        if (loggedTx && loggedTx.id) {
            const updatedFailedTxSnap = await getDoc(doc(db, 'transactions', loggedTx.id));
            if (updatedFailedTxSnap.exists()) {
                const updatedFailedTxData = { id: updatedFailedTxSnap.id, ...updatedFailedTxSnap.data(), date: updatedFailedTxSnap.data().date.toDate().toISOString() };
                sendToUser(userId, { type: 'transaction_update', payload: updatedFailedTxData });
            }
        }

        paymentResultFromPSP.status = 'Failed';
        paymentResultFromPSP.message = errorMessage;
        paymentResultFromPSP.errorCode = errorCode;
        paymentResultFromPSP.mightBeDebited = mightBeDebited;

        if (paymentResultFromPSP.mightBeDebited && paymentResultFromPSP.transactionId && paymentResultFromPSP.transactionId !== `local-failure-${Date.now()}`) {
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
                // Update original transaction with ticketId
                await updateDoc(doc(db, 'transactions', paymentResultFromPSP.transactionId), { ticketId: ticketId, refundEta: paymentResultFromPSP.refundEta, updatedAt: serverTimestamp() });
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
        const balance = await upiProviderService.checkAccountBalance(upiId, pin, userId);
        // Log balance check event (optional, for auditing if needed)
        await addTransaction({ type: 'Balance Check', name: upiId, description: 'UPI Balance Enquiry', amount: 0, status: 'Completed', userId });
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

exports.setUpiPin = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId, oldPin, newPin, bankAccountDetails } = req.body;
    // Bank account details (like last 6 digits of debit card, expiry) might be needed for first time PIN set
    if (!upiId || !newPin || ( (oldPin && oldPin.length !== (newPin.length === 4 ? 4:6)) || newPin.length !== 4 && newPin.length !== 6) ) {
        return res.status(400).json({ message: "Valid UPI ID and new PIN (4 or 6 digits) are required. Old PIN required for change." });
    }
    try {
        const result = await upiProviderService.setOrChangeUpiPin({ userId, upiId, oldPin, newPin, bankAccountDetails });
        if (result.success) {
            // Update mpinSet flag for the linked account
            const accountsColRef = collection(firestoreDb, 'users', userId, 'linkedAccounts');
            const q = query(accountsColRef, where('upiId', '==', upiId), limit(1));
            const accountSnapshot = await getDocs(q);
            if (!accountSnapshot.empty) {
                await updateDoc(accountSnapshot.docs[0].ref, { mpinSet: true, pinLength: newPin.length, updatedAt: serverTimestamp() });
            }
            res.status(200).json({ success: true, message: result.message || 'UPI PIN set/changed successfully.' });
        } else {
            throw new Error(result.message || "Failed to set/change UPI PIN.");
        }
    } catch (error) {
        next(error);
    }
};
