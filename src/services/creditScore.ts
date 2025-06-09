
/**
 * @fileOverview Service functions for fetching credit score information.
 */
import { apiClient } from '@/lib/apiClient';

export interface CreditScoreData {
    score: number;
    provider: string; // e.g., "CIBIL", "Experian"
    reportDate: string; // ISO date string
    // Potentially add more fields like payment history summary, credit utilization, etc.
}

/**
 * Fetches the user's credit score from the backend API.
 * The backend would integrate with a credit bureau.
 * @returns A promise resolving to the CreditScoreData.
 */
export async function getCreditScore(): Promise<CreditScoreData> {
    console.log("[Client Service] Fetching credit score via API...");
    try {
        // Assuming a backend endpoint like '/users/credit-score'
        const data = await apiClient<CreditScoreData>('/users/credit-score');
        // Ensure reportDate is a string if the API might return a Date object
        return {
            ...data,
            reportDate: typeof data.reportDate === 'string' ? data.reportDate : new Date(data.reportDate).toISOString(),
        };
    } catch (error) {
        console.error("Error fetching credit score via API:", error);
        throw error; // Re-throw for UI handling
    }
}
