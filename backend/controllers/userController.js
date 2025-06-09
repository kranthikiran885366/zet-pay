// backend/controllers/userController.js
const admin = require('../config/firebaseAdmin'); // For fetching Auth details if needed
const userService = require('../services/user'); // Import backend user service
const asyncHandler = require('../middleware/asyncHandler');

// Fetch user profile using the service
exports.getUserProfile = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid; // Get user ID from authenticated request
    console.log(`[User Ctrl] Fetching profile for user: ${userId}`);

    let profileData = await userService.getUserProfileFromDb(userId);

    if (!profileData) {
        // If profile doesn't exist in DB, create a basic one from Auth info
        console.log(`[User Ctrl] Profile not found in DB for ${userId}, creating basic profile...`);
        const authUser = await admin.auth().getUser(userId);
        const basicProfile = {
            // id field is not needed as it's the document ID
            name: authUser.displayName || 'PayFriend User',
            email: authUser.email,
            phone: authUser.phoneNumber || undefined,
            avatarUrl: authUser.photoURL || undefined,
            kycStatus: 'Not Verified',
            // createdAt and updatedAt will be set by upsert function
            notificationsEnabled: true,
            biometricEnabled: false,
            appLockEnabled: false,
            isSmartWalletBridgeEnabled: false,
            smartWalletBridgeLimit: 0,
            isSeniorCitizenMode: false,
        };
        // Use upsert to create it (this also sets timestamps)
        await userService.upsertUserProfileInDb(userId, basicProfile);
        // Fetch again to get the saved data with timestamps
        profileData = await userService.getUserProfileFromDb(userId);
        if (!profileData) {
             // This shouldn't happen, but handle defensively
             throw new Error("Failed to create or retrieve user profile after signup.");
        }
    }

    // Convert Firestore Timestamps to JS Dates/ISO Strings for the client
    const clientProfile = convertTimestamps(profileData);

    res.status(200).json({ id: userId, ...clientProfile }); // Return profile with ID
});

// Update user profile settings using the service
exports.updateUserProfile = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const updatesFromBody = req.body; // Data to update (already validated by router)
    console.log(`[User Ctrl] Updating profile for user ${userId} with:`, updatesFromBody);

    // Define allowed fields for update by user
    const allowedUpdates = [
        'name', 'phone', 'avatarUrl', 'notificationsEnabled', 'biometricEnabled',
        'appLockEnabled', 'isSmartWalletBridgeEnabled', 'smartWalletBridgeLimit',
        'isSeniorCitizenMode', 'defaultPaymentMethod'
        // Exclude fields like email, kycStatus which might have different update flows
    ];
    const updateData = {};

    // Filter only allowed fields and sanitize (e.g., ensure limit is non-negative)
    for (const key in updatesFromBody) {
        if (allowedUpdates.includes(key)) {
            if (key === 'smartWalletBridgeLimit' && typeof updatesFromBody[key] === 'number') {
                updateData[key] = Math.max(0, updatesFromBody[key]); // Ensure limit is not negative
            } else if (key === 'phone' && updatesFromBody[key] === '') {
                 updateData[key] = null; // Allow clearing phone number
            } else if (key === 'avatarUrl' && updatesFromBody[key] === '') {
                 updateData[key] = null; // Allow clearing avatar
            }
            else {
                updateData[key] = updatesFromBody[key];
            }
        } else {
            console.warn(`[User Ctrl] Attempted to update restricted/unknown field '${key}' for user ${userId}. Ignoring.`);
        }
    }

    if (Object.keys(updateData).length === 0) {
        console.log(`[User Ctrl] No valid fields provided for update for user ${userId}.`);
        // Fetch current profile to send back updated data (even if nothing changed)
        const currentProfileData = await userService.getUserProfileFromDb(userId);
        const clientProfile = convertTimestamps(currentProfileData);
        return res.status(200).json({ message: 'No fields updated.', profile: { id: userId, ...clientProfile } });
    }

    // Use the service to update the profile in the database
    await userService.upsertUserProfileInDb(userId, updateData);
    console.log(`[User Ctrl] Profile updated successfully for ${userId}.`);

    // Fetch the updated profile to send back the latest data
    const updatedProfileData = await userService.getUserProfileFromDb(userId);
    const clientProfile = convertTimestamps(updatedProfileData);

    res.status(200).json({ message: 'Profile updated successfully.', profile: { id: userId, ...clientProfile } }); // Return updated profile
});

// Fetch Credit Score (Mock)
exports.getCreditScore = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    console.log(`[User Ctrl] Fetching credit score for user: ${userId}`);
    const creditScoreData = await userService.fetchUserCreditScore(userId); // Call service function
    res.status(200).json(creditScoreData);
});


// --- KYC Stubs (Implementation depends heavily on KYC provider) ---

exports.getKycStatus = asyncHandler(async (req, res, next) => {
     const userId = req.user.uid;
     console.log(`[User Ctrl] Getting KYC status for user ${userId}`);
     const profile = await userService.getUserProfileFromDb(userId);
     res.status(200).json({ kycStatus: profile?.kycStatus || 'Not Verified' });
 });

exports.initiateKyc = asyncHandler(async (req, res, next) => {
     const userId = req.user.uid;
     console.log(`[User Ctrl] Initiating KYC for user ${userId}`);
     // TODO: Implement KYC initiation logic
     // 1. Check if KYC already verified/pending
     // 2. Call KYC provider API (e.g., upload documents, start video KYC link generation)
     // 3. Update user profile status to 'Pending' in DB using userService.upsertUserProfileInDb
     // 4. Return necessary info to frontend (e.g., redirect URL, status message)
     res.status(501).json({ message: 'KYC initiation not implemented yet.' });
 });

 // --- Helper ---

// Helper function to convert Firestore Timestamps to ISO strings for JSON response
function convertTimestamps(data) {
    if (!data) return data;
    const converted = { ...data };
    for (const key in converted) {
        if (converted[key] instanceof admin.firestore.Timestamp) {
            // Convert to ISO string which is JSON serializable
            converted[key] = converted[key].toDate().toISOString();
        }
    }
    return converted;
}
