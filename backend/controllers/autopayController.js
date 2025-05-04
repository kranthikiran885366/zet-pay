
const admin = require('firebase-admin');
const { collection, query, where, orderBy, limit, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } = require('firebase/firestore');
const db = admin.firestore();
const { addTransaction } = require('../services/transactionLogger'); // For logging potential setup fees if any

// Interface matching frontend/shared types
// interface Mandate {
//     id?: string; // Firestore document ID
//     userId: string;
//     merchantName: string;
//     upiId: string; // User's UPI ID used for the mandate
//     maxAmount: number;
//     frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented';
//     startDate: Timestamp;
//     validUntil: Timestamp;
//     status: 'Active' | 'Paused' | 'Cancelled' | 'Failed' | 'Pending Approval';
//     createdAt?: Timestamp;
//     updatedAt?: Timestamp;
//     mandateUrn?: string; // Unique reference number from NPCI/PSP
// }


// Get User's Mandates
exports.getMandates = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const mandatesColRef = collection(db, 'users', userId, 'autopayMandates'); // Store under user's subcollection
        const q = query(mandatesColRef, orderBy('createdAt', 'desc')); // Order by creation date
        const querySnapshot = await getDocs(q);

        const mandates = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                // Convert Timestamps to Date objects for client
                startDate: (data.startDate)?.toDate(),
                validUntil: (data.validUntil)?.toDate(),
                createdAt: (data.createdAt)?.toDate(),
                updatedAt: (data.updatedAt)?.toDate(),
            };
        });
        res.status(200).json(mandates);
    } catch (error) {
        next(error);
    }
};

// Setup New Mandate (Initiation - requires PSP integration)
exports.setupMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { merchantName, userUpiId, maxAmount, frequency, startDate, validUntil } = req.body;

    // Basic validation
    if (!merchantName || !userUpiId || !maxAmount || !frequency || !startDate || !validUntil) {
        return res.status(400).json({ message: 'Missing required mandate details.' });
    }

    try {
        // TODO: Initiate mandate creation flow with the UPI PSP/Bank.
        // This usually involves redirecting the user to the PSP app or bank page for approval (PIN entry).
        // The PSP would provide a callback with the status and mandate URN.
        console.log("Simulating mandate setup initiation with PSP for:", { userId, merchantName, userUpiId, maxAmount });
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate PSP interaction delay

        // ** Mock successful setup for demo **
        const mockUrn = `MANDATE_${Date.now()}`;
        const status = 'Pending Approval'; // Or 'Active' if PSP confirms immediately

        const mandateData = {
            userId,
            merchantName,
            upiId: userUpiId,
            maxAmount: Number(maxAmount),
            frequency,
            startDate: Timestamp.fromDate(new Date(startDate)),
            validUntil: Timestamp.fromDate(new Date(validUntil)),
            status: status,
            mandateUrn: mockUrn, // Store the reference number
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const mandatesColRef = collection(db, 'users', userId, 'autopayMandates');
        const docRef = await addDoc(mandatesColRef, mandateData);
        console.log(`Mandate record created in Firestore with ID: ${docRef.id}, Status: ${status}`);

        res.status(201).json({
            success: true,
            mandateId: docRef.id,
            status: status,
            message: `Mandate setup initiated. Status: ${status}. URN: ${mockUrn}`
        });

    } catch (error) {
        console.error("Error setting up mandate:", error);
        next(error);
    }
};

// Pause Mandate
exports.pauseMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { mandateId } = req.params;

    if (!mandateId) return res.status(400).json({ message: 'Mandate ID is required.' });

    try {
        const mandateDocRef = doc(db, 'users', userId, 'autopayMandates', mandateId);
        const mandateSnap = await getDoc(mandateDocRef);

        if (!mandateSnap.exists()) return res.status(404).json({ message: 'Mandate not found.' });
        if (mandateSnap.data().status !== 'Active') return res.status(400).json({ message: 'Only active mandates can be paused.' });

        // TODO: Call PSP API to pause the mandate in the UPI ecosystem.
        console.log(`Simulating pause request to PSP for mandate: ${mandateId}`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate PSP interaction

        // Update Firestore status
        await updateDoc(mandateDocRef, {
            status: 'Paused',
            updatedAt: serverTimestamp()
        });

        res.status(200).json({ success: true, message: 'Mandate paused successfully.' });
    } catch (error) {
        console.error("Error pausing mandate:", error);
        next(error);
    }
};

// Resume Mandate
exports.resumeMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { mandateId } = req.params;

    if (!mandateId) return res.status(400).json({ message: 'Mandate ID is required.' });

    try {
        const mandateDocRef = doc(db, 'users', userId, 'autopayMandates', mandateId);
        const mandateSnap = await getDoc(mandateDocRef);

        if (!mandateSnap.exists()) return res.status(404).json({ message: 'Mandate not found.' });
        if (mandateSnap.data().status !== 'Paused') return res.status(400).json({ message: 'Only paused mandates can be resumed.' });

        // TODO: Call PSP API to resume the mandate in the UPI ecosystem.
         console.log(`Simulating resume request to PSP for mandate: ${mandateId}`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate PSP interaction

        // Update Firestore status
        await updateDoc(mandateDocRef, {
            status: 'Active',
            updatedAt: serverTimestamp()
        });

        res.status(200).json({ success: true, message: 'Mandate resumed successfully.' });
    } catch (error) {
        console.error("Error resuming mandate:", error);
        next(error);
    }
};

// Cancel Mandate
exports.cancelMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { mandateId } = req.params;

    if (!mandateId) return res.status(400).json({ message: 'Mandate ID is required.' });

    try {
        const mandateDocRef = doc(db, 'users', userId, 'autopayMandates', mandateId);
        const mandateSnap = await getDoc(mandateDocRef);

        if (!mandateSnap.exists()) return res.status(404).json({ message: 'Mandate not found.' });
        const currentStatus = mandateSnap.data().status;
        if (currentStatus === 'Cancelled' || currentStatus === 'Failed') return res.status(400).json({ message: `Mandate is already ${currentStatus}.` });

        // TODO: Call PSP API to cancel the mandate in the UPI ecosystem.
         console.log(`Simulating cancel request to PSP for mandate: ${mandateId}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate PSP interaction

        // Update Firestore status
        await updateDoc(mandateDocRef, {
            status: 'Cancelled',
            updatedAt: serverTimestamp()
        });

        res.status(200).json({ success: true, message: 'Mandate cancelled successfully.' });
    } catch (error) {
        console.error("Error cancelling mandate:", error);
        next(error);
    }
};

// Execute Mandate Debit (Should be triggered by a scheduled backend job/webhook from PSP)
// This is a conceptual placeholder, not directly called via API route usually.
exports.executeMandateDebit = async (mandateId: string) => {
    console.log(`Backend job attempting to execute debit for mandate: ${mandateId}`);
    // 1. Fetch mandate details from Firestore
    // 2. Check if mandate is 'Active' and today is a valid execution date based on frequency/startDate/validUntil
    // 3. Determine debit amount (fixed for some, 'As Presented' needs amount from merchant)
    // 4. Call PSP API to execute the debit using the mandate URN
    // 5. If debit successful: Log transaction using addTransaction
    // 6. If debit fails: Log failed transaction, update mandate status if needed (e.g., to 'Failed' after retries)
    // 7. Handle notifications to user
};
