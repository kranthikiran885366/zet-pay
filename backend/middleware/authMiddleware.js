
const admin = require('firebase-admin');

async function authMiddleware(req, res, next) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.warn("[Auth Middleware] Unauthorized: No token provided.");
        res.status(401); // Explicitly set status code before calling next
        return next(new Error('Unauthorized: No token provided.')); // Pass error to error handler
    }

    const idToken = authorizationHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Attach user ID and potentially other useful info to req.user
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            email_verified: decodedToken.email_verified,
            // Add other claims if needed
        };
        console.log(`[Auth Middleware] User authenticated: ${req.user.uid}`);
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('[Auth Middleware] Error verifying Firebase ID token:', error.code, error.message);
         if (error.code === 'auth/id-token-expired') {
             res.status(401);
             return next(new Error('Unauthorized: Token expired.'));
         }
         // Handle other specific auth errors if necessary
         // e.g., 'auth/argument-error', 'auth/id-token-revoked'
        res.status(401);
        return next(new Error('Unauthorized: Invalid token.'));
    }
}

module.exports = authMiddleware;

