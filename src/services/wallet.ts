
/**
 * @fileOverview Service functions for managing the Zet Pay Wallet.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { addTransaction, Transaction } from './transactions';

export interface WalletDetails {
    userId: string;
    balance: number;
    lastUpdated: Date;
    // Add other wallet-specific fields like transaction limits if any
}

export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string;
    message?: string;
}


/**
 * Asynchronously retrieves the current user's Zet Pay Wallet balance.
 *
 * @param userId The ID of the user whose wallet balance is needed.
 * @returns A promise that resolves to the wallet balance number.
 * @throws Error if the wallet is not found or cannot be accessed.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    if (!userId) throw new Error("User ID is required to get wallet balance.");
    console.log(`Fetching wallet balance for user: ${userId}`);

    try {
        const walletDocRef = doc(db, 'wallets', userId); // Assuming wallets are stored in a top-level 'wallets' collection
        const walletDocSnap = await getDoc(walletDocRef);

        if (walletDocSnap.exists()) {
            const data = walletDocSnap.data();
            return data.balance || 0;
        } else {
            console.log("Wallet document not found for user:", userId, "Returning 0 balance.");
            // Optionally create a wallet document here if it doesn't exist
            return 0; // Assume 0 balance if wallet doesn't exist
        }
    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        throw new Error("Could not fetch wallet balance.");
    }
}

/**
 * Asynchronously adds funds to the Zet Pay Wallet from a linked bank account.
 *
 * @param userId The ID of the user whose wallet is being topped up.
 * @param amount The amount to add.
 * @param fundingSourceInfo Information about the funding source (e.g., Bank UPI ID).
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function topUpWallet(userId: string, amount: number, fundingSourceInfo: string): Promise<boolean> {
    if (!userId || amount <= 0) throw new Error("Invalid user ID or amount for wallet top-up.");
    console.log(`Attempting to top up wallet for user ${userId} with ₹${amount} from ${fundingSourceInfo}`);

    // TODO:
    // 1. Initiate payment from the funding source (e.g., UPI collect request or debit via gateway)
    // 2. Wait for payment confirmation.
    // 3. If payment successful, update wallet balance atomically.

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment processing

    try {
        const walletDocRef = doc(db, 'wallets', userId);

        // Use a Firestore transaction to ensure atomic update
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (walletDoc.exists()) {
                currentBalance = walletDoc.data().balance || 0;
            }
            const newBalance = currentBalance + amount;

            // Set or update the wallet document
            transaction.set(walletDocRef, {
                balance: newBalance,
                lastUpdated: serverTimestamp()
            }, { merge: true }); // Use merge: true to create if not exists or update if exists
        });

        // Log successful top-up transaction
         await addTransaction({
             type: 'Received', // Treat wallet top-up as received into wallet
             name: 'Wallet Top-up',
             description: `Added from ${fundingSourceInfo}`,
             amount: amount, // Positive amount
             status: 'Completed',
             userId: userId, // Associate with the user
         });


        console.log(`Wallet for user ${userId} topped up successfully. New balance calculated.`);
        return true;

    } catch (error) {
        console.error("Error topping up wallet:", error);
        throw new Error("Failed to top up wallet balance.");
    }
}


/**
 * Asynchronously processes a payment directly from the Zet Pay Wallet.
 *
 * @param userId The ID of the user making the payment.
 * @param recipientIdentifier Recipient's UPI ID, mobile number, etc.
 * @param amount The amount to pay.
 * @param note Optional payment note.
 * @returns A promise resolving to a WalletTransactionResult.
 */
export async function payViaWallet(
    userId: string,
    recipientIdentifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
    if (!userId || amount <= 0 || !recipientIdentifier) {
        return { success: false, message: "Invalid parameters for wallet payment." };
    }
    console.log(`Attempting wallet payment for user ${userId} of ₹${amount} to ${recipientIdentifier}`);

    try {
        const walletDocRef = doc(db, 'wallets', userId);

        // Use Firestore transaction for atomic read and update
        const transactionId = `TXN_WALLET_${Date.now()}`;
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);

            if (!walletDoc.exists()) {
                throw new Error("Wallet not found.");
            }

            const currentBalance = walletDoc.data()?.balance || 0;
            if (currentBalance < amount) {
                throw new Error("Insufficient wallet balance.");
            }

            const newBalance = currentBalance - amount;

            // Update wallet balance
            transaction.update(walletDocRef, {
                balance: newBalance,
                lastUpdated: serverTimestamp()
            });

            // TODO: Initiate transfer to the recipientIdentifier via appropriate rails (e.g., UPI P2P push if it's a UPI ID)
            // This part is complex and depends on payment infrastructure.
            console.log(`Simulating transfer of ₹${amount} to ${recipientIdentifier}...`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate transfer delay

             // Log successful payment transaction in user's history
             await addTransaction({
                 type: 'Sent', // Payment sent from wallet
                 name: recipientIdentifier, // Use identifier as name for now
                 description: `Paid via Wallet ${note ? `- ${note}` : ''}`,
                 amount: -amount, // Negative amount
                 status: 'Completed',
                 userId: userId,
                 upiId: recipientIdentifier.includes('@') ? recipientIdentifier : undefined, // Store if it looks like a UPI ID
             });

        });

        console.log(`Wallet payment successful for user ${userId}.`);
        return { success: true, transactionId: transactionId, message: "Payment Successful via Wallet" };

    } catch (error: any) {
        console.error("Error processing wallet payment:", error);
        // Log failed payment transaction
         try {
            await addTransaction({
                type: 'Failed',
                name: recipientIdentifier,
                description: `Wallet Payment Failed - ${error.message}`,
                amount: -amount,
                status: 'Failed',
                userId: userId,
                 upiId: recipientIdentifier.includes('@') ? recipientIdentifier : undefined,
            });
         } catch (logError) {
             console.error("Failed to log failed wallet transaction:", logError);
         }
        return { success: false, message: error.message || "Failed to process wallet payment." };
    }
}
