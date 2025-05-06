/**
 * @fileOverview Service functions for cardless cash withdrawal at Zet Agents using Firestore.
 * Note: Actual agent verification, secure OTP/QR handling, and fund movement require backend integration.
 */

import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, Timestamp, getDoc, runTransaction } from 'firebase/firestore';
// Removed addTransaction import
import { getWalletBalance } from './wallet'; // Keep for client-side balance check before initiation
import { addMinutes, differenceInMinutes } from 'date-fns'; // For expiry calculation
import type { WithdrawalDetails, ZetAgent } from './types'; // Import shared types
import { apiClient } from '@/lib/apiClient'; // For API interaction

export type { WithdrawalDetails, ZetAgent }; // Re-export


/**
 * Asynchronously retrieves a list of nearby Zet Agent shops via the backend API.
 * @param latitude User's current latitude.
 * @param longitude User's current longitude.
 * @returns A promise that resolves to an array of ZetAgent objects sorted by distance.
 */
export async function getNearbyAgents(latitude: number, longitude: number): Promise<ZetAgent[]> {
    console.log(`Fetching nearby agents via API for location: ${latitude}, ${longitude}`);
    try {
        const agents = await apiClient<ZetAgent[]>('/cash-withdrawal/agents', {
            params: { lat: latitude, lon: longitude } // Example query params
        });
        // Backend should ideally return sorted agents with distance
        return agents;
    } catch (error) {
        console.error("Error fetching nearby agents via API:", error);
        return []; // Return empty on error
    }
}

/**
 * Initiates a cardless cash withdrawal request via the backend API.
 * Backend handles balance check, hold placement, OTP/QR generation, and initial logging.
 * @param agentId The ID of the selected Zet Agent.
 * @param amount The amount to withdraw.
 * @returns A promise resolving to the WithdrawalDetails object returned by the backend.
 * @throws Error if user is not logged in or initiation fails.
 */
export async function initiateWithdrawal(agentId: string, amount: number): Promise<WithdrawalDetails> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not logged in.");
    const userId = currentUser.uid;
    const agentName = 'Zet Agent'; // Backend should fetch/know agent name

    console.log(`Initiating withdrawal via API: ₹${amount} at agent ${agentId} for user ${userId}`);

    try {
        // Backend performs balance check and creates request
        const details = await apiClient<WithdrawalDetails>('/cash-withdrawal/initiate', {
            method: 'POST',
            body: JSON.stringify({ agentId, agentName, amount }), // Send agentName if available client-side
        });

        // Convert timestamps from backend (likely ISO strings) to Date objects
        return {
            ...details,
            createdAt: new Date(details.createdAt),
            expiresAt: new Date(details.expiresAt),
            updatedAt: details.updatedAt ? new Date(details.updatedAt) : undefined,
            completedAt: details.completedAt ? new Date(details.completedAt) : undefined,
            // Calculate expiresInSeconds client-side if needed, or get from backend
            expiresInSeconds: differenceInMinutes(new Date(details.expiresAt), new Date()) * 60,
        };

    } catch (error: any) {
        console.error("Error initiating withdrawal via API:", error);
        throw error; // Re-throw API client error
    }
}


/**
 * Checks the status of a specific withdrawal request via the backend API.
 * @param withdrawalId The Firestore document ID of the withdrawal request.
 * @returns A promise resolving to the current status of the withdrawal.
 */
export async function checkWithdrawalStatus(withdrawalId: string): Promise<WithdrawalDetails['status']> {
     console.log(`Checking status via API for withdrawal: ${withdrawalId}`);
     try {
        // Backend endpoint handles expiry checks if needed
        const result = await apiClient<{ status: WithdrawalDetails['status'] }>(`/cash-withdrawal/status/${withdrawalId}`);
        return result.status;
     } catch (error: any) {
         console.error(`Error checking withdrawal status via API for ${withdrawalId}:`, error);
         throw new Error(error.message || "Could not check withdrawal status.");
     }
}

/**
 * Cancels a pending cash withdrawal request via the backend API.
 * @param withdrawalId The Firestore document ID of the withdrawal request.
 * @returns A promise resolving when cancellation is complete.
 */
export async function cancelWithdrawal(withdrawalId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not logged in.");
    console.log(`Cancelling withdrawal via API: ${withdrawalId}`);

    try {
        // Backend handles permission checks, status updates, hold release, logging cancellation
        await apiClient<void>(`/cash-withdrawal/cancel/${withdrawalId}`, {
            method: 'POST', // Or DELETE depending on backend design
        });
        console.log(`Withdrawal ${withdrawalId} cancelled successfully via API.`);
    } catch (error: any) {
         console.error(`Error cancelling withdrawal ${withdrawalId} via API:`, error);
         throw new Error(error.message || "Could not cancel withdrawal.");
    }
}

// Note: confirmDispenseByAgent should only be callable by authenticated agents, likely via a separate agent app/portal calling the backend API.
// No client-side function needed for this in the user app.
