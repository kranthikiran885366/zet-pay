/**
 * @fileOverview Service functions for processing bill payments.
 */

import type { Transaction } from './transactions'; // Use the common Transaction interface
import { addTransaction } from './transactions';

export interface BillPaymentDetails {
    billerId: string;
    identifier: string; // Consumer number, Policy number, etc.
    amount: number;
    billerType: string; // Electricity, Water, Insurance etc.
    billerName?: string; // Optional: For display/confirmation
}

/**
 * Asynchronously fetches the outstanding amount for a specific biller and identifier.
 *
 * @param billerId The ID of the biller.
 * @param identifier The consumer number, policy number, etc.
 * @returns A promise that resolves to the outstanding bill amount, or null if not applicable/found.
 */
export async function fetchBillAmount(billerId: string, identifier: string): Promise<number | null> {
    console.log(`Fetching bill amount for biller: ${billerId}, identifier: ${identifier}`);
    // TODO: Implement actual API call to fetch bill details
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Mock fetching logic
    if (billerId === 'bescom' && identifier === '12345') {
        return 1350.75;
    }
    if (billerId === 'bwssb' && identifier === 'W9876') {
         return 420.00;
    }

    // Return null if amount fetching is not supported or no bill found
    return null;
}

/**
 * Asynchronously processes a bill payment.
 *
 * @param paymentDetails Details of the bill payment.
 * @returns A promise that resolves to a Transaction object representing the payment outcome.
 */
export async function processBillPayment(paymentDetails: BillPaymentDetails): Promise<Transaction> {
    console.log("Processing bill payment:", paymentDetails);
    // TODO: Implement actual API call to backend for payment processing
    await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate payment processing delay

    // Simulate different outcomes
    const randomStatus = Math.random();
    let status: Transaction['status'] = 'Completed';
    let description = `${paymentDetails.billerName || paymentDetails.billerType} Bill for ${paymentDetails.identifier}`;
    if (randomStatus < 0.1) {
        status = 'Failed';
        description += ' - Payment Failed';
    } else if (randomStatus < 0.2) {
        status = 'Pending';
         description += ' - Payment Pending';
    }


    // Add transaction to history (simulation)
    const transaction = addTransaction({
        type: 'Bill Payment',
        name: paymentDetails.billerName || paymentDetails.billerType,
        description: description,
        amount: -paymentDetails.amount, // Negative for payment
        status: status,
        billerId: paymentDetails.billerId,
    });

    return transaction; // Return the created transaction details
}
