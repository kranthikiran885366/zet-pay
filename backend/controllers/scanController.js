
// backend/controllers/scanController.js
const scanService = require('../services/scanService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Validates scanned QR data.
 * Checks against verified merchants, blacklisted QRs.
 * Logs the scan attempt. Backend service now handles duplicate scan logic.
 */
exports.validateQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid; // Assuming authMiddleware provides this
    const { qrData } = req.body;

    // Validation already done by router
    const validationResult = await scanService.validateScannedQr(userId, qrData);

    // Reparse to ensure consistency in response if not already provided by service
    const parsedUpi = validationResult.upiId ? { pa: validationResult.upiId, pn: validationResult.merchantNameFromDb, am: null, tn: null} : scanService.parseUpiDataFromQr(qrData);

    res.status(200).json({
        isVerifiedMerchant: validationResult.isVerifiedMerchant,
        isBlacklisted: validationResult.isBlacklisted,
        isDuplicateRecent: validationResult.isDuplicateRecent, // Service provides this now
        merchantName: validationResult.merchantNameFromDb || parsedUpi?.pn,
        payeeAddress: parsedUpi?.pa || validationResult.upiId,
        amount: parsedUpi?.am,
        note: parsedUpi?.tn,
        message: validationResult.message,
        upiId: validationResult.upiId, // Pass back the parsed/verified UPI ID
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
