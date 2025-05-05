// backend/controllers/bnplController.js
const bnplService = require('../services/bnpl'); // Assuming service is in ../services/bnpl

// Get BNPL Status
exports.getBnplStatus = async (req, res, next) => {
    const userId = req.user.uid;
    const status = await bnplService.getBnplStatus(userId);
    res.status(200).json(status);
};

// Activate BNPL
exports.activateBnpl = async (req, res, next) => {
    const userId = req.user.uid;
    // The service handles eligibility checks internally for this example
    const result = await bnplService.activateBnpl(userId); // Pass userId
    if (result) {
         // Re-fetch status to return updated details
         const updatedStatus = await bnplService.getBnplStatus(userId);
        res.status(200).json({ success: true, message: "Pay Later activated successfully.", details: updatedStatus });
    } else {
        // If activateBnpl throws an error, asyncHandler catches it.
        // If it returns false without throwing (which it shouldn't based on service code), handle here.
        res.status(500);
        throw new Error("Failed to activate Pay Later.");
    }
};

// Get Latest Statement
exports.getBnplStatement = async (req, res, next) => {
    const userId = req.user.uid;
    const statement = await bnplService.getBnplStatement(userId); // Pass userId
    if (statement) {
        res.status(200).json(statement);
    } else {
        res.status(404).json({ message: "No active unpaid statement found." });
    }
};

// Repay BNPL Bill
exports.repayBnplBill = async (req, res, next) => {
    const userId = req.user.uid;
    const { statementId, amount, paymentMethodInfo } = req.body;

    // Service handles the core logic and Firestore updates
    const result = await bnplService.repayBnplBill(userId, statementId, amount, paymentMethodInfo); // Pass userId

    if (result) {
        res.status(200).json({ success: true, message: "Repayment processed successfully." });
    } else {
        // If repayBnplBill returns false without throwing (adjust service if needed)
        res.status(500);
        throw new Error("Failed to process repayment.");
    }
};

// Optional: Get Transactions for a Statement
// exports.getStatementTransactions = async (req, res, next) => {
//     const userId = req.user.uid;
//     const { statementId } = req.params;
//     const transactions = await bnplService.getBnplStatementTransactions(userId, statementId);
//     res.status(200).json(transactions);
// };

