
const admin = require('firebase-admin');
const db = admin.firestore();

exports.getTransactionHistory = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, status, limit: count, startDate, endDate, searchTerm } = req.query;
    const defaultLimit = 20; // Default number of transactions per page
    const maxLimit = 100; // Max limit per request

    try {
        const transactionsColRef = db.collection('transactions');
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
                const fromDate = new Date(startDate);
                fromDate.setHours(0, 0, 0, 0);
                q = query(q, where('date', '>=', admin.firestore.Timestamp.fromDate(fromDate)));
            } catch (e) { console.warn("Invalid startDate format"); }
        }
        if (endDate) {
             try {
                const toDate = new Date(endDate);
                toDate.setHours(23, 59, 59, 999);
                q = query(q, where('date', '<=', admin.firestore.Timestamp.fromDate(toDate)));
             } catch (e) { console.warn("Invalid endDate format"); }
        }

        // Order by date descending
        q = query(q, orderBy('date', 'desc'));

        // Apply limit
        const finalLimit = Math.min(parseInt(count || defaultLimit, 10) || defaultLimit, maxLimit);
        q = query(q, limit(finalLimit));

        const querySnapshot = await getDocs(q);

        let transactions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date.toDate(), // Convert Timestamp to Date for client
            };
        });

         // Apply client-side search term filtering (if provided)
         // Firestore doesn't support full-text search efficiently on multiple fields like this
         if (searchTerm) {
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
        next(error);
    }
};

// Add controllers for fetching single transaction, cancelling (if allowed), etc.
