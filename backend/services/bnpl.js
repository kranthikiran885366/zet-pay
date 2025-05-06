// backend/services/bnpl.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, Timestamp, serverTimestamp, runTransaction, writeBatch } = db; // Use admin SDK Firestore
const { addTransaction } = require('./transactionLogger'); // Import backend logger
const { payViaWalletInternal } = require('./wallet'); // Import internal wallet function
const upiProviderService = require('./upiProviderService'); // For potential auto-debit
const userService = require('./user'); // For eligibility checks

// --- BNPL Status & Activation ---

/**
 * Retrieves the user's Pay Later status and details from Firestore.
 * @param userId The user's ID.
 * @returns A promise resolving to the BNPL details object.
 */
async function getBnplStatus(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[BNPL Service - Backend] Fetching status for user ${userId}...`);
    const bnplDocRef = doc(db, 'bnplStatus', userId);
    const bnplDocSnap = await getDoc(bnplDocRef);

    if (bnplDocSnap.exists()) {
        return { userId, ...bnplDocSnap.data() };
    } else {
        // Return default inactive status if document doesn't exist
        return { userId, isActive: false, creditLimit: 0 };
    }
}

/**
 * Activates BNPL for a user after eligibility checks.
 * @param userId The user's ID.
 * @returns A promise resolving to the activated BNPL details.
 * @throws Error if not eligible or activation fails.
 */
async function activateBnpl(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[BNPL Service - Backend] Activating BNPL for user ${userId}...`);

    // 1. Eligibility Check (Backend - using user service)
    // Example: Require verified KYC
    const { kycStatus } = await userService.checkKYCAndBridgeStatus(userId);
    if (kycStatus !== 'Verified') {
        throw new Error("KYC verification required to activate Pay Later.");
    }
    // TODO: Add more checks (transaction history, partner rules, etc.)
    const isEligible = true; // Assume eligible after KYC for now
    if (!isEligible) {
        throw new Error("You are not eligible for Pay Later at this time.");
    }

    // 2. Simulate interaction with NBFC/Partner to get credit limit
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    const creditLimit = (Math.floor(Math.random() * 6) + 5) * 1000; // 5k to 10k limit

    // 3. Update Firestore status
    const bnplDocRef = doc(db, 'bnplStatus', userId);
    const activationData = {
        userId,
        isActive: true,
        creditLimit,
        providerName: "ZetPay Later Partner", // Use actual partner name
        activationDate: serverTimestamp(),
        lastUpdated: serverTimestamp(),
    };

    try {
        await setDoc(bnplDocRef, activationData, { merge: true }); // Use set with merge
        console.log(`[BNPL Service - Backend] BNPL activated for ${userId} with limit ${creditLimit}`);
        return activationData; // Return the newly activated data
    } catch (error) {
        console.error(`[BNPL Service - Backend] Error activating BNPL for ${userId}:`, error);
        throw new Error("Failed to activate Pay Later due to a system error.");
    }
}

// --- Statement Management & Repayment ---

/**
 * Retrieves the latest UNPAID Pay Later statement for a user.
 * @param userId The user's ID.
 * @returns A promise resolving to the statement object or null.
 */
async function getBnplStatement(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[BNPL Service - Backend] Fetching latest unpaid statement for user ${userId}...`);

    const status = await getBnplStatus(userId);
    if (!status.isActive) {
        console.log(`[BNPL Service - Backend] BNPL not active for user ${userId}.`);
        return null;
    }

    const statementsColRef = collection(db, 'bnplStatements');
    const q = query(statementsColRef,
        where('userId', '==', userId),
        where('isPaid', '==', false),
        orderBy('dueDate', 'desc'),
        limit(1)
    );

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log(`[BNPL Service - Backend] No unpaid statements found for user ${userId}.`);
            return null;
        }
        const stmtDoc = querySnapshot.docs[0];
        console.log(`[BNPL Service - Backend] Found unpaid statement ${stmtDoc.id} for user ${userId}.`);
        // Note: Transactions are not fetched here, can be fetched separately if needed
        return { id: stmtDoc.id, ...stmtDoc.data(), transactions: [] }; // Return basic statement data
    } catch (error) {
        console.error(`[BNPL Service - Backend] Error fetching statement for ${userId}:`, error);
        throw new Error("Could not fetch Pay Later statement.");
    }
}

/**
 * Processes a BNPL bill repayment.
 * Handles payment deduction (simulated) and updates statement status.
 * @param userId The user's ID.
 * @param statementId The ID of the statement to repay.
 * @param amount The amount being repaid.
 * @param paymentMethodInfo Description of the payment method used.
 * @returns A promise resolving to true if successful.
 * @throws Error if repayment fails.
 */
async function repayBnplBill(userId, statementId, amount, paymentMethodInfo) {
    if (!userId || !statementId || amount <= 0 || !paymentMethodInfo) {
        throw new Error("Invalid parameters for BNPL repayment.");
    }
    console.log(`[BNPL Service - Backend] Repaying statement ${statementId} (User: ${userId}, Amount: ${amount}) via ${paymentMethodInfo}`);

    const stmtDocRef = doc(db, 'bnplStatements', statementId);

    // Use Firestore Transaction for atomic read/write
    try {
        let isFullyPaid = false;
        await runTransaction(db, async (transaction) => {
            const stmtDoc = await transaction.get(stmtDocRef);
            if (!stmtDoc.exists) throw new Error("Statement not found.");

            const stmtData = stmtDoc.data();
            if (stmtData.userId !== userId) throw new Error("Statement does not belong to this user.");
            if (stmtData.isPaid) throw new Error("This statement has already been paid.");
            if (amount < stmtData.minAmountDue) throw new Error(`Repayment amount ₹${amount} is less than minimum due ₹${stmtData.minAmountDue}.`);
             if (amount > stmtData.dueAmount) throw new Error(`Repayment amount ₹${amount} exceeds amount due ₹${stmtData.dueAmount}.`);


            // 1. TODO: Process Actual Payment Deduction from source (Wallet/UPI/Card)
            // Example: if (paymentMethodInfo === 'Wallet') { await payViaWalletInternal(userId, 'BNPL_REPAYMENT', amount, `Repayment for ${statementId}`); }
            console.log(`[BNPL Service - Backend] Simulating payment deduction of ₹${amount} via ${paymentMethodInfo}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate payment

            // 2. Update Statement Status
            const newAmountDue = stmtData.dueAmount - amount;
            isFullyPaid = newAmountDue <= 0.01; // Allow for small rounding differences
            const updateData = {
                isPaid: isFullyPaid,
                paidDate: isFullyPaid ? serverTimestamp() : null, // Only set paidDate if fully paid
                lastPaymentAmount: amount,
                lastPaymentDate: serverTimestamp(),
                lastPaymentMethod: paymentMethodInfo,
                amountDue: isFullyPaid ? 0 : newAmountDue, // Update amount due if partially paid
                updatedAt: serverTimestamp()
            };
            transaction.update(stmtDocRef, updateData);
        });

        // 3. Log the Repayment Transaction using the backend logger
        await addTransaction({
            userId: userId,
            type: 'Bill Payment',
            name: 'Pay Later Bill Repayment',
            description: `Paid statement ${statementId} via ${paymentMethodInfo}`,
            amount: -amount, // Debit from user's perspective
            status: 'Completed',
            billerId: 'ZETPAY_BNPL', // Internal identifier
            // Link to original payment/statement if needed
        });

        console.log(`[BNPL Service - Backend] Repayment for statement ${statementId} processed. Fully Paid: ${isFullyPaid}`);
        return true;

    } catch (error) {
        console.error(`[BNPL Service - Backend] Error repaying BNPL statement ${statementId}:`, error);
        // Log failed repayment transaction?
        throw error; // Re-throw the original error
    }
}


// --- BNPL Usage (Example internal function) ---

/**
 * Processes a transaction using the BNPL credit limit. (Internal Backend Use)
 * @param userId The user's ID.
 * @param amount The amount of the transaction.
 * @param merchantName Name of the merchant/purpose.
 * @param originalTransactionId ID of the primary transaction (e.g., UPI payment ID).
 * @returns A promise resolving to true if BNPL usage was successful.
 * @throws Error if BNPL is inactive, limit exceeded, or update fails.
 */
async function useBnplCredit(userId, amount, merchantName, originalTransactionId) {
    if (!userId || amount <= 0) throw new Error("Invalid parameters for BNPL usage.");
    console.log(`[BNPL Service - Backend] Attempting BNPL usage for user ${userId}, Amount: ${amount}`);

    const bnplDocRef = doc(db, 'bnplStatus', userId);
    const bnplTxnColRef = collection(db, 'bnplTransactions'); // Collection to store individual BNPL transactions

    try {
        let currentStatementId = null;
        await runTransaction(db, async (transaction) => {
            const bnplSnap = await transaction.get(bnplDocRef);
            if (!bnplSnap.exists || !bnplSnap.data().isActive) {
                throw new Error("Pay Later is not active for this account.");
            }
            const bnplData = bnplSnap.data();
            const currentUsedLimit = bnplData.usedLimit || 0; // Assume usedLimit field exists

            if (currentUsedLimit + amount > bnplData.creditLimit) {
                throw new Error(`Transaction amount ₹${amount} exceeds available Pay Later limit (Available: ₹${bnplData.creditLimit - currentUsedLimit}).`);
            }

            // TODO: Find or create the current open statement ID (e.g., based on current month)
            // This logic depends on your statement generation cycle.
            currentStatementId = `${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`; // Example: 202408

            // Update used limit on the status document
            transaction.update(bnplDocRef, {
                usedLimit: admin.firestore.FieldValue.increment(amount),
                lastUpdated: serverTimestamp()
            });

            // Add the transaction detail to bnplTransactions collection
            transaction.set(doc(bnplTxnColRef), { // Auto-generate document ID
                userId,
                statementId: currentStatementId, // Link to the current billing cycle
                originalTransactionId,
                merchantName: merchantName || 'Purchase',
                amount,
                date: serverTimestamp(), // Timestamp of the BNPL transaction itself
            });
        });

        console.log(`[BNPL Service - Backend] Successfully used ₹${amount} BNPL credit for user ${userId}. Tx linked to statement ${currentStatementId}`);
        return true;
    } catch (error) {
        console.error(`[BNPL Service - Backend] Error using BNPL credit for user ${userId}:`, error);
        throw error; // Re-throw
    }
}


module.exports = {
    getBnplStatus,
    activateBnpl,
    getBnplStatement,
    repayBnplBill,
    useBnplCredit, // Export if called internally by other services like payments
};
