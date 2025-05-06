// backend/services/auth.js
const { authAdmin, db } = require('../config/firebaseAdmin'); // Import admin SDK components

/**
 * Placeholder service for potential future backend-specific authentication logic.
 * Examples:
 * - Generating custom tokens for specific integrations.
 * - Verifying user roles/permissions beyond basic authentication.
 * - Server-side session management (if not using Firebase client-side sessions).
 */

/**
 * Checks if a user has a specific role (if roles are stored in Firestore).
 * @param {string} userId The user's Firebase UID.
 * @param {string} requiredRole The role to check for (e.g., 'admin', 'agent').
 * @returns {Promise<boolean>} True if the user has the role, false otherwise.
 */
async function checkUserRole(userId, requiredRole) {
    if (!userId || !requiredRole) {
        console.warn("[Auth Service] User ID and Required Role are necessary for role check.");
        return false;
    }
    console.log(`[Auth Service] Checking role '${requiredRole}' for user ${userId}`);
    try {
        const userProfileRef = db.collection('users').doc(userId);
        const userProfileSnap = await userProfileRef.get();

        if (!userProfileSnap.exists) {
            console.warn(`[Auth Service] User profile not found for role check: ${userId}`);
            return false;
        }

        const roles = userProfileSnap.data()?.roles; // Assuming roles are stored in an array field 'roles'
        if (Array.isArray(roles) && roles.includes(requiredRole)) {
            console.log(`[Auth Service] User ${userId} has required role: ${requiredRole}`);
            return true;
        }

        console.log(`[Auth Service] User ${userId} does not have required role: ${requiredRole}`);
        return false;
    } catch (error) {
        console.error(`[Auth Service] Error checking role for user ${userId}:`, error);
        return false; // Default to false on error
    }
}

/**
 * Verifies a Firebase ID token and returns user details.
 * This is primarily handled by the authMiddleware, but could be used in specific scenarios.
 * @param {string} idToken The Firebase ID token.
 * @returns {Promise<admin.auth.DecodedIdToken | null>} The decoded token or null if invalid.
 */
async function verifyIdToken(idToken) {
    if (!idToken) return null;
    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error("[Auth Service] Failed to verify ID token:", error.code);
        return null;
    }
}

module.exports = {
    checkUserRole,
    verifyIdToken,
    // Add other backend auth helper functions here
};

