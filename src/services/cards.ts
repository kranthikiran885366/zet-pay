
/**
 * @fileOverview Service functions for managing saved Debit/Credit cards metadata in Firestore.
 * IMPORTANT: This service ONLY stores non-sensitive metadata (last4, expiry, type, issuer).
 * Actual card details and tokens MUST be handled and stored securely by a PCI-DSS compliant
 * payment gateway (e.g., Stripe, Razorpay). The `id` here would typically correspond to the
 * gateway's token ID.
 */
import { db, auth } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    limit,
    orderBy // Added orderBy
} from 'firebase/firestore';
import { payViaWallet, getWalletBalance } from './wallet';
import { addTransaction } from './transactions';
import { isBefore, addMonths, parse } from 'date-fns'; // Used for expiry checks

// Interface for card metadata stored in Firestore
export interface CardDetails {
    id?: string; // Firestore document ID (maps to gateway token ID)
    userId: string; // Belongs to which user
    cardIssuer?: string; // e.g., "Visa", "Mastercard"
    bankName?: string;
    last4: string;
    expiryMonth: string; // MM
    expiryYear: string; // YYYY
    cardHolderName?: string; // Optional
    cardType: 'Credit' | 'Debit';
    isPrimary?: boolean;
    // NOTE: NO full card number, CVV, or raw token should be stored here.
}

export interface CardPaymentResult {
    success: boolean;
    transactionId?: string;
    message: string;
    usedWalletFallback?: boolean;
    walletTransactionId?: string;
    retryWithDifferentMethod?: boolean;
    errorCode?: string;
}

/**
 * Asynchronously retrieves the list of saved card metadata for the current user from Firestore.
 *
 * @returns A promise that resolves to an array of CardDetails objects.
 */
export async function getSavedCards(): Promise<CardDetails[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to get saved cards.");
        return [];
    }
    const userId = currentUser.uid;
    console.log(`Fetching saved cards for user ${userId}...`);

    try {
        const cardsColRef = collection(db, 'users', userId, 'savedCards'); // Store cards in user's subcollection
        const q = query(cardsColRef, orderBy('isPrimary', 'desc')); // Primary first
        const querySnapshot = await getDocs(q);

        const cards = querySnapshot.docs.map(doc => ({
            id: doc.id, // Use Firestore doc ID as the card's unique ID
            userId, // Add userId if needed elsewhere
            ...doc.data()
        } as CardDetails));
        console.log(`Fetched ${cards.length} saved cards.`);
        return cards;

    } catch (error) {
        console.error("Error fetching saved cards:", error);
        throw new Error("Could not fetch saved cards.");
    }
}

/**
 * Asynchronously adds the METADATA of a new card to Firestore.
 * Assumes tokenization happened via a secure gateway and the gateway token ID is passed.
 *
 * @param cardMetadata Metadata of the card (last4, expiry, type, etc.).
 * @param gatewayTokenId The token ID obtained from the payment gateway (this will be the Firestore doc ID).
 * @returns A promise that resolves with the saved CardDetails object.
 */
export async function addCard(cardMetadata: Omit<CardDetails, 'id' | 'userId' | 'isPrimary'>, gatewayTokenId: string): Promise<CardDetails> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in to add a card.");
    const userId = currentUser.uid;

    console.log(`Adding card metadata for user ${userId}, token ID: ${gatewayTokenId}`);

    try {
        const cardsColRef = collection(db, 'users', userId, 'savedCards');
        const cardDocRef = doc(cardsColRef, gatewayTokenId); // Use gateway token as document ID

        // Check if this is the first card being added
        const q = query(cardsColRef, limit(1));
        const existingCardsSnap = await getDocs(q);
        const isFirstCard = existingCardsSnap.empty;

        const dataToSave: Omit<CardDetails, 'id'> = {
            ...cardMetadata,
            userId,
            isPrimary: isFirstCard, // Make the first card primary
        };

        await setDoc(cardDocRef, dataToSave); // Use setDoc to explicitly use the gatewayTokenId
        console.log("Card metadata added successfully.");
        return { id: gatewayTokenId, ...dataToSave };

    } catch (error) {
        console.error("Error adding card metadata:", error);
        throw new Error("Could not save card information.");
    }
}

/**
 * Asynchronously deletes saved card metadata from Firestore.
 * Also triggers deletion of the token at the payment gateway via backend.
 *
 * @param cardId The Firestore document ID (gateway token ID) of the card to delete.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function deleteCard(cardId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;

    console.log(`Deleting card metadata ID: ${cardId} for user ${userId}`);
    try {
        const cardDocRef = doc(db, 'users', userId, 'savedCards', cardId);
        const cardSnap = await getDoc(cardDocRef);
        if (!cardSnap.exists() || cardSnap.data()?.isPrimary) {
            if (cardSnap.data()?.isPrimary) throw new Error("Cannot delete the primary card.");
            else throw new Error("Card not found.");
        }

        // TODO: Trigger backend API call HERE to delete the actual card token from the payment gateway first.
        console.log(`Simulating backend call to delete gateway token: ${cardId}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        const gatewayDeletionSuccess = true; // Assume success for demo

        if (!gatewayDeletionSuccess) {
            throw new Error("Failed to delete card token at payment gateway.");
        }

        // If gateway deletion is successful, delete Firestore metadata
        await deleteDoc(cardDocRef);
        console.log("Card metadata deleted successfully from Firestore.");
        return true;

    } catch (error: any) {
        console.error("Error deleting card:", error);
        throw new Error(error.message || "Could not delete the card.");
    }
}

/**
 * Asynchronously sets a saved card as the primary payment method in Firestore.
 *
 * @param cardId The Firestore document ID (gateway token ID) of the card to set as primary.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function setPrimaryCard(cardId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;

    console.log(`Setting card ID ${cardId} as primary for user ${userId}...`);
    try {
        const cardsColRef = collection(db, 'users', userId, 'savedCards');
        const batch = writeBatch(db);

        // Find the new primary card
        const newPrimaryDocRef = doc(cardsColRef, cardId);
        const newPrimarySnap = await getDoc(newPrimaryDocRef);
        if (!newPrimarySnap.exists()) throw new Error("Card not found.");

        // Find the current primary card (if any)
        const currentPrimaryQuery = query(cardsColRef, where('isPrimary', '==', true), limit(1));
        const currentPrimarySnap = await getDocs(currentPrimaryQuery);

        // Unset current primary if it exists and is different
        if (!currentPrimarySnap.empty) {
            const currentPrimaryDocRef = doc(cardsColRef, currentPrimarySnap.docs[0].id);
            if (currentPrimaryDocRef.id !== newPrimaryDocRef.id) {
                batch.update(currentPrimaryDocRef, { isPrimary: false });
            }
        }

        // Set the new card as primary
        batch.update(newPrimaryDocRef, { isPrimary: true });

        await batch.commit();
        console.log("Primary card updated successfully in Firestore.");
        return true;

    } catch (error) {
        console.error("Error setting primary card:", error);
        throw new Error("Could not set the primary card.");
    }
}


/**
 * Processes a payment using a saved card token.
 * SIMULATED - Requires actual gateway integration for payment processing & 3D Secure.
 * Includes wallet fallback logic and transaction logging.
 *
 * @param cardId The Firestore doc ID / Gateway token ID of the card.
 * @param amount The amount to pay.
 * @param cvv The CVV code (required for simulation).
 * @param purpose A brief description of the payment purpose.
 * @param recipientIdentifier Optional identifier of the recipient.
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
    const userId = currentUser?.uid;

    if (!userId) {
        return { success: false, message: "User not logged in." };
    }

    console.log(`Processing payment with card ${cardId} for amount ${amount}. Purpose: ${purpose}`);

    // Fetch card metadata to simulate checks (like expiry)
    let cardDetails: CardDetails | null = null;
    try {
        const cardDocRef = doc(db, 'users', userId, 'savedCards', cardId);
        const cardSnap = await getDoc(cardDocRef);
        if (cardSnap.exists()) {
            cardDetails = cardSnap.data() as CardDetails;
        } else {
             throw new Error("Saved card details not found.");
        }
    } catch(e) {
         console.error("Failed to fetch card details:", e);
         return { success: false, message: "Failed to retrieve card details." };
    }


    // TODO: Trigger payment gateway API call HERE using the cardId (token), amount, cvv, purpose.
    // The gateway would handle 3D Secure/OTP if needed.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate gateway delay

    let cardFailed = false;
    let failureReason: string | undefined = 'Payment failed at gateway.';
    let errorCode: CardPaymentResult['errorCode'] = 'UNKNOWN_ERROR';

    try {
        // Simulate different card payment outcomes based on CVV, amount, expiry
        if (cvv !== '123') {
            cardFailed = true; failureReason = "Incorrect CVV."; errorCode = 'CVV_MISMATCH';
        } else {
             try {
                // Check expiry using date-fns
                 const expiryDate = parse(`01/${cardDetails.expiryMonth}/${cardDetails.expiryYear}`, 'dd/MM/yyyy', new Date());
                 const expiryCheckDate = addMonths(expiryDate, 1); // Check against start of month *after* expiry
                 if (isBefore(expiryCheckDate, new Date())) {
                     cardFailed = true; failureReason = "Card has expired."; errorCode = 'EXPIRED_CARD';
                 }
             } catch (dateError) {
                 console.error("Error parsing card expiry:", dateError);
                 // Proceed cautiously, maybe flag for review? Or fail safe.
                 cardFailed = true; failureReason = "Invalid card expiry date found."; errorCode = 'INVALID_EXPIRY';
             }
        }

        if (!cardFailed && amount > 10000 && !cardDetails?.isPrimary) { // Simulate limit/funds issue
             cardFailed = true; failureReason = "Payment declined by bank (Limit/Funds)."; errorCode = 'INSUFFICIENT_FUNDS';
        }
        if (!cardFailed && Math.random() < 0.1) { // Simulate generic decline
             cardFailed = true; failureReason = "Payment declined by bank."; errorCode = 'DECLINED';
        }

        if (cardFailed) {
            throw new Error(failureReason);
        }

        // --- Card Payment Succeeded ---
        const transactionId = `PAY_CARD_${Date.now()}`;
        await addTransaction({
            type: 'Bill Payment', // Assume bill payment, adjust based on purpose
            name: purpose || recipientIdentifier || `Card Pmt ...${cardDetails.last4}`,
            description: `Paid via Card ...${cardDetails.last4}`,
            amount: -amount,
            status: 'Completed',
            userId: userId,
            billerId: recipientIdentifier,
        });
        console.log("Card payment successful, transaction logged.");
        return { success: true, transactionId, message: "Payment successful with card." };

    } catch (cardError: any) {
        console.warn(`Card payment failed for ${cardId}: ${cardError.message}`);

        // --- Wallet Fallback Logic (Only for specific errors) ---
        if (userId && (errorCode === 'INSUFFICIENT_FUNDS' || errorCode === 'EXPIRED_CARD' || errorCode === 'DECLINED')) {
            console.log("Attempting wallet fallback...");
            try {
                const walletBalance = await getWalletBalance(userId);
                if (walletBalance >= amount) {
                    const walletResult = await payViaWallet(userId, recipientIdentifier || purpose, amount, `Wallet Fallback: ${purpose}`);
                    if (walletResult.success) {
                        console.log("Wallet fallback successful.");
                        return {
                            success: true, // Overall success via fallback
                            transactionId: walletResult.transactionId,
                            message: `Card payment failed (${cardError.message}). Paid successfully using Wallet.`,
                            usedWalletFallback: true,
                            walletTransactionId: walletResult.transactionId,
                        };
                    } else {
                        failureReason = `Card payment failed (${cardError.message}). Wallet fallback also failed: ${walletResult.message}`;
                    }
                } else {
                    failureReason = `Card payment failed (${cardError.message}). Insufficient wallet balance (₹${walletBalance.toFixed(2)}) for fallback.`;
                }
            } catch (walletError: any) {
                 console.error("Wallet fallback error:", walletError);
                 failureReason = `Card payment failed (${cardError.message}). Error during wallet fallback.`;
            }
        } // --- End Wallet Fallback Logic ---

        // --- Log Final Failure ---
        // Log the failed card transaction attempt only if wallet fallback wasn't successful
        if (! (cardError.message.includes('Wallet fallback also failed') || cardError.message.includes('Insufficient wallet balance for fallback'))) {
            await addTransaction({
                type: 'Failed',
                name: purpose || recipientIdentifier || `Card Pmt ...${cardDetails?.last4 || cardId.slice(-4)}`,
                description: `Card Payment Failed - ${cardError.message}`,
                amount: -amount,
                status: 'Failed',
                userId: userId,
                billerId: recipientIdentifier,
            });
        }
        return {
            success: false,
            message: failureReason || cardError.message,
            retryWithDifferentMethod: true, // Suggest retry
            errorCode: errorCode,
        };
    }
}
