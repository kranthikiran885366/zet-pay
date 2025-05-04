/**
 * @fileOverview Service functions for managing UPI Autopay mandates via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { Mandate } from './types'; // Assume Mandate type is defined in shared types

// Re-export type if needed
export type { Mandate };

/**
 * Asynchronously retrieves the list of UPI Autopay mandates for the current user from the backend API.
 *
 * @returns A promise that resolves to an array of Mandate objects.
 */
export async function getMandates(): Promise<Mandate[]> {
    console.log(`Fetching UPI Autopay Mandates via API...`);
    try {
        const mandates = await apiClient<Mandate[]>('/autopay/mandates'); // Example endpoint
        // Convert date strings if necessary
        return mandates.map(m => ({
            ...m,
            startDate: new Date(m.startDate),
            validUntil: new Date(m.validUntil),
            createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
            updatedAt: m.updatedAt ? new Date(m.updatedAt) : undefined,
        }));
    } catch (error) {
        console.error("Error fetching mandates via API:", error);
        return []; // Return empty on error
    }
}

/**
 * Asynchronously initiates the setup flow for a new UPI Autopay mandate via the backend API.
 * The backend handles interaction with the UPI ecosystem and Firestore logging.
 *
 * @param merchantName Name of the merchant.
 * @param userUpiId The user's UPI ID for the mandate.
 * @param maxAmount The maximum amount per debit.
 * @param frequency The frequency of the debit.
 * @param startDate The start date of the mandate.
 * @param validUntil The expiry date of the mandate.
 * @returns A promise that resolves with details returned by the backend.
 */
export async function setupMandate(
    merchantName: string,
    userUpiId: string,
    maxAmount: number,
    frequency: Mandate['frequency'],
    startDate: Date,
    validUntil: Date
): Promise<{ success: boolean; mandateId?: string; message?: string }> {
    console.log("Initiating mandate setup via API:", { merchantName, maxAmount, frequency });
    const payload = {
        merchantName,
        userUpiId,
        maxAmount,
        frequency,
        startDate: startDate.toISOString(), // Send dates as ISO strings
        validUntil: validUntil.toISOString(),
    };
    try {
        // Assuming backend endpoint '/autopay/mandates' for setup
        const result = await apiClient<{ success: boolean; mandateId?: string; message?: string }>('/autopay/mandates', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        console.log("Mandate setup API response:", result);
        return result;
    } catch (error: any) {
        console.error("Error initiating mandate setup via API:", error);
        return { success: false, message: error.message || "Failed to initiate mandate setup." };
    }
}

/**
 * Asynchronously pauses an active UPI Autopay mandate via the backend API.
 *
 * @param mandateId The ID of the mandate to pause.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function pauseMandate(mandateId: string): Promise<boolean> {
    console.log(`Pausing mandate via API: ${mandateId}`);
    try {
        await apiClient<void>(`/autopay/mandates/${mandateId}/pause`, { // Example endpoint
            method: 'PUT',
        });
        console.log("Mandate paused successfully via API.");
        return true;
    } catch (error) {
        console.error("Error pausing mandate via API:", error);
        return false;
    }
}

/**
 * Asynchronously resumes a paused UPI Autopay mandate via the backend API.
 *
 * @param mandateId The ID of the mandate to resume.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function resumeMandate(mandateId: string): Promise<boolean> {
    console.log(`Resuming mandate via API: ${mandateId}`);
    try {
         await apiClient<void>(`/autopay/mandates/${mandateId}/resume`, { // Example endpoint
            method: 'PUT',
        });
        console.log("Mandate resumed successfully via API.");
        return true;
    } catch (error) {
        console.error("Error resuming mandate via API:", error);
        return false;
    }
}

/**
 * Asynchronously cancels an active or paused UPI Autopay mandate via the backend API.
 *
 * @param mandateId The ID of the mandate to cancel.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function cancelMandate(mandateId: string): Promise<boolean> {
    console.log(`Cancelling mandate via API: ${mandateId}`);
    try {
        await apiClient<void>(`/autopay/mandates/${mandateId}`, { // Example endpoint using DELETE
            method: 'DELETE',
        });
        console.log("Mandate cancelled successfully via API.");
        return true;
    } catch (error) {
        console.error("Error cancelling mandate via API:", error);
        return false;
    }
}
