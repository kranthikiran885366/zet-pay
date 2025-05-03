/**
 * @fileOverview Service functions for managing user contacts and payees.
 */

// Interface matching the one in send money page
export interface Payee {
  id: string;
  name: string;
  identifier: string; // Phone number or UPI ID/Account
  type: 'mobile' | 'bank'; // Type identifier (mobile number, bank account, UPI ID)
  avatarSeed?: string; // For generating mock avatars
  upiId?: string; // Store UPI ID if available
  accountNumber?: string; // Store Account Number if available
  ifsc?: string; // Store IFSC if available
}

// Mock Contact/Payee Data (can be expanded)
const mockContacts: Payee[] = [
  { id: 'c1', name: "Alice Smith", identifier: "+919876543210", type: 'mobile', avatarSeed: 'alice', upiId: 'alice@payfriend' },
  { id: 'c2', name: "Bob Johnson", identifier: "bob.j@okbank", type: 'bank', avatarSeed: 'bob', upiId: 'bob.j@okbank' },
  { id: 'c3', name: "Charlie Brown", identifier: "+919988776655", type: 'mobile', avatarSeed: 'charlie', upiId: '9988776655@pfbank' },
  { id: 'c4', name: "David Williams", identifier: "david.will@ybl", type: 'bank', avatarSeed: 'david', upiId: 'david.will@ybl' },
  { id: 'c5', name: "Eve Davis", identifier: "9876543210@paytm", type: 'bank', avatarSeed: 'eve', upiId: '9876543210@paytm' },
  { id: 'c6', name: "Frank Miller", identifier: '123456789012', type: 'bank', accountNumber: '******9012', ifsc: 'ICIC0001234', avatarSeed: 'frank' }, // Bank Account Example
];

/**
 * Asynchronously retrieves a list of user's saved contacts/payees.
 * Optionally filters by search term.
 *
 * @param searchTerm Optional search term to filter contacts.
 * @returns A promise that resolves to an array of Payee objects.
 */
export async function getContacts(searchTerm?: string): Promise<Payee[]> {
  console.log(`Fetching contacts ${searchTerm ? `matching "${searchTerm}"` : ''}`);
  // TODO: Implement API call to fetch user's contacts
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay

  if (!searchTerm) {
    return mockContacts; // Return all contacts if no search term
  }

  const lowerCaseSearch = searchTerm.toLowerCase();
  return mockContacts.filter(payee =>
    payee.name.toLowerCase().includes(lowerCaseSearch) ||
    payee.identifier.toLowerCase().includes(lowerCaseSearch) ||
    payee.upiId?.toLowerCase().includes(lowerCaseSearch) ||
    payee.accountNumber?.includes(lowerCaseSearch)
  );
}

/**
 * Asynchronously retrieves details for a specific payee ID.
 *
 * @param payeeId The ID of the payee to retrieve.
 * @returns A promise that resolves to the Payee object or null if not found.
 */
export async function getPayeeDetails(payeeId: string): Promise<Payee | null> {
    console.log(`Fetching details for payee ID: ${payeeId}`);
    // TODO: Implement API call
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    return mockContacts.find(p => p.id === payeeId) || null;
}


/**
 * Asynchronously saves a new payee or updates an existing one.
 *
 * @param payeeDetails The details of the payee to save.
 * @returns A promise that resolves to the saved/updated Payee object.
 */
export async function savePayee(payeeDetails: Omit<Payee, 'id' | 'avatarSeed'> & { id?: string }): Promise<Payee> {
    console.log("Saving payee:", payeeDetails);
    // TODO: Implement API call to save/update payee
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay

    if (payeeDetails.id) {
        // Update existing
        const index = mockContacts.findIndex(p => p.id === payeeDetails.id);
        if (index !== -1) {
            mockContacts[index] = { ...mockContacts[index], ...payeeDetails };
            return mockContacts[index];
        } else {
            // If ID provided but not found, treat as new (or throw error)
             console.warn(`Payee with ID ${payeeDetails.id} not found for update, adding as new.`);
             const newPayee: Payee = {
                ...payeeDetails,
                id: `c${Date.now()}`,
                avatarSeed: payeeDetails.name.toLowerCase().replace(/\s+/g, ''),
             };
             mockContacts.push(newPayee);
             return newPayee;
        }
    } else {
        // Add new
        const newPayee: Payee = {
            ...payeeDetails,
            id: `c${Date.now()}`,
            avatarSeed: payeeDetails.name.toLowerCase().replace(/\s+/g, ''),
        };
        mockContacts.push(newPayee);
        return newPayee;
    }
}

/**
 * Asynchronously deletes a payee.
 *
 * @param payeeId The ID of the payee to delete.
 * @returns A promise that resolves to true if deletion was successful, false otherwise.
 */
export async function deletePayee(payeeId: string): Promise<boolean> {
    console.log(`Deleting payee ID: ${payeeId}`);
    // TODO: Implement API call
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay

    const index = mockContacts.findIndex(p => p.id === payeeId);
    if (index !== -1) {
        mockContacts.splice(index, 1);
        return true;
    }
    return false; // Payee not found
}
