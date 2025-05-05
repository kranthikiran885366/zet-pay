// backend/controllers/contactsController.js
const contactService = require('../services/contacts'); // Assuming service is in ../services/contacts

// Get Contacts (with optional search)
exports.getContacts = async (req, res, next) => {
    const userId = req.user.uid;
    const searchTerm = req.query.q; // Use 'q' as the query parameter for search
    const contacts = await contactService.getContacts(userId, searchTerm);
    res.status(200).json(contacts);
};

// Add Contact
exports.addContact = async (req, res, next) => {
    const userId = req.user.uid;
    // Destructure all potential fields from the request body
    const { name, identifier, type, upiId, accountNumber, ifsc, isFavorite } = req.body;

    // Prepare data, ensuring only relevant fields are included based on type (optional stricter validation)
    const contactData = {
        name,
        identifier,
        type,
        upiId: upiId || undefined,
        accountNumber: accountNumber || undefined,
        ifsc: ifsc || undefined,
        isFavorite: isFavorite || false,
    };

    const newContact = await contactService.addContact(userId, contactData);
    res.status(201).json(newContact); // Return the newly created contact with its ID
};

// Get Contact Details
exports.getContactDetails = async (req, res, next) => {
    const userId = req.user.uid;
    const { id } = req.params;
    const contact = await contactService.getContactDetails(userId, id);
    if (!contact) {
        res.status(404);
        throw new Error('Contact not found.');
    }
    res.status(200).json(contact);
};

// Update Contact
exports.updateContact = async (req, res, next) => {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = req.body; // Contains fields to update

    // Ensure restricted fields like userId are not updated directly from body
    delete updateData.userId;
    delete updateData.id; // ID comes from params

    const updatedContact = await contactService.updateContact(userId, id, updateData);
    if (!updatedContact) {
         res.status(404);
         throw new Error('Contact not found or permission denied.');
    }
    res.status(200).json(updatedContact); // Return the updated contact
};

// Delete Contact
exports.deleteContact = async (req, res, next) => {
    const userId = req.user.uid;
    const { id } = req.params;
    await contactService.deleteContact(userId, id); // Service handles checks
    res.status(200).json({ success: true, message: 'Contact deleted successfully.' });
};
