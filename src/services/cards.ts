/**
 * @fileOverview Service functions for managing saved Debit/Credit cards metadata via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { CardDetails, CardPaymentResult } from './types'; // Use shared types

// Re-export types if needed
export type { CardDetails, CardPaymentResult };


/**
 * Asynchronously retrieves the list of saved card metadata for the current user from the backend API.
 *
 * @returns A promise that resolves to an array of CardDetails objects.
 */
export async function getSavedCards(): Promise<CardDetails[]> {
    console.log(`Fetching saved cards via API...`);
    try {
        // Backend infers user from token
        const cards = await apiClient<CardDetails[]>('/cards'); // Assuming '/cards' endpoint
        console.log(`Fetched ${cards.length} saved cards via API.`);
        return cards;
    } catch (error) {
        console.error("Error fetching saved cards via API:", error);
        return []; // Return empty on error
    }
}

/**
 * Asynchronously adds the METADATA of a new card via the backend API.
 * The backend should handle the secure tokenization with the gateway and store only metadata.
 *
 * @param cardMetadata Essential card details needed for tokenization/display (e.g., number, expiry, name, potentially CVV for tokenization only).
 *                     **CVV should NOT be stored by the backend after tokenization.**
 * @returns A promise that resolves with the saved CardDetails object (containing only metadata like last4, expiry, etc.).
 */
export async function addCard(cardMetadata: {
    cardNumber: string; // Full number needed initially for tokenization
    expiryMonth: string; // MM
    expiryYear: string; // YYYY
    cvv: string; // Needed for tokenization, but not stored long-term
    cardHolderName?: string;
    cardType: 'Credit' | 'Debit'; // Help backend categorize
}): Promise<Omit<CardDetails, 'userId'>> { // Return metadata only
    console.log(`Adding card via API (sending details for tokenization)...`);
    try {
        // Backend endpoint '/cards' handles tokenization with gateway and stores metadata
        const savedCardMetadata = await apiClient<Omit<CardDetails, 'userId'>>('/cards', {
            method: 'POST',
            body: JSON.stringify(cardMetadata),
        });
        console.log("Card tokenized and metadata saved via API:", savedCardMetadata);
        return savedCardMetadata;
    } catch (error) {
        console.error("Error adding card via API:", error);
        throw error; // Re-throw error
    }
}

/**
 * Asynchronously deletes saved card metadata via the backend API.
 * Backend handles deleting the token from the gateway and its own database record.
 *
 * @param cardId The ID (gateway token ID / database ID) of the card to delete.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function deleteCard(cardId: string): Promise<boolean> {
    console.log(`Deleting card via API: ${cardId}`);
    try {
        await apiClient<void>(`/cards/${cardId}`, {
            method: 'DELETE',
        });
        console.log("Card deleted successfully via API.");
        return true;
    } catch (error) {
        console.error("Error deleting card via API:", error);
        return false; // Return false on failure
    }
}

/**
 * Asynchronously sets a saved card as the primary payment method via the backend API.
 *
 * @param cardId The ID of the card to set as primary.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function setPrimaryCard(cardId: string): Promise<boolean> {
    console.log(`Setting card ${cardId} as primary via API...`);
    try {
        await apiClient<void>(`/cards/${cardId}/set-primary`, { // Assuming specific endpoint
            method: 'PUT',
        });
        console.log("Primary card updated successfully via API.");
        return true;
    } catch (error) {
        console.error("Error setting primary card via API:", error);
        return false; // Return false on failure
    }
}


/**
 * Processes a payment using a saved card token via the backend API.
 * Backend handles gateway interaction, 3D Secure (if needed), transaction logging, and wallet fallback.
 *
 * @param cardId The ID / token ID of the card.
 * @param amount The amount to pay.
 * @param cvv The CVV code (required by backend for payment attempt).
 * @param purpose A brief description of the payment purpose.
 * @param recipientIdentifier Optional identifier of the recipient.
 * @returns A promise resolving to the CardPaymentResult object from the backend.
 */
export async function payWithSavedCard(
    cardId: string,
    amount: number,
    cvv: string,
    purpose: string,
    recipientIdentifier?: string
): Promise<CardPaymentResult> {
    console.log(`Processing payment with card ${cardId} via API. Amount: ${amount}, Purpose: ${purpose}`);

    const payload = {
        cardId,
        amount,
        cvv, // Send CVV securely to backend for payment processing ONLY
        purpose,
        recipientIdentifier: recipientIdentifier || undefined,
    };

    try {
        // Backend endpoint handles payment attempt, fallback, logging
        const result = await apiClient<CardPaymentResult>('/payments/card', { // Assuming endpoint '/payments/card'
            method: 'POST',
            body: JSON.stringify(payload),
        });
        console.log("Card Payment API result:", result);
        return result;
    } catch (error: any) {
        console.error("Card payment failed via API:", error);
        // Return a standardized error format if API call fails fundamentally
        return {
            success: false,
            message: error.message || "Failed to process card payment.",
            retryWithDifferentMethod: true, // Suggest retry on failure
        };
    }
}

// Remove expiry check logic from client-side if backend handles it or if notifications are sufficient
// import { isBefore, addMonths, parse } from 'date-fns';
