// backend/services/scanService.js
const { admin, db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue, GeoPoint } = admin.firestore;
const { collection, doc, getDoc, setDoc, addDoc, query, where, orderBy, limit, getDocs } = db;

const SCAN_LOG_COLLECTION = 'scan_logs';
const VERIFIED_MERCHANTS_COLLECTION = 'verified_merchants';
const BLACKLISTED_QRS_COLLECTION = 'blacklisted_qrs';
const REPORTED_QRS_COLLECTION = 'reported_qrs';

// Helper to parse UPI URL (simple version, might need improvement)
function parseUpiDataFromQr(qrDataString) {
    try {
        if (!qrDataString.startsWith('upi://pay')) return null;
        const params = new URLSearchParams(qrDataString.substring(qrDataString.indexOf('?') + 1));
        const pa = params.get('pa'); // Payee Address (UPI ID)
        const pn = params.get('pn'); // Payee Name
        const am = params.get('am'); // Amount
        const tn = params.get('tn'); // Transaction Note / Description
        const sign = params.get('sign'); // Digital Signature / Watermark
        return { pa, pn, am, tn, sign, isValidUpi: !!pa };
    } catch (e) {
        console.error("[Scan Service Backend] Error parsing UPI QR data:", e);
        return null;
    }
}

// Simple hash function
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString();
}

/**
 * Validates a scanned QR code.
 * - Checks if it's a valid UPI QR.
 * - Checks against verified merchants list.
 * - Checks against blacklisted QR/UPI IDs.
 * - Checks for watermark/digital signature (conceptual).
 * - Checks if QR has been reported previously.
 * - Logs the scan attempt.
 * @param {string} userId - The ID of the user scanning.
 * @param {string} qrData - The raw string data from the QR code.
 * @param {string} [signatureFromQr] - Optional signature extracted from QR.
 * @param {boolean} [stealthModeInitiated] - Flag if scan was initiated in stealth mode.
 * @returns {Promise<object>} Validation result.
 */
async function validateScannedQr(userId, qrData, signatureFromQr, stealthModeInitiated = false) {
    console.log(`[Scan Service Backend] Validating QR for user ${userId}${stealthModeInitiated ? ' (Stealth Mode)' : ''}: ${qrData.substring(0, 50)}...`);
    let isVerifiedMerchant = false;
    let isBlacklisted = false;
    let merchantNameFromDb = null;
    let message = "QR code processed.";
    let hasValidSignature = false;
    let isReportedPreviously = false;

    const parsedUpi = parseUpiDataFromQr(qrData);

    if (!parsedUpi || !parsedUpi.isValidUpi || !parsedUpi.pa) {
        await logScan(userId, qrData, false, false, false, "Invalid UPI QR format", null, false, false, stealthModeInitiated);
        // This function is called by a controller, so it should return data for the controller to send as response
        // Throwing an error or returning a specific error structure might be better than returning this directly.
        // For now, matching the expected structure from controller.
        return { isVerifiedMerchant, isBlacklisted, merchantNameFromDb: null, message: "Invalid UPI QR format.", upiId: null, hasValidSignature, isReportedPreviously };
    }

    const upiId = parsedUpi.pa;
    const qrSignature = signatureFromQr || parsedUpi.sign;
    const qrHash = simpleHash(qrData);

    try {
        const merchantRef = doc(db, VERIFIED_MERCHANTS_COLLECTION, upiId);
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists() && merchantSnap.data().isVerified === true) {
            isVerifiedMerchant = true;
            merchantNameFromDb = merchantSnap.data().merchantName || parsedUpi.pn;
        }
    } catch (e) { console.error("[Scan Service Backend] Error checking verified merchants:", e); }

    try {
        const blacklistRefByUpi = doc(db, BLACKLISTED_QRS_COLLECTION, upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
            isBlacklisted = true;
            message = `Warning: This UPI ID (${upiId}) is blacklisted. Reason: ${blacklistSnapByUpi.data()?.reason || 'Suspicious Activity'}`;
        }
    } catch (e) { console.error("[Scan Service Backend] Error checking blacklist:", e); }

    if (qrSignature) {
        if (qrSignature === "VALID_SIGNATURE_XYZ" || qrSignature === "MOCK_SIGNATURE_LIVE") {
            hasValidSignature = true;
            console.log(`[Scan Service Backend] QR Signature for ${upiId} considered valid.`);
        } else {
            console.warn(`[Scan Service Backend] QR Signature for ${upiId} is present but considered invalid: ${qrSignature}`);
        }
    }

    try {
        const reportedQrQuery = query(
            collection(db, REPORTED_QRS_COLLECTION),
            where('qrDataHash', '==', qrHash),
            limit(1)
        );
        const reportedSnap = await getDocs(reportedQrQuery);
        if (!reportedSnap.empty) {
            isReportedPreviously = true;
            // Append to message if not blacklisted, otherwise blacklist message takes precedence
            if (!isBlacklisted) {
                 message = `Warning: This QR code has been reported previously. ${message}`;
            }
            console.warn(`[Scan Service Backend] QR code ${qrHash} (UPI: ${upiId}) has been reported previously.`);
        }
    } catch(e) { console.error("[Scan Service Backend] Error checking previously reported QRs:", e); }
    
    // Refine message logic
    if (!isBlacklisted && !isReportedPreviously) {
        if (isVerifiedMerchant && hasValidSignature) {
            message = "Verified Merchant & Authentic QR.";
        } else if (isVerifiedMerchant) {
            message = "Verified Merchant.";
        } else if (hasValidSignature) {
            message = "Authentic QR. Payee not verified.";
        } else {
             message = "Payee is not verified. Proceed with caution.";
        }
    }


    await logScan(userId, qrData, isVerifiedMerchant, isBlacklisted, false, message, parsedUpiDetails, hasValidSignature, isReportedPreviously, stealthModeInitiated);

    return {
        isVerifiedMerchant,
        isBlacklisted,
        merchantNameFromDb, // Will be null if not verified or no specific name in DB
        message,
        upiId, // This is parsedUpi.pa
        hasValidSignature,
        isReportedPreviously,
        // These fields will be populated by the controller after this service call
        // pastPaymentSuggestions: [], 
        // isFavorite: false,
        // customTagName: null
    };
}

/**
 * Logs a scan attempt to Firestore.
 */
async function logScan(userId, qrData, isVerified, isBlacklisted, isDuplicateRecent, validationMessage, parsedUpiDetails, hasValidSignature, isReportedPreviously, stealthMode, paymentMade = false, paymentTransactionId = null) {
    try {
        const scanLogColRef = collection(db, SCAN_LOG_COLLECTION);
        const logData = {
            userId,
            qrData,
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parsedUpiDetails?.pa || null,
            parsedPayeeName: parsedUpiDetails?.pn || null,
            parsedAmount: parsedUpiDetails?.am ? Number(parsedUpiDetails.am) : null,
            timestamp: FieldValue.serverTimestamp(),
            isVerifiedMerchant: isVerified,
            isFlaggedBlacklisted: isBlacklisted, // Use specific name
            isDuplicateRecentScan: isDuplicateRecent, // Use specific name
            validationMessage: validationMessage,
            hasValidSignature,
            isReportedPreviously,
            stealthMode: stealthMode || false,
            paymentMade, // New field
            paymentTransactionId // New field
        };
        // Remove undefined fields before saving
        Object.keys(logData).forEach(key => logData[key] === undefined && delete logData[key]);
        await addDoc(scanLogColRef, logData);

    } catch (e) {
        console.error("[Scan Service Backend] Error logging scan:", e);
    }
}

async function reportQrCode(userId, qrData, reason) {
    if (!userId || !qrData || !reason) {
        throw new Error("User ID, QR Data, and Reason are required for reporting.");
    }
    try {
        const reportColRef = collection(db, REPORTED_QRS_COLLECTION);
        const parsedUpi = parseUpiDataFromQr(qrData);
        const docRef = await addDoc(reportColRef, {
            reporterUserId: userId,
            qrData,
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parsedUpi?.pa || null,
            parsedPayeeName: parsedUpi?.pn || null,
            reason,
            status: 'pending_review',
            reportedAt: FieldValue.serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("[Scan Service Backend] Error saving QR report:", e);
        throw new Error("Failed to submit QR report due to a server error.");
    }
}

module.exports = {
    validateScannedQr,
    reportQrCode,
    parseUpiDataFromQr, // Export for use in other services/controllers
    simpleHash, // Export for use in other services/controllers
    logScan // Export if needed by other parts, e.g. controller updates scan log after payment
};
