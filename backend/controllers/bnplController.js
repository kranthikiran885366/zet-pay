// backend/controllers/bnplController.js
const bnplService = require('../services/bnpl'); // Import backend BNPL service
const asyncHandler = require('../middleware/asyncHandler');
const admin = require('../config/firebaseAdmin'); // To convert Timestamps

// Helper to convert Firestore Timestamps within nested objects
function convertTimestampsToISO(data) {
    if (!data) return data;
    if (data instanceof admin.firestore.Timestamp) {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestampsToISO);
    }
    if (typeof data === 'object') {
        const converted = {};
        for (const key in data) {
            converted[key] = convertTimestampsToISO(data[key]);
        }
        return converted;
    }
    return data;
}

// Get BNPL Status
exports.getBnplStatus = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const status = await bnplService.getBnplStatus(userId);
    res.status(200).json(convertTimestampsToISO(status)); // Convert timestamps before sending
});

// Activate BNPL
exports.activateBnpl = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const result = await bnplService.activateBnpl(userId);
    // result contains the activated details including timestamps
    res.status(200).json({
        success: true,
        message: "Pay Later activated successfully.",
        details: convertTimestampsToISO(result) // Convert timestamps
    });
});

// Get Latest Statement
exports.getBnplStatement = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const statement = await bnplService.getBnplStatement(userId);
    if (statement) {
        res.status(200).json(convertTimestampsToISO(statement)); // Convert timestamps
    } else {
        // Return 200 with null if no unpaid statement found, or 404?
        // Consistent approach: return 200 with null data.
        res.status(200).json(null);
        // Or: res.status(404).json({ message: "No active unpaid statement found." });
    }
});

// Repay BNPL Bill
exports.repayBnplBill = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    // Validation already done by router
    const { statementId, amount, paymentMethodInfo } = req.body;

    const success = await bnplService.repayBnplBill(userId, statementId, amount, paymentMethodInfo);

    if (success) {
        res.status(200).json({ success: true, message: "Repayment processed successfully." });
    }
    // If service throws error, asyncHandler will catch it.
});

// Optional: Get Transactions for a Statement
// exports.getStatementTransactions = asyncHandler(async (req, res, next) => {
//     const userId = req.user.uid;
//     const { statementId } = req.params;
//     const transactions = await bnplService.getBnplStatementTransactions(userId, statementId); // Assuming this function exists in service
//     res.status(200).json(convertTimestampsToISO(transactions)); // Convert dates in transactions too
// });
