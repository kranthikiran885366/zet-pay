
const admin = require('firebase-admin');
const db = admin.firestore();
const { getWalletBalance } = require('./walletController'); // For fallback checks
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { scheduleRecovery } = require('../services/recoveryService'); // Import recovery scheduling
const { checkKYCAndBridgeStatus } = require('../services/userService'); // Import user checks

// Placeholder for secure PSP/NPCI interaction service
const upiProviderService = require('../services/upiProviderService');
const { getBankStatus } = require('../services/bankStatusService');


exports.getLinkedAccounts = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const accountsColRef = db.collection('users').doc(userId).collection('linkedAccounts');
        const q = query(accountsColRef, orderBy('isDefault', 'desc'));
        const querySnapshot = await getDocs(q);
        const accounts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(accounts);
    } catch (error) {
        next(error);
    }
};

exports.linkBankAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { bankName, accountNumber } = req.body; // Basic details needed

    if (!bankName || !accountNumber) {
        return res.status(400).json({ message: 'Bank name and account number are required.' });
    }

    try {
        // Simulate fetching accounts via NPCI/PSP (requires consent/verification flow)
        console.log(`Simulating account linking for ${userId} with bank ${bankName}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const handle = accountNumber.slice(-4);
        const bankDomain = bankName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 5);
        const generatedUpiId = `${handle}@ok${bankDomain}`; // Example ID
        const pinLength = Math.random() > 0.5 ? 6 : 4; // Example PIN length

        const accountsColRef = db.collection('users').doc(userId).collection('linkedAccounts');
        const q = query(accountsColRef, limit(1));
        const existingAccountsSnap = await getDocs(q);
        const isFirstAccount = existingAccountsSnap.empty;

        const accountData = {
            bankName,
            accountNumber, // Store masked number
            userId,
            upiId: generatedUpiId,
            isDefault: isFirstAccount,
            pinLength,
        };

        const docRef = await addDoc(accountsColRef, accountData);
        res.status(201).json({ id: docRef.id, ...accountData });
    } catch (error) {
        next(error);
    }
};

exports.removeUpiId = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.params; // Assuming UPI ID is passed in the route param e.g., /api/upi/accounts/:upiId

    if (!upiId) return res.status(400).json({ message: 'UPI ID is required.' });

    try {
        const accountsColRef = db.collection('users').doc(userId).collection('linkedAccounts');
        const q = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const accountSnapshot = await getDocs(q);

        if (accountSnapshot.empty) return res.status(404).json({ message: "UPI ID not found." });

        const accountDoc = accountSnapshot.docs[0];
        if (accountDoc.data().isDefault) {
            const allAccountsSnap = await getDocs(accountsColRef);
            if (allAccountsSnap.size <= 1) {
                return res.status(400).json({ message: "Cannot remove the only linked account." });
            }
            return res.status(400).json({ message: "Cannot remove default account. Set another as default first." });
        }

        await deleteDoc(accountDoc.ref);
        res.status(200).json({ message: `UPI ID ${upiId} removed successfully.` });
    } catch (error) {
        next(error);
    }
};

exports.setDefaultAccount = async (req, res, next) => {
    const userId = req.user.uid;
    const { upiId } = req.body; // UPI ID to set as default

    if (!upiId) return res.status(400).json({ message: 'UPI ID is required.' });

    try {
        const accountsColRef = db.collection('users').doc(userId).collection('linkedAccounts');
        const batch = db.batch();

        const newDefaultQuery = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const newDefaultSnap = await getDocs(newDefaultQuery);
        if (newDefaultSnap.empty) return res.status(404).json({ message: "Selected UPI ID not found." });
        const newDefaultDocRef = newDefaultSnap.docs[0].ref;

        const currentDefaultQuery = query(accountsColRef, where('isDefault', '==', true), limit(1));
        const currentDefaultSnap = await getDocs(currentDefaultQuery);

        if (!currentDefaultSnap.empty) {
            const currentDefaultDocRef = currentDefaultSnap.docs[0].ref;
            if (currentDefaultDocRef.id !== newDefaultDocRef.id) {
                batch.update(currentDefaultDocRef, { isDefault: false });
            }
        }

        batch.update(newDefaultDocRef, { isDefault: true });
        await batch.commit();
        res.status(200).json({ message: `${upiId} set as default successfully.` });
    } catch (error) {
        next(error);
    }
};

exports.verifyUpiId = async (req, res, next) => {
    const { upiId } = req.query; // Get UPI ID from query parameter
    if (!upiId || typeof upiId !== 'string') {
        return res.status(400).json({ message: 'Valid UPI ID is required.' });
    }
    try {
        // Simulate verification
        const verifiedName = await upiProviderService.verifyRecipient(upiId); // Call hypothetical service
        res.status(200).json({ verifiedName });
    } catch (error) {
        // Pass specific errors from the provider service if possible
        if (error.message === 'Invalid UPI ID format or ID not found.') {
             res.status(404).json({ message: error.message });
        } else {
             next(error); // Pass other errors to general handler
        }
    }
};

exports.processUpiPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { recipientUpiId, amount, pin, note, sourceAccountUpiId } = req.body;

    if (!recipientUpiId || !amount || !pin || !sourceAccountUpiId) {
        return res.status(400).json({ message: 'Recipient UPI ID, amount, PIN, and source account are required.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
         return res.status(400).json({ message: 'Invalid amount.' });
    }

    let paymentResult = { // Initialize with default values
        amount, recipientUpiId, status: 'Failed', message: 'Payment processing failed.', usedWalletFallback: false,
        ticketId: undefined, refundEta: undefined, transactionId: undefined, walletTransactionId: undefined
    };
    let recipientName = 'Recipient';
    let logData = {
        type: 'Failed', name: recipientName, description: '', amount: -amount, status: 'Failed', userId, upiId: recipientUpiId, ticketId: undefined, refundEta: undefined
    };

    try {
        recipientName = await upiProviderService.verifyRecipient(recipientUpiId);
        logData.name = recipientName;
        logData.description = `UPI Payment Failed - Initiation Error to ${recipientName} ${note ? `- ${note}` : ''}`;

        // 1. Check Bank Server Status
        const bankHandle = sourceAccountUpiId.split('@')[1];
        const bankStatus = await getBankStatus(bankHandle);
        if (bankStatus === 'Down') {
            paymentResult.message = `Bank server for ${sourceAccountUpiId} is currently down.`;
             throw new Error(paymentResult.message); // Trigger fallback/failure
        }

        // 2. Simulate UPI Payment via Provider
        const upiResult = await upiProviderService.initiatePayment({
            sourceUpiId: sourceAccountUpiId,
            recipientUpiId,
            amount,
            pin, // PSP handles secure PIN validation
            note: note || `Payment to ${recipientName}`
        });

        // 3. Handle UPI Success
        if (upiResult.status === 'Completed') {
             logData.type = 'Sent';
             logData.status = 'Completed';
             logData.description = `Paid via UPI to ${recipientName} ${note ? `- ${note}` : ''}`;
             paymentResult.status = 'Completed';
             paymentResult.message = upiResult.message || 'Transaction Successful';
             paymentResult.transactionId = upiResult.transactionId;
             const loggedTx = await addTransaction(logData); // Log successful transaction
             paymentResult.transactionId = loggedTx.id; // Use Firestore ID

             // Blockchain log (optional)
             logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date(), recipient: recipientUpiId })
                 .catch(err => console.error("Blockchain log failed:", err));

             return res.status(200).json(paymentResult);
         } else {
             // UPI Failed (other than limit/bank down which would trigger fallback earlier if possible)
             paymentResult.message = upiResult.message || 'UPI payment failed at bank/NPCI.';
             paymentResult.status = 'Failed';
             if (upiResult.mightBeDebited) {
                  paymentResult.ticketId = `ZET_TKT_${Date.now()}`;
                  paymentResult.refundEta = `Expected refund by ${format(addBusinessDays(new Date(), 3), 'PPP')}`;
                  logData.description = `UPI Payment Failed - ${paymentResult.message} (Ticket: ${paymentResult.ticketId})`;
                  logData.ticketId = paymentResult.ticketId;
                  logData.refundEta = paymentResult.refundEta;
             } else {
                  logData.description = `UPI Payment Failed - ${paymentResult.message}`;
             }
             throw new Error(paymentResult.message); // Go to fallback/final failure
         }

    } catch (upiError) {
        console.warn("UPI Payment processing error/failure:", upiError.message);
        paymentResult.message = upiError.message || paymentResult.message; // Update message

        // --- Attempt Wallet Fallback (Smart Wallet Bridge) ---
        try {
            const checkResult = await checkKYCAndBridgeStatus(userId);
            const fallbackLimit = checkResult.smartWalletBridgeLimit || 0;

            // Trigger fallback ONLY if UPI failed due to specific reasons OR bank was down
            if (checkResult.canUseBridge && amount <= fallbackLimit &&
               (upiError.code === 'UPI_LIMIT_EXCEEDED' || upiError.message.includes('Bank server') || upiError.message.includes('Limit')) ) // Check specific error codes/messages
            {
                console.log("Attempting Wallet Fallback...");
                const walletBalance = await getWalletBalance(userId);
                if (walletBalance >= amount) {
                    const walletPaymentResult = await payViaWallet(userId, recipientUpiId, amount, `Wallet Fallback: ${note || ''}`);
                    if (walletPaymentResult.success && walletPaymentResult.transactionId) {
                         paymentResult.status = 'FallbackSuccess';
                         paymentResult.message = `Paid via Wallet (${upiError.message}). Recovery scheduled.`;
                         paymentResult.usedWalletFallback = true;
                         paymentResult.walletTransactionId = walletPaymentResult.transactionId;
                         paymentResult.transactionId = undefined; // Clear UPI txn ID
                         paymentResult.ticketId = undefined; // No ticket needed if fallback worked
                         paymentResult.refundEta = undefined;
                         await scheduleRecovery(userId, amount, recipientUpiId, sourceAccountUpiId);
                         // Note: payViaWallet already logs its own transaction.
                         return res.status(200).json(paymentResult); // Return successful fallback result
                    } else {
                        paymentResult.message = `UPI failed (${upiError.message}). Wallet fallback also failed: ${walletPaymentResult.message}.`;
                    }
                } else {
                    paymentResult.message = `UPI failed (${upiError.message}). Insufficient wallet balance (₹${walletBalance.toFixed(2)}) for fallback.`;
                }
            }
        } catch (fallbackError) {
             console.error("Wallet Fallback attempt failed:", fallbackError.message);
             paymentResult.message = fallbackError.message || paymentResult.message; // Update message with fallback error
        }
        // --- End Wallet Fallback ---

        // --- Final Failure Logging ---
         logData.description = `UPI Payment Failed - ${paymentResult.message}`; // Update description with final reason
         logData.ticketId = paymentResult.ticketId; // Include ticket info if generated
         logData.refundEta = paymentResult.refundEta;
        try {
             const failedTx = await addTransaction(logData);
             paymentResult.transactionId = failedTx.id; // Use ID from logged failure
        } catch (logError) {
             console.error("Failed to log failed UPI transaction:", logError);
        }
         res.status(400).json(paymentResult); // Return failure details
    }
};

exports.checkBalance = async (req, res, next) => {
     const userId = req.user.uid;
     const { upiId, pin } = req.body;

     if (!upiId || !pin) {
         return res.status(400).json({ message: 'UPI ID and PIN are required.' });
     }

     try {
         const balance = await upiProviderService.checkAccountBalance(upiId, pin); // Use provider service
         res.status(200).json({ balance });
     } catch (error) {
         next(error);
     }
 };
// Add controllers for set/reset PIN (requires secure flow)
