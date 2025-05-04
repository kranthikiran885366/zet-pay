
/**
 * @fileOverview Service functions for managing UPI linked accounts and processing payments.
 * Note: Actual UPI functionality (linking, balance check, payments) requires integration
 * with NPCI libraries and a licensed PSP partner. This service simulates these interactions.
 */
import { db, auth } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    limit,
    runTransaction,
    orderBy,
    Timestamp // Import Timestamp
} from 'firebase/firestore';
import { Transaction, addTransaction } from './transactions'; // Import Transaction interface and addTransaction
import { getUserProfileById, UserProfile } from './user'; // To check KYC and feature status
import { getWalletBalance, payViaWallet, WalletTransactionResult } from './wallet'; // Import wallet functions
import { scheduleRecovery } from './recovery'; // Import recovery scheduling function
import { format, addBusinessDays } from 'date-fns';

export interface BankAccount {
  id?: string; // Firestore document ID
  bankName: string;
  accountNumber: string; // Masked number
  upiId: string; // Generated/linked UPI ID
  userId: string; // Link to the user
  isDefault?: boolean;
  pinLength?: 4 | 6;
  // Add other fields like account type (savings/current) if needed
}

export interface UpiTransactionResult {
  transactionId?: string;
  amount: number;
  recipientUpiId: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'FallbackSuccess'; // Added FallbackSuccess
  message?: string;
  usedWalletFallback?: boolean;
  walletTransactionId?: string;
  ticketId?: string;
  refundEta?: string;
}

/**
 * Asynchronously links a bank account for UPI transactions.
 * In a real app, this involves complex flows like fetching accounts from NPCI, SMS verification etc.
 * This simulation adds the account to the user's subcollection in Firestore.
 *
 * @param bankDetails Details of the bank account to link (excluding id, userId, isDefault, upiId).
 * @returns A promise that resolves to the newly linked BankAccount object.
 * @throws Error if the user is not logged in or linking fails.
 */
export async function linkBankAccount(bankDetails: Omit<BankAccount, 'id' | 'userId' | 'isDefault' | 'upiId' | 'pinLength'>): Promise<BankAccount> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in to link an account.");
    const userId = currentUser.uid;

    console.log("Linking bank account for user:", userId, bankDetails);
    // Simulate UPI ID generation (replace with actual generation logic)
    const handle = bankDetails.accountNumber.slice(-4); // Simple handle based on last 4 digits
    const bankDomain = bankDetails.bankName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 5); // Simple domain guess
    const generatedUpiId = `${handle}@ok${bankDomain}`;
    const pinLength = Math.random() > 0.5 ? 6 : 4; // Simulate PIN length

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');

        // Check if this is the first account being linked for the user
        const q = query(accountsColRef, limit(1));
        const existingAccountsSnap = await getDocs(q);
        const isFirstAccount = existingAccountsSnap.empty;

        const accountData: Omit<BankAccount, 'id'> = {
            ...bankDetails,
            userId,
            upiId: generatedUpiId, // Use generated ID
            isDefault: isFirstAccount, // Make the first account default
            pinLength: pinLength,
        };

        const docRef = await addDoc(accountsColRef, accountData);
        console.log("Bank account linked successfully with ID:", docRef.id);
        return { id: docRef.id, ...accountData };

    } catch (error) {
        console.error("Error linking bank account:", error);
        throw new Error("Could not link bank account.");
    }
}

/**
 * Asynchronously retrieves linked bank accounts for the current user from Firestore.
 * @returns A promise that resolves to an array of BankAccount objects.
 */
export async function getLinkedAccounts(): Promise<BankAccount[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to get linked accounts.");
        return [];
    }
    const userId = currentUser.uid;
    console.log(`Fetching linked accounts for user ${userId}`);

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        // Optionally order by isDefault descending to get the primary first
        const q = query(accountsColRef, orderBy('isDefault', 'desc'));
        const querySnapshot = await getDocs(q);

        const accounts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as BankAccount));
        console.log(`Fetched ${accounts.length} linked accounts.`);
        return accounts;

    } catch (error) {
        console.error("Error fetching linked accounts:", error);
        throw new Error("Could not fetch linked accounts.");
    }
}

/**
 * Asynchronously removes a UPI ID / linked account from Firestore.
 * Ensures the default account cannot be removed unless it's the only one.
 * @param upiId The UPI ID associated with the account to remove.
 * @returns A promise that resolves when removal is complete.
 * @throws Error if removal fails or is not allowed.
 */
export async function removeUpiId(upiId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;
    console.log(`Removing UPI ID: ${upiId} for user ${userId}`);

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const accountSnapshot = await getDocs(q);

        if (accountSnapshot.empty) {
            throw new Error("UPI ID not found.");
        }

        const accountDoc = accountSnapshot.docs[0];
        const accountData = accountDoc.data() as BankAccount;

        if (accountData.isDefault) {
            // Check if there are other accounts
            const allAccountsSnap = await getDocs(collection(db, 'users', userId, 'linkedAccounts'));
            if (allAccountsSnap.size <= 1) {
                throw new Error("Cannot remove the only linked account.");
            }
            throw new Error("Cannot remove the default account. Please set another account as default first.");
        }

        await deleteDoc(doc(db, 'users', userId, 'linkedAccounts', accountDoc.id));
        console.log(`UPI ID ${upiId} removed successfully.`);

    } catch (error: any) {
        console.error("Error removing UPI ID:", error);
        throw new Error(error.message || "Could not remove UPI ID.");
    }
}

/**
 * Asynchronously sets a UPI ID as the default/primary account in Firestore.
 * Ensures only one account is marked as default.
 * @param upiId The UPI ID to set as default.
 * @returns A promise that resolves when the update is complete.
 * @throws Error if the UPI ID is not found or the update fails.
 */
export async function setDefaultAccount(upiId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;
    console.log(`Setting ${upiId} as default for user ${userId}`);

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        const batch = writeBatch(db);

        // Find the new default account
        const newDefaultQuery = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const newDefaultSnap = await getDocs(newDefaultQuery);
        if (newDefaultSnap.empty) {
            throw new Error("Selected UPI ID not found.");
        }
        const newDefaultDocRef = doc(db, 'users', userId, 'linkedAccounts', newDefaultSnap.docs[0].id);

        // Find the current default account (if any)
        const currentDefaultQuery = query(accountsColRef, where('isDefault', '==', true), limit(1));
        const currentDefaultSnap = await getDocs(currentDefaultQuery);

        // Unset the current default (if it exists and is different from the new one)
        if (!currentDefaultSnap.empty) {
            const currentDefaultDocRef = doc(db, 'users', userId, 'linkedAccounts', currentDefaultSnap.docs[0].id);
            if (currentDefaultDocRef.id !== newDefaultDocRef.id) {
                batch.update(currentDefaultDocRef, { isDefault: false });
            }
        }

        // Set the new default account
        batch.update(newDefaultDocRef, { isDefault: true });

        await batch.commit();
        console.log(`${upiId} set as default successfully.`);

    } catch (error) {
        console.error("Error setting default account:", error);
        throw new Error("Could not set default account.");
    }
}


/**
 * Asynchronously checks the balance of a linked bank account using UPI.
 * Requires UPI PIN authentication in a real app. THIS IS A SIMULATION.
 *
 * @param upiId The UPI ID of the bank account.
 * @param pin The UPI PIN (for simulation, not used securely here).
 * @returns A promise that resolves to the account balance.
 * @throws Error if balance check fails (e.g., invalid PIN, network issue).
 */
export async function checkBalance(upiId: string, pin?: string): Promise<number> {
  console.log(`Checking balance for ${upiId} (PIN simulation: ${pin ? 'Provided' : 'Not Provided'})`);
  // TODO: Implement actual secure balance check flow via UPI SDK/API.
  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate delay

    // Fetch account details to check PIN length (simulation)
    const accounts = await getLinkedAccounts();
    const account = accounts.find(acc => acc.upiId === upiId);
    const expectedPinLength = account?.pinLength;

    if (!pin) {
        throw new Error("UPI PIN required for balance check.");
    }
    if (expectedPinLength && pin.length !== expectedPinLength) {
        throw new Error(`Invalid PIN length. Expected ${expectedPinLength} digits.`);
    }
     if (!expectedPinLength && pin.length !== 4 && pin.length !== 6) {
         throw new Error("Invalid PIN length. Please enter 4 or 6 digits.");
     }

    // Simulate success/failure based on PIN pattern for demo
    if ((expectedPinLength === 4 && pin === '1234') || (expectedPinLength === 6 && pin === '123456') || (!expectedPinLength && (pin ==='1234' || pin === '123456'))) {
        return parseFloat((Math.random() * 50000).toFixed(2)); // Simulate random balance
    } else {
        throw new Error("Balance check failed. Invalid PIN or temporary issue.");
    }
}

/**
 * Asynchronously verifies a UPI ID with the bank/NPCI. SIMULATED.
 * @param upiId The UPI ID to verify.
 * @returns A promise that resolves to the registered name of the UPI ID holder.
 * @throws Error if verification fails or UPI ID is invalid.
 */
export async function verifyUpiId(upiId: string): Promise<string> {
    console.log(`Verifying UPI ID: ${upiId}`);
    // TODO: Implement actual UPI ID verification API call.
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

    if (upiId === 'limit@payfriend') return "Limit Exceeded User";
    if (upiId === 'debitfail@payfriend') return "Debit Fail User";
    if (upiId.includes('invalid') || !upiId.includes('@')) {
        throw new Error("Invalid UPI ID format or ID not found.");
    }
    const namePart = upiId.split('@')[0].replace(/[._]/g, ' ');
    const verifiedName = namePart
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    return verifiedName || "Verified User";
}


/**
 * Asynchronously processes a UPI payment. SIMULATED.
 * Attempts fallback via wallet if UPI limit is exceeded (Smart Wallet Bridge).
 * Logs transaction to Firestore.
 *
 * @param recipientUpiId The UPI ID of the recipient.
 * @param amount The amount to transfer.
 * @param pin The UPI PIN for authentication (required for simulation).
 * @param note An optional transaction note/description.
 * @param userId The ID of the user making the payment.
 * @param sourceAccountUpiId The specific UPI ID to use for payment.
 * @returns A promise that resolves to a UpiTransactionResult object.
 */
export async function processUpiPayment(
  recipientUpiId: string,
  amount: number,
  pin: string,
  note?: string,
  userId?: string,
  sourceAccountUpiId?: string
): Promise<UpiTransactionResult> {
    const currentUser = auth.currentUser;
    const finalUserId = userId || currentUser?.uid; // Ensure we have a user ID

    if (!finalUserId) {
         // This should ideally not happen if called from UI where user is logged in
         console.error("UPI Payment attempted without User ID!");
         return {
             amount, recipientUpiId, status: 'Failed', message: 'User session error.', usedWalletFallback: false
         };
    }
    if (!sourceAccountUpiId) {
         return { amount, recipientUpiId, status: 'Failed', message: 'Source account UPI ID missing.', usedWalletFallback: false };
    }

    console.log(`Processing UPI payment to ${recipientUpiId} from ${sourceAccountUpiId}, Amount: ${amount}, Note: ${note || 'N/A'} (PIN: ****)`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate UPI API delay

    let upiFailedDueToLimit = false;
    let upiFailedDueToBankDown = false;
    let upiFailureMessage = 'Payment failed.';
    let mightBeDebited = false;

    // Fetch source account details for PIN check (simulation)
    const accounts = await getLinkedAccounts(); // Ideally fetch only the source account
    const sourceAccount = accounts.find(acc => acc.upiId === sourceAccountUpiId);
    const expectedPinLength = sourceAccount?.pinLength;

    // Simulate various UPI outcomes
    try {
        const bankStatus = await getBankStatus(sourceAccountUpiId.split('@')[1]); // Get bank status
        if (bankStatus === 'Down') {
            upiFailedDueToBankDown = true;
            upiFailureMessage = 'Bank server is currently down. Please try later.';
            throw new Error(upiFailureMessage);
        }

         if (!pin) {
            throw new Error("UPI PIN is required.");
        }
        if (expectedPinLength && pin.length !== expectedPinLength) {
            throw new Error(`Incorrect UPI PIN length. Expected ${expectedPinLength} digits.`);
        }
        if (!expectedPinLength && pin.length !== 4 && pin.length !== 6) {
            throw new Error("Incorrect UPI PIN length. Enter 4 or 6 digits.");
        }
        // Simple PIN check for demo
        if ((expectedPinLength === 4 && pin !== '1234') || (expectedPinLength === 6 && pin !== '123456') || (!expectedPinLength && pin !== '1234' && pin !== '123456')) {
            throw new Error("Incorrect UPI PIN entered.");
        }

        if (recipientUpiId === 'limit@payfriend') {
            upiFailedDueToLimit = true;
            upiFailureMessage = 'UPI daily limit exceeded.';
            throw new Error(upiFailureMessage);
        }
        if (recipientUpiId === 'debitfail@payfriend') {
            mightBeDebited = true;
            upiFailureMessage = 'Payment failed due to network error at bank. Money may be debited.';
            throw new Error(upiFailureMessage);
        }
        if (amount > 10000) { // Simulate insufficient balance
            throw new Error('Insufficient bank balance.');
        }
        if (recipientUpiId.includes('invalid')) {
            throw new Error('Invalid recipient UPI ID.');
        }

        // --- UPI Success Case ---
        const transactionId = `TXN_UPI_${Date.now()}`;
        await addTransaction({
            type: 'Sent',
            name: await verifyUpiId(recipientUpiId), // Get name for history
            description: `Paid via UPI ${note ? `- ${note}` : ''}`,
            amount: -amount,
            status: 'Completed',
            userId: finalUserId,
            upiId: recipientUpiId,
        });
        return { transactionId, amount, recipientUpiId, status: 'Completed', message: 'Transaction Successful', usedWalletFallback: false };

    } catch (upiError: any) {
        console.warn("UPI Payment failed:", upiError.message);
        upiFailureMessage = upiError.message || upiFailureMessage;

        // --- Smart Wallet Bridge Logic ---
        if (upiFailedDueToLimit) {
            console.log("UPI limit exceeded, attempting Wallet Fallback...");
            try {
                const userProfile = await getUserProfileById(finalUserId);
                if (!userProfile || userProfile.kycStatus !== 'Verified' || !userProfile.isSmartWalletBridgeEnabled) {
                    console.log("Wallet Fallback disabled or unavailable for user.");
                    throw new Error(upiFailureMessage); // Re-throw original UPI error
                }
                 const fallbackLimit = userProfile.smartWalletBridgeLimit || 0;
                 if (amount > fallbackLimit) {
                     console.log(`Amount ${amount} exceeds wallet fallback limit ${fallbackLimit}`);
                     throw new Error(`${upiFailureMessage} Wallet fallback limit exceeded (₹${fallbackLimit}).`);
                 }

                const walletBalance = await getWalletBalance(finalUserId);
                if (walletBalance < amount) {
                    console.log(`Insufficient wallet balance (${walletBalance}) for fallback amount (${amount}).`);
                    throw new Error(`${upiFailureMessage} Insufficient wallet balance for fallback.`);
                }

                const walletPaymentResult = await payViaWallet(finalUserId, recipientUpiId, amount, `Wallet Fallback: ${note || ''}`);

                if (walletPaymentResult.success) {
                    console.log("Payment successful via Wallet Fallback!");
                    const recoveryScheduled = await scheduleRecovery(finalUserId, amount, recipientUpiId, sourceAccountUpiId);
                    if (!recoveryScheduled) console.error("CRITICAL: Failed to schedule wallet recovery!");

                    return {
                        walletTransactionId: walletPaymentResult.transactionId,
                        amount, recipientUpiId, status: 'FallbackSuccess',
                        message: `Paid via Wallet (UPI Limit Exceeded). Recovery scheduled.`,
                        usedWalletFallback: true,
                    };
                } else {
                    throw new Error(`${upiFailureMessage} Wallet fallback also failed: ${walletPaymentResult.message}`);
                }
            } catch (fallbackError: any) {
                console.error("Wallet Fallback process failed:", fallbackError.message);
                 upiFailureMessage = fallbackError.message || upiFailureMessage; // Use fallback error if more specific
                // Continue to final failure handling below
            }
        } // --- End Smart Wallet Bridge Logic ---

        // --- Final Failure Handling ---
        const failedTxnId = `TXN_UPI_FAILED_${Date.now()}`;
        let ticketDetails: { ticketId?: string; refundEta?: string } = {};

        if (mightBeDebited) {
            ticketDetails.ticketId = `ZET_TKT_${Date.now()}`;
            ticketDetails.refundEta = `Expected refund by ${format(addBusinessDays(new Date(), 3), 'PPP')}`;
            console.log(`Generating ticket ${ticketDetails.ticketId} for potentially debited failed transaction.`);
        }

        // Log failed transaction regardless of reason
        await addTransaction({
            type: 'Failed',
            name: await verifyUpiId(recipientUpiId).catch(() => recipientUpiId), // Get name if possible
            description: `UPI Payment Failed - ${upiFailureMessage}`,
            amount: -amount,
            status: 'Failed',
            userId: finalUserId,
            upiId: recipientUpiId,
            ticketId: ticketDetails.ticketId, // Add ticket info if generated
            refundEta: ticketDetails.refundEta,
        });

        return {
            transactionId: failedTxnId,
            amount, recipientUpiId, status: 'Failed',
            message: upiFailureMessage,
            usedWalletFallback: false,
            ...ticketDetails, // Add ticket details to result
        };
    }
}

/**
 * Simulates fetching the status of a bank's UPI server.
 * @param bankIdentifier A unique identifier for the bank (e.g., the handle like 'oksbi', 'okhdfcbank').
 * @returns A promise resolving to the status: 'Active', 'Slow', or 'Down'.
 */
export async function getBankStatus(bankIdentifier: string): Promise<'Active' | 'Slow' | 'Down'> {
    console.log(`Checking server status for bank: ${bankIdentifier}`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate short delay
    if (bankIdentifier === 'okicici') return 'Down';
    if (bankIdentifier === 'okhdfcbank') return 'Slow';
    return 'Active';
}
