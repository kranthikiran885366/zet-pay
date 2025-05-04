
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Checks user's KYC status and Smart Wallet Bridge enablement.
 * @param userId The ID of the user.
 * @returns Promise resolving to an object with KYC status and bridge status/limit.
 */
async function checkKYCAndBridgeStatus(userId) {
    if (!userId) {
        console.warn("checkKYCAndBridgeStatus called without userId.");
        return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false, canUseBridge: false, smartWalletBridgeLimit: 0 };
    }
    try {
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
             console.warn(`User profile not found for KYC/Bridge check: ${userId}`);
             return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false, canUseBridge: false, smartWalletBridgeLimit: 0 };
        }

        const data = userDocSnap.data();
        const kycStatus = data.kycStatus || 'Not Verified';
        const isEnabled = data.isSmartWalletBridgeEnabled || false;
        const limit = data.smartWalletBridgeLimit || 0; // Use 0 if not set

        return {
            kycStatus,
            isSmartWalletBridgeEnabled: isEnabled,
            canUseBridge: kycStatus === 'Verified' && isEnabled && limit > 0, // Check all conditions
            smartWalletBridgeLimit: limit
        };
    } catch (error) {
        console.error(`Error checking KYC/Bridge status for user ${userId}:`, error);
        // Return defaults on error to prevent blocking payment flows unnecessarily
        return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false, canUseBridge: false, smartWalletBridgeLimit: 0 };
    }
}

module.exports = {
    checkKYCAndBridgeStatus,
};
