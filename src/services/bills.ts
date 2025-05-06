
/**
 * @fileOverview Service functions for processing bill payments.
 */

import type { Transaction } from './types'; // Use the common Transaction interface
// Removed incorrect import of addTransaction from client-side
import { apiClient } from '@/lib/apiClient';
import { format } from 'date-fns';

export interface BillPaymentDetails {
    billerId: string;
    identifier: string; // Consumer number, Policy number, etc.
    amount: number;
    billerType: string; // Electricity, Water, Insurance etc.
    billerName?: string; // Optional: For display/confirmation
    // paymentMethod?: 'wallet' | 'upi' | 'card'; // Optional: If client wants to suggest a method
}

/**
 * Fetches the outstanding bill details from the backend API.
 * The backend handles the actual interaction with BBPS or biller APIs.
 *
 * @param billerId Biller ID from BBPS or aggregator.
 * @param identifier Consumer number, account ID, policy number, etc.
 * @returns A promise that resolves to bill details (amount, dueDate, etc.) or null if not found.
 */
export async function fetchBillDetails(billerId: string, identifier: string): Promise<{ amount: number | null; dueDate?: Date | null; consumerName?: string } | null> {
    console.log(`[Client Service] Fetching bill details via API for Biller: ${billerId}, Identifier: ${identifier}`);
    const endpoint = `/bills/${billerId}/details?identifier=${encodeURIComponent(identifier)}`; // Assuming endpoint structure

    try {
        // Type assertion for the expected API response structure
        const result = await apiClient<{ success: boolean; message?: string; amount?: number; dueDate?: string; consumerName?: string }>(endpoint);

        if (result.success && result.amount !== undefined) {
            return {
                amount: result.amount,
                dueDate: result.dueDate ? new Date(result.dueDate) : null,
                consumerName: result.consumerName
            };
        } else {
            // Handle cases where API indicates success: false or amount is missing
            console.log(`[Client Service] Bill details not found or fetch failed: ${result.message || 'No amount returned.'}`);
            return { amount: null, dueDate: null, consumerName: undefined }; // Return null amount to indicate manual entry needed
        }
    } catch (error: any) {
        console.error(`Error fetching bill details for ${billerId} via API:`, error);
        throw error; // Re-throw error to be caught by UI
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
    // Endpoint includes type, e.g., /api/bills/electricity
    const endpoint = `/bills/pay/${paymentDetails.billerType.toLowerCase().replace(/\s+/g, '-')}`;

    try {
        // Backend API handles payment deduction and logging
        const resultTransaction = await apiClient<Transaction>(endpoint, {
            method: 'POST',
            body: JSON.stringify(paymentDetails),
        });
        console.log("Bill Payment API response (Transaction):", resultTransaction);

        // Convert date string from API response to Date object
        return {
            ...resultTransaction,
            date: new Date(resultTransaction.date),
             avatarSeed: resultTransaction.avatarSeed || resultTransaction.name?.toLowerCase().replace(/\s+/g, '') || resultTransaction.id,
        };
    } catch (error: any) {
         console.error("Error processing bill payment via API:", error);
         throw error; // Re-throw the error for UI handling
    }
}

