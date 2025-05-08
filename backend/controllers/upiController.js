
// backend/controllers/upiController.js
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

// Types
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
        const bankDomain = bankName.toLowerCase().replace(/\s+/g, '').substring(0, 5);
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
   
    // 1. Call PSP API to transfer fundss
    const transferResult = await upiProviderService.transferFunds(sourceAccountUpiId, recipientUpiId, amount, pin, note);

    if (transferResult.success) {
       
       // Log the successful transaction
       const logData = {
           type: 'Sent',
           name: recipientUpiId, // Or use recipientName from a cache/lookup
           description: `Payment to ${recipientUpiId} (UPI)`,
           amount: -amount,
           status: 'Completed',
           userId: userId
       };
      
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

    