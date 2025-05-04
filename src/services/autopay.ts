
/**
 * @fileOverview Service functions for managing UPI Autopay mandates using Firestore.
 */
import { db, auth } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc, // Not typically used for mandates, usually just update status
    orderBy,
    Timestamp, // Use Firestore Timestamp
    serverTimestamp
} from 'firebase/firestore';

export interface Mandate {
    id?: string; // Firestore document ID (optional when creating)
    userId: string; // ID of the user who owns this mandate
    merchantName: string;
    upiId: string; // User's UPI ID used for the mandate
    maxAmount: number;
    frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented';
    startDate: Date; // Store as Date, convert to Timestamp for Firestore
    validUntil: Date; // Store as Date, convert to Timestamp for Firestore
    status: 'Active' | 'Paused' | 'Cancelled' | 'Failed' | 'Pending Approval'; // Added Pending Approval
    createdAt?: Date; // Track creation time
    updatedAt?: Date; // Track last update time
    mandateUrn?: string; // Unique Mandate Reference Number from NPCI (important!)
}

/**
 * Asynchronously retrieves the list of UPI Autopay mandates for the current user from Firestore.
 *
 * @returns A promise that resolves to an array of Mandate objects.
 */
export async function getMandates(): Promise<Mandate[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to get mandates.");
        return [];
    }
    const userId = currentUser.uid;
    console.log(`Fetching UPI Autopay Mandates for user ${userId}...`);

    try {
        const mandatesColRef = collection(db, 'users', userId, 'mandates'); // Store mandates in a subcollection
        const q = query(mandatesColRef, orderBy('validUntil', 'desc')); // Order by expiry date
        const querySnapshot = await getDocs(q);

        const mandates = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId, // Include userId for clarity if needed elsewhere
                ...data,
                startDate: (data.startDate as Timestamp).toDate(), // Convert Timestamp to Date
                validUntil: (data.validUntil as Timestamp).toDate(),
                createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
            } as Mandate;
        });
        console.log(`Fetched ${mandates.length} mandates.`);
        return mandates;

    } catch (error) {
        console.error("Error fetching mandates:", error);
        throw new Error("Could not fetch autopay mandates.");
    }
}

/**
 * Asynchronously initiates the setup flow for a new UPI Autopay mandate.
 * In a real app, this triggers an external flow (SDK/UPI App).
 * This simulation adds a 'Pending Approval' mandate to Firestore.
 *
 * @param merchantName Name of the merchant.
 * @param userUpiId The user's UPI ID for the mandate.
 * @param maxAmount The maximum amount per debit.
 * @param frequency The frequency of the debit.
 * @param startDate The start date of the mandate.
 * @param validUntil The expiry date of the mandate.
 * @returns A promise that resolves with details of the initiated mandate setup.
 */
export async function setupMandate(
    merchantName: string,
    userUpiId: string,
    maxAmount: number,
    frequency: Mandate['frequency'],
    startDate: Date,
    validUntil: Date
): Promise<{ success: boolean; mandateId?: string; message?: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;

    console.log("Initiating mandate setup in Firestore:", { userId, merchantName, maxAmount, frequency });

    const mandateData: Omit<Mandate, 'id' | 'createdAt' | 'updatedAt' | 'mandateUrn'> = {
        userId,
        merchantName,
        upiId: userUpiId,
        maxAmount,
        frequency,
        startDate,
        validUntil,
        status: 'Pending Approval', // Initial status
    };

    try {
        const mandatesColRef = collection(db, 'users', userId, 'mandates');
        const dataToSave = {
            ...mandateData,
            startDate: Timestamp.fromDate(startDate), // Convert Date to Timestamp
            validUntil: Timestamp.fromDate(validUntil),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(mandatesColRef, dataToSave);
        console.log("Pending mandate added to Firestore with ID:", docRef.id);

        // TODO: Trigger the actual external UPI mandate setup flow here.
        // The result of that flow (success/failure, URN) would ideally update
        // the Firestore document via a webhook or callback.

        return { success: true, mandateId: docRef.id, message: "Mandate setup initiated. Please approve in your UPI app." };
    } catch (error) {
        console.error("Error saving pending mandate:", error);
        return { success: false, message: "Failed to initiate mandate setup." };
    }
}

/**
 * Asynchronously pauses an active UPI Autopay mandate by updating its status in Firestore.
 *
 * @param mandateId The Firestore document ID of the mandate to pause.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function pauseMandate(mandateId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;

    console.log(`Pausing mandate ID: ${mandateId} for user ${userId}`);
    try {
        const mandateDocRef = doc(db, 'users', userId, 'mandates', mandateId);
        // Optional: Check if mandate exists and is 'Active' before updating
        await updateDoc(mandateDocRef, {
            status: 'Paused',
            updatedAt: serverTimestamp(),
        });
        console.log("Mandate paused successfully in Firestore.");
        return true;
    } catch (error) {
        console.error("Error pausing mandate:", error);
        return false;
    }
}

/**
 * Asynchronously resumes a paused UPI Autopay mandate by updating its status in Firestore.
 *
 * @param mandateId The Firestore document ID of the mandate to resume.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function resumeMandate(mandateId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;

    console.log(`Resuming mandate ID: ${mandateId} for user ${userId}`);
    try {
        const mandateDocRef = doc(db, 'users', userId, 'mandates', mandateId);
        // Optional: Check if mandate exists and is 'Paused' before updating
        await updateDoc(mandateDocRef, {
            status: 'Active',
            updatedAt: serverTimestamp(),
        });
        console.log("Mandate resumed successfully in Firestore.");
        return true;
    } catch (error) {
        console.error("Error resuming mandate:", error);
        return false;
    }
}

/**
 * Asynchronously cancels an active or paused UPI Autopay mandate by updating its status in Firestore.
 *
 * @param mandateId The Firestore document ID of the mandate to cancel.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function cancelMandate(mandateId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;

    console.log(`Cancelling mandate ID: ${mandateId} for user ${userId}`);
    try {
        const mandateDocRef = doc(db, 'users', userId, 'mandates', mandateId);
        // Optional: Check if mandate exists and is 'Active' or 'Paused'
        await updateDoc(mandateDocRef, {
            status: 'Cancelled',
            updatedAt: serverTimestamp(),
        });
        console.log("Mandate cancelled successfully in Firestore.");

        // TODO: Trigger external UPI mandate cancellation flow if required by the PSP/NPCI.

        return true;
    } catch (error) {
        console.error("Error cancelling mandate:", error);
        return false;
    }
}
