
import { db, auth } from '@/lib/firebase'; // Import Firebase instances
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { addTransaction } from '@/services/transactionLogger'; // Use centralized logger
import { sendToUser } from '@/lib/websocket'; // Import WebSocket sender
import type { Transaction } from './types'; // For internal logging if needed

// Define the expected result structure from the backend API
export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string; // The ID of the transaction record created by the backend
    newBalance?: number; // Optionally returned by the backend after update
    message?: string;
}


/**
 * Asynchronously retrieves the current user's Zet Pay Wallet balance from Firestore.
 * Creates a default wallet document if none exists.
 *
 * @param userId The ID of the user.
 * @returns A promise that resolves to the wallet balance number.
 * @throws Error if the Firestore operation fails.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    if (!userId) throw new Error("User ID required to get wallet balance.");
    console.log(`Fetching wallet balance from Firestore for user: ${userId}`);

    try {
        const walletDocRef = doc(db, 'wallets', userId); // Reference Firestore document
        const walletDocSnap = await getDoc(walletDocRef);

        if (walletDocSnap.exists()) {
            return Number(walletDocSnap.data().balance) || 0;
        } else {
            // Wallet doesn't exist, create it with 0 balance
            console.log(`Wallet not found for user ${userId}, creating...`);
            await setDoc(walletDocRef, {
                userId: userId,
                balance: 0,
                lastUpdated: serverTimestamp() // Use Firestore server timestamp
            });
            return 0;
        }
    } catch (error) {
        console.error("Error fetching/creating wallet balance:", error);
        throw new Error("Could not fetch wallet balance.");
    }
}

/**
 * Asynchronously adds funds to the Zet Pay Wallet in Firestore.
 * Assumes payment from funding source is already verified/processed.
 * Logs the transaction and sends real-time updates.
 *
 * @param userId The ID of the user.
 * @param amount The amount to add.
 * @param fundingSourceInfo Information about the funding source for logging.
 * @returns A promise resolving to an object indicating success and potentially the new balance and transaction ID.
 */
export async function topUpWallet(userId: string, amount: number, fundingSourceInfo: string): Promise<WalletTransactionResult> {
     console.log(`Attempting wallet top-up in Firestore for user ${userId} with ₹${amount} from ${fundingSourceInfo}`);

     if (amount <= 0) {
        return { success: false, message: "Invalid top-up amount." };
     }

     const walletDocRef = doc(db, 'wallets', userId);
     let newBalance = 0;
     let loggedTxId: string | undefined;

     try {
         // Atomically update wallet balance
         await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (!walletDoc.exists()) {
                console.warn(`Wallet for user ${userId} not found during top-up, creating...`);
                // Wallet will be created implicitly by the set/update below if needed
            } else {
                currentBalance = walletDoc.data().balance || 0;
            }
            newBalance = Number(currentBalance) + amount;

            const updateData = {
                 userId: userId, // Ensure userId is set if creating
                 balance: newBalance,
                 lastUpdated: serverTimestamp()
            };

             // Use set with merge: true if creating, or update if exists
             if (!walletDoc.exists()) {
                  transaction.set(walletDocRef, updateData );
             } else {
                  transaction.update(walletDocRef, updateData);
             }
         });

         // Log successful top-up transaction using backend logger
         const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
              type: 'Wallet Top-up',
              name: 'Wallet Top-up',
              description: `Added from ${fundingSourceInfo}`,
              amount: amount, // Positive amount
              status: 'Completed',
              userId: userId,
          };
         const loggedTx = await addTransaction(logData); // Use backend logger
         loggedTxId = loggedTx.id;

         // Send real-time balance update via WebSocket (backend function)
         sendToUser(userId, { type: 'balance_update', payload: { balance: newBalance }});

         // Blockchain log handled by addTransaction if configured

         return { success: true, newBalance, message: 'Wallet topped up successfully.', transactionId: loggedTxId };

     } catch (error: any) {
         console.error("Error topping up wallet:", error);
         return { success: false, message: error.message || "Failed to process top-up." };
     }
}


/**
 * Asynchronously processes a payment directly from the Zet Pay Wallet (Firestore operation).
 * Handles balance check, deduction, and transaction logging.
 *
 * @param userId The ID of the user making the payment.
 * @param recipientIdentifier Recipient's UPI ID, mobile number, etc.
 * @param amount The amount to pay (must be positive).
 * @param note Optional payment note.
 * @returns A promise resolving to a WalletTransactionResult.
 */
export async function payViaWallet(
    userId: string,
    recipientIdentifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
     console.log(`Attempting wallet payment from Firestore for user ${userId} of ₹${amount} to ${recipientIdentifier}`);

     if (amount <= 0 || !recipientIdentifier) {
         return { success: false, message: "Invalid parameters for wallet payment." };
     }

    const walletDocRef = doc(db, 'wallets', userId);
    let newBalance = 0;
    let loggedTxId: string | undefined;


     try {
        // Atomically check balance and deduct
         await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            if (!walletDoc.exists()) {
                throw new Error("Wallet not found.");
            }
            const currentBalance = walletDoc.data()?.balance || 0;
            if (currentBalance < amount) {
                 throw new Error(`Insufficient wallet balance (Available: ₹${currentBalance.toFixed(2)}).`);
            }

            newBalance = Number(currentBalance) - amount;

            transaction.update(walletDocRef, {
                 balance: newBalance,
                 lastUpdated: serverTimestamp()
            });
         });

        // Log successful payment transaction
         const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: 'Sent',
             name: recipientIdentifier, // Use recipient as name for payment
             description: `Paid via Wallet ${note ? `- ${note}` : ''}`,
             amount: -amount, // Negative for payment sent
             status: 'Completed',
             userId: userId,
             upiId: recipientIdentifier.includes('@') ? recipientIdentifier : undefined, // Store if it's a UPI ID
             paymentMethodUsed: 'Wallet',
         };
         const loggedTx = await addTransaction(logData);
         loggedTxId = loggedTx.id;

         // Send real-time balance update via WebSocket
         sendToUser(userId, { type: 'balance_update', payload: { balance: newBalance }});

         return { success: true, newBalance, message: 'Payment successful via Wallet.', transactionId: loggedTxId };

     } catch (error: any) {
         console.error("Error processing wallet payment:", error);
          // Log failed attempt? Maybe not, as balance wasn't deducted.
         return { success: false, message: error.message || "Failed to process wallet payment." };
     }
}


/**
 * Internal helper function used by other services/controllers for direct wallet debit/credit.
 * Handles logging and real-time updates.
 * IMPORTANT: Negative amount signifies a CREDIT to the wallet (like a top-up/refund).
 * This function is now the primary internal logic used by controllers.
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
    const walletDocRef = doc(db, 'wallets', userId);
    let newBalance = 0;
    let transactionId: string | undefined;
    const isCredit = amount < 0;
    const absoluteAmount = Math.abs(amount);

    try {
        await runTransaction(db, async (transaction) => {
             const walletDoc = await transaction.get(walletDocRef);
             let currentBalance = 0;
              if (!walletDoc.exists()) {
                 // Wallet needs to exist for debits, but can be created for credits
                 if (!isCredit) throw new Error("Wallet not found.");
                 console.warn(`Wallet for user ${userId} not found, creating for credit...`);
             } else {
                 currentBalance = walletDoc.data()?.balance || 0;
             }

              if (!isCredit && currentBalance < absoluteAmount) {
                 throw new Error("Insufficient wallet balance.");
             }
             // If it's a credit (amount is negative), add the absolute amount.
             // If it's a debit (amount is positive), subtract the amount.
             newBalance = isCredit ? currentBalance + absoluteAmount : currentBalance - absoluteAmount;

             const updateData = {
                 userId: userId, // Ensure userId is set if creating
                 balance: newBalance,
                 lastUpdated: serverTimestamp()
             };

             // Use set with merge: true if creating, or update if exists
             if (!walletDoc.exists()) {
                  transaction.set(walletDocRef, updateData);
             } else {
                  transaction.update(walletDocRef, updateData);
             }
         });

         // Log successful transaction
         const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             // Determine type based on operation
             type: isCredit ? 'Received' : 'Sent',
             name: identifier, // Use identifier (e.g., 'WALLET_RECOVERY_CREDIT', 'merchant_upi@ok')
             description: `${isCredit ? 'Credited via Wallet' : 'Paid via Wallet'} ${note ? `- ${note}` : ''}`,
             amount: amount, // Store the original amount (positive for debit, negative for credit)
             status: 'Completed',
             userId: userId,
             upiId: identifier.includes('@') ? identifier : undefined,
             paymentMethodUsed: 'Wallet', // Indicate payment method
         };
         const loggedTx = await addTransaction(logData);
         transactionId = loggedTx.id;

         // Send real-time balance update AFTER successful transaction
         sendToUser(userId, { type: 'balance_update', payload: { balance: newBalance }});

          // Log to blockchain (optional, non-blocking) - use absolute amount?
         // logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: absoluteAmount, date: new Date(), recipient: identifier }) ...

         return { success: true, transactionId, newBalance, message: `Internal wallet ${isCredit ? 'credit' : 'payment'} successful` };

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
          let loggedTxId;
          try {
             const failedTx = await addTransaction(failLogData);
             loggedTxId = failedTx.id;
          } catch (logError) {
              console.error("Failed to log failed internal wallet transaction:", logError);
          }
         // Send error update via WebSocket? Could be noisy.
         // sendToUser(userId, { type: 'payment_failed', payload: { recipientId, amount, reason: error.message } });
         return { success: false, transactionId: loggedTxId, message: error.message || `Internal wallet ${isCredit ? 'credit' : 'payment'} failed.` };
    }
}


    