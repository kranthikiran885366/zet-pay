/**
 * @fileOverview Service functions for processing bill payments.
 */

import type { Transaction } from './types'; // Use the common Transaction interface
import { apiClient } from '@/lib/apiClient';
import { format } from 'date-fns';
import { addTransaction } from '@/services/transactionLogger'; // Corrected: Import client-side logger

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
export async function fetchBillDetails(billerId: string, identifier: string): Promise<{ amount: number | null; dueDate?: Date | null; consumerName?: string } | null> {
    console.log(`[Client Service] Fetching bill details via API for Biller: ${billerId}, Identifier: ${identifier}`);
    // Backend needs to determine billType if not passed, or endpoint needs to accept it.
    // For this example, we'll assume a generic detail fetch endpoint that might infer type or accept it in query/body.
    // Let's assume a path like `/bills/details` and pass billerId/identifier as query params
    const endpoint = `/bills/details/${billerId}/${identifier}`; // Path format from billsRoutes.js

    try {
        const result = await apiClient<{ success: boolean; message?: string; amount?: number; dueDate?: string; consumerName?: string }>(endpoint);

        if (result.success && result.amount !== undefined) {
            return {
                amount: result.amount,
                dueDate: result.dueDate ? new Date(result.dueDate) : null,
                consumerName: result.consumerName
            };
        } else if (result.amount === null && result.message?.toLowerCase().includes("manual entry")){
             console.log(`[Client Service] Bill details not found for ${billerId}, ${identifier}: ${result.message || 'Manual entry required.'}`);
             return { amount: null, dueDate: null, consumerName: undefined }; // Indicate manual entry needed
        }
         else {
            console.log(`[Client Service] Bill details fetch failed for ${billerId}, ${identifier}: ${result.message || 'No amount returned.'}`);
            return null; // Or throw specific error
        }
    } catch (error: any) {
        console.error(`Error fetching bill details for ${billerId}, ${identifier} via API:`, error);
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

// This was incorrectly imported by the previous version.
// The client-side should not directly call the backend's transactionLogger.
// It should call its own addTransaction (if one exists for local state/optimistic updates)
// or more commonly, rely on the backend to log the transaction after processBillPayment.
// The current `processBillPayment` expects the backend to return the logged Transaction.
// If `addTransaction` from `transactionLogger` was meant for some other client-side logging,
// that service needs to be defined correctly for client-side use (e.g., using apiClient).
// For now, removing the direct import from here as `processBillPayment` is the primary interaction.

// If `addTransaction` in `src/services/transactionLogger.ts` is the CLIENT-SIDE function
// that calls a backend endpoint to log a transaction, then it might be used if a payment
// flow on the client needs to explicitly log something outside of what `processBillPayment` does.
// However, for standard bill payments, `processBillPayment` should suffice as it expects the backend
// to handle all logging.
