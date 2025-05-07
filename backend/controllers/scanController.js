
// backend/controllers/scanController.js
const scanService = require('../services/scanService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Validates scanned QR data.
 * Checks against verified merchants, blacklisted QRs, and recent scan history.
 * Logs the scan attempt.
 */
exports.validateQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid; // Assuming authMiddleware provides this
    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string') {
        res.status(400);
        throw new Error('QR data is required.');
    }

    const validationResult = await scanService.validateScannedQr(userId, qrData);
    res.status(200).json(validationResult);
});

/**
 * Reports a QR code as fraudulent or suspicious.
 * Stores the report for admin review.
 */
exports.reportQr = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { qrData, reason } = req.body;

    if (!qrData || typeof qrData !== 'string' || !reason || typeof reason !== 'string') {
        res.status(400);
        throw new Error('QR data and reason for reporting are required.');
    }

    await scanService.reportQrCode(userId, qrData, reason);
    res.status(200).json({ success: true, message: 'QR code reported successfully.' });
});

// Add other scan-related controller functions if needed
// e.g., getScanHistory, getMerchantDetails (if separate from UPI verification)
