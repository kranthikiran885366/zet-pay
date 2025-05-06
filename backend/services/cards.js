// backend/services/cards.js
const admin = require('../config/firebaseAdmin'); // Use admin SDK from config
const db = admin.firestore();
// Placeholder for payment gateway interaction
const paymentGatewayService = require('./paymentGatewayService');

/**
 * Retrieves saved card metadata for a user from Firestore.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of card metadata objects.
 */
async function getSavedCards(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[Cards Service - Backend] Fetching saved cards for user: ${userId}`);
    try {
        const cardsColRef = db.collection('users').doc(userId).collection('savedCards');
        const snapshot = await cardsColRef.orderBy('isPrimary', 'desc').get(); // Show primary first
        const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return cards;
    } catch (error) {
        console.error(`[Cards Service - Backend] Error fetching cards for ${userId}:`, error);
        throw new Error("Could not retrieve saved cards.");
    }
}

/**
 * Adds and tokenizes a new card via the gateway, saving only non-sensitive metadata to Firestore.
 * @param userId The ID of the user.
 * @param cardMetadata Card details (number, expiry, CVV for tokenization, name, type).
 * @returns A promise resolving to the saved card metadata (excluding CVV).
 */
async function addCard(userId, cardMetadata) {
    if (!userId || !cardMetadata) throw new Error("User ID and card metadata required.");
    console.log(`[Cards Service - Backend] Adding card for user: ${userId}`);

    // 1. Tokenize Card with Payment Gateway (SIMULATED)
    // WARNING: CVV should ONLY be sent to the gateway for tokenization and MUST NOT be stored.
    const tokenizationDetails = {
        cardNumber: cardMetadata.cardNumber,
        expiryMonth: cardMetadata.expiryMonth,
        expiryYear: cardMetadata.expiryYear,
        cvv: cardMetadata.cvv, // Send CVV only for tokenization step
        cardHolderName: cardMetadata.cardHolderName,
    };
    const tokenResult = await paymentGatewayService.tokenizeCard(tokenizationDetails); // Assume PG service has this
    if (!tokenResult || !tokenResult.success || !tokenResult.token) {
        throw new Error(tokenResult?.message || "Failed to tokenize card with payment gateway.");
    }
    console.log("[Cards Service - Backend] Card tokenized successfully by gateway.");

    // 2. Prepare metadata for Firestore (NO CVV, NO FULL CARD NUMBER)
    const last4 = cardMetadata.cardNumber.slice(-4);
    const cardDataToSave = {
        gatewayToken: tokenResult.token, // Store the gateway token ID
        cardIssuer: tokenResult.cardIssuer || 'Unknown', // Get issuer from gateway if possible
        bankName: tokenResult.bankName || undefined, // Get bank from gateway if possible
        last4: last4,
        expiryMonth: cardMetadata.expiryMonth,
        expiryYear: cardMetadata.expiryYear,
        cardHolderName: cardMetadata.cardHolderName || null,
        cardType: cardMetadata.cardType, // 'Credit' or 'Debit'
        isPrimary: false, // Initially not primary
        userId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 3. Check if it's the first card to make it primary
    const cardsColRef = db.collection('users').doc(userId).collection('savedCards');
    const existingCardsSnap = await cardsColRef.limit(1).get();
    if (existingCardsSnap.empty) {
        cardDataToSave.isPrimary = true;
    }

    // 4. Save metadata to Firestore
    try {
        const docRef = await cardsColRef.add(cardDataToSave);
        console.log(`[Cards Service - Backend] Saved card metadata for user ${userId}, Doc ID: ${docRef.id}`);
        // Return the saved data (excluding sensitive details)
        const { cvv, cardNumber, ...clientSafeData } = cardMetadata; // Remove sensitive data
        return {
            id: docRef.id, // Use Firestore ID as the primary ID now
            ...clientSafeData, // Return original non-sensitive details
            ...cardDataToSave // Add the processed/saved metadata
        };
    } catch (error) {
         console.error(`[Cards Service - Backend] Error saving card metadata for ${userId}:`, error);
         // Optionally: Attempt to detokenize/remove card from gateway if DB save fails? Complex.
         throw new Error("Could not save card details.");
    }
}

/**
 * Deletes a saved card's metadata from Firestore and potentially the token from the gateway.
 * @param userId The ID of the user.
 * @param cardId The Firestore document ID of the card to delete.
 * @returns A promise resolving when deletion is complete.
 */
async function deleteCard(userId, cardId) {
    if (!userId || !cardId) throw new Error("User ID and Card ID required.");
    console.log(`[Cards Service - Backend] Deleting card ${cardId} for user ${userId}`);

    const cardDocRef = db.collection('users').doc(userId).collection('savedCards').doc(cardId);
    try {
        const cardSnap = await cardDocRef.get();
        if (!cardSnap.exists) throw new Error("Card not found.");
        const cardData = cardSnap.data();

        // Check if primary before deleting
        if (cardData.isPrimary) {
             const cardsColRef = db.collection('users').doc(userId).collection('savedCards');
             const allCardsSnap = await cardsColRef.get();
             if (allCardsSnap.size <= 1) {
                 throw new Error("Cannot delete the only saved card.");
             }
             throw new Error("Cannot delete primary card. Set another as primary first.");
        }

        // 1. Delete from Payment Gateway (if applicable and token stored)
        if (cardData.gatewayToken) {
            // await paymentGatewayService.deleteCardToken(cardData.gatewayToken); // Assume PG service function exists
            console.log(`[Cards Service - Backend] Simulated deletion of gateway token for card ${cardId}`);
        }

        // 2. Delete from Firestore
        await cardDocRef.delete();
        console.log(`[Cards Service - Backend] Deleted card ${cardId} from Firestore.`);
    } catch (error) {
         console.error(`[Cards Service - Backend] Error deleting card ${cardId} for ${userId}:`, error);
         throw error; // Re-throw original error
    }
}

/**
 * Sets a specific card as the primary payment method for the user in Firestore.
 * @param userId The ID of the user.
 * @param cardId The Firestore document ID of the card to set as primary.
 * @returns A promise resolving when the update is complete.
 */
async function setPrimaryCard(userId, cardId) {
    if (!userId || !cardId) throw new Error("User ID and Card ID required.");
    console.log(`[Cards Service - Backend] Setting card ${cardId} as primary for user ${userId}`);

    const cardsColRef = db.collection('users').doc(userId).collection('savedCards');
    const newPrimaryRef = cardsColRef.doc(cardId);

    try {
        const newPrimarySnap = await newPrimaryRef.get();
        if (!newPrimarySnap.exists) throw new Error("Card not found.");

        const batch = db.batch();

        // Find and unset current primary card(s)
        const currentPrimaryQuery = query(cardsColRef, where('isPrimary', '==', true));
        const currentPrimarySnap = await getDocs(currentPrimaryQuery);
        currentPrimarySnap.forEach(docSnap => {
             if (docSnap.id !== cardId) { // Don't unset if it's already the target card
                 batch.update(docSnap.ref, { isPrimary: false });
             }
        });

        // Set the new primary card
        batch.update(newPrimaryRef, { isPrimary: true });

        await batch.commit();
        console.log(`[Cards Service - Backend] Card ${cardId} set as primary.`);
    } catch (error) {
         console.error(`[Cards Service - Backend] Error setting primary card ${cardId} for ${userId}:`, error);
         throw new Error("Could not update primary card.");
    }
}


module.exports = {
    getSavedCards,
    addCard,
    deleteCard,
    setPrimaryCard,
};

// Add imports if needed by paymentGatewayService interaction
const { query, where, getDocs } = require('firebase/firestore');
