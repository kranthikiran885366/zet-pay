/**
 * @fileOverview Service functions for managing micro-loans and potentially other loan types.
 */
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp, orderBy, limit } from 'firebase/firestore';
import { addTransaction } from './transactions'; // To log loan disbursement/repayment

export interface MicroLoanEligibility {
    eligible: boolean;
    limit: number; // Max amount eligible for
    message?: string; // Reason if not eligible
}

export interface MicroLoanStatus {
    hasActiveLoan: boolean;
    loanId?: string; // Firestore document ID of the active loan
    amountDue?: number;
    dueDate?: Date;
    purpose?: 'General' | 'Education'; // Added purpose
}

interface MicroLoan {
    id?: string; // Firestore ID
    userId: string;
    amountBorrowed: number;
    amountDue: number; // Initially same as borrowed, decreases on repayment
    purpose: 'General' | 'Education';
    status: 'Active' | 'Repaid' | 'Overdue';
    issuedDate: Timestamp;
    dueDate: Timestamp; // e.g., 7 days from issuedDate for 0% interest
    repaymentDate?: Timestamp; // When fully repaid
}

/**
 * Checks the user's eligibility for an instant micro-loan based on transaction history.
 * @param userId The ID of the user to check.
 * @param checkAmount The amount the user might want to borrow (used for potential checks).
 * @returns A promise resolving to MicroLoanEligibility object.
 */
export async function checkMicroLoanEligibility(userId: string, checkAmount: number = 1000): Promise<MicroLoanEligibility> {
    if (!userId) throw new Error("User ID required for eligibility check.");
    console.log(`Checking micro-loan eligibility for user ${userId}`);
    // TODO: Implement actual eligibility logic based on user's UPI/wallet transactions,
    // repayment history, potentially external data sources (with consent).
    // Factors: Transaction frequency, average balance, repayment history of past micro-loans, etc.

    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate check delay

    // Mock logic: Simple check based on random chance
    const isEligible = Math.random() > 0.3; // 70% chance eligible
    const maxLimit = isEligible ? (Math.floor(Math.random() * 10) + 1) * 1000 : 0; // Random limit up to 10k

    if (!isEligible) {
        return { eligible: false, limit: 0, message: "Based on recent activity, you're not eligible right now. Keep using PayFriend!" };
    }
    return { eligible: true, limit: maxLimit };
}

/**
 * Applies for a micro-loan.
 * @param userId The ID of the user applying.
 * @param amount The amount requested (should be <= eligibility limit).
 * @param purpose The reason for the loan ('General' or 'Education').
 * @returns A promise resolving to an object indicating success and due date.
 */
export async function applyForMicroLoan(userId: string, amount: number, purpose: 'General' | 'Education'): Promise<{ success: boolean; loanId?: string; dueDate?: Date; message?: string }> {
    if (!userId || amount <= 0) throw new Error("Invalid user ID or loan amount.");

    console.log(`Applying for micro-loan: User ${userId}, Amount ₹${amount}, Purpose: ${purpose}`);

    // 1. Re-check eligibility (optional but recommended)
    const eligibility = await checkMicroLoanEligibility(userId, amount);
    if (!eligibility.eligible || amount > eligibility.limit) {
        throw new Error(eligibility.message || `Requested amount ₹${amount} exceeds eligibility limit ₹${eligibility.limit}.`);
    }

    // 2. Check if user already has an active loan
    const currentStatus = await getMicroLoanStatus(userId);
    if (currentStatus.hasActiveLoan) {
        throw new Error("You already have an active micro-loan. Please repay it first.");
    }

    // 3. Create loan document in Firestore
    const issueDate = new Date();
    const dueDate = addDays(issueDate, 7); // 7-day repayment for 0% interest

    const loanData: Omit<MicroLoan, 'id'> = {
        userId,
        amountBorrowed: amount,
        amountDue: amount,
        purpose,
        status: 'Active',
        issuedDate: Timestamp.fromDate(issueDate),
        dueDate: Timestamp.fromDate(dueDate),
    };

    try {
        const loansColRef = collection(db, 'microLoans'); // Store loans in a top-level collection
        const docRef = await addDoc(loansColRef, loanData);
        console.log(`Micro-loan ${docRef.id} created for user ${userId}`);

        // 4. TODO: Disburse funds (e.g., credit to Zet Pay Wallet or linked bank account)
        // This needs integration with the wallet/payment service. Simulate success for now.
        console.log(`Simulating disbursement of ₹${amount} to user ${userId}`);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Log disbursement transaction
        await addTransaction({
            type: 'Received', // Loan received by user
            name: 'Micro-Loan Disbursed',
            description: `Purpose: ${purpose} - Repay by ${format(dueDate, 'PP')}`,
            amount: amount, // Positive amount
            status: 'Completed',
            userId: userId,
            loanId: docRef.id, // Link transaction to loan
        });

        return { success: true, loanId: docRef.id, dueDate };

    } catch (error) {
        console.error("Error applying for micro-loan:", error);
        throw new Error("Could not process loan application.");
    }
}

/**
 * Gets the status of the user's current micro-loan (if any).
 * @param userId The ID of the user.
 * @returns A promise resolving to the MicroLoanStatus object.
 */
export async function getMicroLoanStatus(userId: string): Promise<MicroLoanStatus> {
    if (!userId) throw new Error("User ID required to get loan status.");
    console.log(`Getting micro-loan status for user ${userId}`);

    try {
        const loansColRef = collection(db, 'microLoans');
        const q = query(loansColRef,
            where('userId', '==', userId),
            where('status', '==', 'Active'), // Look for active loans
            orderBy('issuedDate', 'desc'), // Get the latest active one if multiple somehow exist
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const loanDoc = querySnapshot.docs[0];
            const loanData = loanDoc.data() as MicroLoan;
            return {
                hasActiveLoan: true,
                loanId: loanDoc.id,
                amountDue: loanData.amountDue,
                dueDate: (loanData.dueDate as Timestamp).toDate(),
                purpose: loanData.purpose,
            };
        } else {
            return { hasActiveLoan: false };
        }

    } catch (error) {
        console.error("Error getting micro-loan status:", error);
        throw new Error("Could not retrieve loan status.");
    }
}

/**
 * Repays an active micro-loan.
 * @param userId The ID of the user repaying.
 * @param loanId The ID of the loan document in Firestore.
 * @param amount The amount being repaid.
 * @returns A promise resolving to an object indicating success and message.
 */
export async function repayMicroLoan(userId: string, loanId: string, amount: number): Promise<{ success: boolean; message?: string }> {
    if (!userId || !loanId || amount <= 0) throw new Error("Invalid parameters for loan repayment.");

    console.log(`Repaying micro-loan ${loanId}: User ${userId}, Amount ₹${amount}`);

    try {
        const loanDocRef = doc(db, 'microLoans', loanId);

        await runTransaction(db, async (transaction) => {
            const loanDoc = await transaction.get(loanDocRef);
            if (!loanDoc.exists()) {
                throw new Error("Active loan not found.");
            }

            const loanData = loanDoc.data() as MicroLoan;
            if (loanData.userId !== userId) {
                 throw new Error("Loan does not belong to this user.");
            }
            if (loanData.status !== 'Active') {
                 throw new Error("Loan is already repaid or in an invalid state.");
            }
            if (amount > loanData.amountDue) {
                 throw new Error(`Repayment amount ₹${amount} exceeds amount due ₹${loanData.amountDue}.`);
            }

            // TODO: Process payment deduction from user's selected source (Wallet/Bank)
            // Simulate success for now
            console.log(`Simulating deduction of ₹${amount} for repayment.`);
            await new Promise(resolve => setTimeout(resolve, 500));


            // Update loan status in Firestore
            const newAmountDue = loanData.amountDue - amount;
            const isFullyRepaid = newAmountDue <= 0; // Allow for small rounding errors if needed

            transaction.update(loanDocRef, {
                amountDue: newAmountDue,
                status: isFullyRepaid ? 'Repaid' : 'Active',
                repaymentDate: isFullyRepaid ? serverTimestamp() : undefined, // Set repayment date only if fully paid
                updatedAt: serverTimestamp(), // Always update this
            });

             // Log repayment transaction
            await addTransaction({
                type: 'Sent', // Money sent for repayment
                name: 'Micro-Loan Repayment',
                description: `Paid towards Loan ID ${loanId}`,
                amount: -amount, // Negative amount
                status: 'Completed',
                userId: userId,
                loanId: loanId,
            });


        });

        console.log(`Loan ${loanId} repayment of ₹${amount} successful.`);
        return { success: true, message: `Repayment of ₹${amount} successful.` };

    } catch (error: any) {
        console.error(`Error repaying micro-loan ${loanId}:`, error);
        // Attempt to log failed repayment transaction? Maybe not necessary.
        throw new Error(error.message || "Could not process loan repayment.");
    }
}

// Helper function (already exists in pocket-money page, keep for consistency)
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Helper function (already exists in pocket-money page)
const format = (date: Date, formatString: string): string => {
    // Basic formatting, replace with date-fns format if available
    if (formatString === 'PP') return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (formatString === 'PPP') return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (formatString === 'PPp') return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    return date.toISOString();
}

// Helper function (already exists in pocket-money page)
const differenceInDays = (dateLeft: Date, dateRight: Date): number => {
     const diffTime = dateLeft.getTime() - dateRight.getTime();
     return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 }
