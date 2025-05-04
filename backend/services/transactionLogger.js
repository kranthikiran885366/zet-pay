
const admin = require('firebase-admin');
const db = admin.firestore();

// Interface matching frontend's Transaction
interface Transaction {
    id?: string;
    userId: string;
    type: string;
    name: string;
    description: string;
    amount: number;
    date?: Date; // Optional on input, required on output
    status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled' | 'FallbackSuccess';
    avatarSeed?: string;
    upiId?: string;
    billerId?: string;
    loanId?: string;
    ticketId?: string;
    refundEta?: string;
}

/**
 * Adds a new transaction record to Firestore.
 * Automatically adds userId and server timestamp.
 * Generates avatarSeed if not provided.
 *
 * @param transactionData Transaction details (userId is required if not provided by auth context).
 * @returns A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 */
async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string }): Promise<Transaction> {
    const { userId, name, ...rest } = transactionData;
    if (!userId) throw new Error("User ID is required to log transaction.");

    console.log(`Logging transaction for user ${userId}:`, rest);

    try {
        const transactionsColRef = db.collection('transactions');
        const dataToSave = {
            ...rest,
            userId: userId,
            name: name || 'Unknown Transaction', // Ensure name exists
            date: admin.firestore.FieldValue.serverTimestamp(),
            avatarSeed: rest.avatarSeed || (name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''), // Generate seed
        };
        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("Transaction logged with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved
        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        return {
            id: docRef.id,
            ...savedData,
            date: savedData.date.toDate(), // Convert Timestamp to Date
        } as Transaction;

    } catch (error) {
        console.error(`Error logging transaction for user ${userId}:`, error);
        // Optionally re-throw or handle logging failure (e.g., add to a retry queue)
        throw new Error("Could not log transaction.");
    }
}


/**
 * Placeholder for logging critical transaction details to a blockchain.
 */
async function logTransactionToBlockchain(transactionId: string, data: any): Promise<void> {
    console.log(`[Blockchain Log] Action: Transaction Logged (${transactionId})`, data);
    // Simulate API call to blockchain service
    try {
        // const response = await axios.post(process.env.BLOCKCHAIN_API_ENDPOINT, { type: 'logTransaction', transactionId, details: data });
        // console.log('Blockchain log response:', response.data);
         await new Promise(resolve => setTimeout(resolve, 60)); // Simulate short delay
    } catch (error) {
        console.error(`Failed to log transaction ${transactionId} to blockchain:`, error.message);
        // Non-critical failure, just log it
    }
}


module.exports = {
    addTransaction,
    logTransactionToBlockchain,
};
