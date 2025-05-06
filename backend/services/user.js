// backend/services/user.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();

/**
 * Fetches a user profile from Firestore.
 * @param userId The ID of the user.
 * @returns A promise resolving to the user profile data or null if not found.
 */
async function getUserProfileFromDb(userId) {
    if (!userId) throw new Error("User ID is required.");
    console.log(`[User Service - Backend] Fetching profile for user: ${userId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            console.warn(`[User Service - Backend] Profile not found for ${userId}`);
            return null; // Return null if profile doesn't exist
        }
        return userDocSnap.data();
    } catch (error) {
        console.error(`[User Service - Backend] Error fetching profile for ${userId}:`, error);
        throw new Error("Could not retrieve user profile."); // Throw a generic error
    }
}

/**
 * Creates or updates a user profile in Firestore.
 * Uses set with merge to handle both creation and partial updates.
 * Ensures 'updatedAt' timestamp is set.
 * @param userId The ID of the user.
 * @param profileData The data to create or update.
 * @returns A promise resolving when the operation is complete.
 */
async function upsertUserProfileInDb(userId, profileData) {
    if (!userId) throw new Error("User ID is required.");
    if (!profileData || Object.keys(profileData).length === 0) {
        console.warn(`[User Service - Backend] Attempted to upsert profile for ${userId} with empty data.`);
        return; // Don't proceed if no data
    }

    console.log(`[User Service - Backend] Upserting profile for user ${userId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        const dataToSave = {
            ...profileData,
            userId: userId, // Ensure userId is stored
            updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Update timestamp
        };

        // Add createdAt only if the document might not exist (merge handles this implicitly)
        // If you want explicit creation timestamp:
        // const docSnap = await userDocRef.get();
        // if (!docSnap.exists) {
        //     dataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
        // }

        await userDocRef.set(dataToSave, { merge: true });
        console.log(`[User Service - Backend] Profile for ${userId} upserted successfully.`);
    } catch (error) {
        console.error(`[User Service - Backend] Error upserting profile for ${userId}:`, error);
        throw new Error("Could not update user profile.");
    }
}

/**
 * Checks KYC status and Smart Wallet Bridge settings directly from the database.
 * Used internally by backend services (e.g., UPI controller).
 * @param userId The ID of the user.
 * @returns Promise resolving to an object with KYC status and bridge details.
 */
async function checkKYCAndBridgeStatus(userId) {
    if (!userId) throw new Error("User ID required for KYC/Bridge check.");
    try {
        const profile = await getUserProfileFromDb(userId);
        const kycStatus = profile?.kycStatus || 'Not Verified';
        const isEnabled = profile?.isSmartWalletBridgeEnabled || false;
        const limit = profile?.smartWalletBridgeLimit || 0;

        return {
            kycStatus,
            isSmartWalletBridgeEnabled: isEnabled,
            canUseBridge: kycStatus === 'Verified' && isEnabled && limit > 0,
            smartWalletBridgeLimit: limit
        };
    } catch (error) {
        console.error(`[User Service - Backend] Error checking KYC/Bridge status for user ${userId}:`, error);
        // Return defaults on error
        return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false, canUseBridge: false, smartWalletBridgeLimit: 0 };
    }
}

module.exports = {
    getUserProfileFromDb,
    upsertUserProfileInDb,
    checkKYCAndBridgeStatus,
    // Add other user-related backend service functions here
};
