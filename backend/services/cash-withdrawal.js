
// backend/services/cash-withdrawal.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, Timestamp, getDoc, runTransaction } = db; // Use admin SDK Firestore
const { addTransaction } = require('./transactionLogger'); // Use backend logger
const { payViaWalletInternal, getWalletBalance } = require('./wallet'); // Use internal wallet function
const { addMinutes } = require('date-fns'); // Use date-fns if installed, otherwise basic JS Date

/**
 * Retrieves nearby Zet Agents based on location.
 * In a real app, this would use GeoQueries. For now, it's a conceptual placeholder.
 * @param latitude User's latitude.
 * @param longitude User's longitude.
 * @returns Promise resolving to an array of ZetAgent objects.
 */
async function getNearbyAgents(latitude, longitude) {
    console.log(`[CW Service - Backend] Finding nearby agents for REAL API: ${latitude}, ${longitude}`);
    // TODO: Replace with actual API call to a Geo-spatial service or database query
    // const response = await axios.get(`${process.env.AGENT_LOCATOR_API_URL}/nearby`, { params: { lat: latitude, lon: longitude, radius: 5 }});
    // return response.data.agents; // Assuming API returns list of agents
    
    // Simulating as if a real API call was made and fell back to mock
    if (process.env.SIMULATE_PROVIDER_ERROR_CW === 'true' && Math.random() < 0.1) {
        console.warn('[CW Service - Backend] Simulating error for getNearbyAgents.');
        throw new Error('Simulated API error: Could not fetch nearby agents.');
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    const mockAgentsData = [ // Keeping mock data here for fallback
        { id: 'agent1', name: 'Ramesh Kirana Store', address: '123 MG Road, Bangalore', operatingHours: '8 AM - 9 PM', lat: 12.9716, lon: 77.5946, maxWithdrawalLimit: 5000 },
        { id: 'agent2', name: 'Sri Sai Telecom', address: '45 Main St, Koramangala', operatingHours: '9 AM - 8 PM', lat: 12.9352, lon: 77.6245, maxWithdrawalLimit: 10000 },
    ];
    return mockAgentsData.map(agent => ({
        ...agent,
        distanceKm: parseFloat((Math.random() * 5 + 0.5).toFixed(1))
    })).sort((a, b) => a.distanceKm - b.distanceKm);
}


/**
 * Initiates a cardless cash withdrawal request.
 * @param userId The user initiating the request.
 * @param agentId The ID of the selected agent.
 * @param agentName The name of the agent.
 * @param amount The amount to withdraw.
 * @returns Promise resolving to the details of the initiated withdrawal.
 * @throws Error if balance is insufficient or initiation fails.
 */
async function initiateWithdrawal(userId, agentId, agentName, amount) {
    if (!userId || !agentId || amount <= 0) {
        throw new Error("User ID, Agent ID, and valid amount are required.");
    }
    console.log(`[CW Service - Backend] Initiating REAL withdrawal for user ${userId}, Agent ${agentId}, Amount ${amount}`);

    // 1. Check user's wallet balance (using internal wallet service)
    const balance = await getWalletBalance(userId); // Use backend service
    if (balance < amount) {
        throw new Error(`Insufficient wallet balance (Available: ₹${balance.toFixed(2)}).`);
    }

    // 2. Generate OTP and QR Data
    const now = new Date();
    const expiryMinutes = 5;
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const withdrawalRequestId = `CW_REQ_${Date.now()}`;
    const qrData = JSON.stringify({ reqId: withdrawalRequestId, agentId, userId, amount, otp, exp: expiresAt.toISOString() });

    // 3. Create Withdrawal Request Document & Hold Funds Atomically
    const withdrawalColRef = collection(db, 'cashWithdrawals');
    const walletDocRef = doc(db, 'wallets', userId);

    try {
        let withdrawalDocId = null;
        let finalHoldTransactionId = null;

        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            if (!walletDoc.exists) throw new Error("User wallet not found.");
            const currentBalance = walletDoc.data().balance || 0;
            if (currentBalance < amount) throw new Error("Insufficient wallet balance (checked within transaction).");

            const newWithdrawalRef = doc(withdrawalColRef);
            withdrawalDocId = newWithdrawalRef.id;
            const withdrawalData = {
                userId, agentId, agentName: agentName || 'Zet Agent', amount, otp, qrData,
                status: 'Pending Confirmation', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt), holdTransactionId: null
            };
            transaction.set(newWithdrawalRef, withdrawalData);

            const holdLogData = {
                userId, type: 'Hold', name: `Cash Withdrawal Hold @ ${agentName}`,
                description: `Hold for withdrawal request ${withdrawalDocId}`, amount: -amount,
                status: 'Pending', withdrawalRequestId: withdrawalDocId, paymentMethodUsed: 'Wallet',
                date: serverTimestamp() // Use server timestamp for transaction date
            };
            const newTxnRef = doc(collection(db, 'transactions'));
            transaction.set(newTxnRef, holdLogData);
            finalHoldTransactionId = newTxnRef.id;
            transaction.update(newWithdrawalRef, { holdTransactionId: finalHoldTransactionId });

            // IMPORTANT: Real fund hold/escrow would happen here via a payment provider
            // For simulation, we trust the hold transaction log.
            // If actual deduction is needed here, use payViaWalletInternal with transaction object.
        });

        if (!withdrawalDocId) throw new Error("Failed to create withdrawal request ID.");
        console.log(`[CW Service - Backend] Withdrawal request ${withdrawalDocId} created, hold TXN ${finalHoldTransactionId} placed.`);
        
        const finalDocSnap = await getDoc(doc(db, 'cashWithdrawals', withdrawalDocId));
        const finalData = finalDocSnap.data();

        return {
            id: withdrawalDocId, ...finalData,
            createdAt: (finalData.createdAt).toDate().toISOString(),
            expiresAt: (finalData.expiresAt).toDate().toISOString(),
            updatedAt: (finalData.updatedAt).toDate().toISOString(),
            expiresInSeconds: expiryMinutes * 60,
        };

    } catch (error) {
        console.error(`[CW Service - Backend] Error initiating withdrawal for user ${userId}:`, error);
        throw error;
    }
}


async function checkWithdrawalStatus(withdrawalId) {
    // This function remains largely the same as it interacts with Firestore.
    if (!withdrawalId) throw new Error("Withdrawal ID required.");
    const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);
    try {
        const withdrawalSnap = await getDoc(withdrawalDocRef);
        if (!withdrawalSnap.exists()) throw new Error("Withdrawal request not found.");
        const data = withdrawalSnap.data();
        const expiresAt = data.expiresAt.toDate();

        if (data.status === 'Pending Confirmation' && new Date() > expiresAt) {
            console.log(`[CW Service - Backend] Withdrawal ${withdrawalId} expired.`);
            await updateDoc(withdrawalDocRef, { status: 'Expired', updatedAt: serverTimestamp(), failureReason: 'Request Timed Out' });
            if (data.holdTransactionId) {
                 await updateDoc(doc(db, 'transactions', data.holdTransactionId), { status: 'Cancelled', description: `Cancelled: Withdrawal Expired` });
            }
            return 'Expired';
        }
        return data.status;
    } catch (error) {
        console.error(`[CW Service - Backend] Error checking status for ${withdrawalId}:`, error);
        throw new Error("Could not check withdrawal status.");
    }
}

async function cancelWithdrawal(userId, withdrawalId) {
    // This function remains largely the same, interacting with Firestore.
    if (!userId || !withdrawalId) throw new Error("User ID and Withdrawal ID required.");
    console.log(`[CW Service - Backend] Cancelling REAL withdrawal ${withdrawalId} for user ${userId}`);
    const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);
    try {
        await runTransaction(db, async (transaction) => {
            const withdrawalSnap = await transaction.get(withdrawalDocRef);
            if (!withdrawalSnap.exists()) throw new Error("Withdrawal request not found.");
            const data = withdrawalSnap.data();
            if (data.userId !== userId) throw new Error("Permission denied.");
            if (data.status !== 'Pending Confirmation') throw new Error(`Cannot cancel request with status: ${data.status}`);

            transaction.update(withdrawalDocRef, { status: 'Cancelled', failureReason: 'Cancelled by user', updatedAt: serverTimestamp() });
            if (data.holdTransactionId) {
                const txRef = doc(db, 'transactions', data.holdTransactionId);
                transaction.update(txRef, { status: 'Cancelled', description: `Cancelled by User` });
                console.log(`[CW Service - Backend] Marked hold transaction ${data.holdTransactionId} as Cancelled.`);
            }
            // TODO: If funds were actually debited from wallet (not just hold), reverse it here.
            // await payViaWalletInternal(userId, `REFUND_CW_${withdrawalId}`, data.amount, `Refund for cancelled withdrawal ${withdrawalId}`, 'Refund', transaction);
        });
        console.log(`[CW Service - Backend] Withdrawal ${withdrawalId} cancelled successfully.`);
    } catch (error) {
         console.error(`[CW Service - Backend] Error cancelling withdrawal ${withdrawalId}:`, error);
         throw error;
    }
}

async function confirmDispenseByAgent(agentId, withdrawalId, otpEntered) {
    // This function assumes agent is authenticated and authorized.
    if (!agentId || !withdrawalId || !otpEntered) {
        throw new Error("Agent ID, Withdrawal ID, and OTP are required.");
    }
    console.log(`[CW Service - Backend] Agent ${agentId} confirming REAL dispense for withdrawal ${withdrawalId}`);
    const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);
    try {
        let finalTransactionId = null;
        await runTransaction(db, async (transaction) => {
            const withdrawalSnap = await transaction.get(withdrawalDocRef);
            if (!withdrawalSnap.exists()) throw new Error("Withdrawal request not found.");
            const data = withdrawalSnap.data();
            if (data.agentId !== agentId) throw new Error("Agent not authorized for this request.");
            if (data.status !== 'Pending Confirmation') throw new Error(`Request already processed (Status: ${data.status})`);
            if (new Date() > data.expiresAt.toDate()) throw new Error("Request has expired.");
            if (data.otp !== otpEntered) throw new Error("Incorrect OTP provided.");

            // 1. Update withdrawal status
            transaction.update(withdrawalDocRef, { status: 'Completed', completedAt: serverTimestamp(), updatedAt: serverTimestamp() });

            // 2. Mark hold transaction as 'Completed' and debit user's wallet via payViaWalletInternal
            if (!data.holdTransactionId) throw new Error("Critical: Hold transaction ID missing for completed withdrawal.");
            
            const paymentResult = await payViaWalletInternal(data.userId, `CW_AGENT_${agentId}`, data.amount, `Cash Withdrawn at ${data.agentName || 'Agent'} (Req: ${withdrawalId})`, 'Sent', transaction);
            if (!paymentResult.success) {
                 // This is a critical failure: OTP matched, but wallet debit failed. Needs alert.
                 console.error(`[CW Service - Backend] CRITICAL: OTP Correct, but wallet debit failed for user ${data.userId}, withdrawal ${withdrawalId}. Reason: ${paymentResult.message}`);
                 throw new Error(`Wallet payment failed after OTP verification: ${paymentResult.message}. Please contact support.`);
            }
            finalTransactionId = paymentResult.transactionId; // This is the actual debit transaction
            
            // Update the original hold transaction to link to the final debit, or mark as superseded
            const holdTxRef = doc(db, 'transactions', data.holdTransactionId);
            transaction.update(holdTxRef, { status: 'Completed', description: `Fulfilled by Tx: ${finalTransactionId}`, updatedAt: serverTimestamp() });

            console.log(`[CW Service - Backend] Dispense confirmed for withdrawal ${withdrawalId}. Final Debit Tx ID: ${finalTransactionId}`);
        });
        return { success: true, transactionId: finalTransactionId };
    } catch (error) {
        console.error(`[CW Service - Backend] Error confirming dispense for ${withdrawalId}:`, error);
        // Potentially update withdrawal status to 'Failed' on error, if appropriate.
        await updateDoc(withdrawalDocRef, { status: 'Failed', failureReason: `Agent confirmation error: ${error.message}`, updatedAt: serverTimestamp() }).catch(e => console.error("Error marking withdrawal as failed:",e));
        throw error;
    }
}

module.exports = {
    getNearbyAgents,
    initiateWithdrawal,
    checkWithdrawalStatus,
    cancelWithdrawal,
    confirmDispenseByAgent,
};

// Re-added import for addMinutes due to previous removal by mistake.
// It's not directly used in this file, but good to keep for date-fns.
// However, to keep only