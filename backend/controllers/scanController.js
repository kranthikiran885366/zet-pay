// backend/controllers/scanController.js
const { admin, db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue, GeoPoint } = admin.firestore;
const { collection, doc, getDoc, setDoc, addDoc, query, where, orderBy, limit, getDocs, distinct } = db; // Added distinct
const scanService = require('../services/scanService'); // Assuming backend scanService for parsing

const SCAN_LOG_COLLECTION = 'scan_logs';
const VERIFIED_MERCHANTS_COLLECTION = 'verified_merchants';
const BLACKLISTED_QRS_COLLECTION = 'blacklisted_qrs';
const REPORTED_QRS_COLLECTION = 'reported_qrs';
const TRANSACTIONS_COLLECTION = 'transactions';
const USER_FAVORITE_QRS_COLLECTION = 'user_favorite_qrs';


/**
 * Validates scanned QR data.
 * Checks against verified merchants, blacklisted QRs, reported QRs.
 * Checks for past payments to suggest amounts.
 * Checks if the QR is a user favorite.
 * Logs the scan attempt.
 */
exports.validateQr = async (req, res, next) => {
    const userId = req.user.uid; // From authMiddleware
    const { qrData, signature: signatureFromQr, stealthModeInitiated = false } = req.body;

    console.log(`[Scan Ctrl] Validating QR for user ${userId}${stealthModeInitiated ? ' (Stealth Mode)' : ''}`);

    let isVerifiedMerchant = false;
    let isBlacklisted = false;
    let merchantNameFromDb = null;
    let message = "QR code processed.";
    let hasValidSignature = false;
    let isReportedPreviously = false;
    let pastPaymentSuggestions = [];
    let isFavorite = false;
    let customTagName = null;

    const parsedUpi = scanService.parseUpiDataFromQr(qrData); // Use backend scanService

    if (!parsedUpi || !parsedUpi.isValidUpi || !parsedUpi.pa) {
        await scanService.logScan(userId, qrData, false, false, false, "Invalid UPI QR format", null, false, false, stealthModeInitiated);
        return res.status(400).json({ message: "Invalid UPI QR format.", upiId: null });
    }

    const upiId = parsedUpi.pa;
    const qrSignature = signatureFromQr || parsedUpi.sign;
    const qrHash = scanService.simpleHash(qrData); // Use backend scanService hash

    try {
        // Check verified merchants
        const merchantRef = doc(db, VERIFIED_MERCHANTS_COLLECTION, upiId);
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists() && merchantSnap.data().isVerified === true) {
            isVerifiedMerchant = true;
            merchantNameFromDb = merchantSnap.data().merchantName || parsedUpi.pn;
        }

        // Check blacklist
        const blacklistRefByUpi = doc(db, BLACKLISTED_QRS_COLLECTION, upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
            isBlacklisted = true;
            message = `Warning: This UPI ID (${upiId}) is blacklisted. Reason: ${blacklistSnapByUpi.data()?.reason || 'Suspicious Activity'}`;
        }

        // Check reported QRs
        const reportedQrQuery = query(
            collection(db, REPORTED_QRS_COLLECTION),
            where('qrDataHash', '==', qrHash),
            limit(1)
        );
        const reportedSnap = await getDocs(reportedQrQuery);
        if (!reportedSnap.empty) {
            isReportedPreviously = true;
            message = `Warning: This QR code has been reported previously. ${isBlacklisted ? message : ''}`.trim();
        }
        
        // Check signature (conceptual)
        if (qrSignature === "VALID_SIGNATURE_XYZ" || qrSignature === "MOCK_SIGNATURE_VALID" || qrSignature === "MOCK_SIGNATURE_LIVE") {
            hasValidSignature = true;
        }

        // Check for past payments to this UPI ID by this user
        const transactionsQuery = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where('userId', '==', userId),
            where('upiId', '==', upiId), // Assuming 'upiId' field on transaction stores payee UPI
            where('status', '==', 'Completed'),
            orderBy('date', 'desc'),
            limit(3) // Get last 3 payment amounts
        );
        const transactionsSnap = await getDocs(transactionsQuery);
        if (!transactionsSnap.empty) {
            pastPaymentSuggestions = transactionsSnap.docs.map(txDoc => Math.abs(txDoc.data().amount)).filter((v, i, a) => a.indexOf(v) === i); // Unique amounts
        }
        
        // Check if this QR is a favorite for the user
        const favoriteQrRef = doc(db, USER_FAVORITE_QRS_COLLECTION, `${userId}_${qrHash}`); // Example composite ID or query by fields
        const favoriteQrSnap = await getDoc(favoriteQrRef);
        if (favoriteQrSnap.exists()) {
            isFavorite = true;
            customTagName = favoriteQrSnap.data().customTagName || null;
            // Optionally add favorite's defaultAmount to suggestions if not already present
            const favDefaultAmount = favoriteQrSnap.data().defaultAmount;
            if (favDefaultAmount && !pastPaymentSuggestions.includes(favDefaultAmount)) {
                pastPaymentSuggestions.unshift(favDefaultAmount); // Add to beginning
                pastPaymentSuggestions = pastPaymentSuggestions.slice(0,3); // Keep suggestions to 3
            }
        }


        // Final message construction
        if (isBlacklisted) {
            // Message already set for blacklist
        } else if (isReportedPreviously && !isVerifiedMerchant) {
            message = "Warning: This QR code has been reported and the payee is not verified. Proceed with extreme caution.";
        } else if (isReportedPreviously) {
            message = "Warning: This QR code has been reported. Proceed with caution.";
        } else if (isVerifiedMerchant && hasValidSignature) {
            message = "Verified Merchant & Authentic QR.";
        } else if (isVerifiedMerchant) {
            message = "Verified Merchant.";
        } else if (hasValidSignature) {
            message = "Authentic QR. Payee not verified.";
        } else {
            message = "Payee is not verified. Proceed with caution.";
        }


        await scanService.logScan(userId, qrData, isVerifiedMerchant, isBlacklisted, false, message, parsedUpi, hasValidSignature, isReportedPreviously, stealthModeInitiated);

        res.status(200).json({
            isVerifiedMerchant,
            isBlacklisted,
            merchantNameFromDb: merchantNameFromDb || parsedUpi.pn, // Use DB name if available
            payeeAddress: upiId, // from parsedUpi.pa
            amount: parsedUpi.am,
            note: parsedUpi.tn,
            message,
            upiId, // Redundant but keeping for consistency with previous structure
            hasValidSignature,
            isReportedPreviously,
            pastPaymentSuggestions,
            isFavorite,
            customTagName
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Reports a QR code as fraudulent or suspicious.
 * Stores the report for admin review.
 */
exports.reportQr = async (req, res, next) => {
    const userId = req.user.uid;
    const { qrData, reason } = req.body;

    if (!qrData || !reason || !reason.trim()) {
         res.status(400);
         return next(new Error('QR Data and Reason are required for reporting.'));
    }

    try {
        const reportId = await scanService.reportQrCode(userId, qrData, reason);
        res.status(200).json({ success: true, message: 'QR code reported successfully.', reportId });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches recently scanned QRs for which a payment was made by the user.
 */
exports.getRecentScans = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const q = query(
            collection(db, SCAN_LOG_COLLECTION),
            where('userId', '==', userId),
            where('paymentMade', '==', true), // Only QRs that led to a payment
            orderBy('timestamp', 'desc'),
            limit(10) // Limit to last 10 paid scans initially
        );
        const snapshot = await getDocs(q);
        
        const recentScansMap = new Map();
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const parsed = scanService.parseUpiDataFromQr(data.qrData);
            if (parsed && parsed.isValidUpi && parsed.pa && !recentScansMap.has(parsed.pa)) { // Show distinct payees
                recentScansMap.set(parsed.pa, {
                    qrDataHash: data.qrDataHash, // Or scanService.simpleHash(data.qrData)
                    qrData: data.qrData,
                    payeeName: parsed.pn || data.parsedPayeeName,
                    payeeUpi: parsed.pa,
                    lastAmountPaid: data.parsedAmount || undefined, // Assuming logScan stores amount if payment made
                    lastPaidDate: data.timestamp.toDate().toISOString(),
                    paymentTransactionId: data.paymentTransactionId || undefined
                });
            }
        });
        
        const distinctRecentScans = Array.from(recentScansMap.values()).slice(0, 5); // Take top 5 distinct

        res.status(200).json(distinctRecentScans);
    } catch (error) {
        next(error);
    }
};
