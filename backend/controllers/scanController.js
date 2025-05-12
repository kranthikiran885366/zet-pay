// backend/controllers/scanController.js
const scanService = require('../services/scanService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Validates scanned QR data.
 * Checks against verified merchants, blacklisted QRs, reported QRs, and conceptual signature.
 * Logs the scan attempt.
 */
exports.validateQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    // Added stealthModeInitiated flag from request body
    const { qrData, signature, stealthModeInitiated } = req.body; 

    // Validation for qrData already done by router
    const validationResult = await scanService.validateScannedQr(userId, qrData, signature, stealthModeInitiated);

    // Reparse to ensure consistency in response if not already provided by service or to augment
    const parsedUpi = scanService.parseUpiDataFromQr(qrData);

    res.status(200).json({
        isVerifiedMerchant: validationResult.isVerifiedMerchant,
        isBlacklisted: validationResult.isBlacklisted,
        merchantName: validationResult.merchantNameFromDb || parsedUpi?.pn,
        payeeAddress: parsedUpi?.pa || validationResult.upiId,
        amount: parsedUpi?.am,
        note: parsedUpi?.tn,
        message: validationResult.message,
        upiId: validationResult.upiId,
        hasValidSignature: validationResult.hasValidSignature,
        isReportedPreviously: validationResult.isReportedPreviously,
    });
});

/**
 * Reports a QR code as fraudulent or suspicious.
 * Stores the report for admin review.
 */
exports.reportQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { qrData, reason } = req.body;

    // Validation for qrData and reason already done by router
    const reportId = await scanService.reportQrCode(userId, qrData, reason);
    res.status(200).json({ success: true, message: 'QR code reported successfully.', reportId });
});
