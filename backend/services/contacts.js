
// backend/services/contacts.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, query, where, orderBy, limit, getDocs, getDoc, addDoc, updateDoc, deleteDoc } = require('firebase/firestore'); // Import Firestore functions

/**
 * Retrieves contacts for a user, optionally filtered by a search term.
 * @param {string} userId The user's Firebase UID.
 * @param {string} searchTerm Optional search term for contact name or identifier.
 * @returns {Promise<object[]>} A promise resolving to an array of contact objects.
 */
exports.getContacts = async (userId, searchTerm) => {
    if (!userId) throw new Error("User ID is required.");
    console.log(`[Contact Service] Fetching contacts for user ${userId}${searchTerm ? ` with search term "${searchTerm}"` : ''}`);

    try {
        const contactsColRef = collection(db, 'users', userId, 'contacts');
        let q = query(contactsColRef);

        if (searchTerm) {
            // Firestore doesn't support full-text search, so we'll use a client-side filter after fetching
            // TODO: Consider Algolia/Elasticsearch for efficient full-text search at scale.
            // q = query(q, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff')); // Inefficient
        }

        q = query(q, orderBy('name')); // Sort alphabetically (optional)
        const querySnapshot = await getDocs(q);

        let contacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            contacts = contacts.filter(contact =>
                contact.name.toLowerCase().includes(lowerSearchTerm) ||
                contact.identifier.toLowerCase().includes(lowerSearchTerm)
            );
        }

        console.log(`[Contact Service] Found ${contacts.length} contacts for user ${userId}.`);
        return contacts;
    } catch (error) {
        console.error("Error fetching contacts:", error);
        throw new Error("Could not retrieve contacts.");
    }
};

/**
 * Adds a new contact to a user's contact list.
 * @param {string} userId The user's Firebase UID.
 * @param {object} contactData The contact data to add.
 * @returns {Promise<object>} A promise resolving to the newly created contact object with its ID.
 */
exports.addContact = async (userId, contactData) => {
    if (!userId || !contactData) throw new Error("User ID and contact data are required.");

    console.log(`[Contact Service] Adding new contact for user ${userId}:`, contactData);
    try {
        const contactsColRef = collection(db, 'users', userId, 'contacts');
        const docRef = await addDoc(contactsColRef, contactData);
        console.log(`[Contact Service] New contact added with ID: ${docRef.id}`);

        // Fetch the newly created document to return it
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            throw new Error("Failed to retrieve newly created contact.");
        }

    } catch (error) {
        console.error("Error adding contact:", error);
        throw new Error("Could not add contact.");
    }
};

/**
 * Retrieves details of a single contact.
 * @param {string} userId The user's Firebase UID.
 * @param {string} contactId The contact's ID.
 * @returns {Promise<object|null>} A promise resolving to the contact object or null if not found.
 */
exports.getContactDetails = async (userId, contactId) => {
    if (!userId || !contactId) throw new Error("User ID and Contact ID are required.");
    console.log(`[Contact Service] Fetching details for contact ${contactId} for user ${userId}`);

    try {
        const contactDocRef = doc(db, 'users', userId, 'contacts', contactId);
        const docSnap = await getDoc(contactDocRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.warn(`Contact not found: ${contactId}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching contact details:", error);
        throw new Error("Could not retrieve contact details.");
    }
};

/**
 * Updates an existing contact.
 * @param {string} userId The user's Firebase UID.
 * @param {string} contactId The contact's ID.
 * @param {object} updateData The data to update.
 * @returns {Promise<object|null>} A promise resolving to the updated contact object or null if not found/permission denied.
 */
exports.updateContact = async (userId, contactId, updateData) => {
    if (!userId || !contactId || !updateData) throw new Error("User ID, Contact ID, and update data are required.");
    console.log(`[Contact Service] Updating contact ${contactId} for user ${userId}:`, updateData);

    try {
        const contactDocRef = doc(db, 'users', userId, 'contacts', contactId);
        await updateDoc(contactDocRef, updateData);

        const docSnap = await getDoc(contactDocRef); // Get the updated document

        if (docSnap.exists()) {
             return { id: docSnap.id, ...docSnap.data() }; // Return updated data
        } else {
             console.warn(`Contact not found after update: ${contactId}`);
            return null;
        }

    } catch (error) {
        console.error("Error updating contact:", error);
        throw new Error("Could not update contact.");
    }
};

/**
 * Deletes a contact from a user's contact list.
 * @param {string} userId The user's Firebase UID.
 * @param {string} contactId The contact's ID.
 * @returns {Promise<void>} A promise resolving when deletion is complete.
 */
exports.deleteContact = async (userId, contactId) => {
    if (!userId || !contactId) throw new Error("User ID and Contact ID are required.");
    console.log(`[Contact Service] Deleting contact ${contactId} for user ${userId}`);

    try {
        const contactDocRef = doc(db, 'users', userId, 'contacts', contactId);
        await deleteDoc(contactDocRef);
        console.log(`[Contact Service] Contact deleted successfully: ${contactId}`);
    } catch (error) {
        console.error("Error deleting contact:", error);
        throw new Error("Could not delete contact.");
    }
};

    