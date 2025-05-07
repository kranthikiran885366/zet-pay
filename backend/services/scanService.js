
// backend/services/scanService.js
const { admin, db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue, GeoPoint } = admin.firestore;
const { collection, doc, getDoc, setDoc, addDoc, query, where, orderBy, limit, getDocs } = db; // Firestore admin SDK functions

const RECENT_SCAN_WINDOW_MINUTES = 5; // Check for duplicates within last 5 minutes by same user
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
 * - Checks for recent duplicate scans by the same user.
 * - Logs the scan attempt.
 * @param {string} userId - The ID of the user scanning.
 * @param {string} qrData - The raw string data from the QR code.
 * @returns {Promise<object>} Validation result.
 */
async function validateScannedQr(userId, qrData) {
    console.log(`[Scan Service] Validating QR for user ${userId}: ${qrData.substring(0, 50)}...`);
    let isVerifiedMerchant = false;
    let isBlacklisted = false;
    let isDuplicateRecent = false;
    let merchantNameFromDb = null;
    let message = "QR code processed.";

    const parsedUpi = parseUpiDataFromQr(qrData);

    if (!parsedUpi || !parsedUpi.isValidUpi || !parsedUpi.pa) {
        await logScan(userId, qrData, false, false, false, null, "Invalid UPI QR format");
        return { isVerifiedMerchant, isBlacklisted, isDuplicateRecent, merchantName: null, message: "Invalid UPI QR format." };
    }

    const upiId = parsedUpi.pa;

    // 1. Check against verified merchants
    try {
        const merchantRef = doc(db, VERIFIED_MERCHANTS_COLLECTION, upiId);
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists()) {
            isVerifiedMerchant = true;
            merchantNameFromDb = merchantSnap.data().merchantName || parsedUpi.pn; // Use DB name if available
            console.log(`[Scan Service] QR payee ${upiId} is a verified merchant: ${merchantNameFromDb}`);
        }
    } catch (e) {
        console.error("[Scan Service] Error checking verified merchants:", e);
    }

    // 2. Check against blacklisted QRs/UPI IDs
    try {
        // Can blacklist by full QR hash or just UPI ID
        const qrHash = simpleHash(qrData); // Basic hash, consider stronger for production
        const blacklistRefByHash = doc(db, BLACKLISTED_QRS_COLLECTION, qrHash);
        const blacklistSnapByHash = await getDoc(blacklistRefByHash);

        const blacklistRefByUpi = doc(db, BLACKLISTED_QRS_COLLECTION, upiId);
        const blacklistSnapByUpi = await getDoc(blacklistRefByUpi);

        if (blacklistSnapByHash.exists() || blacklistSnapByUpi.exists()) {
            isBlacklisted = true;
            const reason = blacklistSnapByHash.data()?.reason || blacklistSnapByUpi.data()?.reason || "Flagged as suspicious";
            message = `Warning: This QR code (${upiId}) is potentially fraudulent. Reason: ${reason}`;
            console.warn(`[Scan Service] Blacklisted QR/UPI detected: ${upiId}. Reason: ${reason}`);
        }
    } catch (e) {
        console.error("[Scan Service] Error checking blacklist:", e);
    }

    // 3. Check for recent duplicate scans by this user
    try {
        const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - RECENT_SCAN_WINDOW_MINUTES * 60 * 1000);
        const recentScansQuery = query(
            collection(db, SCAN_LOG_COLLECTION, userId, 'scans'),
            where('qrDataHash', '==', simpleHash(qrData)),
            where('timestamp', '>=', fiveMinutesAgo),
            limit(1)
        );
        const recentScansSnap = await getDocs(recentScansQuery);
        if (!recentScansSnap.empty) {
            isDuplicateRecent = true;
            if (!isBlacklisted) { // Don't overwrite blacklist message
                 message = "This QR code was scanned recently. Proceed with caution.";
            }
            console.log(`[Scan Service] Duplicate scan detected for user ${userId}, QR hash ${simpleHash(qrData)}`);
        }
    } catch (e) {
        console.error("[Scan Service] Error checking duplicate scans:", e);
    }

    // 4. Log the scan attempt
    await logScan(userId, qrData, isVerifiedMerchant, isBlacklisted, isDuplicateRecent, parsedUpi, message);

    return {
        isVerifiedMerchant,
        isBlacklisted,
        isDuplicateRecent,
        merchantName: merchantNameFromDb || parsedUpi.pn, // Return name from DB or QR
        payeeAddress: parsedUpi.pa,
        amount: parsedUpi.am,
        note: parsedUpi.tn,
        message
    };
}

/**
 * Logs a scan attempt to Firestore.
 */
async function logScan(userId, qrData, isVerified, isBlacklisted, isDuplicate, parsedUpiDetails, validationMessage) {
    try {
        const scanLogRef = collection(db, SCAN_LOG_COLLECTION, userId, 'scans');
        await addDoc(scanLogRef, {
            userId,
            qrData, // Store raw QR data for reference/analysis
            qrDataHash: simpleHash(qrData),
            parsedPayeeUpi: parsedUpiDetails?.pa || null,
            parsedPayeeName: parsedUpiDetails?.pn || null,
            parsedAmount: parsedUpiDetails?.am ? Number(parsedUpiDetails.am) : null,
            timestamp: FieldValue.serverTimestamp(),
            isVerifiedMerchant: isVerified,
            isFlaggedBlacklisted: isBlacklisted,
            isDuplicateRecentScan: isDuplicate,
            validationMessage: validationMessage,
            // location: location ? new GeoPoint(location.latitude, location.longitude) : null, // Store GeoPoint if available
        });
        console.log(`[Scan Service] Scan logged for user ${userId}`);
    } catch (e) {
        console.error("[Scan Service] Error logging scan:", e);
    }
}

/**
 * Saves a user's report about a QR code.
 * @param {string} userId - The ID of the user reporting.
 * @param {string} qrData - The raw QR data.
 * @param {string} reason - The reason for reporting.
 * @returns {Promise<void>}
 */
async function reportQrCode(userId, qrData, reason) {
    console.log(`[Scan Service] User ${userId} reporting QR: ${qrData.substring(0,30)}... Reason: ${reason}`);
    try {
        const reportColRef = collection(db, REPORTED_QRS_COLLECTION);
        await addDoc(reportColRef, {
            userId,
            qrData,
            qrDataHash: simpleHash(qrData), // For easier lookup
            parsedPayeeUpi: parseUpiDataFromQr(qrData)?.pa || null,
            reason,
            status: 'pending_review', // Initial status
            reportedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[Scan Service] QR report saved from user ${userId}`);

        // Optional: Trigger an alert/notification to admin system
        // Optional: Automatically add to a temporary blacklist or increase suspicion score
    } catch (e) {
        console.error("[Scan Service] Error saving QR report:", e);
        throw new Error("Failed to submit QR report.");
    }
}

// Simple hash function
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
    parseUpiDataFromQr // Export for potential use in controller
};
