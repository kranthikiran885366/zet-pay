
/**
 * @fileOverview Service functions for managing UPI linked accounts and processing payments via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { BankAccount, UpiTransactionResult, Transaction } from './types'; // Import shared types, added Transaction
import { auth } from '@/lib/firebase'; // Keep for potential client-side user checks if needed
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp type for potential conversion

// Re-export types if components import them directly from here
export type { BankAccount, UpiTransactionResult };


/**
 * Asynchronously links a bank account for UPI transactions via the backend API.
 *
 * @param bankDetails Details of the bank account to link (e.g., bankName, accountNumber, accountType, ifsc).
 * @returns A promise that resolves to the newly linked BankAccount object returned by the backend.
 * @throws Error if the user is not logged in or linking fails.
 */
export async function linkBankAccount(bankDetails: { bankName: string; accountNumber: string; accountType: string; ifsc: string; }): Promise<BankAccount> {
    console.log("[Client Service] Linking bank account via API:", bankDetails);
    try {
        const linkedAccount = await apiClient<BankAccount>('/upi/accounts', {
            method: 'POST',
            body: JSON.stringify(bankDetails),
        });
        console.log("[Client Service] Bank account linked successfully via API:", linkedAccount);
        return {
            ...linkedAccount,
            createdAt: linkedAccount.createdAt && typeof linkedAccount.createdAt === 'string'
                       ? new Date(linkedAccount.createdAt)
                       : linkedAccount.createdAt as Date,
        };
    } catch (error) {
        console.error("[Client Service] Error linking bank account via API:", error);
        throw error;
    }
}


/**
 * Asynchronously retrieves linked bank accounts for the current user from the backend API.
 * @returns A promise that resolves to an array of BankAccount objects.
 */
export async function getLinkedAccounts(): Promise<BankAccount[]> {
    console.log(`[Client Service] Fetching linked accounts via API...`);
    try {
        const accounts = await apiClient<BankAccount[]>('/upi/accounts');
        console.log(`[Client Service] Fetched ${accounts.length} linked accounts via API.`);
         return accounts.map(acc => ({
            ...acc,
            createdAt: acc.createdAt && typeof acc.createdAt === 'string'
                       ? new Date(acc.createdAt)
                       : acc.createdAt as Date,
        }));
    } catch (error) {
        console.error("[Client Service] Error fetching linked accounts via API:", error);
        return [];
    }
}

/**
 * Asynchronously removes a UPI ID / linked account via the backend API.
 * @param upiId The UPI ID associated with the account to remove.
 * @returns A promise that resolves when removal is complete.
 * @throws Error if removal fails or is not allowed.
 */
export async function removeUpiId(upiId: string): Promise<void> {
    console.log(`[Client Service] Removing UPI ID via API: ${upiId}`);
    try {
        await apiClient<void>(`/upi/accounts/${encodeURIComponent(upiId)}`, {
            method: 'DELETE',
        });
        console.log(`[Client Service] UPI ID ${upiId} removed successfully via API.`);
    } catch (error: any) {
        console.error("[Client Service] Error removing UPI ID via API:", error);
        throw error;
    }
}

/**
 * Asynchronously sets a UPI ID as the default/primary account via the backend API.
 * @param upiId The UPI ID to set as default.
 * @returns A promise that resolves when the update is complete.
 * @throws Error if the UPI ID is not found or the update fails.
 */
export async function setDefaultAccount(upiId: string): Promise<void> {
    console.log(`[Client Service] Setting ${upiId} as default via API...`);
    try {
        await apiClient<void>('/upi/accounts/default', {
            method: 'PUT',
            body: JSON.stringify({ upiId }),
        });
        console.log(`[Client Service] ${upiId} set as default successfully via API.`);
    } catch (error) {
        console.error("[Client Service] Error setting default account via API:", error);
        throw error;
    }
}


/**
 * Asynchronously checks the balance of a linked bank account using the backend API.
 * Handles PIN entry securely via the backend (client sends PIN, backend makes call).
 *
 * @param upiId The UPI ID of the bank account.
 * @param pin The UPI PIN.
 * @returns A promise that resolves to the account balance number.
 * @throws Error if balance check fails.
 */
export async function checkBalance(upiId: string, pin: string): Promise<number> {
    console.log(`[Client Service] Checking balance via API for ${upiId} (PIN: ****)`);
    try {
        const response = await apiClient<{ balance: number }>('/upi/balance', {
            method: 'POST',
            body: JSON.stringify({ upiId, pin }),
        });
        return response.balance;
    } catch (error) {
        console.error(`[Client Service] Balance check failed via API for ${upiId}:`, error);
        throw error;
    }
}

/**
 * Asynchronously verifies a UPI ID using the backend API.
 * Backend now returns more details.
 * @param upiId The UPI ID to verify.
 * @returns A promise that resolves to an object with verification status and details.
 * @throws Error if the API call itself fails.
 */
export async function verifyUpiId(upiId: string): Promise<{
    verifiedName: string | null;
    isBlacklisted?: boolean;
    isVerifiedMerchant?: boolean;
    reason?: string;
}> {
    console.log(`[Client Service] Verifying UPI ID via API: ${upiId}`);
    try {
        const response = await apiClient<{
            verifiedName: string | null;
            isBlacklisted?: boolean;
            isVerifiedMerchant?: boolean;
            reason?: string;
        }>(`/upi/verify?upiId=${encodeURIComponent(upiId)}`);

        if (!response) {
             return { verifiedName: null, isBlacklisted: false, isVerifiedMerchant: false, reason: "Verification failed: Empty response from server." };
        }
        console.log("[Client Service] Verification result from API:", response);
        return response;
    } catch (error: any) {
        console.error("[Client Service] UPI ID Verification failed via API:", error);
         if (error.message?.includes('404')) {
            return { verifiedName: null, isBlacklisted: false, isVerifiedMerchant: false, reason: "UPI ID not found." };
         }
         return { verifiedName: null, isBlacklisted: false, isVerifiedMerchant: false, reason: `Verification failed: ${error.message}` };
    }
}


/**
 * Asynchronously processes a UPI payment via the backend API.
 * The backend handles PIN verification, payment execution, wallet fallback, transaction logging, and recovery scheduling.
 *
 * @param recipientIdentifier The UPI ID or Mobile Number of the recipient.
 * @param amount The amount to transfer.
 * @param pin The UPI PIN for authentication.
 * @param note An optional transaction note/description.
 * @param sourceAccountUpiId Optional: The specific UPI ID to use for payment.
 * @param stealthScan Optional: Flag indicating if the payment was initiated via stealth scan.
 * @param originatingScanLogId Optional: ID of the scan log if payment originated from a QR scan.
 * @returns A promise that resolves to a UpiTransactionResult object.
 */
export async function processUpiPayment(
  recipientIdentifier: string,
  amount: number,
  pin: string,
  note?: string,
  sourceAccountUpiId?: string,
  stealthScan?: boolean,
  originatingScanLogId?: string
): Promise<UpiTransactionResult> {
    console.log(`[Client Service] Processing UPI payment via API to ${recipientIdentifier} from ${sourceAccountUpiId || 'default account'}, Amount: ${amount}, Stealth: ${stealthScan}, ScanLog: ${originatingScanLogId}`);

    const payload = {
        recipientUpiId: recipientIdentifier,
        amount,
        pin,
        note: note || undefined,
        sourceAccountUpiId: sourceAccountUpiId || undefined,
        stealthScan: stealthScan || false,
        originatingScanLogId: originatingScanLogId || undefined,
    };

    try {
        const result = await apiClient<UpiTransactionResult>('/upi/pay', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        console.log("[Client Service] UPI Payment API result:", result);
        return result;
    } catch (error: any) {
        console.error("[Client Service] UPI Payment failed via API:", error);
        return {
            amount,
            recipientUpiId: recipientIdentifier,
            status: 'Failed',
            message: error.message || "Failed to process payment.",
            usedWalletFallback: false,
        };
    }
}

/**
 * Fetches the status of a bank's UPI server via the backend API.
 * @param bankIdentifier A unique identifier for the bank (e.g., the handle like 'oksbi').
 * @returns A promise resolving to the status: 'Active', 'Slow', or 'Down'.
 */
export async function getBankStatus(bankIdentifier: string): Promise<'Active' | 'Slow' | 'Down'> {
    console.log(`[Client Service] Checking server status via API for bank: ${bankIdentifier}`);
    try {
        const response = await apiClient<{ status: 'Active' | 'Slow' | 'Down' }>(`/banks/status/${encodeURIComponent(bankIdentifier)}`);
        return response.status;
    } catch (error) {
        console.error(`[Client Service] Error checking bank status via API for ${bankIdentifier}:`, error);
        return 'Active';
    }
}

/**
 * Sets or changes the UPI PIN for a linked account via the backend API.
 * @param upiId The UPI ID of the account.
 * @param newPin The new UPI PIN.
 * @param oldPin Optional: The old UPI PIN (required for changing, not for first time set).
 * @param bankAccountDetails Optional: Bank account details (like debit card last 6 digits, expiry) for first time PIN set or reset.
 * @returns A promise resolving to an object indicating success.
 */
export async function setUpiPin(
    upiId: string,
    newPin: string,
    oldPin?: string,
    bankAccountDetails?: { debitCardLast6: string; expiryMMYY: string }
): Promise<{ success: boolean; message?: string }> {
    console.log(`[Client Service] Setting/Changing UPI PIN via API for UPI ID: ${upiId}`);
    const payload = {
        upiId,
        newPin,
        oldPin: oldPin || undefined,
        bankAccountDetails: bankAccountDetails || undefined,
    };
    try {
        const result = await apiClient<{ success: boolean; message?: string }>('/upi/pin/set', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return result;
    } catch (error: any) {
        console.error("[Client Service] Error setting/changing UPI PIN via API:", error);
        throw error;
    }
}
