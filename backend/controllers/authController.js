// backend/controllers/authController.js
const admin = require('../config/firebaseAdmin'); // Use admin SDK from config
const asyncHandler = require('../middleware/asyncHandler');

// Verify token validity and return basic user info
exports.verifyToken = asyncHandler(async (req, res, next) => {
    // Token is already verified by authMiddleware, user UID is in req.user.uid
    const userId = req.user.uid;
    console.log(`[Auth Ctrl] Verifying token for user: ${userId}`);

    // Fetch user data from Firebase Auth and Firestore profile
    try {
        const [userRecord, userProfileSnap] = await Promise.all([
            admin.auth().getUser(userId),
            admin.firestore().collection('users').doc(userId).get()
        ]);

        const userProfileData = userProfileSnap.exists ? userProfileSnap.data() : null;

        res.status(200).json({
            message: "Token verified successfully.",
            user: {
                uid: userId,
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                displayName: userRecord.displayName || userProfileData?.name || 'PayFriend User', // Use profile name as fallback
                photoURL: userRecord.photoURL || userProfileData?.avatarUrl,
                phoneNumber: userRecord.phoneNumber || userProfileData?.phone,
                kycStatus: userProfileData?.kycStatus || 'Not Verified', // Include KYC status
                createdAt: userRecord.metadata.creationTime,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                // Add other profile data as needed, excluding sensitive info
                profileData: {
                    notificationsEnabled: userProfileData?.notificationsEnabled ?? true,
                    isSmartWalletBridgeEnabled: userProfileData?.isSmartWalletBridgeEnabled ?? false,
                     smartWalletBridgeLimit: userProfileData?.smartWalletBridgeLimit ?? 0,
                }
            }
        });
    } catch (error) {
        console.error(`[Auth Ctrl] Error fetching user data for ${userId}:`, error);
        // Let the central error handler manage the response
        next(error);
    }
});

// Note: Login, Signup, Logout, Password Reset are primarily handled client-side.
// Backend role is token verification (middleware) and potentially user management via Admin SDK if needed.
