/**
 * @fileOverview Service functions for cardless cash withdrawal at Zet Agents using Firestore.
 * Note: Actual agent verification, secure OTP/QR handling, and fund movement require backend integration.
 */

import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, Timestamp, getDoc, runTransaction } from 'firebase/firestore';
import { addTransaction } from './transactionLogger'; // For logging the withdrawal/hold
import { getWalletBalance, payViaWallet } from './wallet'; // To check/hold balance potentially
import { addDays, differenceInMinutes } from 'date-fns'; // For expiry calculation

export interface ZetAgent {
    id: string; // Firestore document ID of the agent (if stored)
    name: string;
    address: string;
    distanceKm: number; // Calculated distance
    operatingHours: string;
    // Add other relevant fields like geo-location, current cash limit, etc.
}

export interface WithdrawalDetails {
    id?: string; // Firestore document ID for the withdrawal request
    userId: string;
    agentId: string;
    agentName?: string; // Optional denormalized agent name
    amount: number;
    otp: string;
    qrData: string;
    status: 'Pending Confirmation' | 'Completed' | 'Expired' | 'Cancelled' | 'Failed';
    createdAt: Timestamp;
    expiresAt: Timestamp;
    completedAt?: Timestamp;
    failureReason?: string;
    // Added from backend
    transactionId?: string;
    updatedAt?: Timestamp;
    expiresInSeconds?: number; // Calculated on client potentially

}

/**
 * Asynchronously retrieves a list of nearby Zet Agent shops.
 * SIMULATED: Uses mock data and calculates dummy distance.
 * @param latitude User's current latitude.
 * @param longitude User's current longitude.
 * @returns A promise that resolves to an array of ZetAgent objects sorted by distance.
 */
export async function getNearbyAgents(latitude: number, longitude: number): Promise<ZetAgent[]> {
    console.log(`Fetching nearby agents for location: ${latitude}, ${longitude}`);
    // TODO: Implement API call to backend service that queries agents based on location.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    const mockAgentsData = [
        { id: 'agent1', name: 'Ramesh Kirana Store', address: '123 MG Road, Bangalore', operatingHours: '8 AM - 9 PM' },
        { id: 'agent2', name: 'Sri Sai Telecom', address: '45 Main St, Koramangala', operatingHours: '9 AM - 8 PM' },
        { id: 'agent3', name: 'Pooja General Store', address: '78 Market Rd, Jayanagar', operatingHours: '7 AM - 10 PM' },
    ];

    return mockAgentsData.map(agent => ({
        ...agent,
        distanceKm: parseFloat((Math.random() * 5 + 0.5).toFixed(1))
    })).sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Initiates a cardless cash withdrawal request in Firestore.
 * Generates OTP and QR data. Places a temporary hold (simulated).
 * @param agentId The ID of the selected Zet Agent.
 * @param amount The amount to withdraw.
 * @returns A promise resolving to the WithdrawalDetails object (including the Firestore document ID).
 * @throws Error if user is not logged in, balance is insufficient, or initiation fails.
 */
export async function initiateWithdrawal(agentId: string, amount: number): Promise<WithdrawalDetails> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not logged in.");
    const userId = currentUser.uid;
    const agentName = 'Zet Agent'; // Fetch agent name if needed

    console.log(`Initiating withdrawal of ₹${amount} at agent ${agentId} (${agentName}) for user ${userId}`);

    // 1. Check User Balance (e.g., Wallet Balance)
    const balance = await getWalletBalance(userId);
    if (balance < amount) {
        throw new Error(`Insufficient wallet balance (₹${balance.toFixed(2)}) to initiate withdrawal.`);
    }

    // TODO: Implement more robust limit checks (daily withdrawal limit, agent limit, etc.)

    // Simulate placing a temporary hold on the balance (in a real app, use transactions)
    console.log(`Simulating balance hold of ₹${amount} for user ${userId}`);
    // await updateDoc(doc(db, 'wallets', userId), { balance: balance - amount }); // This is risky without transaction

    // 2. Generate OTP & QR Data
    const now = new Date();
    const expiryMinutes = 5;
    const expiresAt = addMinutes(now, expiryMinutes); // Use addMinutes from date-fns
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const transactionId = `CW_${Date.now()}_${userId.substring(0, 5)}`; // Unique enough for demo
    const qrData = `zetpay://cashwithdrawal?txn=${transactionId}&agent=${agentId}&amount=${amount}&otp=${otp}`; // Example QR data format

    // 3. Create Withdrawal Request Document in Firestore
    const withdrawalData: Omit<WithdrawalDetails, 'id' | 'createdAt' | 'completedAt' | 'updatedAt'> = {
        userId,
        agentId,
        agentName,
        amount,
        otp,
        qrData,
        status: 'Pending Confirmation',
        expiresAt: Timestamp.fromDate(expiresAt),
    };

    try {
        const withdrawalColRef = collection(db, 'cashWithdrawals'); // Top-level collection for requests
        const docRef = await addDoc(withdrawalColRef, {
            ...withdrawalData,
            createdAt: serverTimestamp(), // Use server timestamp
            updatedAt: serverTimestamp(),
        });
        console.log("Withdrawal request created with ID:", docRef.id);

        // Log the initiated withdrawal transaction (as pending)
        await addTransaction({
            type: 'Sent', // Funds are 'sent' to the agent initially
            name: `Cash Withdrawal @ ${agentName}`,
            description: `Pending Agent Confirmation (Txn: ${docRef.id})`,
            amount: -amount,
            status: 'Pending', // Match withdrawal status
            userId: userId,
            // Add specific fields like withdrawalRequestId: docRef.id
        });

         // Fetch the created doc to get the server timestamp resolved for return
        const newDocSnap = await getDoc(docRef);
        const savedData = newDocSnap.data()!;

        return {
            id: docRef.id,
            ...withdrawalData,
            createdAt: (savedData.createdAt as Timestamp), // Use resolved timestamp
            expiresAt: (savedData.expiresAt as Timestamp),
            expiresInSeconds: differenceInMinutes(expiresAt, new Date()) * 60, // Calculate seconds remaining
        } as WithdrawalDetails;

    } catch (error) {
        console.error("Error initiating withdrawal:", error);
        // TODO: Rollback balance hold if implemented
        throw new Error("Could not initiate cash withdrawal request.");
    }
}

/**
 * Checks the status of a specific withdrawal request in Firestore.
 * @param withdrawalId The Firestore document ID of the withdrawal request.
 * @returns A promise resolving to the current status of the withdrawal.
 */
export async function checkWithdrawalStatus(withdrawalId: string): Promise<WithdrawalDetails['status']> {
     console.log(`Checking status for withdrawal: ${withdrawalId}`);
     try {
        const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);
        const withdrawalSnap = await getDoc(withdrawalDocRef);

        if (!withdrawalSnap.exists()) {
            throw new Error("Withdrawal request not found.");
        }

        const data = withdrawalSnap.data() as WithdrawalDetails;

        // Check for expiry server-side (or client-side if reliable time sync)
        if (data.status === 'Pending Confirmation' && Timestamp.now() > data.expiresAt) {
             console.log(`Withdrawal ${withdrawalId} has expired. Updating status.`);
             // Update status to Expired if it hasn't been completed/cancelled
             // This should ideally be handled by a backend process checking expiry
             await updateDoc(withdrawalDocRef, { status: 'Expired', failureReason: 'Timed out' });
             // TODO: Release balance hold if implemented
             return 'Expired';
        }

        return data.status;

     } catch (error: any) {
         console.error(`Error checking withdrawal status for ${withdrawalId}:`, error);
         throw new Error(error.message || "Could not check withdrawal status.");
     }
}

/**
 * Cancels a pending cash withdrawal request.
 * @param withdrawalId The Firestore document ID of the withdrawal request.
 * @returns A promise resolving when cancellation is complete.
 */
export async function cancelWithdrawal(withdrawalId: string): Promise<void> {
     const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not logged in.");
    const userId = currentUser.uid;
    console.log(`Cancelling withdrawal ${withdrawalId} for user ${userId}`);

    try {
        const withdrawalDocRef = doc(db, 'cashWithdrawals', withdrawalId);
         // Use a transaction to ensure we only cancel if it's still pending
         await runTransaction(db, async (transaction) => {
             const withdrawalSnap = await transaction.get(withdrawalDocRef);
             if (!withdrawalSnap.exists()) throw new Error("Withdrawal request not found.");

             const data = withdrawalSnap.data() as WithdrawalDetails;
             if (data.userId !== userId) throw new Error("Permission denied.");
             if (data.status !== 'Pending Confirmation') throw new Error(`Cannot cancel request with status: ${data.status}`);

             transaction.update(withdrawalDocRef, {
                 status: 'Cancelled',
                 failureReason: 'Cancelled by user',
                 updatedAt: serverTimestamp()
             });
             // TODO: Release balance hold if implemented
         });

         // Update the corresponding transaction log status
         // Find transaction linked to this withdrawal (assuming withdrawalId was stored)
         // const q = query(collection(db, 'transactions'), where('withdrawalRequestId', '==', withdrawalId), limit(1));
         // const txSnap = await getDocs(q);
         // if (!txSnap.empty) {
         //     await updateDoc(doc(db, 'transactions', txSnap.docs[0].id), { status: 'Cancelled' });
         // }

        console.log(`Withdrawal ${withdrawalId} cancelled successfully.`);

    } catch (error: any) {
         console.error(`Error cancelling withdrawal ${withdrawalId}:`, error);
         throw new Error(error.message || "Could not cancel withdrawal.");
    }
}


// Helper function (import from date-fns if available)
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
