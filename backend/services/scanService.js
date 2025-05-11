
// backend/services/scanService.js
const { admin, db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue, GeoPoint } = admin.firestore; // FieldValue for serverTimestamp
const { collection, doc, getDoc, setDoc, addDoc, query, where, orderBy, limit, getDocs } = db; // Ensure all Firestore functions are from db
// Removed: const { addTransaction } = require('./transactionLogger'); // Scan logging is specific, not a generic transaction yet

const SCAN_LOG_COLLECTION = 'scan_logs';
const VERIFIED_MERCHANTS_COLLECTION = 'verified_merchants'; // Stores { merchantName, otherDetails... }
const BLACKLISTED_QRS_COLLECTION = 'blacklisted_qrs'; // Stores { qrDataHash or upiId, reason, reportedBy... }
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
        console.error("[Scan Service Backend] Error parsing UPI QR data:", e);
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
        await logScan(userId, qrData, false, false, false, "Invalid UPI QR format", null); // Added false for isDuplicateRecent
        return { isVerifiedMerchant, isBlacklisted, isDuplicateRecent: false, merchantNameFromDb: null, message: "Invalid UPI QR format.", upiId: null };
    }

    const upiId = parsedUpi.pa;

    // 1. Check against verified merchants
    try {
        const merchantRef = doc(db, VERIFIED_MERCHANTS_COLLECTION, upiId); // UPI ID is the document ID
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists()) {
            isVerifiedMerchant = true;
            merchantNameFromDb = merchantSnap.data().merchantName || parsedUpi.pn; // Prioritize DB name
            message = "Verified merchant.";
            console.log(`[Scan Service Backend] QR payee ${upiId} is a verified merchant: ${merchantNameFromDb}`);
        } else {
             message = "Payee is not a verified merchant. Proceed with caution.";
        }
    } catch (e) {
        console.error("[Scan Service Backend] Error checking verified merchants:", e);
    }

    // 2. Check against blacklisted QRs/UPI IDs
    try {
        // Check by UPI ID first
        const blacklistRefByUpi = doc(db, BLACKLISTED_QRS_COLLECTION, upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);
        let blacklistReason = null;

        if (blacklistSnapByUpi.exists()) {
            isBlacklisted = true;
            blacklistReason = blacklistSnapByUpi.data()?.reason || "Flagged as suspicious";
        } else {
            // If not blacklisted by UPI ID, check by QR hash (for specific QR instances)
            const qrHash = simpleHash(qrData);
            const blacklistRefByHash = doc(db, BLACKLISTED_QRS_COLLECTION, qrHash);
            const blacklistSnapByHash = await getDoc(blacklistRefByHash);
            if (blacklistSnapByHash.exists()) {
                isBlacklisted = true;
                blacklistReason = blacklistSnapByHash.data()?.reason || "This specific QR code is flagged";
            }
        }
        
        if (isBlacklisted) {
            message = `Warning: This QR code (${upiId}) is potentially fraudulent. Reason: ${blacklistReason}`;
            console.warn(`[Scan Service Backend] Blacklisted QR/UPI detected: ${upiId}. Reason: ${blacklistReason}`);
        }
    } catch (e) {
        console.error("[Scan Service Backend] Error checking blacklist:", e);
    }

    // 3. Check for recent duplicate scans (informational, client can decide to warn user)
    let isDuplicateRecent = false;
    try {
        const qrHash = simpleHash(qrData);
        const recentScanQuery = query(
            collection(db, SCAN_LOG_COLLECTION),
            where('userId', '==', userId),
            where('qrDataHash', '==', qrHash),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        const recentScanSnap = await getDocs(recentScanQuery);
        if (!recentScanSnap.empty) {
            const lastScanTime = recentScanSnap.docs[0].data().timestamp.toDate();
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minute cooldown
            if (lastScanTime > fiveMinutesAgo) {
                isDuplicateRecent = true;
                 // message = "This QR was scanned recently. Proceed if intended."; // Append to existing message
                console.log(`[Scan Service Backend] Duplicate scan detected for user ${userId}, QR hash ${qrHash}`);
            }
        }
    } catch (e) {
        console.error("[Scan Service Backend] Error checking for duplicate scans:", e);
    }


    // 4. Log the scan attempt
    await logScan(userId, qrData, isVerifiedMerchant, isBlacklisted, isDuplicateRecent, message, parsedUpi);

    return {
        isVerifiedMerchant,
        isBlacklisted,
        isDuplicateRecent,
        merchantNameFromDb: merchantNameFromDb,
        message,
        upiId, // Return the parsed UPI ID
    };
}

/**
 * Logs a scan attempt to Firestore.
 */
async function logScan(userId, qrData, isVerified, isBlacklisted, isDuplicateRecent, validationMessage, parsedUpiDetails) {
    try {
        const scanLogColRef = collection(db, SCAN_LOG_COLLECTION);
        await addDoc(scanLogColRef, {
            userId,
            qrData,
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parsedUpiDetails?.pa || null,
            parsedPayeeName: parsedUpiDetails?.pn || null,
            parsedAmount: parsedUpiDetails?.am ? Number(parsedUpiDetails.am) : null,
            timestamp: FieldValue.serverTimestamp(), // Use server timestamp
            isVerifiedMerchant: isVerified,
            isFlaggedBlacklisted: isBlacklisted,
            isDuplicateRecent, // Log if it was a recent duplicate
            validationMessage: validationMessage,
            // location: location ? new GeoPoint(location.latitude, location.longitude) : null, // GeoPoint if available
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
        const parsedUpi = parseUpiDataFromQr(qrData);
        const docRef = await addDoc(reportColRef, {
            reporterUserId: userId,
            qrData,
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parsedUpi?.pa || null,
            parsedPayeeName: parsedUpi?.pn || null, // Store parsed name too
            reason,
            status: 'pending_review', // Initial status for admin review
            reportedAt: FieldValue.serverTimestamp(), // Use server timestamp
        });
        console.log(`[Scan Service Backend] QR report saved from user ${userId}. Report ID: ${docRef.id}`);
        return docRef.id;
    } catch (e) {
        console.error("[Scan Service Backend] Error saving QR report:", e);
        throw new Error("Failed to submit QR report due to a server error.");
    }
}

// Simple hash function (can be improved if needed, e.g., crypto.createHash)
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
    parseUpiDataFromQr, // Export for potential use in controller
};
