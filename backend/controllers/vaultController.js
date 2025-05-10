// backend/controllers/vaultController.js
const vaultService = require('../services/vaultService'); // Assuming service location

// Get all vault items for the user
exports.getVaultItems = async (req, res, next) => {
    const userId = req.user.uid; // From authMiddleware
    const items = await vaultService.getUserVaultItems(userId);
    res.status(200).json(items);
};

// Add a new item to the vault
exports.addVaultItem = async (req, res, next) => {
    const userId = req.user.uid;
    // itemData contains name, type, source, fileUrl (if external), notes
    const itemData = req.body;

    // In a real scenario, if files are uploaded directly to backend:
    // 1. Handle file upload (e.g., using multer)
    // 2. Upload file to Firebase Storage using vaultService.uploadFileToVaultStorage
    // 3. Then call vaultService.addVaultItemMetadata with the file's storage path/URL

    // For now, assume fileUrl might be an external link or handled by client direct upload
    const newItem = await vaultService.addVaultItemMetadata(userId, itemData);
    res.status(201).json(newItem);
};

// Get details of a specific vault item
exports.getVaultItemDetails = async (req, res, next) => {
    const userId = req.user.uid;
    const { itemId } = req.params;
    const item = await vaultService.getVaultItemById(userId, itemId);
    if (!item) {
        res.status(404);
        throw new Error('Vault item not found or access denied.');
    }
    res.status(200).json(item);
};

// Update a vault item
exports.updateVaultItem = async (req, res, next) => {
    const userId = req.user.uid;
    const { itemId } = req.params;
    const updateData = req.body;
    const updatedItem = await vaultService.updateVaultItemMetadata(userId, itemId, updateData);
    if (!updatedItem) {
        res.status(404);
        throw new Error('Vault item not found or update failed.');
    }
    res.status(200).json(updatedItem);
};

// Delete a vault item
exports.deleteVaultItem = async (req, res, next) => {
    const userId = req.user.uid;
    const { itemId } = req.params;
    await vaultService.deleteVaultItemAndFile(userId, itemId); // Service handles file deletion from Storage
    res.status(200).json({ success: true, message: 'Vault item deleted successfully.' });
};

// Get a signed URL for uploading a file (if direct client upload to Firebase Storage)
// exports.getUploadUrl = async (req, res, next) => {
//     const userId = req.user.uid;
//     const { fileName, contentType } = req.body;
//     // Validate fileNamen and contentType
//     const uploadUrlDetails = await vaultService.generateSignedUploadUrl(userId, fileName, contentType);
//     res.status(200).json(uploadUrlDetails);
// };
