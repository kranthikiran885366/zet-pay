/**
 * @fileOverview Service functions for managing the Zet Pay Wallet via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // Keep for client-side user checks if needed
import { addTransaction } from '@/services/transactionLogger'; // Use centralized logger
import type { Transaction } from './types'; // For internal logging if needed

// Define the expected result structure from the backend API
export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string; // The ID of the transaction record created by the backend
    newBalance?: number; // Optionally returned by the backend after update
    message?: string;
}


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
        const result = await apiClient<WalletTransactionResult>('/wallet/pay', { // Assuming a new '/wallet/pay' endpoint
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
    console.warn("payViaWalletInternal is intended for internal use or backend. Using client-side simulation.");
    // Simulate the API call and transaction logging for now
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    const isCredit = amount < 0;
    const absoluteAmount = Math.abs(amount);
    let loggedTxId: string | undefined;

    try {
        // Simulate success (replace with actual backend call logic if possible)
        const success = true;
        const message = `Internal wallet ${isCredit ? 'credit' : 'payment'} successful (Simulated)`;
        const newBalance = 5000; // Mock balance

        if (success) {
             // Log successful transaction
            const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
                // Determine type based on operation
                type: isCredit ? 'Received' : 'Sent',
                name: identifier, // Use identifier
                description: `${isCredit ? 'Credited via Wallet' : 'Paid via Wallet'} ${note ? `- ${note}` : ''}`,
                amount: amount, // Store the original amount (positive for debit, negative for credit)
                status: 'Completed',
                userId: userId,
                upiId: identifier.includes('@') ? identifier : undefined,
                paymentMethodUsed: 'Wallet', // Indicate payment method
            };
            const loggedTx = await addTransaction(logData);
            loggedTxId = loggedTx.id;

             // Blockchain logging is handled by backend

        } else {
             throw new Error("Internal wallet operation failed (Simulated).");
        }

        return { success, transactionId: loggedTxId, newBalance, message };

    } catch (error: any) {
        console.error(`Internal wallet ${isCredit ? 'credit' : 'payment'} failed for ${userId} to ${identifier}:`, error);
        // Log failed attempt
        const failLogData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
            type: 'Failed',
            name: identifier,
            description: `Wallet ${isCredit ? 'Credit' : 'Payment'} Failed - ${error.message}`,
            amount: amount,
            status: 'Failed',
            userId: userId,
            upiId: identifier.includes('@') ? identifier : undefined,
            paymentMethodUsed: 'Wallet',
        };
         let failedTxId;
         try {
            const failedTx = await addTransaction(failLogData);
            failedTxId = failedTx.id;
         } catch (logError) {
             console.error("Failed to log failed internal wallet transaction:", logError);
         }
        return { success: false, transactionId: failedTxId, message: error.message || `Internal wallet ${isCredit ? 'credit' : 'payment'} failed.` };
    }
}
