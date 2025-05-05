
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { addTransaction as addTransactionService } from '../services/transactionLogger'; // Import backend logger service
import type { Transaction } from '../services/types'; // Import shared types

const db = admin.firestore(); // Use Admin SDK's Firestore instance

// Get Transaction History
export const getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid; // Assuming authMiddleware adds user to req
    if (!userId) {
        return res.status(401).json({ message: "User not authenticated." });
    }

    const { type, status, limit: count, startDate, endDate, searchTerm } = req.query;
    const defaultLimit = 20; // Default number of transactions per page
    const maxLimit = 100; // Max limit per request

    try {
        const transactionsColRef = db.collection('transactions');
        let q = query(transactionsColRef, where('userId', '==', userId)); // Base query for user

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
            } catch (e) { console.warn("Invalid startDate format"); }
        }
        if (endDate && typeof endDate === 'string') {
            try {
                const toDate = new Date(endDate);
                toDate.setHours(23, 59, 59, 999);
                q = query(q, where('date', '<=', Timestamp.fromDate(toDate)));
            } catch (e) { console.warn("Invalid endDate format"); }
        }

        // Order by date descending
        q = query(q, orderBy('date', 'desc'));

        // Apply limit
        const finalLimit = Math.min(parseInt(count as string || defaultLimit.toString(), 10) || defaultLimit, maxLimit);
        q = query(q, limit(finalLimit));

        const querySnapshot = await getDocs(q);

        let transactions = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date as Timestamp).toDate(), // Convert Timestamp to Date for client
            };
        });

        // Apply client-side search term filtering (if provided)
        // Firestore doesn't support full-text search efficiently on multiple fields like this natively
        if (searchTerm && typeof searchTerm === 'string') {
            const lowerSearchTerm = searchTerm.toLowerCase();
            transactions = transactions.filter(tx =>
                (tx.name && tx.name.toLowerCase().includes(lowerSearchTerm)) ||
                (tx.description && tx.description.toLowerCase().includes(lowerSearchTerm)) ||
                tx.amount.toString().includes(lowerSearchTerm) ||
                (tx.upiId && tx.upiId.toLowerCase().includes(lowerSearchTerm)) ||
                (tx.billerId && tx.billerId.toLowerCase().includes(lowerSearchTerm)) ||
                tx.id.toLowerCase().includes(lowerSearchTerm)
            );
        }

        res.status(200).json(transactions);

    } catch (error) {
        next(error); // Pass error to central handler
    }
};

// Get Single Transaction Details
export const getTransactionDetails = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ message: "User not authenticated." });
    }
    const { id } = req.params;

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

        const transaction = {
            id: txDocSnap.id,
            ...data,
            date: (data?.date as Timestamp).toDate(), // Convert Timestamp
        };

        res.status(200).json(transaction);
    } catch (error) {
        next(error);
    }
};

// POST /api/transactions - Add a new transaction (called internally by other controllers)
export const addTransactionController = async (req: Request, res: Response, next: NextFunction) => {
     const userId = req.user?.uid;
     if (!userId) {
         return res.status(401).json({ message: 'User not authenticated.' });
     }

     const transactionData = req.body;

     // Basic validation (more robust validation can be added)
     if (!transactionData || typeof transactionData !== 'object' || !transactionData.type || !transactionData.name || transactionData.amount === undefined) {
         return res.status(400).json({ message: 'Invalid transaction data provided.' });
     }

     try {
         // Prepare data, ensuring userId is set correctly
         const dataToLog: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             ...transactionData,
             userId: userId, // Ensure userId from token is used
         };

         const savedTransaction = await addTransactionService(dataToLog); // Call the backend service
         res.status(201).json(savedTransaction); // Return the full transaction object
     } catch (error) {
         next(error); // Pass error to central handler
     }
 };

    