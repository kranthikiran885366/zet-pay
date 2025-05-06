// backend/services/cash-withdrawal.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, Timestamp, getDoc, runTransaction } = db; // Use admin SDK Firestore
const { addTransaction } = require('./transactionLogger'); // Use backend logger
const { payViaWalletInternal } = require('./wallet'); // Use internal wallet function
const { addMinutes } = require('date-fns'); // Use date-fns if installed, otherwise basic JS Date

/**
 * Retrieves nearby Zet Agents based on location.
 * TODO: Replace mock data with actual DB query (e.g., GeoQuery).
 * @param latitude User's latitude.
 * @param longitude User's longitude.
 * @returns Promise resolving to an array of ZetAgent objects.
 */
async function getNearbyAgents(latitude, longitude) {
    console.log(`[CW Service - Backend] Fetching nearby agents for location: ${latitude}, ${longitude}`);
    // TODO: Implement GeoQuery on an 'agents' collection in Firestore
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate DB query

    const mockAgentsData = [
        { id: 'agent1', name: 'Ramesh Kirana Store', address: '123 MG Road, Bangalore', operatingHours: '8 AM - 9 PM', lat: 12.9716, lon: 77.5946 },
        { id: 'agent2', name: 'Sri Sai Telecom', address: '45 Main St, Koramangala', operatingHours: '9 AM - 8 PM', lat: 12.9352, lon: 77.6245 },
        { id: 'agent3', name: 'Pooja General Store', address: '78 Market Rd, Jayanagar', operatingHours: '7 AM - 10 PM', lat: 12.9199, lon: 77.5829 },
    ];

    // Calculate dummy distance for simulation
    return mockAgentsData.map(agent => ({
        ...agent,
        distanceKm: parseFloat((Math.random() * 5 + 0.5).toFixed(1)) // Replace with actual distance calculation
    })).sort((a, b) => a.distanceKm - b.distanceKm);
}


/**
 * Initiates a cardless cash withdrawal request.
 * @param userId The user initiating the request.
 * @param agentId The ID of the selected agent.
 * @param agentName The name of the agent (denormalized).
 * @param amount The amount to withdraw.
 * @returns Promise resolving to the details of the initiated withdrawal.
 * @throws Error if balance is insufficient or initiation fails.
 */
async function initiateWithdrawal(userId, agentId, agentName, amount) {
    if (!userId || !agentId || amount <= 0) {
        throw new Error("User ID, Agent ID, and valid amount are required.");
    }
    console.log(`[CW Service - Backend] Initiating withdrawal for user ${userId}, Agent ${agentId}, Amount ${amount}`);

    // 1. Check user's wallet balance (using internal wallet service)
    const balance = await require('./wallet').ensureWalletExistsInternal(userId); // Get balance directly
    if (balance < amount) {
        throw new Error(`Insufficient wallet balance (Available: ₹${balance.toFixed(2)}).`);
    }

    // 2. Generate OTP and QR Data
    const now = new Date();
    const expiryMinutes = 5; // OTP/QR validity window
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000); // Basic JS Date addition
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const withdrawalRequestId = `CW_REQ_${Date.now()}`; // Unique ID for this request
    // Example QR Data: Can include more details like timestamp, maybe signed
    const qrData = JSON.stringify({
        reqId: withdrawalRequestId,
        agentId: agentId,
        userId: userId, // Include user ID for agent verification? Security consideration.
        amount: amount,
        otp: otp, // Include OTP in QR for scanning convenience by agent? Security trade-off.
        exp: expiresAt.toISOString()
    });

    // 3. Create Withdrawal Request Document & Hold Funds Atomically
    const withdrawalColRef = collection(db, 'cashWithdrawals');
    const walletDocRef = doc(db, 'wallets', userId); // Reference user's wallet

    try {
        let withdrawalDocId = null;
        await runTransaction(db, async (transaction) => {
            // Read current wallet balance within transaction
            const walletDoc = await transaction.get(walletDocRef);
            if (!walletDoc.exists) throw new Error("User wallet not found.");
            const currentBalance = walletDoc.data().balance || 0;
            if (currentBalance < amount) throw new Error("Insufficient wallet balance.");

            // Create withdrawal request document (auto-ID)
            const newWithdrawalRef = doc(withdrawalColRef); // Generate ref first to get ID
            withdrawalDocId = newWithdrawalRef.id; // Store the auto-generated ID
            const withdrawalData = {
                userId,
                agentId,
                agentName: agentName || 'Zet Agent',
                amount,
                otp,
                qrData,
                status: 'Pending Confirmation',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
                 holdTransactionId: null // Placeholder for hold transaction ID
            };
            transaction.set(newWithdrawalRef, withdrawalData); // Set data for the new doc

            // Hold funds by creating a PENDING transaction log
             const holdLogData = {
                userId: userId,
                type: 'Hold',
                name: `Cash Withdrawal Hold @ ${agentName}`,
                description: `Hold for withdrawal request ${withdrawalDocId}`,
                amount: -amount, // Negative amount for hold
                status: 'Pending', // Pending until confirmed/cancelled/expired
                withdrawalRequestId: withdrawalDocId, // Link to the request
                paymentMethodUsed: 'Wallet',
            };
            // Add transaction within the Firestore transaction
            const newTxnRef = doc(collection(db, 'transactions')); // Generate ref for new transaction
            transaction.set(newTxnRef, { ...holdLogData, date: serverTimestamp() });

            // Update withdrawal request with the hold transaction ID
             transaction.update(newWithdrawalRef, { holdTransactionId: newTxnRef.id });

            // Deduct from wallet balance (optional: some might only deduct on confirmation)
            // For simplicity here, we deduct now, but reverse on failure/expiry
            // transaction.update(walletDocRef, {
            //     balance: admin.firestore.FieldValue.increment(-amount),
            //     lastUpdated: serverTimestamp()
            // });
        });

        if (!withdrawalDocId) throw new Error("Failed to create withdrawal request ID.");

        console.log(`[CW Service - Backend] Withdrawal request ${withdrawalDocId} created, hold placed.`);
        // Fetch the created doc to return full details
        const finalDocSnap = await getDoc(doc(db, 'cashWithdrawals', withdrawalDocId));
        const finalData = finalDocSnap.data();

        return {
            id: withdrawalDocId,
            ...finalData,
            createdAt: (finalData.createdAt).toDate().toISOString(),
            expiresAt: (finalData.expiresAt).toDate().toISOString(),
            updatedAt: (finalData.updatedAt).toDate().toISOString(),
             expiresInSeconds: expiryMinutes * 60, // Return initial expiry seconds
        };

    } catch (error) {
        console.error(`[CW Service - Backend] Error initiating withdrawal for user ${userId}:`, error);
        throw error; // Re-throw original error
    }
}


/**
 * Checks the status of a withdrawal request.
 * @param withdrawalId The ID of the withdrawal request.
 * @returns Promise resolving to the current status.
 */
async function checkWithdrawalStatus(withdrawalId) {
    if (!withdrawalId) throw new Error("Withdrawal ID required.");
    const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);

    try {
        const withdrawalSnap = await getDoc(withdrawalDocRef);
        if (!withdrawalSnap.exists()) throw new Error("Withdrawal request not found.");

        const data = withdrawalSnap.data();
        const expiresAt = data.expiresAt.toDate(); // Convert timestamp

        // Check for expiry
        if (data.status === 'Pending Confirmation' && new Date() > expiresAt) {
            console.log(`[CW Service - Backend] Withdrawal ${withdrawalId} expired.`);
            // Update status to Expired if not already done
            await updateDoc(withdrawalDocRef, { status: 'Expired', updatedAt: serverTimestamp(), failureReason: 'Request Timed Out' });
             // Reverse the hold transaction
             if (data.holdTransactionId) {
                 await updateDoc(doc(db, 'transactions', data.holdTransactionId), { status: 'Cancelled', description: `Cancelled due to withdrawal request expiry` });
             }
             // TODO: Reverse wallet balance deduction if done initially
             return 'Expired';
        }
        return data.status;
    } catch (error) {
        console.error(`[CW Service - Backend] Error checking status for ${withdrawalId}:`, error);
        throw new Error("Could not check withdrawal status.");
    }
}

/**
 * Cancels a pending cash withdrawal request.
 * @param userId The ID of the user cancelling.
 * @param withdrawalId The ID of the withdrawal request.
 * @returns Promise resolving when cancellation is complete.
 */
async function cancelWithdrawal(userId, withdrawalId) {
    if (!userId || !withdrawalId) throw new Error("User ID and Withdrawal ID required.");
    console.log(`[CW Service - Backend] Cancelling withdrawal ${withdrawalId} for user ${userId}`);
    const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);

    try {
        await runTransaction(db, async (transaction) => {
            const withdrawalSnap = await transaction.get(withdrawalDocRef);
            if (!withdrawalSnap.exists()) throw new Error("Withdrawal request not found.");

            const data = withdrawalSnap.data();
            if (data.userId !== userId) throw new Error("Permission denied.");
            if (data.status !== 'Pending Confirmation') throw new Error(`Cannot cancel request with status: ${data.status}`);

            // Update withdrawal status
            transaction.update(withdrawalDocRef, {
                status: 'Cancelled',
                failureReason: 'Cancelled by user',
                updatedAt: serverTimestamp()
            });

            // Update the hold transaction log status to Cancelled
            if (data.holdTransactionId) {
                const txRef = doc(db, 'transactions', data.holdTransactionId);
                 transaction.update(txRef, { status: 'Cancelled', description: `Cancelled by user` });
                 console.log(`[CW Service - Backend] Marked hold transaction ${data.holdTransactionId} as Cancelled.`);
            }

            // TODO: Reverse wallet balance deduction if it was done during initiation
        });
        console.log(`[CW Service - Backend] Withdrawal ${withdrawalId} cancelled successfully.`);
    } catch (error) {
         console.error(`[CW Service - Backend] Error cancelling withdrawal ${withdrawalId}:`, error);
         throw error; // Re-throw original error
    }
}

/**
 * Confirms cash dispense by the agent. (Requires Agent Authentication)
 * Verifies OTP, updates status, finalizes transaction log.
 * @param agentId The ID of the agent confirming.
 * @param withdrawalId The ID of the withdrawal request.
 * @param otpEntered The OTP entered by the agent.
 * @returns Promise resolving to true if successful.
 */
async function confirmDispenseByAgent(agentId, withdrawalId, otpEntered) {
    if (!agentId || !withdrawalId || !otpEntered) {
        throw new Error("Agent ID, Withdrawal ID, and OTP are required.");
    }
    console.log(`[CW Service - Backend] Agent ${agentId} confirming dispense for withdrawal ${withdrawalId}`);
    const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);

    try {
        let finalTransactionId = null;
        await runTransaction(db, async (transaction) => {
            const withdrawalSnap = await transaction.get(withdrawalDocRef);
            if (!withdrawalSnap.exists) throw new Error("Withdrawal request not found.");

            const data = withdrawalSnap.data();
             // TODO: Add check if agentId matches data.agentId if needed
             if (data.status !== 'Pending Confirmation') throw new Error(`Request already processed (Status: ${data.status})`);
             if (new Date() > data.expiresAt.toDate()) throw new Error("Request has expired.");
             if (data.otp !== otpEntered) throw new Error("Incorrect OTP provided.");

            // Update withdrawal status
            transaction.update(withdrawalDocRef, {
                status: 'Completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Update the original hold transaction log status to Completed
             if (data.holdTransactionId) {
                const txRef = doc(db, 'transactions', data.holdTransactionId);
                 transaction.update(txRef, { status: 'Completed', description: `Confirmed by Agent ${agentId}` });
                 finalTransactionId = data.holdTransactionId; // Use the hold transaction ID as the final one
                 console.log(`[CW Service - Backend] Marked hold transaction ${data.holdTransactionId} as Completed.`);
             } else {
                 // If no hold transaction was logged, log a new completed one (less ideal)
                 console.warn(`[CW Service - Backend] No hold transaction ID found for withdrawal ${withdrawalId}. Logging new transaction.`);
                 const completeLogData = {
                     userId: data.userId,
                     type: 'Sent', // Final completed state is 'Sent'
                     name: `Cash Withdrawal @ ${data.agentName}`,
                     description: `Confirmed by Agent ${agentId} (Withdrawal ID: ${withdrawalId})`,
                     amount: -data.amount,
                     status: 'Completed',
                     withdrawalRequestId: withdrawalId,
                     paymentMethodUsed: 'Wallet',
                     date: serverTimestamp()
                 };
                 const newTxnRef = doc(collection(db, 'transactions'));
                 transaction.set(newTxnRef, completeLogData);
                 finalTransactionId = newTxnRef.id;
             }

            // TODO: Perform actual wallet deduction if not done during initiation.
             // Example: Use payViaWalletInternal(data.userId, `AGENT_${agentId}`, data.amount, `Cash Dispensed: ${withdrawalId}`);
             // Make sure payViaWalletInternal handles potential insufficient funds error *within* this transaction.
        });

        console.log(`[CW Service - Backend] Dispense confirmed for withdrawal ${withdrawalId}. Final Tx ID: ${finalTransactionId}`);
        return { success: true, transactionId: finalTransactionId };

    } catch (error) {
        console.error(`[CW Service - Backend] Error confirming dispense for ${withdrawalId}:`, error);
        // Update status to Failed? Depends on error type.
        // await updateDoc(withdrawalDocRef, { status: 'Failed', failureReason: error.message || 'Confirmation Failed', updatedAt: serverTimestamp() });
        throw error; // Re-throw
    }
}


module.exports = {
    getNearbyAgents,
    initiateWithdrawal,
    checkWithdrawalStatus,
    cancelWithdrawal,
    confirmDispenseByAgent, // Export agent action
};
