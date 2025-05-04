/**
 * @fileOverview Service functions for managing saved Debit/Credit cards.
 */

export interface CardDetails {
    id: string; // Unique identifier for the saved card (e.g., token ID)
    cardIssuer?: string; // e.g., "Visa", "Mastercard", "Rupay" - might be derived from BIN
    bankName?: string; // Issuing bank name (optional)
    last4: string; // Last 4 digits of the card number
    expiryMonth: string; // MM format
    expiryYear: string; // YYYY format
    cardHolderName?: string; // Name on the card (optional, often not stored)
    cardType: 'Credit' | 'Debit';
    isPrimary?: boolean; // Flag if this is the default card for payments
    token?: string; // The actual token representing the card (should not be sent to client usually)
}

/**
 * Asynchronously retrieves the list of saved cards for the user.
 *
 * @returns A promise that resolves to an array of CardDetails objects (without the full token).
 */
export async function getSavedCards(): Promise<CardDetails[]> {
    console.log("Fetching saved cards...");
    // TODO: Implement actual API call to backend to fetch saved card tokens/details
    await new Promise(resolve => setTimeout(resolve, 900)); // Simulate API delay

    // Mock Data
    return [
        {
            id: 'card_tok_1',
            cardIssuer: 'Visa',
            bankName: 'HDFC Bank',
            last4: '1234',
            expiryMonth: '12',
            expiryYear: '2028',
            cardHolderName: 'Chandra S.',
            cardType: 'Credit',
            isPrimary: true,
        },
        {
            id: 'card_tok_2',
            cardIssuer: 'Mastercard',
            bankName: 'SBI',
            last4: '5678',
            expiryMonth: '06',
            expiryYear: '2026',
            cardHolderName: 'Chandra S.',
            cardType: 'Debit',
            isPrimary: false,
        },
         {
            id: 'card_tok_3',
            cardIssuer: 'Rupay',
            bankName: 'ICICI Bank',
            last4: '9012',
            expiryMonth: '09',
            expiryYear: '2027',
            cardHolderName: 'Chandra S.',
            cardType: 'Credit',
            isPrimary: false,
        },
    ].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)); // Sort primary card first
}

/**
 * Asynchronously initiates the flow to add a new card.
 * This typically involves integrating with a payment gateway SDK for secure capture and tokenization.
 *
 * @param cardData Raw card details (SHOULD NOT be handled directly like this in production).
 * @returns A promise that resolves with details of the newly saved card (e.g., its ID/token info).
 */
export async function addCard(cardData: any): Promise<{ success: boolean; cardId?: string; message?: string }> {
    console.log("Initiating add card flow...", cardData);
    // TODO: Implement secure card adding flow using a Gateway SDK (e.g., Stripe Elements, Razorpay Checkout)
    // The SDK handles PCI compliance. Never send raw card details to your backend directly.
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Simulate success
    return { success: true, cardId: `card_tok_${Date.now()}`, message: "Card added successfully (Simulated)." };
}

/**
 * Asynchronously deletes a saved card.
 *
 * @param cardId The unique ID (token ID) of the card to delete.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function deleteCard(cardId: string): Promise<boolean> {
    console.log(`Deleting card ID: ${cardId}`);
    // TODO: Implement API call to backend to delete the card token
    await new Promise(resolve => setTimeout(resolve, 700));
    // Simulate success
    return true;
}

/**
 * Asynchronously sets a saved card as the primary payment method.
 *
 * @param cardId The unique ID (token ID) of the card to set as primary.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function setPrimaryCard(cardId: string): Promise<boolean> {
    console.log(`Setting card ID ${cardId} as primary...`);
    // TODO: Implement API call to backend to update the primary card flag
    await new Promise(resolve => setTimeout(resolve, 600));
    // Simulate success
    return true;
}

/**
 * Processes a payment using a saved card token.
 * Requires CVV and potentially OTP/3D Secure authentication.
 *
 * @param cardId The ID of the saved card token to use.
 * @param amount The amount to pay.
 * @param cvv The CVV code (required for payment).
 * @returns A promise resolving to the transaction status.
 */
export async function payWithSavedCard(cardId: string, amount: number, cvv: string): Promise<{ success: boolean; transactionId?: string; message: string }> {
    console.log(`Processing payment with card ${cardId} for amount ${amount} (CVV: ${cvv.replace(/./g, '*')})...`);
    // TODO: Implement secure payment processing via payment gateway, likely involving redirects or further steps for 3D Secure.
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate different outcomes
    if (cvv !== '123') { // Simulate wrong CVV
        return { success: false, message: "Incorrect CVV." };
    }
    if (amount > 1000) { // Simulate insufficient funds/limit
        return { success: false, message: "Payment declined by bank (Insufficient Limit)." };
    }

    // Simulate success
    return { success: true, transactionId: `PAY_CARD_${Date.now()}`, message: "Payment successful." };
}
