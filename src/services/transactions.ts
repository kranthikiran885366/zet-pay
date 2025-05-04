
/**
 * @fileOverview Service functions for managing transaction history in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp, onSnapshot, Unsubscribe, QueryConstraint, updateDoc, doc } from 'firebase/firestore'; // Added updateDoc, doc
import type { DateRange } from "react-day-picker";
import { differenceInMinutes } from 'date-fns'; // Added differenceInMinutes

// Interface matching the one in history page
export interface Transaction {
  id: string; // Firestore document ID
  userId: string; // ID of the user this transaction belongs to
  type: 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Failed' | 'Refund' | 'Cashback' | 'Movie Booking' | 'Bus Booking' | 'Train Booking' | 'Car Booking' | 'Bike Booking' | 'Food Order' | 'Donation' | 'Prasadam Order' | 'Pooja Booking' | 'Cancelled'; // Added Cancelled
  name: string; // Payee/Payer/Service name
  description: string; // e.g., Mobile Number, Bill type, reason
  amount: number; // Positive for received/refunds/cashback, negative for sent/payments
  date: Date; // Stored as Timestamp in Firestore, converted to Date here
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled'; // Added Processing Activation & Cancelled
  avatarSeed: string; // Kept for client-side generation
  upiId?: string;
  billerId?: string;
  // Add other relevant fields like reference numbers, etc.
  loanId?: string; // Added optional loan ID
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
    const constraints: QueryConstraint[] = [where('userId', '==', userId), orderBy('date', 'desc')]; // Filter by userId and Always order by date desc initially

    if (filters?.type && filters.type !== 'all') {
        constraints.push(where('type', '==', filters.type));
    }
    if (filters?.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
    }
    if (filters?.dateRange?.from) {
        // Set time to the beginning of the day
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        constraints.push(where('date', '>=', Timestamp.fromDate(fromDate)));
    }
    if (filters?.dateRange?.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999); // Set time to the end of the day
        constraints.push(where('date', '<=', Timestamp.fromDate(toDate)));
    }
    if (count) {
        constraints.push(limit(count));
    }

    return constraints;
};

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
        // Use a generic collection reference, filtering will happen with constraints
        const transactionsColRef = collection(db, 'transactions');
        const queryConstraints = buildTransactionQueryConstraints(userId, filters, count);
        const q = query(transactionsColRef, ...queryConstraints);

        const querySnapshot = await getDocs(q);

        let transactions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
                // Ensure avatarSeed is always present
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

/**
 * Subscribes to real-time updates for the current user's transaction history.
 *
 * @param onUpdate Callback function triggered with the updated list of transactions.
 * @param onError Callback function triggered on error.
 * @param filters Optional filters for transaction type, status, date range.
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
        console.log("User not logged in. Cannot subscribe to transaction history.");
        // Don't trigger error callback here, handle the null return in component
        // onError(new Error("User not logged in."));
        return null;
    }
    const userId = currentUser.uid;
    console.log(`Subscribing to transaction history for user ${userId} with filters:`, filters);

    try {
        // Use a generic collection reference, filtering will happen with constraints
        const transactionsColRef = collection(db, 'transactions');
        // Note: Real-time search term filtering is best done client-side after receiving updates.
        const queryConstraints = buildTransactionQueryConstraints(userId, { ...filters, searchTerm: undefined }, count);
        const q = query(transactionsColRef, ...queryConstraints);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            let transactions = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                    // Ensure avatarSeed is always present
                    avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || doc.id,
                } as Transaction;
            });

            // Apply client-side search term filtering if provided in the original filters
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
            onUpdate(transactions); // Pass the updated list to the callback
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
 *
 * @param transactionData The transaction details to add (excluding id, userId, date, avatarSeed).
 * @returns A promise that resolves to the newly created Transaction object (with id, userId, date).
 */
export async function addTransaction(transactionData: Omit<Transaction, 'id' | 'userId' | 'date' | 'avatarSeed'>): Promise<Transaction> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to add transaction.");
    }
    const userId = currentUser.uid;
    console.log("Adding transaction for user:", userId, transactionData);

    try {
        // Use the top-level 'transactions' collection
        const transactionsColRef = collection(db, 'transactions');
        const dataToSave = {
            ...transactionData,
            userId: userId, // Store the userId within the transaction document
            date: serverTimestamp(), // Use server timestamp
            // Generate avatarSeed here before saving
            avatarSeed: transactionData.name.toLowerCase().replace(/\s+/g, '') || 'default_seed',
        };
        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("Transaction added with ID:", docRef.id);

        // We need to fetch the doc again to get the server timestamp resolved to a date
        // Or we can just return with a client-side date for immediate feedback,
        // knowing the server timestamp is slightly different. Let's use client-side for now.
        const newTransaction: Transaction = {
            ...transactionData,
            id: docRef.id,
            userId: userId,
            date: new Date(), // Use client date for immediate feedback
            avatarSeed: dataToSave.avatarSeed, // Use the generated seed
        };
        return newTransaction;

    } catch (error) {
        console.error("Error adding transaction:", error);
        throw new Error("Could not add transaction.");
    }
}

/**
 * Attempts to cancel a recently completed or processing recharge transaction.
 * Checks if the transaction occurred within the allowable time window (e.g., 30 minutes).
 *
 * @param transactionId The ID of the recharge transaction to cancel.
 * @returns A promise resolving to an object indicating success and a message.
 */
export async function cancelRecharge(transactionId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User must be logged in to cancel a recharge.");
    }
    console.log(`Attempting to cancel recharge transaction: ${transactionId}`);

    try {
        const transactionDocRef = doc(db, 'transactions', transactionId);
        const transactionSnap = await getDoc(transactionDocRef);

        if (!transactionSnap.exists()) {
            throw new Error("Transaction not found.");
        }

        const tx = transactionSnap.data() as Omit<Transaction, 'id' | 'date'> & { date: Timestamp }; // Get data with Timestamp

        // Validate ownership and type
        if (tx.userId !== currentUser.uid) {
            throw new Error("Permission denied.");
        }
        if (tx.type !== 'Recharge') {
            throw new Error("Only recharge transactions can be cancelled.");
        }
        if (tx.status === 'Cancelled' || tx.status === 'Failed' || tx.status === 'Pending') {
             throw new Error(`Cannot cancel a transaction with status: ${tx.status}.`);
        }

        // Check time window (e.g., 30 minutes)
        const transactionDate = tx.date.toDate();
        const now = new Date();
        const minutesPassed = differenceInMinutes(now, transactionDate);

        if (minutesPassed > 30) {
            throw new Error("Cancellation window (30 minutes) has passed.");
        }

        // TODO: Implement the actual API call to the recharge aggregator/operator to attempt cancellation.
        // This is highly dependent on the provider and might not always be possible.
        console.log(`Simulating cancellation API call for ${transactionId}...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        const cancellationSuccess = Math.random() > 0.2; // Simulate 80% success rate

        if (cancellationSuccess) {
            // Update the transaction status in Firestore
            await updateDoc(transactionDocRef, {
                status: 'Cancelled',
                description: `${tx.description} (Cancelled by User)`,
            });
            // TODO: Initiate refund process if applicable (might happen automatically via aggregator).
            console.log(`Transaction ${transactionId} cancelled successfully.`);
            return { success: true, message: "Recharge cancelled. Refund will be processed if applicable." };
        } else {
            throw new Error("Cancellation failed at operator/aggregator level.");
        }

    } catch (error: any) {
        console.error("Error cancelling recharge:", error);
        throw new Error(error.message || "Could not cancel recharge.");
    }
}

