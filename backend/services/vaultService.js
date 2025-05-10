// backend/services/vaultService.js
const { db, storageAdmin } = require('../config/firebaseAdmin'); // Import Firestore and Storage Admin SDK
const { collection, query, where, orderBy, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } = db; // Use admin SDK Firestore

const VAULT_ITEMS_COLLECTION = 'vaultItems'; // Top-level collection for vault items
const VAULT_STORAGE_BASE_PATH = 'user_vault_files'; // Base path in Firebase Storage

/**
 * Retrieves all vault items for a given user from Firestore.
 * @param userId The ID of the user.
 * @returns Promise resolving to an array of vault item objects.
 */
async function getUserVaultItems(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[Vault Service - Backend] Fetching vault items for user: ${userId}`);
    try {
        const itemsColRef = collection(db, VAULT_ITEMS_COLLECTION);
        const q = query(itemsColRef, where('userId', '==', userId), orderBy('dateAdded', 'desc'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            dateAdded: docSnap.data().dateAdded.toDate(), // Convert Timestamp
        }));
        return items;
    } catch (error) {
        console.error(`[Vault Service - Backend] Error fetching vault items for ${userId}:`, error);
        throw new Error("Could not retrieve vault items.");
    }
}

/**
 * Adds metadata of a new item to the user's vault in Firestore.
 * File upload itself might be handled separately (e.g., client direct to Storage).
 * @param userId The ID of the user.
 * @param itemData Metadata of the item (name, type, source, fileUrl/filePath, notes).
 * @returns Promise resolving to the newly created vault item object.
 */
async function addVaultItemMetadata(userId, itemData) {
    if (!userId || !itemData || !itemData.name || !itemData.type) {
        throw new Error("User ID, item name, and type are required.");
    }
    console.log(`[Vault Service - Backend] Adding vault item for user ${userId}: ${itemData.name}`);
    try {
        const itemsColRef = collection(db, VAULT_ITEMS_COLLECTION);
        const dataToSave = {
            userId,
            name: itemData.name,
            type: itemData.type,
            source: itemData.source || 'Manual Upload',
            notes: itemData.notes || '',
            fileUrl: itemData.fileUrl || null, // URL if external or after upload
            filePath: itemData.filePath || null, // Path in Firebase Storage if uploaded
            dateAdded: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(itemsColRef, dataToSave);
        const newDoc = await getDoc(docRef);
        return { id: newDoc.id, ...newDoc.data(), dateAdded: newDoc.data().dateAdded.toDate() };
    } catch (error) {
        console.error(`[Vault Service - Backend] Error adding vault item metadata for ${userId}:`, error);
        throw new Error("Could not add item to vault.");
    }
}

/**
 * Retrieves a specific vault item by its ID for a user.
 * @param userId The ID of the user.
 * @param itemId The ID of the vault item.
 * @returns Promise resolving to the vault item object or null if not found/unauthorized.
 */
async function getVaultItemById(userId, itemId) {
    if (!userId || !itemId) throw new Error("User ID and Item ID required.");
    const itemDocRef = doc(db, VAULT_ITEMS_COLLECTION, itemId);
    try {
        const docSnap = await getDoc(itemDocRef);
        if (docSnap.exists() && docSnap.data().userId === userId) {
            return { id: docSnap.id, ...docSnap.data(), dateAdded: docSnap.data().dateAdded.toDate() };
        }
        return null;
    } catch (error) {
        console.error(`[Vault Service - Backend] Error fetching vault item ${itemId} for ${userId}:`, error);
        throw new Error("Could not retrieve vault item.");
    }
}

/**
 * Updates metadata of an existing vault item.
 * @param userId The ID of the user.
 * @param itemId The ID of the vault item to update.
 * @param updateData The data to update.
 * @returns Promise resolving to the updated item object or null.
 */
async function updateVaultItemMetadata(userId, itemId, updateData) {
    if (!userId || !itemId || !updateData) throw new Error("User ID, Item ID, and update data required.");
    const itemDocRef = doc(db, VAULT_ITEMS_COLLECTION, itemId);
    try {
        const itemSnap = await getDoc(itemDocRef);
        if (!itemSnap.exists() || itemSnap.data().userId !== userId) {
            throw new Error("Vault item not found or permission denied.");
        }
        await updateDoc(itemDocRef, { ...updateData, updatedAt: serverTimestamp() });
        const updatedDoc = await getDoc(itemDocRef);
        return { id: updatedDoc.id, ...updatedDoc.data(), dateAdded: updatedDoc.data().dateAdded.toDate(), updatedAt: updatedDoc.data().updatedAt.toDate() };
    } catch (error) {
        console.error(`[Vault Service - Backend] Error updating vault item ${itemId} for ${userId}:`, error);
        throw new Error("Could not update vault item.");
    }
}

/**
 * Deletes a vault item's metadata from Firestore and its associated file from Firebase Storage.
 * @param userId The ID of the user.
 * @param itemId The ID of the vault item to delete.
 */
async function deleteVaultItemAndFile(userId, itemId) {
    if (!userId || !itemId) throw new Error("User ID and Item ID required.");
    console.log(`[Vault Service - Backend] Deleting vault item ${itemId} for user ${userId}`);
    const itemDocRef = doc(db, VAULT_ITEMS_COLLECTION, itemId);
    try {
        const itemSnap = await getDoc(itemDocRef);
        if (!itemSnap.exists() || itemSnap.data().userId !== userId) {
            throw new Error("Vault item not found or permission denied for deletion.");
        }
        const itemData = itemSnap.data();

        // Delete file from Firebase Storage if filePath exists
        if (itemData.filePath) {
            const bucket = storageAdmin.bucket(); // Default bucket
            const file = bucket.file(itemData.filePath);
            try {
                await file.delete();
                console.log(`[Vault Service - Backend] Deleted file ${itemData.filePath} from Storage.`);
            } catch (storageError) {
                // Log error but proceed to delete Firestore record
                console.error(`[Vault Service - Backend] Failed to delete file ${itemData.filePath} from Storage:`, storageError);
            }
        }
        // Delete metadata from Firestore
        await deleteDoc(itemDocRef);
        console.log(`[Vault Service - Backend] Deleted vault item metadata ${itemId}.`);
    } catch (error) {
        console.error(`[Vault Service - Backend] Error deleting vault item ${itemId}:`, error);
        throw new Error("Could not delete vault item.");
    }
}

/**
 * Generates a signed URL for client-side direct upload to Firebase Storage.
 * @param userId User's ID (for namespacing storage path).
 * @param fileName Original name of the file.
 * @param contentType MIME type of the file.
 * @returns Promise resolving to object with signed URL and file path.
 */
async function generateSignedUploadUrl(userId, fileName, contentType) {
    if (!userId || !fileName || !contentType) {
        throw new Error("User ID, file name, and content type are required.");
    }
    const filePath = `${VAULT_STORAGE_BASE_PATH}/${userId}/${Date.now()}_${fileName}`;
    const bucket = storageAdmin.bucket();
    const file = bucket.file(filePath);

    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: contentType,
    };

    try {
        const [url] = await file.getSignedUrl(options);
        console.log(`[Vault Service - Backend] Generated signed URL for ${filePath}`);
        return { signedUrl: url, filePath: filePath };
    } catch (error) {
        console.error(`[Vault Service - Backend] Error generating signed URL for ${filePath}:`, error);
        throw new Error("Could not generate upload URL.");
    }
}


module.exports = {
    getUserVaultItems,
    addVaultItemMetadata,
    getVaultItemById,
    updateVaultItemMetadata,
    deleteVaultItemAndFile,
    generateSignedUploadUrl,
    // uploadFileToVaultStorage - might be a helper for direct backend uploads
};
