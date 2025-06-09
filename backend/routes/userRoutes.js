const express = require('express');
const { body, validationResult } = require('express-validator'); // Import validator
const userController = require('../controllers/userController');
const asyncHandler = require('../middleware/asyncHandler'); // Import asyncHandler
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); // Set status code
        throw new Error(`Validation Failed: ${errorMessages}`); // Throw error for asyncHandler
    }
    next();
};

// GET /api/users/profile - Fetch current user's profile
router.get('/profile', asyncHandler(userController.getUserProfile));

// PUT /api/users/profile - Update current user's profile
router.put('/profile',
    // Add optional validation rules for fields that can be updated
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
    body('phone').optional({ checkFalsy: true }).trim().isMobilePhone('en-IN').withMessage('Invalid Indian mobile number format.'),
    body('avatarUrl').optional({ checkFalsy: true }).isURL().withMessage('Invalid avatar URL.'),
    body('notificationsEnabled').optional().isBoolean().withMessage('notificationsEnabled must be true or false.'),
    body('biometricEnabled').optional().isBoolean().withMessage('biometricEnabled must be true or false.'),
    body('appLockEnabled').optional().isBoolean().withMessage('appLockEnabled must be true or false.'),
    body('isSmartWalletBridgeEnabled').optional().isBoolean().withMessage('isSmartWalletBridgeEnabled must be true or false.'),
    body('smartWalletBridgeLimit').optional({ checkFalsy: true }).isNumeric().toFloat({ min: 0 }).withMessage('Invalid smart wallet bridge limit.'),
    body('defaultPaymentMethod').optional().isString().trim(),
    body('isSeniorCitizenMode').optional().isBoolean().withMessage('isSeniorCitizenMode must be true or false.'),
    handleValidationErrors, // Apply validation check
    asyncHandler(userController.updateUserProfile)
);

// GET /api/users/credit-score - Fetch user's credit score (mocked)
router.get('/credit-score', asyncHandler(userController.getCreditScore));


// POST /api/users/kyc/initiate - Initiate KYC process (Placeholder)
// router.post('/kyc/initiate', asyncHandler(userController.initiateKyc));

// GET /api/users/kyc/status - Get KYC status (can be part of getProfile)
// router.get('/kyc/status', asyncHandler(userController.getKycStatus));

module.exports = router;
