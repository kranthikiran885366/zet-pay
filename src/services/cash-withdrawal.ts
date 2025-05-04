/**
 * @fileOverview Service functions for cardless cash withdrawal at Zet Agents.
 */

import { addTransaction } from './transactions'; // For logging the withdrawal
import { auth } from '@/lib/firebase'; // To get current user

export interface ZetAgent {
    id: string;
    name: string;
    address: string;
    distanceKm: number; // Calculated distance
    operatingHours: string; // e.g., "9 AM - 8 PM"
    // Add other relevant fields like current cash limit, transaction limits, etc.
}

export interface WithdrawalDetails {
    transactionId: string;
    agentId: string;
    amount: number;
    otp: string; // One-Time Password for verification
    qrData: string; // Data to be encoded in the QR code for agent scanning
    expiresInSeconds: number; // How long the OTP/QR is valid
    status: 'Pending Confirmation' | 'Completed' | 'Expired' | 'Cancelled';
}

/**
 * Asynchronously retrieves a list of nearby Zet Agent shops.
 * @param latitude User's current latitude.
 * @param longitude User's current longitude.
 * @returns A promise that resolves to an array of ZetAgent objects sorted by distance.
 */
export async function getNearbyAgents(latitude: number, longitude: number): Promise<ZetAgent[]> {
    console.log(`Fetching nearby agents for location: ${latitude}, ${longitude}`);
    // TODO: Implement API call to backend service that queries agents based on location.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    // Mock Data (calculate dummy distance based on fixed points)
    const mockAgents: Omit<ZetAgent, 'distanceKm'>[] = [
        { id: 'agent1', name: 'Ramesh Kirana Store', address: '123 MG Road, Bangalore', operatingHours: '8 AM - 9 PM' },
        { id: 'agent2', name: 'Sri Sai Telecom', address: '45 Main St, Koramangala', operatingHours: '9 AM - 8 PM' },
        { id: 'agent3', name: 'Pooja General Store', address: '78 Market Rd, Jayanagar', operatingHours: '7 AM - 10 PM' },
    ];

    // Simple distance simulation
    return mockAgents.map(agent => ({
        ...agent,
        distanceKm: Math.random() * 5 + 0.5 // Random distance between 0.5 and 5.5 km
    })).sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Initiates a cardless cash withdrawal request.
 * Generates OTP and QR data to be shown to the agent.
 * @param agentId The ID of the selected Zet Agent.
 * @param amount The amount to withdraw.
 * @returns A promise resolving to the WithdrawalDetails object.
 */
export async function initiateWithdrawal(agentId: string, amount: number): Promise<WithdrawalDetails> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User not logged in.");
    }
    console.log(`Initiating withdrawal of ₹${amount} at agent ${agentId} for user ${currentUser.uid}`);
    // TODO: Implement API call to backend to:
    // 1. Check user balance/limits.
    // 2. Generate a secure OTP and transaction token.
    // 3. Create a pending withdrawal record in the database.
    // 4. Generate QR code data containing transaction details.
    // 5. Start a timer/webhook for expiry.
    // 6. Potentially place a hold on the user's balance.

    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Simulate success
    const transactionId = `CW${Date.now()}`;
    const otp = String(Math.floor(100000 + Math.random() * 900000)); // Generate 6-digit OTP
    const qrData = `zetpay://cashwithdrawal?txn=${transactionId}&agent=${agentId}&amount=${amount}&otp=${otp}`; // Example QR data format

    // Log the initiated withdrawal (as pending)
    // Note: Status should ideally be updated by the backend upon agent confirmation
     await addTransaction({
         type: 'Sent', // Consider this as 'Sent' from user's perspective until confirmed
         name: `Cash Withdrawal @ ${agentId}`, // Use agent ID or fetch name
         description: `Pending Agent Confirmation - OTP: ${otp}`,
         amount: -amount, // Negative amount
         status: 'Pending', // Initial status is pending
         userId: currentUser.uid,
         // Add specific fields if needed for this transaction type
     });


    return {
        transactionId: transactionId,
        agentId: agentId,
        amount: amount,
        otp: otp,
        qrData: qrData,
        expiresInSeconds: 300, // 5 minutes validity
        status: 'Pending Confirmation',
    };
}

// Optional: Function to check the status of a withdrawal (e.g., poll or use WebSocket)
export async function checkWithdrawalStatus(transactionId: string): Promise<WithdrawalDetails['status']> {
     console.log(`Checking status for withdrawal: ${transactionId}`);
     // TODO: Implement API call to check status
     await new Promise(resolve => setTimeout(resolve, 500));
     // Simulate status change
     const random = Math.random();
     if (random < 0.2) return 'Completed'; // 20% chance it's completed
     if (random < 0.3) return 'Expired'; // 10% chance it expired
     return 'Pending Confirmation'; // Otherwise still pending
}