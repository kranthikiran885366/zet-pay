
/**
 * @fileOverview Service functions for managing transaction history in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot, // Import onSnapshot for real-time updates
  Unsubscribe,
  QueryConstraint,
  updateDoc,
  doc,
  getDoc, // Added getDoc
} from 'firebase/firestore';
import type { DateRange } from "react-day-picker";
import { differenceInMinutes } from 'date-fns'; // Keep for cancellation logic

// Interface matching the one in history page
export interface Transaction {
  id: string; // Firestore document ID
  userId: string; // ID of the user this transaction belongs to
  type: 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Failed' | 'Refund' | 'Cashback' | 'Movie Booking' | 'Bus Booking' | 'Train Booking' | 'Car Booking' | 'Bike Booking' | 'Food Order' | 'Donation' | 'Prasadam Order' | 'Pooja Booking' | 'Cancelled' | 'Wallet Top-up' | 'Loan Disbursed' | 'Loan Repayment'; // Added more types
  name: string; // Payee/Payer/Service name
  description: string; // e.g., Mobile Number, Bill type, reason
  amount: number; // Positive for received/refunds/cashback, negative for sent/payments
  date: Date; // Stored as Timestamp in Firestore, converted to Date here for client
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled'; // Added Processing Activation & Cancelled
  avatarSeed: string; // Kept for client-side generation
  upiId?: string; // Recipient/Source UPI ID or identifier for recharges
  billerId?: string;
  // Add other relevant fields like reference numbers, etc.
  loanId?: string; // Added optional loan ID
  ticketId?: string; // Added for failed payment tracking
  refundEta?: string; // Added for failed payment tracking
}

// Interface for data stored in Firestore (uses Timestamp)
interface TransactionFirestore extends Omit<Transaction, 'id' | 'date'> {
    date: Timestamp;
}

export interface TransactionFilters {
    type?: string;
    status?: string;
    dateRange?: DateRange;
    searchTerm?: string;
}

/**
 * Builds Firestore query constraints based on filters.
 * @param userId The current user's ID.
 * @param filters Optional filters.
 * @param count Optional limit.
 * @returns An array of QueryConstraint objects.
 */
const buildTransactionQueryConstraints = (
    userId: string,
    filters?: TransactionFilters,
    count?: number
): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [where('userId', '==', userId)]; // Filter by userId FIRST

    if (filters?.type && filters.type !== 'all') {
        constraints.push(where('type', '==', filters.type));
    }
    if (filters?.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
    }
    if (filters?.dateRange?.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        constraints.push(where('date', '>=', Timestamp.fromDate(fromDate)));
    }
    if (filters?.dateRange?.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        constraints.push(where('date', '<=', Timestamp.fromDate(toDate)));
    }

    // IMPORTANT: Firestore requires the first orderBy field to match the first range inequality filter field if multiple exist.
    // We always order by date descending as the primary sort.
    constraints.push(orderBy('date', 'desc'));

    if (count) {
        constraints.push(limit(count));
    }

    // Note: Search term filtering must be done client-side after fetching due to Firestore limitations.

    return constraints;
};


/**
 * Subscribes to real-time updates for the current user's transaction history.
 *
 * @param onUpdate Callback function triggered with the updated list of transactions.
 * @param onError Callback function triggered on error.
 * @param filters Optional filters for transaction type, status, date range, and search term.
 * @param count Optional limit on the number of transactions to retrieve.
 * @returns An unsubscribe function to stop listening for updates, or null if user is not logged in.
 */
export function subscribeToTransactionHistory(
    onUpdate: (transactions: Transaction[]) => void,
    onError: (error: Error) => void,
    filters?: TransactionFilters,
    count?: number
): Unsubscribe | null {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        // This case should be handled by the calling component (e.g., useEffect dependency on user login status)
        // Avoid calling onError directly here if the component will handle the null return value.
        console.log("User not logged in. Cannot subscribe to transaction history.");
        return null;
    }
    const userId = currentUser.uid;
    console.log(`Subscribing to transaction history for user ${userId} with filters:`, filters);

    try {
        const transactionsColRef = collection(db, 'transactions');
        // Apply basic filters (type, status, date) via Firestore query constraints
        const queryConstraints = buildTransactionQueryConstraints(userId, filters, count);
        const q = query(transactionsColRef, ...queryConstraints);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            let transactions = querySnapshot.docs.map(doc => {
                const data = doc.data() as TransactionFirestore;
                return {
                    id: doc.id,
                    ...data,
                    date: data.date.toDate(), // Convert Timestamp to Date
                    avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || doc.id,
                } as Transaction;
            });

            // Apply client-side search term filtering if provided
            if (filters?.searchTerm) {
                const lowerSearchTerm = filters.searchTerm.toLowerCase();
                transactions = transactions.filter(tx =>
                    tx.name.toLowerCase().includes(lowerSearchTerm) ||
                    tx.description.toLowerCase().includes(lowerSearchTerm) ||
                    tx.amount.toString().includes(lowerSearchTerm) ||
                    tx.upiId?.toLowerCase().includes(lowerSearchTerm) ||
                    tx.billerId?.toLowerCase().includes(lowerSearchTerm) ||
                    tx.id.toLowerCase().includes(lowerSearchTerm)
                );
            }

            console.log(`Received ${transactions.length} real-time transactions.`);
            onUpdate(transactions); // Pass the filtered & sorted list to the callback
        }, (error) => {
            console.error("Error subscribing to transaction history:", error);
            onError(new Error("Could not subscribe to transaction history."));
        });

        return unsubscribe; // Return the unsubscribe function

    } catch (error) {
        console.error("Error setting up transaction subscription:", error);
        onError(new Error("Could not set up transaction subscription."));
        return null;
    }
}


/**
 * Adds a new transaction record to Firestore for the current user.
 * Stores transactions in a top-level 'transactions' collection with a userId field.
 * Automatically generates an avatarSeed based on the name.
 *
 * @param transactionData The transaction details to add (excluding id, userId, date, avatarSeed).
 * @returns A promise that resolves to the newly created Transaction object (with id, userId, date, avatarSeed).
 */
export async function addTransaction(transactionData: Omit<Transaction, 'id' | 'userId' | 'date' | 'avatarSeed'>): Promise<Transaction> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to add transaction.");
    }
    const userId = currentUser.uid;
    console.log("Adding transaction for user:", userId, transactionData);

    try {
        const transactionsColRef = collection(db, 'transactions');
        const dataToSave = {
            ...transactionData,
            userId: userId,
            date: serverTimestamp(), // Use server timestamp
            avatarSeed: transactionData.name.toLowerCase().replace(/\s+/g, '') || `tx_${Date.now()}`, // Generate seed
        };
        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("Transaction added with ID:", docRef.id);

        // For immediate feedback, return a client-side representation.
        // The actual timestamp will be resolved later by Firestore.
        const newTransaction: Transaction = {
            ...transactionData, // Original data
            id: docRef.id,
            userId: userId,
            date: new Date(), // Use client date for immediate display
            avatarSeed: dataToSave.avatarSeed,
        };
        return newTransaction;

    } catch (error) {
        console.error("Error adding transaction:", error);
        throw new Error("Could not add transaction.");
    }
}


/**
 * Attempts to cancel a recently completed or processing recharge transaction.
 * Updates the transaction status in Firestore if cancellation is successful.
 *
 * @param transactionId The ID of the recharge transaction to cancel.
 * @returns A promise resolving to an object indicating success and a message.
 */
export async function cancelRecharge(transactionId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to cancel a recharge.");
    }
    const userId = currentUser.uid; // Get userId for permission check
    console.log(`Attempting to cancel recharge transaction: ${transactionId}`);

    try {
        const transactionDocRef = doc(db, 'transactions', transactionId);
        const transactionSnap = await getDoc(transactionDocRef);

        if (!transactionSnap.exists()) {
            throw new Error("Transaction not found.");
        }

        const tx = transactionSnap.data() as TransactionFirestore; // Use Firestore type

        // **PERMISSION CHECK**: Ensure the transaction belongs to the current user
        if (tx.userId !== userId) {
            throw new Error("Permission denied. Cannot cancel another user's transaction.");
        }

        if (tx.type !== 'Recharge') {
            throw new Error("Only recharge transactions can be cancelled.");
        }
        if (tx.status === 'Cancelled' || tx.status === 'Failed') {
             throw new Error(`Cannot cancel a transaction with status: ${tx.status}.`);
        }

        const transactionDate = tx.date.toDate(); // Convert timestamp to Date
        const now = new Date();
        const minutesPassed = differenceInMinutes(now, transactionDate);

        // **Cancellation Window Check**
        const CANCELLATION_WINDOW_MINUTES = 30;
        if (minutesPassed > CANCELLATION_WINDOW_MINUTES) {
            throw new Error(`Cancellation window (${CANCELLATION_WINDOW_MINUTES} minutes) has passed.`);
        }

        // **Simulate external cancellation API call**
        // TODO: Replace with actual API call to the recharge aggregator/provider
        console.log(`Simulating cancellation API call for ${transactionId}...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        const cancellationSuccess = Math.random() > 0.2; // 80% success rate simulation

        if (cancellationSuccess) {
            // Update the transaction status in Firestore
            await updateDoc(transactionDocRef, {
                status: 'Cancelled',
                description: `${tx.description} (Cancelled by User)`,
                // Add an 'updatedAt' field if you track modifications
                // updatedAt: serverTimestamp(),
            });
            console.log(`Transaction ${transactionId} cancelled successfully in Firestore.`);
            // TODO: Initiate refund process if applicable via backend/webhook.
            return { success: true, message: "Recharge cancelled. Refund will be processed if applicable." };
        } else {
            // Cancellation failed at the provider level
            throw new Error("Cancellation failed at operator/aggregator level.");
        }

    } catch (error: any) {
        console.error("Error cancelling recharge:", error);
        throw new Error(error.message || "Could not cancel recharge.");
    }
}


// --- Kept for non-realtime fetch scenarios ---
/**
 * Asynchronously retrieves the transaction history for the current user, optionally filtered.
 * Performs a one-time fetch.
 *
 * @param filters Optional filters for transaction type, status, date range, and search term.
 * @param count Optional limit on the number of transactions to retrieve.
 * @returns A promise that resolves to an array of Transaction objects.
 */
export async function getTransactionHistory(filters?: TransactionFilters, count?: number): Promise<Transaction[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("No user logged in to get transaction history.");
        return [];
    }
    const userId = currentUser.uid;
    console.log(`Fetching transaction history (one-time) for user ${userId} with filters:`, filters);

    try {
        const transactionsColRef = collection(db, 'transactions');
        const queryConstraints = buildTransactionQueryConstraints(userId, filters, count);
        const q = query(transactionsColRef, ...queryConstraints);

        const querySnapshot = await getDocs(q);

        let transactions = querySnapshot.docs.map(doc => {
            const data = doc.data() as TransactionFirestore;
            return {
                id: doc.id,
                ...data,
                date: data.date.toDate(), // Convert Timestamp to Date
                avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || doc.id,
            } as Transaction;
        });

        // Apply client-side search term filtering if provided
         if (filters?.searchTerm) {
            const lowerSearchTerm = filters.searchTerm.toLowerCase();
            transactions = transactions.filter(tx =>
                tx.name.toLowerCase().includes(lowerSearchTerm) ||
                tx.description.toLowerCase().includes(lowerSearchTerm) ||
                tx.amount.toString().includes(lowerSearchTerm) ||
                tx.upiId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.billerId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.id.toLowerCase().includes(lowerSearchTerm)
            );
        }

        console.log(`Fetched ${transactions.length} transactions (one-time).`);
        return transactions;

    } catch (error) {
        console.error("Error fetching transaction history:", error);
        throw new Error("Could not fetch transaction history.");
    }
}

// --- Blockchain Integration Placeholder ---
/**
 * Logs a transaction hash to a (hypothetical) blockchain ledger.
 * This is a placeholder and requires a real blockchain integration (e.g., Web3 library, backend service).
 *
 * @param transactionId The ID of the transaction in Firestore.
 * @param transactionData Key details of the transaction.
 * @returns A promise resolving to the blockchain transaction hash (simulated).
 */
export async function logTransactionToBlockchain(
    transactionId: string,
    transactionData: Pick<Transaction, 'userId' | 'type' | 'amount' | 'date'> & { recipient?: string }
): Promise<string> {
    console.log(`[Blockchain Simulation] Logging transaction ${transactionId} to ledger...`);
    // TODO: Implement actual blockchain interaction here.
    // This might involve:
    // 1. Connecting to a blockchain node/provider.
    // 2. Creating and signing a blockchain transaction with relevant data.
    // 3. Sending the transaction and waiting for confirmation.
    // 4. Returning the blockchain transaction hash.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const mockBlockchainHash = `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    console.log(`[Blockchain Simulation] Transaction ${transactionId} logged with hash: ${mockBlockchainHash}`);

    // Optionally, update the Firestore transaction document with the blockchain hash
    try {
        const txDocRef = doc(db, 'transactions', transactionId);
        await updateDoc(txDocRef, { blockchainHash: mockBlockchainHash });
    } catch (error) {
        console.error(`Error updating transaction ${transactionId} with blockchain hash:`, error);
        // Handle error appropriately (e.g., retry, log) - non-critical for core functionality
    }

    return mockBlockchainHash;
}

// --- Example Usage within addTransaction (optional) ---
// Modify addTransaction to call logTransactionToBlockchain AFTER successfully adding to Firestore:
/*
export async function addTransaction(...) {
    // ... (existing add logic) ...
    try {
        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("Transaction added with ID:", docRef.id);

        // Log to blockchain after successful Firestore add (non-blocking)
        logTransactionToBlockchain(docRef.id, {
            userId: userId,
            type: transactionData.type,
            amount: transactionData.amount,
            date: new Date(), // Use client date for simulation consistency
            recipient: transactionData.upiId || transactionData.billerId,
        }).catch(blockchainError => {
            console.error(`Failed to log transaction ${docRef.id} to blockchain:`, blockchainError);
        });

        // Return client-side representation
        const newTransaction: Transaction = { ... };
        return newTransaction;

    } catch (error) { ... }
}
*/

