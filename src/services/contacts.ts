
/**
 * @fileOverview Service functions for managing user contacts/payees in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    orderBy,
    limit,
    onSnapshot, // Import for real-time updates
    Unsubscribe,
    getDoc,
    QueryConstraint, // Import QueryConstraint
    serverTimestamp, // Import serverTimestamp
    Timestamp // Import Timestamp
} from 'firebase/firestore';
import { getUserProfileById } from './user'; // To potentially fetch full payee details

// Interface remains the same
export interface Payee {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this contact
  name: string;
  identifier: string; // Phone number or UPI ID/Account
  type: 'mobile' | 'bank';
  avatarSeed?: string; // Kept for potential client-side generation consistency
  upiId?: string; // Store full UPI ID if type is bank/UPI
  accountNumber?: string; // Store account if type is bank
  ifsc?: string; // Store IFSC if type is bank
  isFavorite?: boolean; // Example new field
  createdAt?: Timestamp; // Track creation time
  updatedAt?: Timestamp; // Track update time
}

// Client-side interface with Date objects
export interface PayeeClient extends Omit<Payee, 'createdAt' | 'updatedAt'> {
    createdAt?: Date;
    updatedAt?: Date;
}


/**
 * Subscribes to real-time updates for the current user's contacts/payees.
 * Optionally filters by search term (client-side).
 *
 * @param onUpdate Callback function triggered with the updated list of contacts.
 * @param onError Callback function triggered on error.
 * @param searchTerm Optional search term for client-side filtering.
 * @returns An unsubscribe function to stop listening for updates, or null if user is not logged in.
 */
export function subscribeToContacts(
  onUpdate: (contacts: PayeeClient[]) => void,
  onError: (error: Error) => void,
  searchTerm?: string // Add searchTerm parameter
): Unsubscribe | null {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("User not logged in. Cannot subscribe to contacts.");
    // onError(new Error("User not logged in.")); // Avoid calling onError here
    return null;
  }
  const userId = currentUser.uid;
  console.log(`Subscribing to contacts for user ${userId}`);

  try {
    const contactsColRef = collection(db, 'users', userId, 'contacts');
    // Always order by name for consistency
    const q = query(contactsColRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let contacts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId,
            ...data,
            avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || doc.id, // Ensure avatarSeed
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
          } as PayeeClient;
      });

      // Apply client-side filtering if searchTerm is provided
      if (searchTerm) {
          const lowerCaseSearch = searchTerm.toLowerCase();
          contacts = contacts.filter(payee =>
              payee.name.toLowerCase().includes(lowerCaseSearch) ||
              payee.identifier.toLowerCase().includes(lowerCaseSearch) ||
              payee.upiId?.toLowerCase().includes(lowerCaseSearch)
          );
      }

      console.log(`Received ${contacts.length} real-time contacts (filtered: ${!!searchTerm}).`);
      onUpdate(contacts);
    }, (error) => {
      console.error("Error subscribing to contacts:", error);
      onError(new Error("Could not subscribe to contacts."));
    });

    return unsubscribe;

  } catch (error) {
    console.error("Error setting up contacts subscription:", error);
    onError(new Error("Could not set up contacts subscription."));
    return null;
  }
}


/**
 * Asynchronously retrieves a list of the current user's saved contacts/payees from Firestore.
 * Optionally filters by search term. Performs a one-time fetch.
 * (Kept for scenarios where a non-realtime fetch is needed).
 *
 * @param searchTerm Optional search term to filter contacts by name or identifier.
 * @returns A promise that resolves to an array of PayeeClient objects.
 */
export async function getContacts(searchTerm?: string): Promise<PayeeClient[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in to get contacts.");
    return [];
  }
  const userId = currentUser.uid;

  console.log(`Fetching contacts (one-time) for user ${userId} ${searchTerm ? `matching "${searchTerm}"` : ''}`);

  try {
    const contactsColRef = collection(db, 'users', userId, 'contacts');
    const queryConstraints: QueryConstraint[] = [orderBy('name')]; // Start with ordering

    // Client-side filtering will be applied after fetching all contacts
    const q = query(contactsColRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    let contacts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            userId,
            ...data,
            avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || doc.id, // Ensure avatarSeed
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
        } as PayeeClient;
    });

    // Apply client-side filtering if searchTerm is provided
    if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        contacts = contacts.filter(payee =>
            payee.name.toLowerCase().includes(lowerCaseSearch) ||
            payee.identifier.toLowerCase().includes(lowerCaseSearch) ||
            payee.upiId?.toLowerCase().includes(lowerCaseSearch)
        );
    }

    return contacts;

  } catch (error) {
    console.error("Error fetching contacts (one-time):", error);
    throw new Error("Could not fetch contacts.");
  }
}


/**
 * Asynchronously retrieves details for a specific payee ID for the current user.
 *
 * @param payeeId The Firestore document ID of the payee to retrieve.
 * @returns A promise that resolves to the PayeeClient object or null if not found or not accessible.
 */
export async function getPayeeDetails(payeeId: string): Promise<PayeeClient | null> {
     const currentUser = auth.currentUser;
     if (!currentUser) return null;
     const userId = currentUser.uid;

     console.log(`Fetching details for payee ID: ${payeeId} for user ${userId}`);
     try {
        const payeeDocRef = doc(db, 'users', userId, 'contacts', payeeId);
        const payeeDocSnap = await getDoc(payeeDocRef);

        if (payeeDocSnap.exists()) {
            const data = payeeDocSnap.data();
            return {
                id: payeeDocSnap.id,
                userId,
                ...data,
                avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || payeeDocSnap.id, // Ensure avatarSeed
                createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
            } as PayeeClient;
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
 * @param payeeData The details of the payee to save (excluding id, userId, avatarSeed, timestamps).
 * @returns A promise that resolves to the newly created PayeeClient object (with id).
 */
export async function savePayee(payeeData: Omit<Payee, 'id' | 'userId' | 'avatarSeed' | 'createdAt' | 'updatedAt'>): Promise<PayeeClient> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to save payee.");
    }
    const userId = currentUser.uid;

    console.log("Saving new payee for user:", userId, payeeData);
    try {
        const contactsColRef = collection(db, 'users', userId, 'contacts');
        const now = serverTimestamp(); // Get server timestamp
        const dataToSave = {
            ...payeeData,
            userId: userId, // Ensure userId is saved
            isFavorite: payeeData.isFavorite ?? false, // Default favorite status
            avatarSeed: payeeData.name.toLowerCase().replace(/\s+/g, '') || Date.now().toString(), // Add avatar seed on creation
            createdAt: now,
            updatedAt: now,
        };
        const docRef = await addDoc(contactsColRef, dataToSave);
        console.log("Payee added with ID:", docRef.id);
        // Return client version with JS Date (approximate)
        return {
            id: docRef.id,
            userId: userId,
            ...payeeData,
            isFavorite: dataToSave.isFavorite,
            avatarSeed: dataToSave.avatarSeed,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as PayeeClient;
    } catch (error) {
        console.error("Error saving payee:", error);
        throw new Error("Could not save payee.");
    }
}


/**
 * Asynchronously updates an existing payee for the current user.
 * Automatically updates the 'updatedAt' timestamp.
 *
 * @param payeeId The Firestore document ID of the payee to update.
 * @param updateData The partial data to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updatePayee(payeeId: string, updateData: Partial<Omit<Payee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
     const currentUser = auth.currentUser;
     if (!currentUser) {
        throw new Error("User must be logged in to update payee.");
    }
    const userId = currentUser.uid;
    console.log(`Updating payee ${payeeId} for user ${userId}`);
    try {
        const payeeDocRef = doc(db, 'users', userId, 'contacts', payeeId);
        // Ensure the document exists before updating
        const docSnap = await getDoc(payeeDocRef);
        if (!docSnap.exists()) {
            throw new Error("Payee not found.");
        }
        await updateDoc(payeeDocRef, {
            ...updateData,
            updatedAt: serverTimestamp() // Automatically update timestamp
        });
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
    const userId = currentUser.uid;
    console.log(`Deleting payee ID: ${payeeId} for user ${userId}`);
     try {
        const payeeDocRef = doc(db, 'users', userId, 'contacts', payeeId);
        // Ensure the document exists before attempting deletion
        const docSnap = await getDoc(payeeDocRef);
        if (!docSnap.exists()) {
            console.warn("Attempted to delete non-existent payee:", payeeId);
            return; // Or throw error? Decide based on desired behavior.
        }
        await deleteDoc(payeeDocRef);
        console.log("Payee deleted successfully.");
    } catch (error) {
        console.error("Error deleting payee:", error);
        throw new Error("Could not delete payee.");
    }
}
