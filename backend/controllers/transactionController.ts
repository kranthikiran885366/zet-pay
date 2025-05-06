
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin'; // Use admin SDK
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions from Admin SDK
// Import addTransactionService from backend service if needed internally (unlikely for GET requests)
// import { addTransaction as addTransactionService } from '../services/transactionLogger';
import type { Transaction } from '../services/types'; // Import shared types

const db = admin.firestore(); // Use Admin SDK's Firestore instance

// Helper function to convert Firestore doc to Transaction type for API response
function convertFirestoreDocToTransaction(docSnap: admin.firestore.DocumentSnapshot): Transaction | null {
    if (!docSnap.exists) return null;
    const data = docSnap.data()!; // Use non-null assertion as existence is checked
    return {
        id: docSnap.id,
        ...data,
        // Convert Timestamps to ISO strings for JSON serialization
        date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate().toISOString() : new Date().toISOString(),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
    } as Transaction; // Assert the final type
}

// Get Transaction History
export const getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid; // Get user ID from authMiddleware
    if (!userId) {
        // This should ideally be caught by authMiddleware, but double-check
        res.status(401);
        return next(new Error("User not authenticated."));
    }

    const { type, status, limit: count, startDate, endDate, searchTerm } = req.query;
    const defaultLimit = 20; // Default number of transactions per page
    const maxLimit = 100; // Max limit per request

    try {
        const transactionsColRef = db.collection('transactions');
        let q: FirebaseFirestore.Query = query(transactionsColRef, where('userId', '==', userId)); // Base query for user, specify type

        // Apply filters
        if (type && typeof type === 'string' && type !== 'all') {
            q = query(q, where('type', '==', type));
        }
        if (status && typeof status === 'string' && status !== 'all') {
            q = query(q, where('status', '==', status));
        }
        if (startDate && typeof startDate === 'string') {
            try {
                const fromDate = new Date(startDate);
                fromDate.setHours(0, 0, 0, 0);
                q = query(q, where('date', '>=', Timestamp.fromDate(fromDate)));
            } catch (e) { console.warn("Invalid startDate format:", startDate); }
        }
        if (endDate && typeof endDate === 'string') {
            try {
                const toDate = new Date(endDate);
                toDate.setHours(23, 59, 59, 999);
                q = query(q, where('date', '<=', Timestamp.fromDate(toDate)));
            } catch (e) { console.warn("Invalid endDate format:", endDate); }
        }

        // Order by date descending (Firestore requires index for this combination)
        q = query(q, orderBy('date', 'desc'));

        // Apply limit
        const finalLimit = Math.min(parseInt(count as string || defaultLimit.toString(), 10) || defaultLimit, maxLimit);
        q = query(q, limit(finalLimit));

        const querySnapshot = await getDocs(q);

        let transactions = querySnapshot.docs
            .map(docSnap => convertFirestoreDocToTransaction(docSnap))
            .filter((tx): tx is Transaction => tx !== null); // Type guard to filter out nulls

        // Apply client-side search term filtering (if provided) AFTER fetching
        // Firestore doesn't support efficient full-text search on multiple fields natively.
        // For large datasets, consider dedicated search solutions like Algolia or Elasticsearch.
        if (searchTerm && typeof searchTerm === 'string') {
            const lowerSearchTerm = searchTerm.toLowerCase();
            transactions = transactions.filter(tx =>
                (tx.name && tx.name.toLowerCase().includes(lowerSearchTerm)) ||
                (tx.description && tx.description.toLowerCase().includes(lowerSearchTerm)) ||
                tx.amount.toString().includes(lowerSearchTerm) ||
                (tx.upiId && tx.upiId.toLowerCase().includes(lowerSearchTerm)) ||
                (tx.billerId && tx.billerId.toLowerCase().includes(lowerSearchTerm)) ||
                (tx.ticketId && tx.ticketId.toLowerCase().includes(lowerSearchTerm)) || // Search ticketId
                (tx.id && tx.id.toLowerCase().includes(lowerSearchTerm)) // Search transaction ID
            );
        }

        console.log(`[Transaction Ctrl] Fetched ${transactions.length} transactions for user ${userId}`);
        res.status(200).json(transactions); // Send ISO string dates in response

    } catch (error) {
        console.error(`[Transaction Ctrl] Error fetching history for user ${userId}:`, error);
        next(error); // Pass error to central handler
    }
};

// Get Single Transaction Details
export const getTransactionDetails = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        res.status(401);
        return next(new Error("User not authenticated."));
    }
    const { id } = req.params; // Get transaction ID from URL parameter

    try {
        const txDocRef = doc(db, 'transactions', id);
        const txDocSnap = await getDoc(txDocRef);

        if (!txDocSnap.exists()) {
            res.status(404);
            throw new Error('Transaction not found.');
        }

        const data = txDocSnap.data();

        // Verify ownership
        if (data?.userId !== userId) {
            res.status(403); // Forbidden
            throw new Error('Permission denied to access this transaction.');
        }

        const transaction = convertFirestoreDocToTransaction(txDocSnap); // Use helper

        if (!transaction) { // Should not happen if exists check passed, but for safety
             res.status(404);
             throw new Error('Transaction not found.');
        }

        console.log(`[Transaction Ctrl] Fetched details for transaction ${id}`);
        res.status(200).json(transaction); // Send ISO string dates
    } catch (error) {
        console.error(`[Transaction Ctrl] Error fetching details for tx ${id}:`, error);
        next(error);
    }
};

// POST /api/transactions - Add a new transaction (called internally by other controllers/services)
// This controller might not be needed if transactions are only logged via the logger service.
export const addTransactionController = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        res.status(401);
        return next(new Error('User not authenticated.'));
    }

    const transactionData = req.body;

    // Basic validation (more robust validation should be added based on type)
    if (!transactionData || typeof transactionData !== 'object' || !transactionData.type || !transactionData.name || transactionData.amount === undefined) {
        res.status(400);
        return next(new Error('Invalid transaction data provided. Required fields: type, name, amount.'));
    }

    try {
        // It's generally better to call the transactionLogger service internally from other services/controllers
        // rather than exposing a direct POST endpoint like this, unless there's a specific need.
        console.warn("[Transaction Ctrl] Direct POST to /api/transactions is generally discouraged. Use internal service calls.");
        // const savedTransaction = await addTransactionService({ ...transactionData, userId }); // Call the backend logger service
        // res.status(201).json(savedTransaction); // Return the full transaction object (with ISO dates)
        res.status(501).json({ message: "Direct transaction creation endpoint not implemented. Use service-specific endpoints." });
    } catch (error) {
        next(error); // Pass error to central handler
    }
};

