
/**
 * @fileOverview Service functions for processing bill payments.
 */

import type { Transaction } from './types'; // Use the common Transaction interface
import { addTransaction } from '@/services/transactionLogger'; // Import function to add transaction to Firestore

export interface BillPaymentDetails {
    billerId: string;
    identifier: string; // Consumer number, Policy number, etc.
    amount: number;
    billerType: string; // Electricity, Water, Insurance etc.
    billerName?: string; // Optional: For display/confirmation
}

/**
 * Asynchronously fetches the outstanding amount for a specific biller and identifier.
 * SIMULATED - Actual implementation depends on BBPS or direct biller integration APIs.
 *
 * @param {string} billerId Biller ID from BBPS or aggregator.
 * @param {string} identifier Consumer number, account ID, policy number, etc.
 * @returns {Promise<object|null>} Bill details or null if not found/applicable.
 */
export async function fetchBillAmount(billerId: string, identifier: string): Promise<number | null> {
    console.log(`[Bill Provider Sim] Fetching bill for Biller: ${billerId}, Identifier: ${identifier}`);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Mock data based on controller examples
    if ((billerId === 'bescom' || billerId === 'mock-prepaid-bescom') && identifier === '12345') {
        return 1350.75;
    }
    if ((billerId === 'bwssb') && identifier === 'W9876') {
         return 420.00;
    }
     if ((billerId === 'mock-school-1') && identifier === 'S101') { // Example education fee
         return 5000.00;
     }
      if ((billerId === 'hdfc-cc') && identifier === '4111********1111') { // Example credit card
          return 12345.67;
      }


    // Return null if amount fetching is not supported or no bill found for mock data
    console.log(`[Bill Provider Sim] No mock bill amount found for biller ${billerId}, identifier ${identifier}.`);
    return null; // Bill fetch not supported or not found
}

/**
 * Asynchronously processes a bill payment.
 * SIMULATED - Actual implementation depends on payment gateway and biller integration.
 * Logs the transaction outcome to Firestore via addTransaction.
 *
 * @param {object} details Payment details { billerId, identifier, amount, type, transactionId }.
 * @returns {Promise<object>} Result status and messages.
 */
export async function processBillPayment(paymentDetails: BillPaymentDetails): Promise<Transaction> {
    console.log("Processing bill payment:", paymentDetails);
    // TODO: Implement actual API call to backend for payment processing (via UPI, Wallet, Card).
    // This would involve selecting payment method, handling PIN/OTP, etc.
    await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate payment processing delay

    // Simulate different outcomes
    const randomStatus = Math.random();
    let status: Transaction['status'] = 'Completed';
    let descriptionSuffix = '';
    if (randomStatus < 0.08) {
        status = 'Failed';
        descriptionSuffix = ' - Payment Failed';
    } else if (randomStatus < 0.2) {
        status = 'Pending';
         descriptionSuffix = ' - Payment Pending';
    }

    const description = `${paymentDetails.billerName || paymentDetails.billerType} Bill for ${paymentDetails.identifier}${descriptionSuffix}`;

    // Add transaction to Firestore history
    // This assumes the payment processing part (debit from user) was attempted.
    try {
        const transaction = await addTransaction({
            type: 'Bill Payment',
            name: paymentDetails.billerName || paymentDetails.billerType,
            description: description,
            amount: -paymentDetails.amount, // Negative for payment
            status: status,
            billerId: paymentDetails.billerId,
            // upiId or other identifiers might be relevant depending on payment method
        });
        console.log(`Bill payment transaction logged with ID: ${transaction.id} and status: ${status}`);
        return transaction; // Return the created transaction details
    } catch (error) {
        console.error("Error logging bill payment transaction:", error);
        // If logging fails, we still need to inform the user about the likely payment status
        // Create a temporary Transaction object to return
        const fallbackTransaction: Transaction = {
            id: `local_${Date.now()}`,
            userId: 'unknown', // User ID not available in this scope without auth context
            type: 'Bill Payment',
            name: paymentDetails.billerName || paymentDetails.billerType,
            description: `${description} (Logging Failed)`,
            amount: -paymentDetails.amount,
            status: status, // Reflect the simulated payment status
            date: new Date(),
            avatarSeed: (paymentDetails.billerName || paymentDetails.billerType).toLowerCase(),
            billerId: paymentDetails.billerId,
        };
        return fallbackTransaction;
    }
}
