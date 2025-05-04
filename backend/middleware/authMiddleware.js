
const admin = require('firebase-admin');

async function authMiddleware(req, res, next) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const idToken = authorizationHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Add decoded user info to the request object
        console.log(`User authenticated: ${req.user.uid}`);
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
         if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ message: 'Unauthorized: Token expired.' });
         }
        return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
}

module.exports = authMiddleware;
