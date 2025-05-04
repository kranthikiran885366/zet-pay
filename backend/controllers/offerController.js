
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger

// Get Active Offers (non-user specific)
exports.getActiveOffers = async (req, res, next) => {
    try {
        const offersColRef = db.collection('offers');
        const q = query(offersColRef,
            where('isActive', '==', true),
            where('validUntil', '>=', admin.firestore.Timestamp.now()),
            orderBy('validUntil', 'asc')
        );
        const querySnapshot = await getDocs(q);
        const offers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(offers);
    } catch (error) {
        next(error);
    }
};

// Get Offer Details (non-user specific)
exports.getOfferDetails = async (req, res, next) => {
    const { offerId } = req.params;
    try {
        const offerDocRef = db.collection('offers').doc(offerId);
        const offerDocSnap = await offerDocRef.get();

        if (!offerDocSnap.exists) {
            return res.status(404).json({ message: 'Offer not found.' });
        }
        res.status(200).json({ id: offerDocSnap.id, ...offerDocSnap.data() });
    } catch (error) {
        next(error);
    }
};

// Get User-Specific Scratch Cards
exports.getScratchCards = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const cardsColRef = db.collection('scratchCards');
        const q = query(cardsColRef,
            where('userId', '==', userId),
            where('expiryDate', '>=', admin.firestore.Timestamp.now()), // Only non-expired
            orderBy('expiryDate', 'asc') // Show soon-to-expire first
        );
        const querySnapshot = await getDocs(q);
        const cards = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert timestamps for client if needed
                expiryDate: data.expiryDate.toDate(),
                createdAt: data.createdAt.toDate(),
                scratchedAt: data.scratchedAt ? data.scratchedAt.toDate() : undefined
            };
        });
        res.status(200).json(cards);
    } catch (error) {
        next(error);
    }
};

// Scratch a Card
exports.scratchCard = async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId } = req.params;

    if (!cardId) return res.status(400).json({ message: 'Card ID is required.' });

    const cardDocRef = db.collection('scratchCards').doc(cardId);
    const walletDocRef = db.collection('wallets').doc(userId); // For crediting reward

    try {
        let finalCardData;
        await db.runTransaction(async (transaction) => {
            const cardDoc = await transaction.get(cardDocRef);
            if (!cardDoc.exists) throw new Error("Scratch card not found.");

            const cardData = cardDoc.data();
            if (cardData.userId !== userId) throw new Error("Permission denied.");
            if (cardData.isScratched) throw new Error("Card already scratched.");
            if (admin.firestore.Timestamp.now() > cardData.expiryDate) throw new Error("Scratch card has expired.");

            // Simulate reward generation
            const wonAmount = Math.random() > 0.3 ? Math.floor(Math.random() * 50) + 5 : 0;
            const message = wonAmount > 0 ? `You won ₹${wonAmount} Cashback!` : "Better luck next time!";

            const updateData = {
                isScratched: true,
                rewardAmount: wonAmount > 0 ? wonAmount : null,
                message: message,
                scratchedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            transaction.update(cardDocRef, updateData);

            // Credit wallet if amount won
            if (wonAmount > 0) {
                const walletDoc = await transaction.get(walletDocRef);
                let currentBalance = 0;
                if (!walletDoc.exists) {
                     console.warn(`Wallet for user ${userId} not found during scratch reward, creating...`);
                     transaction.set(walletDocRef, { userId, balance: wonAmount, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
                } else {
                     currentBalance = walletDoc.data().balance || 0;
                     transaction.update(walletDocRef, { balance: currentBalance + wonAmount, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
                }
            }
            // Prepare data to return (timestamps will be resolved after commit)
            finalCardData = { id: cardId, ...cardData, ...updateData };
        });

         // Log transaction if cashback won
         if (finalCardData.rewardAmount > 0) {
             const logData = {
                 type: 'Cashback',
                 name: 'Scratch Card Reward',
                 description: `Won from card ${cardId}`,
                 amount: finalCardData.rewardAmount,
                 status: 'Completed',
                 userId: userId,
             };
             const loggedTx = await addTransaction(logData);
             // Log to blockchain (optional)
             logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: logData.amount, date: new Date() })
                 .catch(err => console.error("Blockchain log failed:", err));
         }

        // Fetch the final data again to get resolved timestamps
        const finalSnap = await cardDocRef.get();
        const resolvedData = finalSnap.data();
        res.status(200).json({
            id: finalSnap.id,
            ...resolvedData,
            expiryDate: resolvedData.expiryDate.toDate(),
            createdAt: resolvedData.createdAt.toDate(),
            scratchedAt: resolvedData.scratchedAt ? resolvedData.scratchedAt.toDate() : undefined,
        });

    } catch (error) {
        next(error);
    }
};

// Add controllers for Loyalty Status and Referral Status if needed
exports.getLoyaltyStatus = async (req, res, next) => { /* ... */ };
exports.getReferralStatus = async (req, res, next) => { /* ... */ };
