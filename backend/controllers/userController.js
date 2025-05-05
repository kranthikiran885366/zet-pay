
const admin = require('firebase-admin');
const db = admin.firestore();

// Fetch user profile
exports.getUserProfile = async (req, res, next) => {
    const userId = req.user.uid; // Get user ID from authenticated request
    console.log(`[User Ctrl] Fetching profile for user: ${userId}`);
    try {
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            // If profile doesn't exist, create a basic one from Auth info
            console.log(`[User Ctrl] Profile not found for ${userId}, creating basic profile...`);
            const authUser = await admin.auth().getUser(userId);
            const basicProfile = {
                id: userId, // Explicitly add id
                name: authUser.displayName || 'PayFriend User',
                email: authUser.email,
                phone: authUser.phoneNumber || undefined,
                avatarUrl: authUser.photoURL || undefined,
                kycStatus: 'Not Verified',
                createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                // Initialize other fields with defaults
                notificationsEnabled: true,
                biometricEnabled: false,
                appLockEnabled: false,
                isSmartWalletBridgeEnabled: false,
                smartWalletBridgeLimit: 0,
                isSeniorCitizenMode: false,
            };
            await userDocRef.set(basicProfile);
             // Fetch again to get server timestamp resolved (or return basicProfile directly)
             const createdDocSnap = await userDocRef.get();
             const profileData = createdDocSnap.data();
             // Convert timestamps if needed
             const clientProfile = convertTimestampsToDates(profileData);
             return res.status(200).json({ id: userId, ...clientProfile });

        } else {
            const profileData = userDocSnap.data();
            // Convert timestamps if needed before sending
            const clientProfile = convertTimestampsToDates(profileData);
            res.status(200).json({ id: userId, ...clientProfile });
        }
    } catch (error) {
        console.error(`[User Ctrl] Error fetching profile for ${userId}:`, error);
        next(error); // Pass error to central handler
    }
};

// Update user profile settings
exports.updateUserProfile = async (req, res, next) => {
    const userId = req.user.uid;
    const updates = req.body; // Data to update (already validated by router)
    console.log(`[User Ctrl] Updating profile for user ${userId} with:`, updates);

    // Define allowed fields for update
    const allowedUpdates = [
        'name', 'phone', 'avatarUrl', 'notificationsEnabled', 'biometricEnabled',
        'appLockEnabled', 'isSmartWalletBridgeEnabled', 'smartWalletBridgeLimit',
        'isSeniorCitizenMode', 'defaultPaymentMethod'
    ];
    const updateData = {};

    // Filter only allowed fields
    for (const key in updates) {
        if (allowedUpdates.includes(key)) {
            // Handle specific conversions or validations if necessary
            if (key === 'smartWalletBridgeLimit' && typeof updates[key] === 'number') {
                updateData[key] = Math.max(0, updates[key]); // Ensure limit is not negative
            } else {
                 updateData[key] = updates[key];
            }
        } else {
            console.warn(`[User Ctrl] Attempted to update restricted field '${key}' for user ${userId}. Ignoring.`);
        }
    }

    if (Object.keys(updateData).length === 0) {
        // No valid fields provided, but maybe still return success? Or bad request?
         console.log(`[User Ctrl] No valid fields provided for update for user ${userId}.`);
        return res.status(200).json({ message: 'No valid fields provided for update.' }); // Success, but nothing changed
    }

    try {
        const userDocRef = db.collection('users').doc(userId);
        // Ensure document exists before update (optional, update creates if not exists with merge)
        const userDocSnap = await userDocRef.get();
        if (!userDocSnap.exists) {
             res.status(404);
             throw new Error('User profile not found.');
        }

        // Set updatedAt timestamp
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await userDocRef.update(updateData); // Use update instead of set with merge for clarity
        console.log(`[User Ctrl] Profile updated successfully for ${userId}.`);

        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(`[User Ctrl] Error updating profile for ${userId}:`, error);
        next(error);
    }
};

// Helper function to convert Firestore Timestamps to JS Dates (or ISO strings)
function convertTimestampsToDates(data) {
    if (!data) return data;
    const converted = { ...data };
    for (const key in converted) {
        if (converted[key] instanceof admin.firestore.Timestamp) {
            converted[key] = converted[key].toDate(); // Convert to JS Date object
            // Or to ISO string: converted[key] = converted[key].toDate().toISOString();
        }
    }
    return converted;
}

// Placeholder for Blockchain Logging (moved to transactionLogger service)

// Add other user-related controller functions (KYC status, etc.) if needed
exports.getKycStatus = async (req, res, next) => {
     const userId = req.user.uid;
     console.log(`[User Ctrl] Getting KYC status for user ${userId}`);
     try {
         const profile = await exports.getUserProfile(req, res, next); // Reuse getUserProfile
         // getUserProfile already sends response, so maybe just return status? Or refactor getUserProfile
         // For now, let's just return the status if profile exists
         if(profile && profile.kycStatus) {
              res.status(200).json({ kycStatus: profile.kycStatus });
         } else if (profile) {
             res.status(200).json({ kycStatus: 'Not Verified' }); // Default if field missing
         } else {
             // getUserProfile handles not found, so this shouldn't be reached unless there's an error
         }
     } catch (error) {
         next(error);
     }
 };

exports.initiateKyc = async (req, res, next) => {
     const userId = req.user.uid;
     console.log(`[User Ctrl] Initiating KYC for user ${userId}`);
     // TODO: Implement KYC initiation logic
     // 1. Call KYC provider API (e.g., upload documents, start video KYC)
     // 2. Update user profile status to 'Pending'
     res.status(501).json({ message: 'KYC initiation not implemented yet.' });
 };

// Example of how a service might interact with user data
// This would typically be in a service file, not controller
async function checkKYCAndBridgeStatusInternal(userId) {
     if (!userId) return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false };
     const userDoc = await db.collection('users').doc(userId).get();
     if (!userDoc.exists) return { kycStatus: 'Not Verified', isSmartWalletBridgeEnabled: false };
     const data = userDoc.data();
     return {
         kycStatus: data.kycStatus || 'Not Verified',
         isSmartWalletBridgeEnabled: data.isSmartWalletBridgeEnabled || false,
         smartWalletBridgeLimit: data.smartWalletBridgeLimit || 0
     };
}
