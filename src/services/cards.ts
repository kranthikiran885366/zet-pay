
/**
 * @fileOverview Service functions for managing saved Debit/Credit cards.
 */
import { payViaWallet, getWalletBalance } from './wallet'; // Import wallet services
import { addTransaction } from './transactions'; // Import transaction logging
import { auth } from '@/lib/firebase'; // Import auth for user ID

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
 * Represents the result of a card payment attempt.
 */
export interface CardPaymentResult {
    success: boolean;
    transactionId?: string; // ID if payment succeeded (partially or fully)
    message: string; // User-friendly message
    usedWalletFallback?: boolean; // Flag if wallet was used after card failure
    walletTransactionId?: string; // ID if wallet fallback succeeded
    retryWithDifferentMethod?: boolean; // Flag to suggest retrying
    errorCode?: string; // Optional error code (e.g., 'INSUFFICIENT_FUNDS', 'EXPIRED_CARD', 'CVV_MISMATCH', 'DECLINED')
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
 * Includes fallback logic to wallet if card payment fails due to insufficient funds or expiry.
 *
 * @param cardId The ID of the saved card token to use.
 * @param amount The amount to pay.
 * @param cvv The CVV code (required for payment).
 * @param purpose A brief description of the payment purpose (e.g., "Electricity Bill").
 * @param recipientIdentifier Optional identifier of the recipient (e.g., Biller ID, Merchant UPI).
 * @returns A promise resolving to the CardPaymentResult object.
 */
export async function payWithSavedCard(
    cardId: string,
    amount: number,
    cvv: string,
    purpose: string,
    recipientIdentifier?: string
): Promise<CardPaymentResult> {
    const currentUser = auth.currentUser;
    const userId = currentUser?.uid; // Needed for wallet fallback

    console.log(`Processing payment with card ${cardId} for amount ${amount} (CVV: ${cvv.replace(/./g, '*')}). Purpose: ${purpose}`);
    // TODO: Implement secure payment processing via payment gateway, likely involving redirects or further steps for 3D Secure.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate gateway delay

    let cardFailed = false;
    let failureReason: string | undefined;
    let errorCode: CardPaymentResult['errorCode'];

    try {
        // Simulate different card payment outcomes
        if (cvv !== '123') { // Simulate wrong CVV
            cardFailed = true;
            failureReason = "Incorrect CVV.";
            errorCode = 'CVV_MISMATCH';
        } else if (cardId === 'card_tok_2' && (new Date() > new Date(2026, 5))) { // Simulate expired card (card_tok_2 expires 06/2026)
             cardFailed = true;
             failureReason = "Card has expired.";
             errorCode = 'EXPIRED_CARD';
        } else if (amount > 1000 && cardId !== 'card_tok_1') { // Simulate insufficient funds/limit (except for primary HDFC card)
            cardFailed = true;
            failureReason = "Payment declined by bank (Insufficient Limit/Funds).";
            errorCode = 'INSUFFICIENT_FUNDS';
        } else if (Math.random() < 0.1) { // Simulate generic decline
            cardFailed = true;
            failureReason = "Payment declined by bank.";
            errorCode = 'DECLINED';
        }

        if (cardFailed) {
            throw new Error(failureReason);
        }

        // Card Payment Succeeded
        const transactionId = `PAY_CARD_${Date.now()}`;
        // Log successful card transaction
        if (userId) {
            await addTransaction({
                type: 'Bill Payment', // Or other appropriate type based on purpose
                name: purpose || recipientIdentifier || `Card Payment`,
                description: `Paid via Card ending ...${cardId.slice(-4)}`,
                amount: -amount,
                status: 'Completed',
                userId: userId,
                billerId: recipientIdentifier, // Store if available
            });
        }

        return {
            success: true,
            transactionId: transactionId,
            message: "Payment successful with card."
        };

    } catch (cardError: any) {
        console.warn(`Card payment failed for ${cardId}: ${cardError.message}`);

        // Wallet Fallback Logic (only for specific errors like insufficient funds/expired card)
        if (userId && (errorCode === 'INSUFFICIENT_FUNDS' || errorCode === 'EXPIRED_CARD')) {
            console.log("Attempting wallet fallback...");
            try {
                const walletBalance = await getWalletBalance(userId);
                if (walletBalance >= amount) {
                    const walletResult = await payViaWallet(userId, recipientIdentifier || purpose, amount, `Wallet Fallback: ${purpose}`);
                    if (walletResult.success) {
                        console.log("Wallet fallback successful.");
                        // Log original card failure + wallet success? Maybe just log wallet tx.
                        // The payViaWallet already logs a 'Sent' transaction.
                        return {
                            success: true, // Overall transaction succeeded via fallback
                            transactionId: walletResult.transactionId, // Use wallet transaction ID
                            message: `Card payment failed (${cardError.message}). Paid successfully using Wallet.`,
                            usedWalletFallback: true,
                            walletTransactionId: walletResult.transactionId,
                        };
                    } else {
                        // Wallet fallback also failed
                        return {
                            success: false,
                            message: `Card payment failed (${cardError.message}). Wallet fallback also failed: ${walletResult.message}`,
                            retryWithDifferentMethod: true, // Suggest trying another card/method
                            errorCode: errorCode,
                        };
                    }
                } else {
                    // Insufficient wallet balance for fallback
                    return {
                        success: false,
                        message: `Card payment failed (${cardError.message}). Insufficient wallet balance for fallback.`,
                        retryWithDifferentMethod: true,
                        errorCode: errorCode,
                    };
                }
            } catch (walletError: any) {
                 console.error("Wallet fallback error:", walletError);
                 return {
                    success: false,
                    message: `Card payment failed (${cardError.message}). Error during wallet fallback.`,
                    retryWithDifferentMethod: true,
                    errorCode: errorCode,
                };
            }
        } else {
             // Card failed for other reasons (CVV, generic decline) - No wallet fallback
             // Log the failed card transaction attempt
            if (userId) {
                await addTransaction({
                    type: 'Failed',
                    name: purpose || recipientIdentifier || `Card Payment`,
                    description: `Card Payment Failed - ${cardError.message}`,
                    amount: -amount,
                    status: 'Failed',
                    userId: userId,
                     billerId: recipientIdentifier,
                });
            }
            return {
                success: false,
                message: `Card payment failed: ${cardError.message}`,
                retryWithDifferentMethod: true, // Suggest trying another card/method
                errorCode: errorCode || 'UNKNOWN_ERROR',
            };
        }
    }
}
