
/**
 * @fileOverview Service functions for managing the Zet Pay Wallet using Firestore.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore'; // Import setDoc for creation
import { addTransaction, Transaction } from './transactions';

export interface WalletDetails {
    userId: string; // Redundant if doc ID is userId, but good for clarity
    balance: number;
    lastUpdated: Timestamp; // Use Firestore Timestamp
}

export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string;
    message?: string;
}


/**
 * Asynchronously retrieves the current user's Zet Pay Wallet balance from Firestore.
 * Creates a wallet document with 0 balance if it doesn't exist.
 *
 * @param userId The ID of the user whose wallet balance is needed.
 * @returns A promise that resolves to the wallet balance number.
 * @throws Error if the user ID is missing or fetching fails.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    if (!userId) throw new Error("User ID is required to get wallet balance.");
    console.log(`Fetching wallet balance for user: ${userId}`);

    try {
        const walletDocRef = doc(db, 'wallets', userId); // Use userId as document ID in 'wallets' collection
        const walletDocSnap = await getDoc(walletDocRef);

        if (walletDocSnap.exists()) {
            return walletDocSnap.data().balance || 0;
        } else {
            console.log("Wallet document not found for user:", userId, "Creating wallet with 0 balance.");
            // Create the wallet document if it doesn't exist
            await setDoc(walletDocRef, {
                userId: userId, // Optional: store userId inside doc too
                balance: 0,
                lastUpdated: serverTimestamp()
            });
            return 0; // Return 0 balance for the newly created wallet
        }
    } catch (error) {
        console.error("Error fetching/creating wallet balance:", error);
        throw new Error("Could not fetch or initialize wallet balance.");
    }
}

/**
 * Asynchronously adds funds to the Zet Pay Wallet from a linked bank account.
 * SIMULATED: Assumes payment from funding source is successful. Updates balance atomically.
 *
 * @param userId The ID of the user whose wallet is being topped up.
 * @param amount The amount to add.
 * @param fundingSourceInfo Information about the funding source (e.g., Bank UPI ID).
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function topUpWallet(userId: string, amount: number, fundingSourceInfo: string): Promise<boolean> {
    if (!userId || amount <= 0) throw new Error("Invalid user ID or amount for wallet top-up.");
    console.log(`Attempting to top up wallet for user ${userId} with ₹${amount} from ${fundingSourceInfo}`);

    // TODO: In a real app:
    // 1. Initiate debit from the fundingSourceInfo (e.g., UPI collect/debit).
    // 2. Wait for successful confirmation of debit.
    // 3. ONLY THEN proceed to credit the wallet (ideally triggered by webhook/callback).
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate external payment processing

    try {
        const walletDocRef = doc(db, 'wallets', userId);

        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (walletDoc.exists()) {
                currentBalance = walletDoc.data().balance || 0;
            }
            const newBalance = currentBalance + amount;

            // Use set with merge: true to create or update
            transaction.set(walletDocRef, {
                balance: newBalance,
                lastUpdated: serverTimestamp()
            }, { merge: true });
        });

        // Log successful top-up transaction
        await addTransaction({
             type: 'Wallet Top-up', // Use specific type
             name: 'Wallet Top-up',
             description: `Added from ${fundingSourceInfo}`,
             amount: amount, // Positive amount
             status: 'Completed',
             userId: userId,
         });

        console.log(`Wallet for user ${userId} topped up successfully. New balance calculated.`);
        return true;

    } catch (error) {
        console.error("Error topping up wallet:", error);
        throw new Error("Failed to top up wallet balance."); // Throw specific error
    }
}


/**
 * Asynchronously processes a payment directly from the Zet Pay Wallet using Firestore transaction.
 *
 * @param userId The ID of the user making the payment.
 * @param recipientIdentifier Recipient's UPI ID, mobile number, etc. (for logging purposes).
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
        const transactionId = `TXN_WALLET_${Date.now()}`;

        await runTransaction(db, async (firestoreTransaction) => {
            const walletDoc = await firestoreTransaction.get(walletDocRef);

            if (!walletDoc.exists()) {
                throw new Error("Wallet not found.");
            }

            const currentBalance = walletDoc.data()?.balance || 0;
            if (currentBalance < amount) {
                throw new Error("Insufficient wallet balance.");
            }

            const newBalance = currentBalance - amount;

            // Update wallet balance within the Firestore transaction
            firestoreTransaction.update(walletDocRef, {
                balance: newBalance,
                lastUpdated: serverTimestamp()
            });

            // TODO: In a real system, after the transaction commits successfully,
            // trigger the actual fund transfer to the recipientIdentifier.
            // If that transfer fails, a refund/reversal process for the wallet debit is needed.
        });

        // Log successful payment transaction AFTER Firestore transaction commits
        await addTransaction({
            type: 'Sent',
            name: recipientIdentifier,
            description: `Paid via Wallet ${note ? `- ${note}` : ''}`,
            amount: -amount,
            status: 'Completed',
            userId: userId,
            upiId: recipientIdentifier.includes('@') ? recipientIdentifier : undefined,
        });

        console.log(`Wallet payment successful for user ${userId}.`);
        return { success: true, transactionId: transactionId, message: "Payment Successful via Wallet" };

    } catch (error: any) {
        console.error("Error processing wallet payment:", error);
        // Attempt to log failed transaction
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
