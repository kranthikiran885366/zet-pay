/**
 * @fileOverview Service functions for managing Pay Later (BNPL) functionality using Firestore.
 * Note: Actual activation and repayment processing require integration with a BNPL provider/NBFC partner.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, Timestamp, serverTimestamp, runTransaction, writeBatch } from 'firebase/firestore';
import { addTransaction } from './transactionLogger'; // To log repayments

// Interfaces remain largely the same, added Firestore IDs
export interface BnplDetails {
    userId: string; // Firestore document ID (same as auth UID)
    isActive: boolean;
    creditLimit: number;
    providerName?: string;
    partnerBank?: string;
    activationDate?: Timestamp;
    lastUpdated?: Timestamp;
}

export interface BnplStatement {
    id?: string; // Firestore document ID
    userId: string;
    statementId: string; // e.g., YYYYMM format
    statementPeriodStart: Timestamp;
    statementPeriodEnd: Timestamp;
    dueDate: Timestamp;
    dueAmount: number;
    minAmountDue: number;
    isPaid: boolean; // New field to track payment status
    paidDate?: Timestamp;
    // transactions array might be large, consider storing them in a subcollection
}

export interface BnplTransaction {
    id?: string; // Firestore document ID
    userId: string;
    statementId: string; // Link to the statement
    transactionId: string; // Original transaction ID (e.g., from UPI/Card)
    date: Timestamp;
    merchantName: string;
    amount: number;
}

/**
 * Retrieves the user's Pay Later status and details from Firestore.
 * Creates a default (inactive) record if none exists.
 * @param userId The user's ID.
 * @returns A promise that resolves to the BnplDetails object.
 */
export async function getBnplStatus(userId?: string): Promise<BnplDetails> {
    const currentUserId = userId || auth.currentUser?.uid;
    if (!currentUserId) throw new Error("User ID required to get BNPL status.");
    console.log(`Fetching Pay Later (BNPL) status for user ${currentUserId}...`);

    try {
        const bnplDocRef = doc(db, 'bnplStatus', currentUserId); // Store status in 'bnplStatus' collection by userId
        const bnplDocSnap = await getDoc(bnplDocRef);

        if (bnplDocSnap.exists()) {
            const data = bnplDocSnap.data();
            return {
                ...data,
                userId: currentUserId,
                 // Convert timestamps if they exist
                 activationDate: data.activationDate ? (data.activationDate as Timestamp).toDate() : undefined,
                 lastUpdated: data.lastUpdated ? (data.lastUpdated as Timestamp).toDate() : undefined,
            } as BnplDetails;
        } else {
            // Create a default inactive record
            console.log(`No BNPL status found for user ${currentUserId}. Creating default inactive record.`);
            const defaultStatus: Omit<BnplDetails, 'lastUpdated'> = {
                userId: currentUserId,
                isActive: false,
                creditLimit: 0,
            };
            await setDoc(bnplDocRef, {
                ...defaultStatus,
                lastUpdated: serverTimestamp(), // Add timestamp on creation
            });
            return { ...defaultStatus, lastUpdated: new Date() }; // Return with client date for immediate use
        }
    } catch (error) {
        console.error("Error fetching/creating BNPL status:", error);
        throw new Error("Could not fetch Pay Later status.");
    }
}

/**
 * Initiates the activation process for Pay Later.
 * SIMULATED: Updates status in Firestore, actual activation requires partner integration.
 *
 * @returns A promise that resolves to true if activation is marked as successful (simulated), false otherwise.
 * @throws Error if activation fails eligibility or other checks.
 */
export async function activateBnpl(): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;
    console.log("Initiating Pay Later (BNPL) activation for user:", userId);

    // TODO: Implement actual eligibility checks with backend/partner API.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate checks
    const mockEligibility = Math.random() > 0.2; // 80% chance eligible

    if (!mockEligibility) {
        throw new Error("You are not eligible for Pay Later at this time based on our checks.");
    }

    // Simulate successful activation & update Firestore
    try {
        const bnplDocRef = doc(db, 'bnplStatus', userId);
        const creditLimitMock = (Math.floor(Math.random() * 11) + 5) * 1000; // 5k to 15k limit

        await setDoc(bnplDocRef, { // Use setDoc with merge:true or updateDoc
            isActive: true,
            creditLimit: creditLimitMock,
            providerName: "PayFriend PayLater (Simulated)",
            partnerBank: "MockBank NBFC",
            activationDate: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        }, { merge: true }); // Use merge to avoid overwriting other fields if they exist

        console.log(`BNPL activated for user ${userId} with limit ${creditLimitMock}`);
        return true;
    } catch (error) {
        console.error("Error updating BNPL status in Firestore:", error);
        throw new Error("Could not activate Pay Later due to a system error.");
    }
}

/**
 * Retrieves the latest UNPAID Pay Later statement details from Firestore.
 *
 * @returns A promise that resolves to the BnplStatement object or null if no unpaid statement exists.
 */
export async function getBnplStatement(): Promise<BnplStatement | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;
    console.log(`Fetching latest unpaid BNPL statement for user ${userId}...`);

    try {
        // Check if BNPL is active first
        const status = await getBnplStatus(userId);
        if (!status.isActive) {
            console.log("BNPL is not active, no statement to fetch.");
            return null;
        }

        const statementsColRef = collection(db, 'bnplStatements'); // Top-level collection for statements
        const q = query(statementsColRef,
            where('userId', '==', userId),
            where('isPaid', '==', false), // Look for unpaid statements
            orderBy('dueDate', 'desc'), // Get the most recent due date first
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const stmtDoc = querySnapshot.docs[0];
            const data = stmtDoc.data();
            console.log("Found latest unpaid statement:", stmtDoc.id);

             // Fetch associated transactions (optional, could be large)
             // const transactions = await getBnplStatementTransactions(userId, stmtDoc.id);

            return {
                id: stmtDoc.id,
                ...data,
                statementPeriodStart: (data.statementPeriodStart as Timestamp).toDate(),
                statementPeriodEnd: (data.statementPeriodEnd as Timestamp).toDate(),
                dueDate: (data.dueDate as Timestamp).toDate(),
                paidDate: data.paidDate ? (data.paidDate as Timestamp).toDate() : undefined,
                transactions: [], // Populate if transactions are fetched
            } as BnplStatement;
        } else {
            console.log("No unpaid BNPL statements found.");
            return null; // No active unpaid statement
        }

    } catch (error) {
        console.error("Error fetching BNPL statement:", error);
        throw new Error("Could not fetch Pay Later statement.");
    }
}

/**
 * Asynchronously processes a repayment for the Pay Later bill.
 * SIMULATED: Updates statement status in Firestore and logs transaction. Actual payment needed.
 *
 * @param statementId The Firestore document ID of the statement being paid.
 * @param amount The amount being paid (should ideally match dueAmount or minAmountDue).
 * @param paymentMethodInfo Information about the payment source (e.g., "Paid via UPI").
 * @returns A promise that resolves to true if repayment logging is successful, false otherwise.
 * @throws Error if repayment simulation fails.
 */
export async function repayBnplBill(statementId: string, amount: number, paymentMethodInfo: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;
    console.log(`Processing Pay Later repayment of ₹${amount} for statement ${statementId} using ${paymentMethodInfo}...`);

    // TODO: Implement actual payment deduction from user's chosen source (UPI/Wallet/Card).
    await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate payment processing

    try {
        const stmtDocRef = doc(db, 'bnplStatements', statementId);

        await runTransaction(db, async (transaction) => {
            const stmtDoc = await transaction.get(stmtDocRef);
            if (!stmtDoc.exists()) {
                throw new Error("Statement not found.");
            }
            const stmtData = stmtDoc.data();
            if (stmtData.userId !== userId) {
                throw new Error("Statement does not belong to this user.");
            }
            if (stmtData.isPaid) {
                throw new Error("This statement has already been paid.");
            }
            // Basic validation: Check if payment amount is sufficient (e.g., at least min due)
            if (amount < stmtData.minAmountDue) {
                console.warn(`Payment amount ${amount} is less than minimum due ${stmtData.minAmountDue}`);
                 // Allow partial payment but don't mark as fully paid yet
                 // Or throw error depending on business logic
            }

            // Assume payment debit was successful (from the TODO above)

            // Mark statement as paid in Firestore (if amount covers full due amount)
            // Adjust logic here for partial payments if needed
            const isFullyPaid = amount >= stmtData.dueAmount;
            if (isFullyPaid) {
                transaction.update(stmtDocRef, {
                    isPaid: true,
                    paidDate: serverTimestamp(),
                    // Optionally update amountDue if partial payments were allowed
                });
            } else {
                 // Handle partial payment logic if required
                 console.log("Partial payment received. Statement remains unpaid.");
                 // transaction.update(stmtDocRef, { amountDue: stmtData.dueAmount - amount }); // Example
            }
        });

         // Log successful repayment transaction
         await addTransaction({
             type: 'Bill Payment', // Consider BNPL repayment a bill payment
             name: 'Pay Later Bill Payment',
             description: `Paid statement ${statementId} via ${paymentMethodInfo}`,
             amount: -amount, // Negative amount
             status: 'Completed',
             userId: userId,
             billerId: 'PAYFRIEND_BNPL', // Use an internal identifier
         });


        console.log(`BNPL statement ${statementId} marked as paid (or partially paid).`);
        return true;
    } catch (error: any) {
        console.error("Error repaying BNPL bill:", error);
        // Log failed repayment attempt? Maybe not needed if payment itself failed earlier.
        throw new Error(error.message || "Could not process Pay Later repayment.");
    }
}
