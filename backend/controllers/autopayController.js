// backend/controllers/autopayController.js
const admin = require('firebase-admin');
const { collection, query, where, orderBy, limit, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } = require('firebase/firestore');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const upiProviderService = require('../services/upiProviderService'); // Assume PSP functions are here
const { sendToUser } = require('../server'); // For WebSocket updates

// Get User's Mandates
exports.getMandates = async (req, res, next) => {
    const userId = req.user.uid;
    console.log(`[Autopay Ctrl] Fetching mandates for user ${userId}`);
    try {
        const mandatesColRef = collection(db, 'users', userId, 'autopayMandates');
        const q = query(mandatesColRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const mandates = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            // Ensure date fields are properly converted or handled
            const convertTimestamp = (ts) => ts instanceof Timestamp ? ts.toDate() : (ts?._seconds ? new Date(ts._seconds * 1000) : null);
            return {
                id: docSnap.id,
                ...data,
                startDate: convertTimestamp(data.startDate),
                validUntil: convertTimestamp(data.validUntil),
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt),
            };
        });
        res.status(200).json(mandates);
    } catch (error) {
        console.error(`[Autopay Ctrl] Error fetching mandates for user ${userId}:`, error);
        next(error);
    }
};

// Setup New Mandate (Initiation - requires PSP integration)
exports.setupMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { merchantName, userUpiId, maxAmount, frequency, startDate, validUntil } = req.body;

    console.log(`[Autopay Ctrl] Attempting mandate setup for user ${userId}: Merchant=${merchantName}, UPI=${userUpiId}`);

    // Validation already handled by router

    try {
        // 1. Initiate mandate creation flow with the UPI PSP/Bank.
        // This usually involves redirecting the user or providing data for the PSP SDK.
        // The PSP would typically return a reference ID and status.
        const pspResult = await upiProviderService.initiateMandateSetup({
            userId,
            merchantName,
            payeeUpiId: merchantName.toLowerCase().replace(/\s+/g, '') + '@okpsp', // Example payee UPI, might need actual lookup
            payerUpiId: userUpiId,
            maxAmount: Number(maxAmount),
            frequency,
            startDate: new Date(startDate),
            endDate: new Date(validUntil),
        });

        if (!pspResult || !pspResult.success) {
             res.status(400); // Bad Request if PSP initiation fails
            throw new Error(pspResult?.message || 'Mandate initiation failed with PSP.');
        }

        // 2. Store mandate details in Firestore with Pending status
        const mandateData = {
            userId,
            merchantName,
            upiId: userUpiId,
            maxAmount: Number(maxAmount),
            frequency,
            startDate: Timestamp.fromDate(new Date(startDate)),
            validUntil: Timestamp.fromDate(new Date(validUntil)),
            status: pspResult.status || 'Pending Approval', // Use status from PSP or default
            mandateUrn: pspResult.mandateUrn || null, // Unique reference number from NPCI/PSP
            pspReferenceId: pspResult.referenceId || null, // PSP's internal reference
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const mandatesColRef = collection(db, 'users', userId, 'autopayMandates');
        const docRef = await addDoc(mandatesColRef, mandateData);
        console.log(`[Autopay Ctrl] Mandate record created (ID: ${docRef.id}) with status: ${mandateData.status}`);

        // No transaction log needed for setup itself unless there's a fee

        res.status(201).json({
            success: true,
            mandateId: docRef.id,
            status: mandateData.status,
            message: pspResult.message || `Mandate setup initiated. Status: ${mandateData.status}.`
            // Optionally return redirect URL or other PSP data if needed by frontend
        });

    } catch (error) {
        console.error("[Autopay Ctrl] Error setting up mandate:", error);
        next(error); // Pass to error middleware
    }
};

// Pause Mandate
exports.pauseMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { mandateId } = req.params;

    console.log(`[Autopay Ctrl] Attempting to pause mandate ${mandateId} for user ${userId}`);

    if (!mandateId) {
         res.status(400);
         return next(new Error('Mandate ID is required.'));
    }

    try {
        const mandateDocRef = doc(db, 'users', userId, 'autopayMandates', mandateId);
        const mandateSnap = await getDoc(mandateDocRef);

        if (!mandateSnap.exists() || mandateSnap.data().userId !== userId) {
             res.status(404);
             return next(new Error('Mandate not found or permission denied.'));
        }
        const mandateData = mandateSnap.data();
        if (mandateData.status !== 'Active') {
            res.status(400);
            return next(new Error('Only active mandates can be paused.'));
        }

        // 1. Call PSP API to pause the mandate in the UPI ecosystem.
        const pspResult = await upiProviderService.pauseMandate(mandateData.mandateUrn);
         if (!pspResult || !pspResult.success) {
             res.status(500); // Or appropriate error from PSP
            throw new Error(pspResult?.message || 'Failed to pause mandate with PSP.');
        }

        // 2. Update Firestore status
        await updateDoc(mandateDocRef, {
            status: 'Paused',
            updatedAt: serverTimestamp()
        });
        console.log(`[Autopay Ctrl] Mandate ${mandateId} paused successfully.`);

        // Send WebSocket update
        sendToUser(userId, { type: 'autopay_update', payload: { mandateId, status: 'Paused' } });

        res.status(200).json({ success: true, message: 'Mandate paused successfully.' });
    } catch (error) {
        console.error("[Autopay Ctrl] Error pausing mandate:", error);
        next(error);
    }
};

// Resume Mandate
exports.resumeMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { mandateId } = req.params;
    console.log(`[Autopay Ctrl] Attempting to resume mandate ${mandateId} for user ${userId}`);

     if (!mandateId) {
         res.status(400);
         return next(new Error('Mandate ID is required.'));
    }

    try {
        const mandateDocRef = doc(db, 'users', userId, 'autopayMandates', mandateId);
        const mandateSnap = await getDoc(mandateDocRef);

         if (!mandateSnap.exists() || mandateSnap.data().userId !== userId) {
             res.status(404);
             return next(new Error('Mandate not found or permission denied.'));
        }
        const mandateData = mandateSnap.data();
        if (mandateData.status !== 'Paused') {
             res.status(400);
            return next(new Error('Only paused mandates can be resumed.'));
        }

        // 1. Call PSP API to resume the mandate in the UPI ecosystem.
        const pspResult = await upiProviderService.resumeMandate(mandateData.mandateUrn);
        if (!pspResult || !pspResult.success) {
             res.status(500); // Or appropriate error from PSP
            throw new Error(pspResult?.message || 'Failed to resume mandate with PSP.');
        }

        // 2. Update Firestore status
        await updateDoc(mandateDocRef, {
            status: 'Active',
            updatedAt: serverTimestamp()
        });
        console.log(`[Autopay Ctrl] Mandate ${mandateId} resumed successfully.`);

        // Send WebSocket update
        sendToUser(userId, { type: 'autopay_update', payload: { mandateId, status: 'Active' } });

        res.status(200).json({ success: true, message: 'Mandate resumed successfully.' });
    } catch (error) {
        console.error("[Autopay Ctrl] Error resuming mandate:", error);
        next(error);
    }
};

// Cancel Mandate
exports.cancelMandate = async (req, res, next) => {
    const userId = req.user.uid;
    const { mandateId } = req.params;
    console.log(`[Autopay Ctrl] Attempting to cancel mandate ${mandateId} for user ${userId}`);

    if (!mandateId) {
         res.status(400);
         return next(new Error('Mandate ID is required.'));
    }

    try {
        const mandateDocRef = doc(db, 'users', userId, 'autopayMandates', mandateId);
        const mandateSnap = await getDoc(mandateDocRef);

         if (!mandateSnap.exists() || mandateSnap.data().userId !== userId) {
             res.status(404);
             return next(new Error('Mandate not found or permission denied.'));
        }
        const mandateData = mandateSnap.data();
        const currentStatus = mandateData.status;
        if (currentStatus === 'Cancelled' || currentStatus === 'Failed') {
             res.status(400);
            return next(new Error(`Mandate is already ${currentStatus}.`));
        }

        // 1. Call PSP API to cancel the mandate in the UPI ecosystem.
        const pspResult = await upiProviderService.cancelMandate(mandateData.mandateUrn);
         if (!pspResult || !pspResult.success) {
             // Log warning but proceed to update Firestore? Or throw error? Decide based on PSP behavior.
             console.warn(`[Autopay Ctrl] PSP cancellation failed for mandate ${mandateId}, but proceeding to mark as cancelled in Firestore. PSP Message: ${pspResult?.message}`);
             // Consider throwing an error if PSP confirmation is critical:
             // res.status(500);
             // throw new Error(pspResult?.message || 'Failed to cancel mandate with PSP.');
        }

        // 2. Update Firestore status regardless of PSP success? (Safer to reflect user intent)
        await updateDoc(mandateDocRef, {
            status: 'Cancelled',
            updatedAt: serverTimestamp()
        });
        console.log(`[Autopay Ctrl] Mandate ${mandateId} marked as cancelled in Firestore.`);

        // Send WebSocket update
        sendToUser(userId, { type: 'autopay_update', payload: { mandateId, status: 'Cancelled' } });

        res.status(200).json({ success: true, message: 'Mandate cancellation request processed.' });
    } catch (error) {
        console.error("[Autopay Ctrl] Error cancelling mandate:", error);
        next(error);
    }
};

