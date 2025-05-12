// backend/controllers/favoritesController.js
const { db, admin } = require('../config/firebaseAdmin');
const { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, serverTimestamp } = db;
const { simpleHash, parseUpiDataFromQr } = require('../services/scanService'); // Assuming scanService has these helpers

const USER_FAVORITE_QRS_COLLECTION = 'user_favorite_qrs';

/**
 * Adds a QR code to the user's favorites.
 */
exports.addFavorite = async (req, res, next) => {
    const userId = req.user.uid;
    const { qrData, payeeUpi, payeeName, customTagName, defaultAmount } = req.body;

    if (!qrData || !payeeUpi || !payeeName) {
        res.status(400);
        return next(new Error("QR Data, Payee UPI, and Payee Name are required."));
    }

    const qrHash = simpleHash(qrData);
    // Use a composite ID or query for existing to avoid duplicates if qrHash isn't unique enough per user
    const favoriteDocRef = doc(db, USER_FAVORITE_QRS_COLLECTION, `${userId}_${qrHash}`);

    try {
        const favoriteData = {
            userId,
            qrDataHash,
            qrData, // Store the full QR data for re-use
            payeeUpi,
            payeeName,
            customTagName: customTagName || null,
            defaultAmount: defaultAmount ? Number(defaultAmount) : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(favoriteDocRef, favoriteData, { merge: true }); // Use set with merge to create or update

        // Fetch the document to return it with server-generated timestamps
        const savedDoc = await getDoc(favoriteDocRef);
        const responseData = {
            ...savedDoc.data(),
            createdAt: savedDoc.data().createdAt.toDate().toISOString(),
            updatedAt: savedDoc.data().updatedAt.toDate().toISOString(),
        };

        res.status(201).json(responseData);
    } catch (error) {
        next(error);
    }
};

/**
 * Lists all favorite QRs for the current user.
 */
exports.listFavorites = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const q = query(collection(db, USER_FAVORITE_QRS_COLLECTION), where('userId', '==', userId), orderBy('payeeName')); // Order by name
        const snapshot = await getDocs(q);
        const favorites = snapshot.docs.map(docSnap => ({
            id: docSnap.id, // Firestore document ID (useful if not using composite ID for ref)
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt.toDate().toISOString(),
            updatedAt: docSnap.data().updatedAt.toDate().toISOString(),
        }));
        res.status(200).json(favorites);
    } catch (error) {
        next(error);
    }
};

/**
 * Removes a QR code from the user's favorites.
 */
exports.removeFavorite = async (req, res, next) => {
    const userId = req.user.uid;
    const { qrHash } = req.params; // Get qrHash from URL parameter

    if (!qrHash) {
        res.status(400);
        return next(new Error("QR Hash parameter is required."));
    }

    const favoriteDocRef = doc(db, USER_FAVORITE_QRS_COLLECTION, `${userId}_${qrHash}`);

    try {
        const docSnap = await getDoc(favoriteDocRef);
        if (!docSnap.exists() || docSnap.data().userId !== userId) {
            res.status(404);
            return next(new Error("Favorite QR not found or permission denied."));
        }

        await deleteDoc(favoriteDocRef);
        res.status(200).json({ success: true, message: 'Favorite QR removed successfully.' });
    } catch (error) {
        next(error);
    }
};
