
// backend/controllers/scanController.js
const scanService = require('../services/scanService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Validates scanned QR data.
 * Checks against verified merchants, blacklisted QRs.
 * Logs the scan attempt. Backend no longer handles "recent duplicate scan" logic for blocking.
 */
exports.validateQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid; // Assuming authMiddleware provides this
    const { qrData } = req.body;

    // Validation already done by router
    const validationResult = await scanService.validateScannedQr(userId, qrData);

    // Prepare response based on backend validation
    const parsedUpi = scanService.parseUpiDataFromQr(qrData); // Reparse to ensure consistency in response

    res.status(200).json({
        isVerifiedMerchant: validationResult.isVerifiedMerchant,
        isBlacklisted: validationResult.isBlacklisted,
        isDuplicateRecent: validationResult.isDuplicateRecent, // This will likely be false from backend if not explicitly checked there
        merchantName: validationResult.merchantNameFromDb || parsedUpi?.pn, // Prioritize DB name
        payeeAddress: parsedUpi?.pa,
        amount: parsedUpi?.am,
        note: parsedUpi?.tn,
        message: validationResult.message,
        upiId: validationResult.upiId, // Pass back the parsed UPI ID from validation service
    });
});

/**
 * Reports a QR code as fraudulent or suspicious.
 * Stores the report for admin review.
 */
exports.reportQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { qrData, reason } = req.body;

    // Validation already done by router
    const reportId = await scanService.reportQrCode(userId, qrData, reason);
    res.status(200).json({ success: true, message: 'QR code reported successfully.', reportId });
});

// Add other scan-related controller functions if needed
// e.g., getScanHistory (if storing logs per user and want to expose)
