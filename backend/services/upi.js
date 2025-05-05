
const admin = require('firebase-admin');
const db = admin.firestore();
const { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, getDoc, writeBatch, Timestamp } = require('firebase/firestore'); // Use Node.js Firestore
const upiProviderService = require('./upiProviderService'); // Simulated PSP/Bank interaction
const { getBankStatus } = require('./bankStatusService'); // Simulated bank status check

/**
 * Retrieves linked bank accounts for a given user ID from Firestore.
 * @param userId The user's Firebase UID.
 * @returns A promise resolving to an array of BankAccount objects.
 */
async function getLinkedAccounts(userId) {
    if (!userId) throw new Error("User ID required to fetch linked accounts.");
    console.log(`[UPI Service] Fetching linked accounts for user: ${userId}`);
    const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
    const q = query(accountsColRef, orderBy('isDefault', 'desc')); // Order default first
    const querySnapshot = await getDocs(q);
    const accounts = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        // Convert Timestamps if they exist (e.g., createdAt)
        createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : undefined,
    }));
    return accounts;
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
    console.log(`[UPI Service] Linking account for ${userId} with bank ${bankName}...`);

    // --- PSP SIMULATION START ---
    // Replace with actual PSP SDK calls for account discovery & linking
    await upiProviderService.simulateAccountDiscovery(userId);
    const maskedNumber = `xxxx${accountNumber.slice(-4)}`;
    const bankDomain = bankName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 5);
    const generatedUpiId = `${userId.substring(0, 4)}${maskedNumber.slice(-4)}@ok${bankDomain}`; // Example ID format
    const pinLength = Math.random() > 0.5 ? 6 : 4; // Example PIN length
    // --- PSP SIMULATION END ---

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
    console.log(`[UPI Service] Account linked successfully. Doc ID: ${docRef.id}, UPI ID: ${generatedUpiId}`);
    return { id: docRef.id, ...accountData, createdAt: accountData.createdAt.toDate() }; // Return with JS Date
}

/**
 * Removes a linked UPI ID/account from Firestore.
 * @param userId The user's Firebase UID.
 * @param upiId The UPI ID to remove.
 */
async function removeUpiId(userId, upiId) {
    if (!userId || !upiId) throw new Error("User ID and UPI ID are required.");
    console.log(`[UPI Service] Removing UPI ID ${upiId} for user ${userId}...`);

    const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
    const q = query(accountsColRef, where('upiId', '==', upiId), limit(1));
    const accountSnapshot = await getDocs(q);

    if (accountSnapshot.empty) {
        throw new Error("UPI ID not found.");
    }

    const accountDoc = accountSnapshot.docs[0];
    if (accountDoc.data().isDefault) {
         // Check if it's the ONLY account before throwing error
        const allAccountsSnap = await getDocs(accountsColRef);
        if (allAccountsSnap.size <= 1) {
             throw new Error("Cannot remove the only linked account.");
        }
        throw new Error("Cannot remove default account. Set another as default first.");
    }

    // TODO: Call PSP to deregister/unlink the UPI ID from their system if necessary

    await deleteDoc(accountDoc.ref);
    console.log(`[UPI Service] UPI ID ${upiId} removed successfully.`);
}

/**
 * Sets a specific UPI ID as the default account for the user in Firestore.
 * @param userId The user's Firebase UID.
 * @param upiId The UPI ID to set as default.
 */
async function setDefaultAccount(userId, upiId) {
    if (!userId || !upiId) throw new Error("User ID and UPI ID are required.");
    console.log(`[UPI Service] Setting ${upiId} as default for user ${userId}...`);

    const accountsColRef = collection(db, 'users', userId, 'linkedAccounts');
    const batch = writeBatch(db);

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
    console.log(`[UPI Service] ${upiId} set as default successfully.`);
}

module.exports = {
    getLinkedAccounts,
    linkBankAccount,
    removeUpiId,
    setDefaultAccount,
};
