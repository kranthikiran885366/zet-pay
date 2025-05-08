// backend/services/refundService.js (Conceptual Placeholder)
const { admin, db } = require('../config/firebaseAdmin');
const { collection, query, where, getDocs, updateDoc, serverTimestamp, doc, Timestamp } = require('firebase/firestore'); // Updated imports
const { payViaWalletInternal } = require('./wallet'); // Internal wallet credit
// NOTE: We won't log a transaction directly from here, payViaWalletInternal handles its log.
// We only update the original failed transaction's status.
// const { addTransaction } = require('./transactionLogger');
const { subHours, isBefore } = require('date-fns'); // For checking delay

/**
 * Checks the status of a transaction with the Payment Service Provider (PSP).
 * THIS IS A PLACEHOLDER - Requires actual PSP integration.
 * @param {string | undefined} pspTransactionId The transaction ID provided by the PSP.
 * @returns {Promise<'REFUNDED' | 'NOT_DEBITED' | 'DEBITED_PENDING_REFUND' | 'NOT_REFUNDED' | 'UNKNOWN'>} Status from PSP.
 */
async function checkPspRefundStatus(pspTransactionId) {
    if (!pspTransactionId) return 'UNKNOWN'; // Cannot check without PSP ID
    console.log(`[Refund Service - PSP Sim] Checking PSP status for Tx ID: ${pspTransactionId}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call delay
    // Mock Logic:
    if (pspTransactionId.includes('REFUNDED')) return 'REFUNDED';
    if (pspTransactionId.includes('NODEBIT')) return 'NOT_DEBITED';
    if (pspTransactionId.includes('PENDING')) return 'DEBITED_PENDING_REFUND';
    if (Math.random() < 0.1) return 'REFUNDED'; // 10% chance already refunded by bank
    if (Math.random() < 0.1) return 'NOT_DEBITED'; // 10% chance bank confirms no debit occurred
    return 'NOT_REFUNDED'; // Default: Assume not refunded yet by bank
}


/**
 * Finds failed transactions eligible for auto-credit and processes them.
 * Intended to be run periodically (e.g., daily via Cloud Scheduler + Cloud Function).
 */
async function processDelayedRefunds() {
    console.log('[Refund Service] Checking for delayed refunds eligible for auto-credit...');
    const failedTxnCol = collection(db, 'transactions');

    // Query for failed transactions with a ticket ID, not yet auto-credited,
    // and where the failure occurred some time ago (e.g., > 24 hours)
    const cutoffTime = subHours(new Date(), 24); // Check failures older than 24 hours
    const q = query(failedTxnCol,
        where('status', '==', 'Failed'),
        where('ticketId', '!=', null), // Only those where debit might have happened
        // where('refundProcessed', '==', false), // Add a flag to prevent reprocessing
        where('date', '<=', Timestamp.fromDate(cutoffTime)) // Check creation date/time
        // Ideally, compare against refundEta if stored as Timestamp, but date is simpler for now
    );

    try {
        const snapshot = await getDocs(q);
        console.log(`[Refund Service] Found ${snapshot.docs.length} potentially delayed refunds.`);

        if (snapshot.empty) {
            return;
        }

        for (const docSnap of snapshot.docs) {
            const failedTx = { id: docSnap.id, ...docSnap.data() };
            const txRef = doc(db, 'transactions', failedTx.id);

            // Skip if already processed (check the flag if added)
            // if (failedTx.refundProcessed) continue;

            console.log(`[Refund Service] Evaluating Tx ID: ${failedTx.id}, Amount: ${Math.abs(failedTx.amount)}, Date: ${failedTx.date.toDate()}`);

            // 1. Check PSP Status (CRITICAL - Needs real implementation)
            const pspStatus = await checkPspRefundStatus(failedTx.pspTransactionId); // Pass PSP ID if stored on tx

            if (pspStatus === 'NOT_REFUNDED' || pspStatus === 'DEBITED_PENDING_REFUND' || pspStatus === 'UNKNOWN') {
                // Condition met for potential auto-credit (PSP hasn't confirmed refund/no debit)
                console.log(`[Refund Service] Processing auto-credit for failed Tx ID: ${failedTx.id}, Amount: ${Math.abs(failedTx.amount)}`);

                // 2. Credit amount back to user's wallet
                // Use payViaWalletInternal with a NEGATIVE amount to trigger credit logic
                const creditResult = await payViaWalletInternal(
                    failedTx.userId,
                    `REFUND_${failedTx.id}`, // Reference ID for the credit
                    -Math.abs(failedTx.amount), // Pass negative amount for CREDIT
                    `Auto-credit for failed Tx ${failedTx.id}`
                    // Optionally pass 'Refund' as transactionType override
                );

                if (creditResult.success && creditResult.transactionId) {
                    // 3. Update original failed transaction status
                    await updateDoc(txRef, {
                        status: 'Refunded_To_Wallet', // New status indicating wallet credit
                        refundTransactionId: creditResult.transactionId, // Link credit transaction
                        updatedAt: serverTimestamp(),
                        // refundProcessed: true, // Mark as processed
                        failureReason: `${failedTx.failureReason || ''} (Auto-Credited to Wallet)`.trim()
                    });
                    console.log(`[Refund Service] Auto-credit successful for Tx ID: ${failedTx.id}. Credit Tx ID: ${creditResult.transactionId}`);
                    // TODO: Notify user about the wallet credit
                } else {
                    console.error(`[Refund Service] CRITICAL: Failed to auto-credit wallet for Tx ID: ${failedTx.id}. Reason: ${creditResult.message}`);
                    // Update original Tx with credit failure reason? Needs careful handling.
                    await updateDoc(txRef, {
                        failureReason: `${failedTx.failureReason || ''} (Wallet Auto-Credit Attempt Failed: ${creditResult.message})`.trim(),
                        updatedAt: serverTimestamp()
                        // Don't mark refundProcessed: true here, allow retry later?
                    });
                    // Needs alerting/manual review
                }
            } else if (pspStatus === 'REFUNDED' || pspStatus === 'NOT_DEBITED') {
                 console.log(`[Refund Service] Skipping auto-credit for Tx ${failedTx.id}, PSP status: ${pspStatus}`);
                 // Update status if PSP confirmed refund/no debit
                  await updateDoc(txRef, {
                      status: 'Refunded_By_Bank', // Example status
                      updatedAt: serverTimestamp(),
                      // refundProcessed: true, // Mark as processed
                      failureReason: `${failedTx.failureReason || ''} (${pspStatus === 'REFUNDED' ? 'Refunded by Bank/PSP' : 'Confirmed Not Debited by Bank/PSP'})`.trim()
                  });
            }
        } // End loop
    } catch (error) {
        console.error("[Refund Service] Error processing delayed refunds:", error);
    }
}

// Export function if it will be triggered externally (e.g., by a Cloud Function)
module.exports = { processDelayedRefunds };
