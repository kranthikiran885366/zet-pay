
// backend/routes/healthcareRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator');
const healthcareController = require('../controllers/healthcareController');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
// TODO: Add file upload middleware like multer for prescription/document uploads

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400);
        return next(new Error(`Validation Failed: ${errorMessages}`));
    }
    next();
};

// --- Doctor Appointments & Video Consultations ---
router.get('/doctors/search',
    query('specialty').optional().isString().trim(),
    query('location').optional().isString().trim(),
    query('name').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(healthcareController.searchDoctors)
);
router.get('/doctors/slots', // Changed from /doctors/:doctorId/slots to query based
    query('doctorId').isString().trim().notEmpty().withMessage('Doctor ID is required.'),
    query('date').isISO8601().toDate().withMessage('Valid date is required.'),
    handleValidationErrors,
    asyncHandler(healthcareController.getDoctorSlots)
);
router.post('/appointments/book',
    body('doctorId').isString().notEmpty(),
    body('doctorName').isString().notEmpty(),
    body('slotTime').isString().notEmpty(),
    body('date').isISO8601().toDate(),
    body('appointmentType').isIn(['In-Clinic', 'Video']).withMessage('Invalid appointment type.'),
    body('consultationFee').optional().isNumeric().toFloat({min: 0}),
    handleValidationErrors,
    asyncHandler(healthcareController.bookAppointment)
);

// --- Lab Tests ---
router.get('/labs/tests', query('query').optional().isString().trim(), asyncHandler(healthcareController.searchLabTests));
router.get('/labs/slots', // Changed from /labs/:labId/slots
    query('labId').isString().notEmpty(),
    query('testId').optional().isString(),
    query('date').isISO8601().toDate(),
    handleValidationErrors,
    asyncHandler(healthcareController.getLabTestSlots)
);
router.post('/labtests/book',
    body('labId').isString().notEmpty(),
    body('labName').isString().notEmpty(),
    body('testId').isString().notEmpty(),
    body('testName').isString().notEmpty(),
    body('slotTime').optional().isString(),
    body('date').isISO8601().toDate(),
    body('collectionType').isIn(['Home', 'Lab Visit']),
    body('price').isNumeric().toFloat({min: 0}),
    handleValidationErrors,
    asyncHandler(healthcareController.bookLabTest)
);

// --- Pharmacy / Order Medicines ---
// For uploadPrescription, you'd use multer middleware here before the controller
// router.post('/pharmacy/upload-prescription', multerUpload.single('prescriptionFile'), asyncHandler(healthcareController.uploadPrescription));
router.get('/pharmacy/search-medicines', query('query').isString().notEmpty(), asyncHandler(healthcareController.searchMedicines));
router.post('/pharmacy/order',
    body('items').isArray({min:1}).withMessage('Order must contain items.'),
    body('items.*.medicineId').isString().notEmpty(),
    body('items.*.name').isString().notEmpty(),
    body('items.*.quantity').isInt({min:1}),
    body('items.*.price').isNumeric(),
    body('totalAmount').isNumeric().toFloat({min:0}),
    body('deliveryAddress').isObject().withMessage('Delivery address object required.'),
    body('prescriptionId').optional().isString(),
    handleValidationErrors,
    asyncHandler(healthcareController.orderMedicines)
);

// --- Medicine Subscription ---
router.post('/med-subscriptions/setup',
    body('medicineId').isString().notEmpty(),
    body('medicineName').isString().notEmpty(),
    body('quantity').isInt({min:1}),
    body('frequency').isIn(['Weekly', 'Monthly', 'Bi-Monthly', 'Quarterly']),
    body('startDate').isISO8601().toDate(),
    body('deliveryAddress').isObject(),
    handleValidationErrors,
    asyncHandler(healthcareController.setupMedicineSubscription)
);

// --- Emergency Ambulance ---
router.post('/ambulance/request',
    body('location').isObject().withMessage('Location object is required.'),
    body('location.lat').isNumeric().withMessage('Latitude is required.'),
    body('location.lon').isNumeric().withMessage('Longitude is required.'),
    body('type').isIn(['BLS', 'ALS']).withMessage('Valid ambulance type (BLS/ALS) required.'),
    handleValidationErrors,
    asyncHandler(healthcareController.requestAmbulance)
);

// --- Health Wallet ---
// router.post('/wallet/upload', multerUpload.single('healthDocument'), asyncHandler(healthcareController.uploadHealthDocument));
router.get('/wallet/documents', asyncHandler(healthcareController.getHealthWalletDocuments));

// --- Fitness Trainers & Health Packages ---
router.get('/fitness/trainers',
    query('specialty').optional().isString(),
    query('location').optional().isString(),
    asyncHandler(healthcareController.getFitnessTrainers)
);
router.post('/fitness/book-session',
    body('trainerId').isString().notEmpty(),
    // Add other booking details
    handleValidationErrors,
    asyncHandler(healthcareController.bookFitnessSession)
);
router.get('/health-packages', asyncHandler(healthcareController.getHealthPackages));
router.post('/health-packages/purchase',
    body('packageId').isString().notEmpty(),
    // Add other purchase details
    handleValidationErrors,
    asyncHandler(healthcareController.purchaseHealthPackage)
);


module.exports = router;
