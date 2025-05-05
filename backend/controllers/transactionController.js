const admin = require('firebase-admin');
const db = admin.firestore();
const { collection, query, where, orderBy, limit, getDocs, doc, getDoc } = require('firebase/firestore'); // Import Firestore functions

// Get Transaction History
exports.getTransactionHistory = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, status, limit: count, startDate, endDate, searchTerm } = req.query;
    const defaultLimit = 20; // Default number of transactions per page
    const maxLimit = 100; // Max limit per request

    // Use Firestore client SDK from initialized admin app
    const firestoreDb = admin.firestore();
    const transactionsColRef = collection(firestoreDb, 'transactions');
    let q = query(transactionsColRef, where('userId', '==', userId)); // Base query for user

    // Apply filters
    if (type && type !== 'all') {
        q = query(q, where('type', '==', type));
    }
    if (status && status !== 'all') {
        q = query(q, where('status', '==', status));
    }
     if (startDate) {
        try {
            const fromDate = new Date(startDate as string);
            fromDate.setHours(0, 0, 0, 0);
            q = query(q, where('date', '>=', Timestamp.fromDate(fromDate)));
        } catch (e) { console.warn("Invalid startDate format"); }
    }
    if (endDate) {
         try {
            const toDate = new Date(endDate as string);
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
     if (searchTerm) {
        const lowerSearchTerm = (searchTerm as string).toLowerCase();
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
};

// Get Single Transaction Details
exports.getTransactionDetails = async (req, res, next) => {
    const userId = req.user.uid;
    const { id } = req.params;

    const firestoreDb = admin.firestore();
    const txDocRef = doc(firestoreDb, 'transactions', id);
    const txDocSnap = await getDoc(txDocRef);

    if (!txDocSnap.exists()) {
        res.status(404);
        throw new Error('Transaction not found.');
    }

    const data = txDocSnap.data();

    // Verify ownership
    if (data.userId !== userId) {
        res.status(403); // Forbidden
        throw new Error('Permission denied to access this transaction.');
    }

    const transaction = {
        id: txDocSnap.id,
        ...data,
        date: (data.date as Timestamp).toDate(), // Convert Timestamp
    };

    res.status(200).json(transaction);
};

// Import Timestamp type if needed
import { Timestamp } from 'firebase/firestore';

