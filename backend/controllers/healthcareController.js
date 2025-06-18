
// backend/controllers/healthcareController.js
const healthcareProviderService = require('../services/healthcareProviderService');
const vaultService = require('../services/vaultService'); // For Health Wallet
const { addTransaction } = require('../services/transactionLogger');
const asyncHandler = require('../middleware/asyncHandler');
const { serverTimestamp, collection, addDoc, getDocs, query, where, orderBy, limit, doc } = require('firebase/firestore'); // Added doc
const db = require('../config/firebaseAdmin').db; // Use configured db

// --- Doctor Appointments & Video Consultations ---
exports.searchDoctors = asyncHandler(async (req, res, next) => {
    const { specialty, location, name } = req.query;
    const results = await healthcareProviderService.searchDoctors({ specialty, location, name });
    res.status(200).json(results);
});

exports.getDoctorSlots = asyncHandler(async (req, res, next) => {
    const { doctorId, date } = req.query; // Changed from params to query
    if (!doctorId || !date) {
        res.status(400);
        throw new Error("Doctor ID and date are required.");
    }
    const slots = await healthcareProviderService.getDoctorAvailability(doctorId, date);
    res.status(200).json(slots);
});

exports.bookAppointment = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { doctorId, doctorName, slotTime, date, appointmentType, consultationFee } = req.body;
    
    // TODO: Payment processing if consultationFee > 0

    const bookingDetails = { userId, doctorId, doctorName, slotTime, date, appointmentType, consultationFee, status: 'Confirmed' };
    const result = await healthcareProviderService.confirmAppointment(bookingDetails);
    
    // Log to user's appointments
    const appointmentsColRef = collection(db, 'users', userId, 'healthAppointments');
    await addDoc(appointmentsColRef, { ...result, createdAt: serverTimestamp() });
    
    res.status(201).json(result);
});


// --- Lab Tests ---
exports.searchLabTests = asyncHandler(async (req, res, next) => {
    const { query: searchQuery } = req.query;
    const tests = await healthcareProviderService.searchLabTests(searchQuery);
    res.status(200).json(tests);
});

exports.getLabTestSlots = asyncHandler(async (req, res, next) => {
    const { labId, testId, date } = req.query;
    if (!labId || !date) {
        res.status(400);
        throw new Error("Lab ID and date are required.");
    }
    const slots = await healthcareProviderService.getLabAvailability(labId, testId, date);
    res.status(200).json(slots);
});

exports.bookLabTest = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { labId, labName, testId, testName, slotTime, date, collectionType, price } = req.body;

    // TODO: Payment processing for 'price'

    const bookingDetails = { userId, labId, labName, testId, testName, slotTime, date, collectionType, price, status: 'Confirmed' };
    const result = await healthcareProviderService.confirmLabTestBooking(bookingDetails);

     // Log to user's lab bookings
    const labBookingsColRef = collection(db, 'users', userId, 'labBookings');
    await addDoc(labBookingsColRef, { ...result, createdAt: serverTimestamp() });

    res.status(201).json(result);
});

// --- Pharmacy / Order Medicines ---
exports.searchMedicines = asyncHandler(async (req, res, next) => {
    const { query: searchQuery } = req.query;
    const medicines = await healthcareProviderService.searchPharmacyMedicines(searchQuery);
    res.status(200).json(medicines);
});

exports.orderMedicines = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { items, totalAmount, deliveryAddress, prescriptionId } = req.body; // items: [{ medicineId, name, quantity, price }]
    
    // TODO: Payment processing for totalAmount
    // TODO: Prescription validation if prescriptionId is present

    const orderDetails = { userId, items, totalAmount, deliveryAddress, prescriptionId, status: 'Processing' };
    const result = await healthcareProviderService.placePharmacyOrder(orderDetails);

    // Log to user's medicine orders
    const medicineOrdersColRef = collection(db, 'users', userId, 'medicineOrders');
    await addDoc(medicineOrdersColRef, { ...result, createdAt: serverTimestamp() });
    
    res.status(201).json(result);
});

exports.uploadPrescription = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    // This endpoint would typically handle file upload (e.g., using multer)
    // and then save the file to Firebase Storage, returning the URL.
    // For now, simulate:
    if (!req.file) { // Assuming multer or similar middleware adds req.file
        res.status(400);
        throw new Error("No prescription file uploaded.");
    }
    const mockFileUrl = `https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/prescriptions%2F${userId}%2F${req.file.originalname}?alt=media`;
    // Save metadata to Firestore
    const prescriptionsColRef = collection(db, 'users', userId, 'userPrescriptions');
    const docRef = await addDoc(prescriptionsColRef, {
        userId,
        fileName: req.file.originalname,
        fileUrl: mockFileUrl,
        uploadedAt: serverTimestamp(),
        status: 'Pending Verification'
    });
    res.status(201).json({ success: true, message: 'Prescription uploaded.', prescriptionId: docRef.id, fileUrl: mockFileUrl });
});


// --- Medicine Subscription ---
exports.setupMedicineSubscription = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { medicineId, medicineName, quantity, frequency, startDate, deliveryAddress } = req.body;
    // Basic validation
    if (!medicineId || !medicineName || !quantity || !frequency || !startDate || !deliveryAddress) {
        res.status(400);
        throw new Error("Missing required subscription details.");
    }
    const subDetails = { userId, medicineId, medicineName, quantity, frequency, startDate, deliveryAddress, status: 'Active' };
    const result = await healthcareProviderService.createMedicineSubscription(subDetails);

     // Log to user's subscriptions
    const medSubsColRef = collection(db, 'users', userId, 'medicineSubscriptions');
    await addDoc(medSubsColRef, { ...result, createdAt: serverTimestamp() });

    res.status(201).json(result);
});

// --- Emergency Ambulance ---
exports.requestAmbulance = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { location, type } = req.body; // location: { lat, lon }, type: 'BLS' | 'ALS'
    if (!location || !type) {
        res.status(400);
        throw new Error("Location and ambulance type are required.");
    }
    const result = await healthcareProviderService.dispatchAmbulance({ userId, location, type });
    // Log request (optional)
    res.status(200).json(result);
});

// --- Health Wallet (Document Management) ---
exports.getHealthWalletDocuments = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const items = await vaultService.getUserVaultItems(userId, 'Health'); // Filter by 'Health' type
    res.status(200).json(items);
});

exports.uploadHealthDocument = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { name, type, source, notes } = req.body; // type e.g., 'Prescription', 'Lab Report'
    // Simulate file upload and get filePath from storage (use vaultService)
    if (!req.file) throw new Error("No file uploaded.");
    const filePath = await vaultService.uploadFileToVaultStorage(userId, req.file, 'Health'); // Assuming req.file from multer

    const itemData = {
        userId, name, type, source, notes, filePath,
        // For Health Wallet, we use type as 'Health' for general vault,
        // but can store specific health document type in metadata.
        healthDocumentType: type, // e.g. 'Prescription', 'Lab Report'
        fileUrl: `gs://${process.env.FIREBASE_STORAGE_BUCKET}/${filePath}` // Example format
    };
    const newItem = await vaultService.addVaultItemMetadata(userId, itemData, 'Health'); // Store with 'Health' tag
    res.status(201).json(newItem);
});


// --- Fitness Trainers & Health Packages ---
exports.getFitnessTrainers = asyncHandler(async (req, res, next) => {
    const { specialty, location } = req.query;
    const trainers = await healthcareProviderService.searchFitnessTrainers({ specialty, location });
    res.status(200).json(trainers);
});

exports.bookFitnessSession = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { trainerId, trainerName, sessionDate, sessionTime, price } = req.body;
    // TODO: Payment for price
    const result = await healthcareProviderService.bookFitnessSession({ userId, trainerId, trainerName, sessionDate, sessionTime, price });
    // Log booking
    res.status(201).json(result);
});

exports.getHealthPackages = asyncHandler(async (req, res, next) => {
    const packages = await healthcareProviderService.fetchHealthPackages();
    res.status(200).json(packages);
});

exports.purchaseHealthPackage = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { packageId, packageName, price, labId } = req.body;
    // TODO: Payment for price
    const result = await healthcareProviderService.purchaseHealthPackage({ userId, packageId, packageName, price, labId });
    // Log purchase
    res.status(201).json(result);
});

