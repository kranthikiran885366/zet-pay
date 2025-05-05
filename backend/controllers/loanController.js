// backend/controllers/loanController.js
const loanService = require('../services/loans'); // Assuming service is in ../services/loans

// Check Micro-Loan Eligibility
exports.checkMicroLoanEligibility = async (req, res, next) => {
    const userId = req.user.uid;
    const checkAmount = req.query.checkAmount ? Number(req.query.checkAmount) : undefined;
    const eligibility = await loanService.checkMicroLoanEligibility(userId, checkAmount);
    res.status(200).json(eligibility);
};

// Apply for Micro-Loan
exports.applyForMicroLoan = async (req, res, next) => {
    const userId = req.user.uid;
    const { amount, purpose } = req.body;
    const result = await loanService.applyForMicroLoan(userId, amount, purpose);
    res.status(201).json(result); // Return success status, loanId, dueDate
};

// Get Micro-Loan Status
exports.getMicroLoanStatus = async (req, res, next) => {
    const userId = req.user.uid;
    const status = await loanService.getMicroLoanStatus(userId);
    res.status(200).json(status);
};

// Repay Micro-Loan
exports.repayMicroLoan = async (req, res, next) => {
    const userId = req.user.uid;
    const { loanId, amount } = req.body;
    // TODO: Add paymentMethodInfo if needed by service
    const result = await loanService.repayMicroLoan(userId, loanId, amount);
    res.status(200).json(result); // Return success status
};

// --- Personal Loans (Placeholders) ---

// Get Personal Loan Offers
exports.getPersonalLoanOffers = async (req, res, next) => {
    const userId = req.user.uid;
    // TODO: Implement logic to fetch pre-approved offers from partners
    console.log(`Fetching personal loan offers for user ${userId} (Not Implemented)`);
    res.status(501).json({ message: 'Personal loan offers feature not implemented yet.' });
};

// Apply for Personal Loan
// exports.applyForPersonalLoan = async (req, res, next) => {
//     const userId = req.user.uid;
//     const applicationData = req.body;
//     // TODO: Implement logic to submit application to partner
//     console.log(`Applying for personal loan for user ${userId} (Not Implemented)`);
//     res.status(501).json({ message: 'Personal loan application feature not implemented yet.' });
// };

