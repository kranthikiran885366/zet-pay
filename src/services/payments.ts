
/**
 * @fileOverview Service functions for processing various payments like Fuel.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Use shared types

/**
 * Processes a fuel payment via the backend API.
 * Backend handles actual payment processing (mocked for now) and transaction logging.
 * @param amount The amount for the fuel payment.
 * @returns A promise resolving to the Transaction object.
 */
export async function processFuelPayment(amount: number): Promise<Transaction> {
    console.log(`[Client Service] Processing fuel payment of ₹${amount} via API...`);
    try {
        const result = await apiClient<Transaction>('/payments/fuel', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
        console.log("Fuel Payment API response:", result);
        // Convert date string from API to Date object
        return {
            ...result,
            date: new Date(result.date),
            avatarSeed: result.avatarSeed || result.name?.toLowerCase().replace(/\s+/g, '') || result.id,
        };
    } catch (error: any) {
        console.error("Error processing fuel payment via API:", error);
        throw error;
    }
}
