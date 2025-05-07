
/**
 * @fileOverview Service functions for processing bill payments.
 */

import type { Transaction } from './types'; // Use the common Transaction interface
import { apiClient } from '@/lib/apiClient';
import { format } from 'date-fns';

export interface BillPaymentDetails {
    billerId: string;
    identifier: string; // Consumer number, Policy number, Student ID, etc.
    amount: number;
    billerType: string; // Electricity, Water, Insurance, Education etc.
    billerName?: string; // Optional: For display/confirmation
}

/**
 * Fetches the outstanding bill details from the backend API.
 * The backend handles the actual interaction with BBPS or biller APIs.
 *
 * @param billerId Biller ID from BBPS or aggregator.
 * @param identifier Consumer number, account ID, policy number, student ID etc.
 * @param billType The specific type of bill (e.g., 'electricity', 'education') for the API path.
 * @returns A promise that resolves to bill details (amount, dueDate, etc.) or null if not found.
 */
export async function fetchBillDetails(billerId: string, identifier: string, billType: string): Promise<{ amount: number | null; dueDate?: Date | null; consumerName?: string } | null> {
    console.log(`[Client Service] Fetching bill details via API for Type: ${billType}, Biller: ${billerId}, Identifier: ${identifier}`);
    // Use the :type/:identifier structure with billerId as query param
    const endpoint = `/bills/details/${billType.toLowerCase().replace(/\s+/g, '-')}/${encodeURIComponent(identifier)}?billerId=${encodeURIComponent(billerId)}`;

    try {
        const result = await apiClient<{ success: boolean; message?: string; amount?: number; dueDate?: string; consumerName?: string }>(endpoint);

        if (result.success && result.amount !== undefined) {
            return {
                amount: result.amount, // Can be null if manual entry is needed
                dueDate: result.dueDate ? new Date(result.dueDate) : null,
                consumerName: result.consumerName
            };
        } else {
            console.log(`[Client Service] Bill details not found or fetch failed for ${billType}: ${result.message || 'No amount returned.'}`);
            return { amount: null, dueDate: null, consumerName: undefined };
        }
    } catch (error: any) {
        console.error(`Error fetching bill details for ${billType} via API:`, error);
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
    // Ensure billerType is correctly formatted for the API endpoint
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
            createdAt: resultTransaction.createdAt ? new Date(resultTransaction.createdAt) : undefined,
            updatedAt: resultTransaction.updatedAt ? new Date(resultTransaction.updatedAt) : undefined,
        };
    } catch (error: any) {
         console.error("Error processing bill payment via API:", error);
         throw error;
    }
}
