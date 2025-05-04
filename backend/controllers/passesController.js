
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');

// Interface (Informational)
// interface PurchasedPass {
//     passId: string; // Original pass type ID (e.g., 'bmtc-monthly-nonac')
//     purchaseId: string; // Firestore document ID
//     operatorName: string;
//     operatorLogo?: string;
//     passName: string;
//     passengerName: string;
//     passengerPhotoUrl?: string; // URL to uploaded photo
//     validFrom: Timestamp; // Firestore Timestamp
//     validUntil: Timestamp; // Firestore Timestamp
//     status: 'Active' | 'Expired' | 'Pending Verification' | 'Rejected';
//     qrCodeData?: string; // Data for generating QR code
//     downloadUrl?: string; // URL to download pass PDF/image
//     userId: string;
//     createdAt: Timestamp;
// }

// Get User's Purchased Passes
exports.getMyPasses = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const passesColRef = collection(db, 'users', userId, 'purchasedPasses');
        // Order by status (Active first), then by expiry date descending
        const q = query(passesColRef, orderBy('status'), orderBy('validUntil', 'desc'));
        const querySnapshot = await getDocs(q);

        const passes = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                purchaseId: doc.id,
                ...data,
                validFrom: (data.validFrom as Timestamp)?.toDate(),
                validUntil: (data.validUntil as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
            };
        });
        res.status(200).json(passes);
    } catch (error) {
        next(error);
    }
};

// Apply for a New Pass (handles submission from frontend)
exports.applyForPass = async (req, res, next) => {
    const userId = req.user.uid;
    // Destructure all expected fields from the frontend form
    const {
        passId, // ID of the pass type being applied for (e.g., 'bmtc-student-monthly')
        operatorName, // e.g., "BMTC"
        passName, // e.g., "Student Monthly Pass"
        price, // Price associated with the pass type
        duration, // Duration string (e.g., "1 Month")
        passengerName,
        passengerDob, // Should be validated and stored appropriately
        passengerGender,
        passengerAddress,
        studentId, // Optional, required for student passes
        photoUrl // URL of the uploaded photo (assuming upload handled separately)
    } = req.body;

    // --- Validation ---
    if (!passId || !operatorName || !passName || price === undefined || price < 0 || !duration || !passengerName || !passengerDob) {
        return res.status(400).json({ message: 'Missing required pass application details.' });
    }
    // TODO: Add more specific validation (e.g., date format, student ID if required)

    try {
        // TODO: Implement payment processing here if the pass costs money
        // const paymentResult = await processPayment(userId, price, `Bus Pass Application: ${passName}`);
        // if (!paymentResult.success) {
        //     throw new Error(paymentResult.message || 'Payment failed for pass application.');
        // }

        // --- Save Application to Firestore ---
        // Determine initial status (e.g., 'Pending Verification' for student passes, 'Active' for others if payment is immediate)
        const initialStatus: PurchasedPass['status'] = passId.includes('student') ? 'Pending Verification' : 'Active'; // Example logic
        const validFrom = new Date(); // Start from today
        // Calculate validUntil based on duration (simplified example)
        let validUntil = new Date(validFrom);
        if (duration.toLowerCase().includes('month')) {
            const months = parseInt(duration.split(' ')[0] || '1', 10);
            validUntil.setMonth(validUntil.getMonth() + months);
        } else if (duration.toLowerCase().includes('day')) {
             validUntil = new Date(validFrom.setHours(23, 59, 59, 999)); // End of day
        } else {
             // Default expiry or handle other durations
             validUntil.setDate(validUntil.getDate() + 30);
        }


        const passApplicationData = {
            userId,
            passId,
            operatorName,
            passName,
            price, // Store the price paid
            passengerName,
            passengerPhotoUrl: photoUrl || null, // Store photo URL
            validFrom: Timestamp.fromDate(validFrom),
            validUntil: Timestamp.fromDate(validUntil),
            status: initialStatus,
            qrCodeData: initialStatus === 'Active' ? `${operatorName}_PASS_${Date.now()}_${userId.substring(0,5)}_ACTIVE` : null, // Generate QR only if active
            createdAt: serverTimestamp(),
            // Store other submitted details if needed for verification
            submittedDetails: {
                dob: passengerDob,
                gender: passengerGender,
                address: passengerAddress,
                studentId: studentId || null,
            }
        };

        const passesColRef = collection(db, 'users', userId, 'purchasedPasses');
        const docRef = await addDoc(passesColRef, passApplicationData);

        res.status(201).json({
            success: true,
            purchaseId: docRef.id,
            status: initialStatus,
            message: `Pass application submitted. Status: ${initialStatus}`
        });

    } catch (error) {
        console.error("Error applying for pass:", error);
        next(error); // Pass to error handling middleware
    }
};

// Cancel a Pass (usually means marking it inactive, rarely deletion)
exports.cancelPass = async (req, res, next) => {
    const userId = req.user.uid;
    const { purchaseId } = req.params; // Get purchaseId from route params

    if (!purchaseId) {
        return res.status(400).json({ message: 'Pass Purchase ID is required.' });
    }

    try {
        const passDocRef = doc(db, 'users', userId, 'purchasedPasses', purchaseId);
        // TODO: Add check if pass belongs to the user and is in a cancellable state
        await updateDoc(passDocRef, {
            status: 'Cancelled', // Or 'Inactive' depending on terminology
            updatedAt: serverTimestamp(), // Assuming you add updatedAt field
        });
        res.status(200).json({ success: true, message: 'Pass cancelled successfully.' });
    } catch (error) {
        console.error("Error cancelling pass:", error);
        next(error);
    }
};

// Get Pass Details (potentially including QR code data or download link)
exports.getPassDetails = async (req, res, next) => {
     const userId = req.user.uid;
     const { purchaseId } = req.params;

     if (!purchaseId) {
        return res.status(400).json({ message: 'Pass Purchase ID is required.' });
    }
     try {
        const passDocRef = doc(db, 'users', userId, 'purchasedPasses', purchaseId);
        const passDoc = await getDoc(passDocRef);
        if (!passDoc.exists() || passDoc.data().userId !== userId) {
             return res.status(404).json({ message: 'Pass not found or permission denied.' });
        }

        const data = passDoc.data();
        res.status(200).json({
            purchaseId: passDoc.id,
            ...data,
            validFrom: (data.validFrom as Timestamp)?.toDate(),
            validUntil: (data.validUntil as Timestamp)?.toDate(),
            createdAt: (data.createdAt as Timestamp)?.toDate(),
        });
    } catch (error) {
        next(error);
    }
};

    