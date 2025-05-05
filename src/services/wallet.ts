/**
 * @fileOverview Service functions for managing the Zet Pay Wallet via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // Keep for client-side user checks if needed
import { addTransaction } from '../../backend/services/transactionLogger'; // Use backend logger - Corrected Path
import type { Transaction, WalletTransactionResult } from './types'; // Use shared types

// Define the expected result structure from the backend API (Already in types.ts)
// export interface WalletTransactionResult { ... }
export type { WalletTransactionResult }; // Re-export


/**
 * Asynchronously retrieves the current user's Zet Pay Wallet balance from the backend API.
 *
 * @param userId Optional: Pass userId explicitly if needed, otherwise inferred from auth token by backend.
 * @returns A promise that resolves to the wallet balance number.
 * @throws Error if the API call fails.
 */
export async function getWalletBalance(userId?: string): Promise<number> {
    const currentUserId = userId || auth.currentUser?.uid; // Get ID for logging if needed
    console.log(`Fetching wallet balance via API for user: ${currentUserId || 'current'}`);

    try {
        // Backend infers user from the token
        const response = await apiClient<{ balance: number }>('/wallet/balance');
        return response.balance;
    } catch (error) {
        console.error("Error fetching wallet balance via API:", error);
        throw error; // Re-throw error caught by apiClient
    }
}

/**
 * Asynchronously adds funds to the Zet Pay Wallet via the backend API.
 * The backend handles debiting the funding source and updating the wallet balance.
 *
 * @param userId Optional: The ID of the user. Backend typically infers from token.
 * @param amount The amount to add.
 * @param fundingSourceInfo Information about the funding source (e.g., Bank UPI ID, Card Token ID).
 * @returns A promise resolving to an object indicating success and potentially the new balance.
 */
export async function topUpWallet(userId: string | undefined, amount: number, fundingSourceInfo: string): Promise<WalletTransactionResult> {
     const currentUserId = userId || auth.currentUser?.uid;
     console.log(`Attempting wallet top-up via API for user ${currentUserId} with ₹${amount} from ${fundingSourceInfo}`);

     if (amount <= 0) {
        return { success: false, message: "Invalid top-up amount." };
     }

     try {
        // Backend infers user from token
        // Use the correct expected response type from the backend endpoint
        const result = await apiClient<WalletTransactionResult>('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount, fundingSourceInfo }),
        });
        console.log("Wallet top-up API response:", result);
        return result; // Return the structured result
     } catch (error: any) {
        console.error("Error topping up wallet via API:", error);
        return { success: false, message: error.message || "Failed to process top-up." };
     }
}


/**
 * Asynchronously processes a payment directly from the Zet Pay Wallet via the backend API.
 * Backend handles balance check, deduction, fund transfer simulation/initiation, and transaction logging.
 *
 * @param userId Optional: The ID of the user making the payment. Backend infers from token.
 * @param recipientIdentifier Recipient's UPI ID, mobile number, etc.
 * @param amount The amount to pay.
 * @param note Optional payment note.
 * @returns A promise resolving to a WalletTransactionResult.
 */
export async function payViaWallet(
    userId: string | undefined,
    recipientIdentifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
     const currentUserId = userId || auth.currentUser?.uid;
     console.log(`Attempting wallet payment via API for user ${currentUserId} of ₹${amount} to ${recipientIdentifier}`);

    if (amount <= 0 || !recipientIdentifier) {
        return { success: false, message: "Invalid parameters for wallet payment." };
    }

     try {
        // Backend infers user from token
        // Use the backend payViaWalletController which calls payViaWalletInternal
        const result = await apiClient<WalletTransactionResult>('/wallet/pay', {
            method: 'POST',
            body: JSON.stringify({ recipientIdentifier, amount, note: note || undefined }),
        });
        console.log("Wallet payment API response:", result);
        return result;
     } catch (error: any) {
        console.error("Error processing wallet payment via API:", error);
         return { success: false, message: error.message || "Failed to process wallet payment." };
     }
}


/**
 * @deprecated This client-side simulation is deprecated. Use the `payViaWallet` function to interact with the backend API.
 * Internal helper function used by other services/controllers for direct wallet debit/credit.
 * Handles logging and real-time updates.
 * IMPORTANT: Negative amount signifies a CREDIT to the wallet (like a top-up/refund).
 * This function should ideally be moved to the backend service.
 * Keeping it here temporarily requires access to addTransaction and other client-side details.
 *
 * @param userId The ID of the user whose wallet is affected.
 * @param identifier An identifier for the transaction (e.g., recipient UPI, 'WALLET_RECOVERY').
 * @param amount The amount (positive for debit, negative for credit).
 * @param note A descriptive note for the transaction log.
 * @returns A promise resolving to a WalletTransactionResult.
 */
export async function payViaWalletInternal(
    userId: string,
    identifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
    // This function is now primarily handled by the backend controller (`payViaWalletController`)
    // which in turn calls the backend `payViaWalletInternal`.
    // The client-side simulation is removed to avoid duplication and rely on the API call.
    console.warn("payViaWalletInternal called client-side. Use payViaWallet to trigger the backend logic.");

    // For compatibility with client-side simulations (like in UPI fallback), we can keep a simple simulation
    // but it won't reflect the true backend state or trigger backend logs/WS updates.
    // If a true internal client-side update is needed (highly discouraged), it needs careful state management.

    // Simulate basic success/failure for client-side flows that might still call this temporarily
    await new Promise(resolve => setTimeout(resolve, 100)); // Minimal delay
    const isCredit = amount < 0;
    const success = Math.random() > 0.1; // 90% success simulation

    if (!success) {
         console.error(`Simulated Internal wallet ${isCredit ? 'credit' : 'payment'} failed for ${userId}.`);
         return { success: false, message: `Simulated internal wallet ${isCredit ? 'credit' : 'payment'} failed.` };
    }

     console.log(`Simulated Internal wallet ${isCredit ? 'credit' : 'payment'} successful for ${userId}.`);
     // Return a mock successful response without transaction ID or balance update
     // Logging and balance update should happen via backend API call.
     return { success: true, message: `Simulated internal wallet ${isCredit ? 'credit' : 'payment'} successful.` };


    // **Removed the previous client-side simulation logic including:**
    // - runTransaction calls
    // - addTransaction calls
    // - sendBalanceUpdate calls (backend handles this)
    // - Blockchain logging calls (backend handles this)
}
