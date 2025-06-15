
/**
 * @fileOverview Service functions for processing bill payments.
 */

import type { Transaction } from './types'; // Use the common Transaction interface
import { apiClient } from '@/lib/apiClient';
import { format } from 'date-fns';

export interface BillPaymentDetails {
    billerId: string;
    identifier: string; 
    amount: number;
    billerType: string; 
    billerName?: string; 
    paymentMethod?: 'wallet' | 'upi' | 'card'; 
    sourceAccountUpiId?: string; 
    pin?: string; 
    cardToken?: string; 
    cvv?: string; 
}

export interface FetchedBillDetails {
    amount: number | null;
    dueDate?: Date | null;
    consumerName?: string;
    minAmountDue?: number;
    status?: string; // e.g., 'DUE', 'PAID' from provider
}

/**
 * Fetches the outstanding bill details from the backend API.
 *
 * @param billerType The type of bill (e.g., 'electricity', 'mobile-postpaid').
 * @param billerId Biller ID from BBPS or aggregator.
 * @param identifier Consumer number, account ID, policy number, student ID etc.
 * @returns A promise that resolves to bill details or null if not found.
 */
export async function fetchBillDetails(type: string, billerId: string, identifier: string): Promise<FetchedBillDetails | null> {
    console.log(`[Client Service] Fetching bill details via API for Type: ${type}, Biller: ${billerId}, Identifier: ${identifier}`);
    const endpoint = `/bills/details/${type.toLowerCase().replace(/\s+/g, '-')}/${identifier}?billerId=${billerId}`;

    try {
        // The backend is expected to return an object that might look like:
        // { success: boolean, message?: string, amount?: number, dueDate?: string, consumerName?: string, minAmountDue?: number, status?: string }
        const result = await apiClient<{ success: boolean; message?: string; amount?: number; dueDate?: string; consumerName?: string; minAmountDue?: number; status?: string }>(endpoint);

        // Check if the backend indicates success OR if an amount is present (even if success might be implicitly true)
        // Also handle the case where amount is explicitly null for manual entry.
        if (result.success === true || (result.amount !== undefined)) {
            return {
                amount: result.amount === undefined ? null : result.amount,
                dueDate: result.dueDate ? new Date(result.dueDate) : null,
                consumerName: result.consumerName,
                minAmountDue: result.minAmountDue,
                status: result.status,
            };
        } else if (result.message?.toLowerCase().includes("manual entry")) {
             console.log(`[Client Service] Bill details not found for ${type}, ${billerId}, ${identifier}: ${result.message || 'Manual entry required.'}`);
             return { amount: null, dueDate: null, consumerName: undefined }; // Indicate manual entry needed
        }
         else {
            console.log(`[Client Service] Bill details fetch failed for ${type}, ${billerId}, ${identifier}: ${result.message || 'No amount returned.'}`);
            throw new Error(result.message || 'Failed to fetch bill details. It might be already paid or invalid.');
        }
    } catch (error: any) {
        console.error(`Error fetching bill details for type ${type}, Biller ${billerId}, ID ${identifier} via API:`, error);
        throw error;
    }
}


/**
 * Sends a bill payment request to the backend API.
 * The backend handles payment processing (UPI/Wallet/Card) and transaction logging.
 *
 * @param paymentDetails Details required for the bill payment.
 * @returns A promise that resolves to the final Transaction object returned by the backend.
 * @throws Error if the API call fails.
 */
export async function processBillPayment(paymentDetails: BillPaymentDetails): Promise<Transaction> {
    console.log("Processing bill payment via API:", paymentDetails);
    const apiType = paymentDetails.billerType.toLowerCase().replace(/\s+/g, '-');
    const endpoint = `/bills/pay/${apiType}`;

    try {
        const resultTransaction = await apiClient<Transaction>(endpoint, {
            method: 'POST',
            body: JSON.stringify(paymentDetails),
        });
        console.log("Bill Payment API response (Transaction):", resultTransaction);

        return {
            ...resultTransaction,
            date: new Date(resultTransaction.date),
            avatarSeed: resultTransaction.avatarSeed || resultTransaction.name?.toLowerCase().replace(/\s+/g, '') || resultTransaction.id,
            createdAt: resultTransaction.createdAt ? new Date(resultTransaction.createdAt as string) : undefined,
            updatedAt: resultTransaction.updatedAt ? new Date(resultTransaction.updatedAt as string) : undefined,
        };
    } catch (error: any) {
         console.error("Error processing bill payment via API:", error);
         throw error;
    }
}

