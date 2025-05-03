/**
 * @fileOverview Service functions for managing user contacts/payees in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { getUserProfileById } from './user'; // To potentially fetch full payee details

// Interface remains the same
export interface Payee {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this contact
  name: string;
  identifier: string; // Phone number or UPI ID/Account
  type: 'mobile' | 'bank';
  avatarSeed?: string; // Kept for potential client-side generation consistency
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
  isFavorite?: boolean; // Example new field
}

/**
 * Asynchronously retrieves a list of the current user's saved contacts/payees from Firestore.
 * Optionally filters by search term.
 *
 * @param searchTerm Optional search term to filter contacts by name or identifier.
 * @returns A promise that resolves to an array of Payee objects.
 */
export async function getContacts(searchTerm?: string): Promise<Payee[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in to get contacts.");
    return [];
  }

  console.log(`Fetching contacts for user ${currentUser.uid} ${searchTerm ? `matching "${searchTerm}"` : ''}`);

  try {
    const contactsColRef = collection(db, 'users', currentUser.uid, 'contacts');
    let q = query(contactsColRef, orderBy('name')); // Default sort by name

    // Note: Firestore requires composite indexes for queries involving multiple different fields (e.g., filtering by name OR identifier).
    // For simplicity, this example searches only by name prefix if a search term is provided.
    // A more robust solution might involve a dedicated search index (like Algolia) or client-side filtering after fetching.
    if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        // Simple prefix search on name (case-insensitive requires workaround or different DB)
        // This query might need adjustments based on exact search needs and Firestore limitations.
        // q = query(contactsColRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
        // Client-side filtering is easier for mock/simple cases:
         const allContactsSnap = await getDocs(q);
         const allContacts = allContactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payee));
         return allContacts.filter(payee =>
            payee.name.toLowerCase().includes(lowerCaseSearch) ||
            payee.identifier.toLowerCase().includes(lowerCaseSearch) ||
            payee.upiId?.toLowerCase().includes(lowerCaseSearch)
         );
    }

    const querySnapshot = await getDocs(q);
    const contacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payee));
    return contacts;

  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw new Error("Could not fetch contacts.");
  }
}

/**
 * Asynchronously retrieves details for a specific payee ID for the current user.
 *
 * @param payeeId The Firestore document ID of the payee to retrieve.
 * @returns A promise that resolves to the Payee object or null if not found or not accessible.
 */
export async function getPayeeDetails(payeeId: string): Promise<Payee | null> {
     const currentUser = auth.currentUser;
     if (!currentUser) return null;

     console.log(`Fetching details for payee ID: ${payeeId} for user ${currentUser.uid}`);
     try {
        const payeeDocRef = doc(db, 'users', currentUser.uid, 'contacts', payeeId);
        const payeeDocSnap = await getDoc(payeeDocRef);

        if (payeeDocSnap.exists()) {
            return { id: payeeDocSnap.id, ...payeeDocSnap.data() } as Payee;
        } else {
            console.log("Payee document not found:", payeeId);
            return null;
        }
    } catch (error) {
        console.error("Error fetching payee details:", error);
        throw new Error("Could not fetch payee details.");
    }
}

/**
 * Asynchronously saves a new payee for the current user in Firestore.
 *
 * @param payeeData The details of the payee to save (excluding id and userId).
 * @returns A promise that resolves to the newly created Payee object (with id).
 */
export async function savePayee(payeeData: Omit<Payee, 'id' | 'userId' | 'avatarSeed'>): Promise<Payee> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to save payee.");
    }

    console.log("Saving new payee for user:", currentUser.uid, payeeData);
    try {
        const contactsColRef = collection(db, 'users', currentUser.uid, 'contacts');
        const docRef = await addDoc(contactsColRef, {
            ...payeeData,
            userId: currentUser.uid, // Add owner ID
            isFavorite: payeeData.isFavorite ?? false, // Default favorite status
        });
        console.log("Payee added with ID:", docRef.id);
        return {
            ...payeeData,
            id: docRef.id,
            userId: currentUser.uid,
            isFavorite: payeeData.isFavorite ?? false,
        };
    } catch (error) {
        console.error("Error saving payee:", error);
        throw new Error("Could not save payee.");
    }
}


/**
 * Asynchronously updates an existing payee for the current user.
 *
 * @param payeeId The Firestore document ID of the payee to update.
 * @param updateData The partial data to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updatePayee(payeeId: string, updateData: Partial<Omit<Payee, 'id' | 'userId'>>): Promise<void> {
     const currentUser = auth.currentUser;
     if (!currentUser) {
        throw new Error("User must be logged in to update payee.");
    }
    console.log(`Updating payee ${payeeId} for user ${currentUser.uid}`);
    try {
        const payeeDocRef = doc(db, 'users', currentUser.uid, 'contacts', payeeId);
        await updateDoc(payeeDocRef, updateData);
        console.log("Payee updated successfully.");
    } catch (error) {
        console.error("Error updating payee:", error);
        throw new Error("Could not update payee.");
    }
}

/**
 * Asynchronously deletes a payee for the current user.
 *
 * @param payeeId The Firestore document ID of the payee to delete.
 * @returns A promise that resolves when deletion is complete.
 */
export async function deletePayee(payeeId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to delete payee.");
    }
    console.log(`Deleting payee ID: ${payeeId} for user ${currentUser.uid}`);
     try {
        const payeeDocRef = doc(db, 'users', currentUser.uid, 'contacts', payeeId);
        await deleteDoc(payeeDocRef);
        console.log("Payee deleted successfully.");
    } catch (error) {
        console.error("Error deleting payee:", error);
        throw new Error("Could not delete payee.");
    }
}
