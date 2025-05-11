
// backend/services/upiLite.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } = db; // Use admin SDK Firestore
const { addTransaction } = require('./transactionLogger.ts'); // Use backend transaction logger
const upiProviderService = require('./upiProviderService'); // For PSP interactions

const UPI_LITE_COLLECTION = 'upiLiteStatus';
const MAX_BALANCE = 2000;
const MAX_TXN_AMOUNT = 500;

/**
 * Retrieves the user's UPI Lite details (status, balance).
 * @param {string} userId The user's ID.
 * @returns {Promise<UpiLiteDetails>} UPI Lite details.
 */
async function getUpiLiteDetails(userId) {
    if (!userId) throw new Error("User ID required for UPI Lite details.");
    const liteDocRef = doc(db, UPI_LITE_COLLECTION, userId);
    const docSnap = await getDoc(liteDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            isEnabled: data.isEnabled,
            balance: data.balance,
            maxBalance: MAX_BALANCE,
            maxTxnAmount: MAX_TXN_AMOUNT,
            linkedAccountUpiId: data.linkedAccountUpiId,
        };
    } else {
        // Default state if not found
        return { isEnabled: false, balance: 0, maxBalance: MAX_BALANCE, maxTxnAmount: MAX_TXN_AMOUNT };
    }
}

/**
 * Enables UPI Lite for the user, linking it to a bank account.
 * @param {string} userId The user's ID.
 * @param {string} linkedAccountUpiId The UPI ID of the bank account to link.
 * @returns {Promise<object>} Result of enabling UPI Lite.
 */
async function enableUpiLite(userId, linkedAccountUpiId) {
    if (!userId || !linkedAccountUpiId) throw new Error("User ID and Linked Account UPI ID required.");
    console.log(`[UPI Lite Service] Enabling for user ${userId} with account ${linkedAccountUpiId}`);

    // Simulate PSP/Bank interaction for enabling UPI Lite
    // This might involve setting a flag with the PSP for this user/UPI ID.
    await upiProviderService.simulateEnableUpiLite(userId, linkedAccountUpiId);

    const liteDocRef = doc(db, UPI_LITE_COLLECTION, userId);
    const liteData = {
        userId,
        isEnabled: true,
        balance: 0, // Initial balance is zero
        linkedAccountUpiId,
        maxBalance: MAX_BALANCE,
        maxTxnAmount: MAX_TXN_AMOUNT,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(liteDocRef, liteData, { merge: true });
    console.log(`[UPI Lite Service] Enabled successfully for user ${userId}`);
    // No transaction log for enabling itself unless there's a fee.
    return { success: true, message: 'UPI Lite enabled successfully.' };
}

/**
 * Adds funds to the UPI Lite balance from the linked bank account.
 * @param {string} userId The user's ID.
 * @param {number} amount The amount to add.
 * @param {string} fundingSourceUpiId The UPI ID of the bank account to debit (should match linked account).
 * @returns {Promise<object>} Result of the top-up.
 */
async function topUpUpiLite(userId, amount, fundingSourceUpiId) {
    if (!userId || amount <= 0 || !fundingSourceUpiId) throw new Error("Invalid parameters for top-up.");
    console.log(`[UPI Lite Service] Topping up ₹${amount} for user ${userId} from ${fundingSourceUpiId}`);

    const liteDetails = await getUpiLiteDetails(userId);
    if (!liteDetails.isEnabled) throw new Error("UPI Lite is not enabled for this account.");
    if (liteDetails.linkedAccountUpiId !== fundingSourceUpiId) {
        throw new Error("Funding source UPI ID does not match the linked account for UPI Lite.");
    }
    if ((liteDetails.balance + amount) > liteDetails.maxBalance) {
        throw new Error(`Top-up would exceed max UPI Lite balance of ₹${liteDetails.maxBalance}. Current: ₹${liteDetails.balance}, Adding: ₹${amount}`);
    }

    // Simulate debit from fundingSourceUpiId via PSP
    await upiProviderService.initiateDebit(fundingSourceUpiId, amount, `UPILiteTopup_${userId}`);

    // Update Firestore balance
    const liteDocRef = doc(db, UPI_LITE_COLLECTION, userId);
    await updateDoc(liteDocRef, {
        balance: admin.firestore.FieldValue.increment(amount),
        updatedAt: serverTimestamp(),
    });

    // Log transaction
    await addTransaction({
        userId,
        type: 'Wallet Top-up', // Treat UPI Lite top-up similar to wallet top-up
        name: 'UPI Lite Top-up',
        description: `Added to UPI Lite from ${fundingSourceUpiId}`,
        amount: amount, // Positive amount for the credit to Lite balance
        status: 'Completed',
        paymentMethodUsed: 'UPI', // Source was UPI
    });

    console.log(`[UPI Lite Service] Top-up of ₹${amount} successful for user ${userId}`);
    return { success: true, message: `₹${amount} added to UPI Lite successfully.` };
}

/**
 * Disables UPI Lite for the user.
 * Transfers any remaining balance back to the linked bank account.
 * @param {string} userId The user's ID.
 * @returns {Promise<object>} Result of disabling UPI Lite.
 */
async function disableUpiLite(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[UPI Lite Service] Disabling for user ${userId}`);

    const liteDetails = await getUpiLiteDetails(userId);
    if (!liteDetails.isEnabled) throw new Error("UPI Lite is already disabled.");

    const balanceToTransfer = liteDetails.balance;

    // Simulate PSP/Bank interaction for disabling UPI Lite
    await upiProviderService.simulateDisableUpiLite(userId, liteDetails.linkedAccountUpiId, balanceToTransfer);

    const liteDocRef = doc(db, UPI_LITE_COLLECTION, userId);
    await updateDoc(liteDocRef, {
        isEnabled: false,
        balance: 0, // Balance is transferred out
        updatedAt: serverTimestamp(),
    });

    // Log transaction if balance was transferred
    if (balanceToTransfer > 0) {
        await addTransaction({
            userId,
            type: 'Sent', // Money sent from Lite back to bank
            name: `UPI Lite Balance Transfer to Bank`,
            description: `Transferred ₹${balanceToTransfer} from UPI Lite to ${liteDetails.linkedAccountUpiId}`,
            amount: -balanceToTransfer, // Negative from perspective of Lite balance change (debit from Lite)
            status: 'Completed',
            paymentMethodUsed: 'UPI', // Destination is UPI linked account
        });
    }
    console.log(`[UPI Lite Service] Disabled successfully for user ${userId}. Balance of ₹${balanceToTransfer} transferred.`);
    return { success: true, message: 'UPI Lite disabled. Balance transferred to linked account.' };
}

module.exports = {
    getUpiLiteDetails,
    enableUpiLite,
    topUpUpiLite,
    disableUpiLite,
};
