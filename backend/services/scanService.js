
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
        return { pa, pn, am, tn, isValidUpi: !!pa };
    } catch (e) {
        console.error("Error parsing UPI QR data:", e);
        return null;
    }
}

/**
 * Validates a scanned QR code.
 * - Checks if it's a valid UPI QR.
 * - Checks against verified merchants list.
 * - Checks against blacklisted QR/UPI IDs.
 * - Logs the scan attempt.
 * - Does NOT penalize for repeated scans of the same valid QR by the same user.
 * @param {string} userId - The ID of the user scanning.
 * @param {string} qrData - The raw string data from the QR code.
 * @returns {Promise<object>} Validation result.
 */
async function validateScannedQr(userId, qrData) {
    console.log(`[Scan Service Backend] Validating QR for user ${userId}: ${qrData.substring(0, 50)}...`);
    let isVerifiedMerchant = false;
    let isBlacklisted = false;
    let merchantNameFromDb = null;
    let message = "QR code processed."; // Default message

    const parsedUpi = parseUpiDataFromQr(qrData);

    if (!parsedUpi || !parsedUpi.isValidUpi || !parsedUpi.pa) {
        await logScan(userId, qrData, false, false, "Invalid UPI QR format", null);
        return { isVerifiedMerchant, isBlacklisted, merchantNameFromDb: null, message: "Invalid UPI QR format." };
    }

    const upiId = parsedUpi.pa;

    // 1. Check against verified merchants
    try {
        const merchantRef = doc(db, VERIFIED_MERCHANTS_COLLECTION, upiId);
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists()) {
            isVerifiedMerchant = true;
            merchantNameFromDb = merchantSnap.data().merchantName || parsedUpi.pn;
            message = "Verified merchant."; // Update message
            console.log(`[Scan Service Backend] QR payee ${upiId} is a verified merchant: ${merchantNameFromDb}`);
        } else {
             message = "Payee is not a verified merchant. Proceed with caution."; // Update for unverified
        }
    } catch (e) {
        console.error("[Scan Service Backend] Error checking verified merchants:", e);
    }

    // 2. Check against blacklisted QRs/UPI IDs
    try {
        const qrHash = simpleHash(qrData);
        const blacklistRefByHash = doc(db, BLACKLISTED_QRS_COLLECTION, qrHash);
        const blacklistSnapByHash = await getDoc(blacklistRefByHash);

        const blacklistRefByUpi = doc(db, BLACKLISTED_QRS_COLLECTION, upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);

        if (blacklistSnapByHash.exists() || blacklistSnapByUpi.exists()) {
            isBlacklisted = true;
            const reason = blacklistSnapByHash.data()?.reason || blacklistSnapByUpi.data()?.reason || "Flagged as suspicious";
            message = `Warning: This QR code (${upiId}) is potentially fraudulent. Reason: ${reason}`;
            console.warn(`[Scan Service Backend] Blacklisted QR/UPI detected: ${upiId}. Reason: ${reason}`);
        }
    } catch (e) {
        console.error("[Scan Service Backend] Error checking blacklist:", e);
    }

    // 3. Log the scan attempt (isDuplicateRecent is now purely informational and handled client-side based on local checks)
    await logScan(userId, qrData, isVerifiedMerchant, isBlacklisted, message, parsedUpi);

    return {
        isVerifiedMerchant,
        isBlacklisted,
        isDuplicateRecent: false, // Backend doesn't gate on this. Client handles informational display.
        merchantNameFromDb: merchantNameFromDb, // Return name from DB or null
        message, // Return the final message
        upiId, // Return the parsed UPI ID for easier use by controller
    };
}

/**
 * Logs a scan attempt to Firestore.
 */
async function logScan(userId, qrData, isVerified, isBlacklisted, validationMessage, parsedUpiDetails) {
    try {
        // Store scans in a top-level collection, queryable by userId
        const scanLogColRef = collection(db, SCAN_LOG_COLLECTION);
        await addDoc(scanLogColRef, {
            userId,
            qrData,
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parsedUpiDetails?.pa || null,
            parsedPayeeName: parsedUpiDetails?.pn || null,
            parsedAmount: parsedUpiDetails?.am ? Number(parsedUpiDetails.am) : null,
            timestamp: FieldValue.serverTimestamp(),
            isVerifiedMerchant: isVerified,
            isFlaggedBlacklisted: isBlacklisted,
            validationMessage: validationMessage,
            // location: location ? new GeoPoint(location.latitude, location.longitude) : null,
        });
        console.log(`[Scan Service Backend] Scan logged for user ${userId}`);
    } catch (e) {
        console.error("[Scan Service Backend] Error logging scan:", e);
    }
}

/**
 * Saves a user's report about a QR code to Firestore.
 * @param {string} userId - The ID of the user reporting.
 * @param {string} qrData - The raw QR data.
 * @param {string} reason - The reason for reporting.
 * @returns {Promise<string>} The ID of the saved report document.
 */
async function reportQrCode(userId, qrData, reason) {
    console.log(`[Scan Service Backend] User ${userId} reporting QR. Reason: ${reason}`);
    if (!userId || !qrData || !reason) {
        throw new Error("User ID, QR Data, and Reason are required for reporting.");
    }
    try {
        const reportColRef = collection(db, REPORTED_QRS_COLLECTION);
        const docRef = await addDoc(reportColRef, {
            reporterUserId: userId,
            qrData,
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parseUpiDataFromQr(qrData)?.pa || null,
            reason,
            status: 'pending_review', // Initial status for admin review
            reportedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[Scan Service Backend] QR report saved from user ${userId}. Report ID: ${docRef.id}`);
        return docRef.id;
    } catch (e) {
        console.error("[Scan Service Backend] Error saving QR report:", e);
        throw new Error("Failed to submit QR report due to a server error.");
    }
}

// Simple hash function (can be improved if needed)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

module.exports = {
    validateScannedQr,
    reportQrCode,
    parseUpiDataFromQr,
};
