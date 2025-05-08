/**
 * @fileOverview Service functions for managing UPI linked accounts and processing payments via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { BankAccount, UpiTransactionResult, Transaction } from './types'; // Import shared types, added Transaction
import { auth } from '@/lib/firebase'; // Keep for potential client-side user checks if needed

// Re-export types if components import them directly from here
export type { BankAccount, UpiTransactionResult };


/**
 * Asynchronously links a bank account for UPI transactions via the backend API.
 *
 * @param bankDetails Details of the bank account to link (excluding id, userId, isDefault, upiId, pinLength).
 * @returns A promise that resolves to the newly linked BankAccount object returned by the backend.
 * @throws Error if the user is not logged in or linking fails.
 */
export async function linkBankAccount(bankDetails: Omit<BankAccount, 'id' | 'userId' | 'isDefault' | 'upiId' | 'pinLength'>): Promise<BankAccount> {
    console.log("Linking bank account via API:", bankDetails);
    try {
        const linkedAccount = await apiClient<BankAccount>('/upi/accounts', {
            method: 'POST',
            body: JSON.stringify(bankDetails),
        });
        console.log("Bank account linked successfully via API:", linkedAccount);
        // Convert createdAt string if needed
        if (linkedAccount.createdAt && typeof linkedAccount.createdAt === 'string') {
            linkedAccount.createdAt = new Date(linkedAccount.createdAt);
        }
        return linkedAccount;
    } catch (error) {
        console.error("Error linking bank account via API:", error);
        throw error; // Re-throw error caught by apiClient
    }
}


/**
 * Asynchronously retrieves linked bank accounts for the current user from the backend API.
 * @returns A promise that resolves to an array of BankAccount objects.
 */
export async function getLinkedAccounts(): Promise<BankAccount[]> {
    console.log(`Fetching linked accounts via API...`);
    try {
        const accounts = await apiClient<BankAccount[]>('/upi/accounts');
        console.log(`Fetched ${accounts.length} linked accounts via API.`);
         // Convert createdAt string if needed
         return accounts.map(acc => ({
            ...acc,
            createdAt: acc.createdAt && typeof acc.createdAt === 'string' ? new Date(acc.createdAt) : acc.createdAt
        }));
    } catch (error) {
        console.error("Error fetching linked accounts via API:", error);
        return []; // Return empty array on error
    }
}

/**
 * Asynchronously removes a UPI ID / linked account via the backend API.
 * @param upiId The UPI ID associated with the account to remove.
 * @returns A promise that resolves when removal is complete.
 * @throws Error if removal fails or is not allowed.
 */
export async function removeUpiId(upiId: string): Promise<void> {
    console.log(`Removing UPI ID via API: ${upiId}`);
    try {
        // Backend endpoint handles checks (e.g., cannot remove default)
        await apiClient<void>(`/upi/accounts/${encodeURIComponent(upiId)}`, { // Ensure UPI ID is encoded for URL
            method: 'DELETE',
        });
        console.log(`UPI ID ${upiId} removed successfully via API.`);
    } catch (error: any) {
        console.error("Error removing UPI ID via API:", error);
        throw error; // Re-throw error
    }
}

/**
 * Asynchronously sets a UPI ID as the default/primary account via the backend API.
 * @param upiId The UPI ID to set as default.
 * @returns A promise that resolves when the update is complete.
 * @throws Error if the UPI ID is not found or the update fails.
 */
export async function setDefaultAccount(upiId: string): Promise<void> {
    console.log(`Setting ${upiId} as default via API...`);
    try {
        await apiClient<void>('/upi/accounts/default', {
            method: 'PUT',
            body: JSON.stringify({ upiId }),
        });
        console.log(`${upiId} set as default successfully via API.`);
    } catch (error) {
        console.error("Error setting default account via API:", error);
        throw error; // Re-throw error
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
    console.log(`Checking balance via API for ${upiId} (PIN: ****)`);
    try {
        const response = await apiClient<{ balance: number }>('/upi/balance', {
            method: 'POST',
            body: JSON.stringify({ upiId, pin }),
        });
        return response.balance;
    } catch (error) {
        console.error(`Balance check failed via API for ${upiId}:`, error);
        throw error; // Re-throw error
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
    console.log(`Verifying UPI ID via API: ${upiId}`);
    try {
        const response = await apiClient<{
            verifiedName: string | null;
            isBlacklisted?: boolean;
            isVerifiedMerchant?: boolean; // Assuming backend adds this
            reason?: string;
        }>(`/upi/verify?upiId=${encodeURIComponent(upiId)}`);

        if (!response) { // Handle case where API might return empty success
             return { verifiedName: null, isBlacklisted: false, isVerifiedMerchant: false, reason: "Verification failed: Empty response from server." };
        }
        console.log("Verification result from API:", response);
        return response; // Return the full object
    } catch (error: any) {
        console.error("UPI ID Verification failed via API:", error);
         // If API client throws structured errors, handle 404 etc.
         if (error.message?.includes('404')) {
            return { verifiedName: null, isBlacklisted: false, isVerifiedMerchant: false, reason: "UPI ID not found." };
         }
        // Rethrow other errors or return a generic failure state
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
 * @returns A promise that resolves to a UpiTransactionResult object.
 */
export async function processUpiPayment(
  recipientIdentifier: string,
  amount: number,
  pin: string,
  note?: string,
  sourceAccountUpiId?: string
): Promise<UpiTransactionResult> {
    console.log(`Processing UPI payment via API to ${recipientIdentifier} from ${sourceAccountUpiId || 'default account'}, Amount: ${amount}`);

    const payload = {
        recipientUpiId: recipientIdentifier, // Backend expects this key
        amount,
        pin,
        note: note || undefined,
        sourceAccountUpiId: sourceAccountUpiId || undefined,
    };

    try {
        // Backend /upi/pay endpoint returns the UpiTransactionResult structure
        const result = await apiClient<UpiTransactionResult>('/upi/pay', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        console.log("UPI Payment API result:", result);
        return result;
    } catch (error: any) {
        console.error("UPI Payment failed via API:", error);
        // Return a standardized error format if API call fails fundamentally
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
    console.log(`Checking server status via API for bank: ${bankIdentifier}`);
    try {
        // Endpoint expects the identifier in the path
        const response = await apiClient<{ status: 'Active' | 'Slow' | 'Down' }>(`/banks/status/${encodeURIComponent(bankIdentifier)}`);
        return response.status;
    } catch (error) {
        console.error(`Error checking bank status via API for ${bankIdentifier}:`, error);
        return 'Active'; // Default to 'Active' on error to avoid blocking unnecessarily
    }
}

