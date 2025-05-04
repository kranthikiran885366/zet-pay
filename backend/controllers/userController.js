
const admin = require('firebase-admin');
const db = admin.firestore();

// Fetch user profile
exports.getUserProfile = async (req, res, next) => {
    const userId = req.user.uid; // Get user ID from authenticated request
    try {
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const profileData = userDocSnap.data();
        // Convert timestamps if needed before sending
        // const clientProfile = convertTimestampsToDates(profileData); // Assuming helper exists

        res.status(200).json({ id: userId, ...profileData });
    } catch (error) {
        next(error); // Pass error to central handler
    }
};

// Update user profile settings
exports.updateUserProfile = async (req, res, next) => {
    const userId = req.user.uid;
    const updates = req.body; // Data to update (e.g., { notificationsEnabled: true })

     // Basic validation (use express-validator for more robust checks)
     if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'Invalid update data provided.' });
     }

    // Prevent updating sensitive fields directly
     const allowedUpdates = ['name', 'phone', 'avatarUrl', 'notificationsEnabled', 'biometricEnabled', 'appLockEnabled', 'isSmartWalletBridgeEnabled', 'smartWalletBridgeLimit', 'isSeniorCitizenMode', 'defaultPaymentMethod'];
     const updateData = {};
     for (const key in updates) {
         if (allowedUpdates.includes(key)) {
             updateData[key] = updates[key];
         } else {
              console.warn(`Attempted to update restricted field '${key}' for user ${userId}. Ignoring.`);
         }
     }

     if (Object.keys(updateData).length === 0) {
         return res.status(400).json({ message: 'No valid fields provided for update.' });
     }


    try {
        const userDocRef = db.collection('users').doc(userId);
        // Check if doc exists before update if necessary
        // const userDocSnap = await userDocRef.get();
        // if (!userDocSnap.exists) return res.status(404).json({ message: 'User profile not found.' });

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp(); // Always update timestamp
        await userDocRef.update(updateData);

        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        next(error);
    }
};

// Placeholder for Blockchain Logging (should be in a separate service)
async function logToBlockchain(action, details) {
    console.log(`[Blockchain Log] Action: ${action}`, details);
    // Simulate API call to blockchain service
    try {
        // const response = await axios.post(process.env.BLOCKCHAIN_API_ENDPOINT, { action, details });
        // console.log('Blockchain log response:', response.data);
         await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
        console.error('Failed to log to blockchain:', error.message);
        // Decide if this failure should affect the user response
    }
}

// Add other user-related controller functions (KYC status, etc.)
