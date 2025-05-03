/**
 * @fileOverview Service functions for managing transaction history in Firestore.
 */
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { DateRange } from "react-day-picker";

// Interface matching the one in history page
export interface Transaction {
  id: string; // Firestore document ID
  userId: string; // ID of the user this transaction belongs to
  type: 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Failed' | 'Refund' | 'Cashback';
  name: string; // Payee/Payer/Service name
  description: string; // e.g., Mobile Number, Bill type, reason
  amount: number; // Positive for received/refunds/cashback, negative for sent/payments
  date: Date; // Stored as Timestamp in Firestore, converted to Date here
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation'; // Added Processing Activation
  avatarSeed: string; // Kept for client-side generation
  upiId?: string;
  billerId?: string;
  // Add other relevant fields like reference numbers, etc.
}

export interface TransactionFilters {
    type?: string;
    status?: string;
    dateRange?: DateRange;
    searchTerm?: string;
}

/**
 * Asynchronously retrieves the transaction history for the current user, optionally filtered.
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
    console.log(`Fetching transaction history for user ${userId} with filters:`, filters);

    try {
        const transactionsColRef = collection(db, 'users', userId, 'transactions');
        let q = query(transactionsColRef, orderBy('date', 'desc')); // Default sort: newest first

        // Apply Firestore server-side filters where possible
        if (filters?.type && filters.type !== 'all') {
            q = query(q, where('type', '==', filters.type));
        }
        if (filters?.status && filters.status !== 'all') {
             q = query(q, where('status', '==', filters.status));
        }
        if (filters?.dateRange?.from) {
             q = query(q, where('date', '>=', Timestamp.fromDate(filters.dateRange.from)));
        }
         if (filters?.dateRange?.to) {
            // Adjust 'to' date to include the whole day
            const toDate = new Date(filters.dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            q = query(q, where('date', '<=', Timestamp.fromDate(toDate)));
        }

        if (count) {
             q = query(q, limit(count));
        }

        const querySnapshot = await getDocs(q);

        let transactions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
            } as Transaction;
        });

        // Apply client-side search term filtering if provided (more flexible than Firestore limitations)
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


        console.log(`Fetched ${transactions.length} transactions.`);
        return transactions;

    } catch (error) {
        console.error("Error fetching transaction history:", error);
        throw new Error("Could not fetch transaction history.");
    }
}

/**
 * Adds a new transaction record to Firestore for the current user.
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
        const transactionsColRef = collection(db, 'users', userId, 'transactions');
        const dataToSave = {
            ...transactionData,
            userId: userId,
            date: serverTimestamp(), // Use server timestamp
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
            avatarSeed: transactionData.name.toLowerCase().replace(/\s+/g, '') || 'default',
        };
        return newTransaction;

    } catch (error) {
        console.error("Error adding transaction:", error);
        throw new Error("Could not add transaction.");
    }
}
