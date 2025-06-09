
// backend/services/user.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore'); // Import FieldValue

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
            return null;
        }
        const data = userDocSnap.data();
         // Convert Timestamps to Dates or ISO strings for consistency if needed by callers
         // For backend internal use, Timestamps are often fine. For API responses, convert.
         return {
            ...data,
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : undefined,
         };
    } catch (error) {
        console.error(`[User Service - Backend] Error fetching profile for ${userId}:`, error);
        throw new Error("Could not retrieve user profile.");
    }
}

/**
 * Creates or updates a user profile in Firestore.
 * Uses set with merge to handle both creation and partial updates.
 * Ensures 'updatedAt' timestamp is set. 'createdAt' is set on creation.
 * @param userId The ID of the user.
 * @param profileData The data to create or update.
 * @returns A promise resolving when the operation is complete.
 */
async function upsertUserProfileInDb(userId, profileData) {
    if (!userId) throw new Error("User ID is required.");
    if (!profileData || Object.keys(profileData).length === 0) {
        console.warn(`[User Service - Backend] Attempted to upsert profile for ${userId} with empty data.`);
        return;
    }

    console.log(`[User Service - Backend] Upserting profile for user ${userId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        
        const dataToSave = {
            ...profileData,
            userId: userId,
            updatedAt: FieldValue.serverTimestamp(), // Always update 'updatedAt'
        };

        const docSnap = await userDocRef.get();
        if (!docSnap.exists) {
            dataToSave.createdAt = FieldValue.serverTimestamp(); // Add 'createdAt' only on creation
        }

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
        return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false, canUseBridge: false, smartWalletBridgeLimit: 0 };
    }
}

/**
 * Updates only the Smart Wallet Bridge related settings.
 * Ensures KYC check before enabling.
 * @param userId The ID of the user.
 * @param settings Object containing `isSmartWalletBridgeEnabled` and optionally `smartWalletBridgeLimit`.
 */
async function updateSmartWalletBridgeSettings(userId, settings) {
    if (!userId || typeof settings !== 'object') throw new Error("User ID and settings object required.");
    
    const updates = {};
    if (settings.isSmartWalletBridgeEnabled !== undefined) {
        updates.isSmartWalletBridgeEnabled = settings.isSmartWalletBridgeEnabled;
    }
    if (settings.smartWalletBridgeLimit !== undefined && typeof settings.smartWalletBridgeLimit === 'number' && settings.smartWalletBridgeLimit >= 0) {
        updates.smartWalletBridgeLimit = settings.smartWalletBridgeLimit;
    }

    if (Object.keys(updates).length === 0) {
        console.warn("[User Service - Backend] No valid Smart Wallet Bridge settings provided for update.");
        return;
    }
    
    console.log(`[User Service - Backend] Updating Smart Wallet Bridge for user ${userId}:`, updates);

    try {
        const userDocRef = db.collection('users').doc(userId);

        // Re-check KYC if enabling or setting a positive limit
        if ((updates.isSmartWalletBridgeEnabled === true || (updates.smartWalletBridgeLimit !== undefined && updates.smartWalletBridgeLimit > 0))) {
            const profile = await getUserProfileFromDb(userId); // Fetch current profile
            if (!profile || profile.kycStatus !== 'Verified') {
                throw new Error("KYC verification required to enable or set a limit for Smart Wallet Bridge.");
            }
        }
        
        updates.updatedAt = FieldValue.serverTimestamp();
        await userDocRef.update(updates); // Use update instead of set with merge if document is known to exist
        console.log(`[User Service - Backend] Smart Wallet Bridge settings updated for ${userId}.`);
    } catch (error) {
        console.error(`[User Service - Backend] Error updating Smart Wallet Bridge for ${userId}:`, error);
        throw new Error(error.message || "Could not update Smart Wallet Bridge settings.");
    }
}

/**
 * Fetches a mock credit score for the user.
 * In a real app, this would integrate with a credit bureau API.
 * @param userId The ID of the user.
 * @returns A promise resolving to mock credit score data.
 */
async function fetchUserCreditScore(userId) {
    console.log(`[User Service - Backend] Simulating credit score fetch for user ${userId}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock data generation
    const score = Math.floor(Math.random() * (850 - 550 + 1)) + 550; // Score between 550 and 850
    const providers = ["CIBIL", "Experian", "Equifax"];
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const reportDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();

    return {
        score,
        provider,
        reportDate,
        // Add more mock details if needed
        // paymentHistory: "Excellent",
        // creditUtilization: "Low",
    };
}


module.exports = {
    getUserProfileFromDb,
    upsertUserProfileInDb,
    checkKYCAndBridgeStatus,
    updateSmartWalletBridgeSettings,
    fetchUserCreditScore, // Export new function
};

