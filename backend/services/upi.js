// backend/services/upi.js
const admin = require('../config/firebaseAdmin'); // Use admin SDK from config
const db = admin.firestore();
const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp } = db; // Use Firestore functions from admin SDK
const upiProviderService = require('./upiProviderService'); // Simulated PSP/Bank interaction
const { getBankStatus } = require('./bankStatusService'); // Simulated bank status check

/**
 * Retrieves linked bank accounts for a given user ID from Firestore.
 * @param userId The user's Firebase UID.
 * @returns A promise resolving to an array of BankAccount objects.
 */
async function getLinkedAccounts(userId) {
    if (!userId) throw new Error("User ID required to fetch linked accounts.");
    console.log(`[UPI Service - Backend] Fetching linked accounts for user: ${userId}`);
    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, orderBy('isDefault', 'desc')); // Order default first
        const querySnapshot = await getDocs(q);
        const accounts = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            // Convert Timestamps if they exist (e.g., createdAt)
            createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate().toISOString() : undefined,
        }));
        return accounts;
    } catch (error) {
         console.error(`[UPI Service - Backend] Error fetching linked accounts for ${userId}:`, error);
         throw new Error("Could not retrieve linked accounts.");
    }
}

/**
 * Simulates linking a new bank account via the PSP and saves details to Firestore.
 * In reality, this involves device binding, SMS verification, and PSP callbacks.
 * @param userId The user's Firebase UID.
 * @param bankName Name of the bank.
 * @param accountNumber Account number (will be masked).
 * @returns A promise resolving to the newly linked BankAccount object.
 */
async function linkBankAccount(userId, bankName, accountNumber) {
    if (!userId || !bankName || !accountNumber) throw new Error("User ID, Bank Name, and Account Number are required.");
    console.log(`[UPI Service - Backend] Linking account for ${userId} with bank ${bankName}...`);

    // --- PSP SIMULATION START ---
    // Replace with actual PSP SDK calls for account discovery & linking
    await upiProviderService.simulateAccountDiscovery(userId);
    const maskedNumber = `xxxx${String(accountNumber).slice(-4)}`; // Ensure accountNumber is string before slice
    const bankDomain = bankName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 5);
    const generatedUpiId = `${userId.substring(0, 4)}${maskedNumber.slice(-4)}@ok${bankDomain}`; // Example ID format
    const pinLength = Math.random() > 0.5 ? 6 : 4; // Example PIN length
    // --- PSP SIMULATION END ---

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, limit(1));
        const existingAccountsSnap = await getDocs(q);
        const isFirstAccount = existingAccountsSnap.empty;

        const accountData = {
            bankName,
            accountNumber: maskedNumber, // Store masked number
            userId,
            upiId: generatedUpiId,
            isDefault: isFirstAccount,
            pinLength,
            createdAt: Timestamp.now(), // Use Firestore Timestamp
        };

        const docRef = await addDoc(accountsColRef, accountData);
        console.log(`[UPI Service - Backend] Account linked successfully. Doc ID: ${docRef.id}, UPI ID: ${generatedUpiId}`);
        return { id: docRef.id, ...accountData, createdAt: accountData.createdAt.toDate().toISOString() }; // Return with ISO string date
    } catch (error) {
         console.error(`[UPI Service - Backend] Error saving linked account for ${userId}:`, error);
         throw new Error("Could not link bank account.");
    }
}

/**
 * Removes a linked UPI ID/account from Firestore.
 * @param userId The user's Firebase UID.
 * @param upiId The UPI ID to remove.
 */
async function removeUpiId(userId, upiId) {
    if (!userId || !upiId) throw new Error("User ID and UPI ID are required.");
    console.log(`[UPI Service - Backend] Removing UPI ID ${upiId} for user ${userId}...`);

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        const q = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const accountSnapshot = await getDocs(q);

        if (accountSnapshot.empty) {
            throw new Error("UPI ID not found.");
        }

        const accountDoc = accountSnapshot.docs[0];
        if (accountDoc.data().isDefault) {
            const allAccountsSnap = await getDocs(accountsColRef);
            if (allAccountsSnap.size <= 1) {
                throw new Error("Cannot remove the only linked account.");
            }
            throw new Error("Cannot remove default account. Set another as default first.");
        }

        // TODO: Call PSP to deregister/unlink the UPI ID from their system if necessary

        await deleteDoc(accountDoc.ref);
        console.log(`[UPI Service - Backend] UPI ID ${upiId} removed successfully.`);
    } catch (error) {
         console.error(`[UPI Service - Backend] Error removing UPI ID ${upiId} for ${userId}:`, error);
         throw error; // Re-throw original error
    }
}

/**
 * Sets a specific UPI ID as the default account for the user in Firestore.
 * @param userId The user's Firebase UID.
 * @param upiId The UPI ID to set as default.
 */
async function setDefaultAccount(userId, upiId) {
    if (!userId || !upiId) throw new Error("User ID and UPI ID are required.");
    console.log(`[UPI Service - Backend] Setting ${upiId} as default for user ${userId}...`);

    try {
        const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
        const batch = db.batch(); // Use batch from admin SDK db

        // Find the new default account
        const newDefaultQuery = query(accountsColRef, where('upiId', '==', upiId), limit(1));
        const newDefaultSnap = await getDocs(newDefaultQuery);
        if (newDefaultSnap.empty) {
            throw new Error("Selected UPI ID not found.");
        }
        const newDefaultDocRef = newDefaultSnap.docs[0].ref;

        // Find the current default account(s)
        const currentDefaultQuery = query(accountsColRef, where('isDefault', '==', true));
        const currentDefaultSnap = await getDocs(currentDefaultQuery);

        // Unset all current defaults
        currentDefaultSnap.docs.forEach(docSnap => {
            if (docSnap.id !== newDefaultDocRef.id) { // Avoid unnecessary write if already default
                batch.update(docSnap.ref, { isDefault: false });
            }
        });

        // Set the new default
        batch.update(newDefaultDocRef, { isDefault: true });

        await batch.commit();
        console.log(`[UPI Service - Backend] ${upiId} set as default successfully.`);
    } catch (error) {
         console.error(`[UPI Service - Backend] Error setting default account for ${userId}:`, error);
         throw new Error("Could not set default account.");
    }
}

module.exports = {
    getLinkedAccounts,
    linkBankAccount,
    removeUpiId,
    setDefaultAccount,
};
