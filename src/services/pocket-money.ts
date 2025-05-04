/**
 * @fileOverview Service functions for managing Digital Pocket Money feature.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs, addDoc, Timestamp, serverTimestamp, limit } from 'firebase/firestore';

// Interface for individual child settings within the parent's config
export interface ChildAccountConfig {
    id: string; // Unique ID for the child (could be a generated ID)
    name: string;
    avatarSeed: string; // For generating consistent avatar placeholders
    balance: number; // Current pocket money balance (managed by parent/system)
    allowanceAmount?: number; // Amount for automatic allowance
    allowanceFrequency?: 'Daily' | 'Weekly' | 'Monthly' | 'None'; // Frequency of allowance
    lastAllowanceDate?: Date; // Last date allowance was given
    spendingLimitPerTxn?: number; // Max amount child can spend in one transaction
    linkedSchoolBillerId?: string; // Optional: For direct school fee payments
    // Add more controls as needed (e.g., blocked categories, spending reports)
}

// Interface for the overall Pocket Money configuration linked to the parent user
export interface PocketMoneyConfig {
    userId: string; // Parent's Firebase Auth UID
    children: ChildAccountConfig[];
    // Add parent-level settings if any (e.g., master enable/disable)
}

// Interface for transactions specific to a child's pocket money
export interface PocketMoneyTransaction {
    id: string; // Firestore document ID
    userId: string; // Parent's UID
    childId: string; // ID of the child involved
    description: string; // e.g., "Allowance Added", "Ice Cream Shop", "School Fee Paid", "Funds Added by Parent"
    amount: number; // Positive for additions (allowance, manual top-up), negative for spending
    date: Date; // Timestamp of the transaction
    // Add category, merchant details, etc. if needed
}


/**
 * Retrieves the pocket money configuration for the current user.
 * @param userId The ID of the parent user.
 * @returns A promise resolving to the PocketMoneyConfig object or null if not found.
 */
export async function getPocketMoneyConfig(userId: string): Promise<PocketMoneyConfig | null> {
    if (!userId) throw new Error("User ID required to get pocket money config.");
    console.log(`Fetching pocket money config for user: ${userId}`);

    try {
        const configDocRef = doc(db, 'pocketMoneyConfigs', userId); // Store configs in a top-level collection by parent userId
        const configDocSnap = await getDoc(configDocRef);

        if (configDocSnap.exists()) {
            const data = configDocSnap.data();
            // Ensure children array exists and dates are converted
            const children = (data.children || []).map((child: any) => ({
                ...child,
                lastAllowanceDate: child.lastAllowanceDate ? (child.lastAllowanceDate as Timestamp).toDate() : undefined,
            }));
            return { userId, children } as PocketMoneyConfig;
        } else {
            console.log("No pocket money config found for user:", userId);
            // Return a default empty config if none exists
            return { userId, children: [] };
        }
    } catch (error) {
        console.error("Error fetching pocket money config:", error);
        throw new Error("Could not fetch pocket money configuration.");
    }
}

/**
 * Creates or updates the pocket money configuration for the current user.
 * @param userId The ID of the parent user.
 * @param configData The full PocketMoneyConfig object to save.
 * @returns A promise that resolves when the operation is complete.
 */
export async function updatePocketMoneyConfig(userId: string, configData: PocketMoneyConfig): Promise<void> {
    if (!userId) throw new Error("User ID required to update pocket money config.");
    console.log(`Updating pocket money config for user: ${userId}`);

    try {
        const configDocRef = doc(db, 'pocketMoneyConfigs', userId);
        // Convert Date objects back to Timestamps before saving
        const dataToSave = {
            ...configData,
            children: configData.children.map(child => ({
                ...child,
                // Convert Date back to Timestamp only if it exists
                lastAllowanceDate: child.lastAllowanceDate ? Timestamp.fromDate(new Date(child.lastAllowanceDate)) : null,
            }))
        };
         // Using set with merge: true handles both creation and update
        await setDoc(configDocRef, dataToSave, { merge: true });
        console.log("Pocket money config updated successfully.");
    } catch (error) {
        console.error("Error updating pocket money config:", error);
        throw new Error("Could not save pocket money configuration.");
    }
}

/**
 * Retrieves recent pocket money transactions for a specific child.
 * @param userId The ID of the parent user.
 * @param childId The ID of the child whose transactions are needed.
 * @param count Optional limit on the number of transactions (default 10).
 * @returns A promise resolving to an array of PocketMoneyTransaction objects.
 */
export async function getPocketMoneyTransactions(userId: string, childId: string, count: number = 10): Promise<PocketMoneyTransaction[]> {
    if (!userId || !childId) throw new Error("User ID and Child ID required to get transactions.");
    console.log(`Fetching transactions for user ${userId}, child ${childId}`);

    try {
        // Assuming transactions are stored in a subcollection under the parent's config document
        // OR in a top-level collection queryable by userId and childId.
        // Example using a top-level collection 'pocketMoneyTransactions':
        const transColRef = collection(db, 'pocketMoneyTransactions');
        const q = query(transColRef,
            where('userId', '==', userId),
            where('childId', '==', childId),
            orderBy('date', 'desc'),
            limit(count)
        );

        const querySnapshot = await getDocs(q);
        const transactions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate(), // Convert Timestamp to Date
            } as PocketMoneyTransaction;
        });
        return transactions;
    } catch (error) {
        console.error("Error fetching pocket money transactions:", error);
        throw new Error("Could not fetch transactions.");
    }
}

/**
 * Adds a new pocket money transaction record. Used internally for allowance, top-ups, spending.
 * @param transactionData Data for the transaction (excluding id).
 * @returns A promise resolving to the created transaction's ID.
 */
export async function addPocketMoneyTransaction(transactionData: Omit<PocketMoneyTransaction, 'id' | 'date'>): Promise<string> {
     if (!transactionData.userId || !transactionData.childId) {
        throw new Error("User ID and Child ID are required.");
     }
     console.log("Adding pocket money transaction:", transactionData);

     try {
        const transColRef = collection(db, 'pocketMoneyTransactions');
        const dataToSave = {
            ...transactionData,
            date: serverTimestamp(), // Use server timestamp
        };
        const docRef = await addDoc(transColRef, dataToSave);
        console.log("Pocket money transaction added with ID:", docRef.id);
        return docRef.id;
     } catch (error) {
         console.error("Error adding pocket money transaction:", error);
         throw new Error("Could not log pocket money transaction.");
     }
}
