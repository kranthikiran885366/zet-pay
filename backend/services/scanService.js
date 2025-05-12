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
 * @returns {Promise<object>} Validation result.
 */
async function validateScannedQr(userId, qrData, signatureFromQr) {
    console.log(`[Scan Service Backend] Validating QR for user ${userId}: ${qrData.substring(0, 50)}...`);
    let isVerifiedMerchant = false;
    let isBlacklisted = false;
    let merchantNameFromDb = null;
    let message = "QR code processed.";
    let hasValidSignature = false; // New check
    let isReportedPreviously = false; // New check

    const parsedUpi = parseUpiDataFromQr(qrData);

    if (!parsedUpi || !parsedUpi.isValidUpi || !parsedUpi.pa) {
        await logScan(userId, qrData, false, false, false, "Invalid UPI QR format", null, false, false);
        return { isVerifiedMerchant, isBlacklisted, isDuplicateRecent: false, merchantNameFromDb: null, message: "Invalid UPI QR format.", upiId: null, hasValidSignature, isReportedPreviously };
    }

    const upiId = parsedUpi.pa;
    const qrSignature = signatureFromQr || parsedUpi.sign; // Use signature from param if provided, else from parsed QR

    // 1. Check against verified merchants
    try {
        const merchantRef = doc(db, VERIFIED_MERCHANTS_COLLECTION, upiId);
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists() && merchantSnap.data().isVerified === true) {
            isVerifiedMerchant = true;
            merchantNameFromDb = merchantSnap.data().merchantName || parsedUpi.pn;
            message = "Verified merchant.";
        } else {
             message = "Payee is not a verified merchant. Proceed with caution.";
        }
    } catch (e) { console.error("[Scan Service Backend] Error checking verified merchants:", e); }

    // 2. Check against blacklisted QRs/UPI IDs
    try {
        const blacklistRefByUpi = doc(db, BLACKLISTED_QRS_COLLECTION, upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        if (blacklistSnapByUpi.exists()) {
            isBlacklisted = true;
            message = `Warning: This UPI ID (${upiId}) is blacklisted. Reason: ${blacklistSnapByUpi.data()?.reason || 'Suspicious Activity'}`;
        }
    } catch (e) { console.error("[Scan Service Backend] Error checking blacklist:", e); }

    // 3. Conceptual Watermark/Digital Signature Check
    if (qrSignature) {
        // In a real system, this would involve cryptographic verification
        // For simulation: assume valid if signature exists and matches a pattern
        if (qrSignature === "VALID_SIGNATURE_XYZ" || qrSignature === "MOCK_SIGNATURE_LIVE") { // Example valid signatures
            hasValidSignature = true;
            console.log(`[Scan Service Backend] QR Signature/Watermark for ${upiId} considered valid.`);
        } else {
            console.warn(`[Scan Service Backend] QR Signature/Watermark for ${upiId} is present but considered invalid: ${qrSignature}`);
            // Optionally set a specific message if signature is invalid
        }
    }

    // 4. Check if QR has been reported previously
    try {
        const qrHash = simpleHash(qrData);
        const reportedQrQuery = query(
            collection(db, REPORTED_QRS_COLLECTION),
            where('qrDataHash', '==', qrHash), // Check by hash for specific QR
            limit(1)
        );
        const reportedSnap = await getDocs(reportedQrQuery);
        if (!reportedSnap.empty) {
            isReportedPreviously = true;
            message = `Warning: This QR code has been reported previously. ${message}`; // Append to existing message
            console.warn(`[Scan Service Backend] QR code ${qrHash} (UPI: ${upiId}) has been reported previously.`);
        }
    } catch(e) { console.error("[Scan Service Backend] Error checking previously reported QRs:", e); }

    // Determine final message based on checks
    if (isBlacklisted) {
        // Blacklist message already set
    } else if (isReportedPreviously) {
        // Reported message already appended or set
    } else if (isVerifiedMerchant && hasValidSignature) {
        message = "Verified Merchant & Authentic QR.";
    } else if (isVerifiedMerchant) {
        message = "Verified Merchant. QR authenticity not fully confirmed.";
    } else if (hasValidSignature) {
        message = "Authentic QR (Signature Valid). Merchant not verified.";
    } else {
        // Default message: "Payee is not a verified merchant. Proceed with caution."
    }


    // 5. Log the scan attempt (isDuplicateRecent is handled client-side for immediate feedback)
    await logScan(userId, qrData, isVerifiedMerchant, isBlacklisted, false /* isDuplicateRecent - client handles this */, message, parsedUpi, hasValidSignature, isReportedPreviously);

    return {
        isVerifiedMerchant,
        isBlacklisted,
        isDuplicateRecent: false, // Client handles immediate duplicate feedback
        merchantNameFromDb,
        message,
        upiId,
        hasValidSignature,
        isReportedPreviously,
    };
}

/**
 * Logs a scan attempt to Firestore.
 */
async function logScan(userId, qrData, isVerified, isBlacklisted, isDuplicateRecent, validationMessage, parsedUpiDetails, hasValidSignature, isReportedPreviously) {
    try {
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
            // isDuplicateRecent, // This is now primarily a client-side check for immediate UI feedback
            validationMessage: validationMessage,
            hasValidSignature,
            isReportedPreviously,
        });
    } catch (e) {
        console.error("[Scan Service Backend] Error logging scan:", e);
    }
}

/**
 * Saves a user's report about a QR code to Firestore.
 */
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
    parseUpiDataFromQr,
};
