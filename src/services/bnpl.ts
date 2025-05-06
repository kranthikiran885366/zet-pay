/**
 * @fileOverview Service functions for managing Pay Later (BNPL) functionality using Firestore.
 * Note: Actual activation and repayment processing require integration with a BNPL provider/NBFC partner.
 */
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, Timestamp, serverTimestamp, runTransaction, writeBatch } from 'firebase/firestore';
// Removed unused import: addTransaction
import { payViaWalletInternal } from './wallet'; // Import internal wallet function (Keep if backend uses it internally)
import { apiClient } from '@/lib/apiClient'; // Import apiClient for backend calls
import type { BnplDetails, BnplStatement, BnplTransaction } from './types'; // Import shared types

export type { BnplDetails, BnplStatement, BnplTransaction }; // Re-export

/**
 * Retrieves the user's Pay Later status and details from the backend API.
 * @param userId Optional: The user's ID (usually inferred by backend).
 * @returns A promise that resolves to the BnplDetails object.
 */
export async function getBnplStatus(userId?: string): Promise<BnplDetails> {
    const currentUserId = userId || auth.currentUser?.uid;
    console.log(`Fetching Pay Later (BNPL) status via API for user ${currentUserId || 'current'}...`);

    try {
        // Backend infers user from token
        const details = await apiClient<BnplDetails>('/bnpl/status');
        return {
            ...details,
            userId: currentUserId || details.userId, // Ensure userId is set client-side
            activationDate: details.activationDate ? new Date(details.activationDate) : undefined,
            lastUpdated: details.lastUpdated ? new Date(details.lastUpdated) : undefined,
        };
    } catch (error) {
        console.error("Error fetching BNPL status via API:", error);
        // Return default inactive status on error
        return {
            userId: currentUserId || 'error_user',
            isActive: false,
            creditLimit: 0,
        };
    }
}

/**
 * Initiates the activation process for Pay Later via the backend API.
 *
 * @returns A promise that resolves to true if activation is successful, false otherwise.
 * @throws Error if activation fails eligibility or other checks.
 */
export async function activateBnpl(): Promise<boolean> {
    console.log("Initiating Pay Later (BNPL) activation via API...");
    try {
        // Backend handles eligibility checks and partner integration
        const result = await apiClient<{ success: boolean; message?: string; details?: BnplDetails }>('/bnpl/activate', {
            method: 'POST',
        });
        if (result.success) {
             console.log(`BNPL activated via API`);
             return true;
        } else {
             throw new Error(result.message || "Activation failed.");
        }
    } catch (error: any) {
        console.error("Error activating BNPL via API:", error);
        throw new Error(error.message || "Could not activate Pay Later.");
    }
}

/**
 * Retrieves the latest UNPAID Pay Later statement details from the backend API.
 *
 * @returns A promise that resolves to the BnplStatement object or null if no unpaid statement exists.
 */
export async function getBnplStatement(): Promise<BnplStatement | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("User must be logged in to fetch BNPL statement.");
        return null; // Don't throw, just return null
    }
    const userId = currentUser.uid;
    console.log(`Fetching latest unpaid BNPL statement via API for user ${userId}...`);

    try {
        // Backend checks if BNPL is active before returning statement
        const statement = await apiClient<BnplStatement | null>('/bnpl/statement');
        if (!statement) {
             console.log("No unpaid BNPL statement found via API.");
             return null;
        }

        console.log("Found unpaid statement via API:", statement.id);
        return {
            ...statement,
            statementPeriodStart: new Date(statement.statementPeriodStart),
            statementPeriodEnd: new Date(statementPeriodEnd),
            dueDate: new Date(dueDate),
            paidDate: statement.paidDate ? new Date(statement.paidDate) : undefined,
            // Transactions might be included or fetched separately
            transactions: statement.transactions || [],
        };

    } catch (error) {
        console.error("Error fetching BNPL statement via API:", error);
        // Return null on error instead of throwing, UI can handle this state
        return null;
    }
}

/**
 * Asynchronously processes a repayment for the Pay Later bill via the backend API.
 * Backend handles payment deduction and updates statement status/transaction logging.
 *
 * @param statementId The Firestore document ID of the statement being paid.
 * @param amount The amount being paid.
 * @param paymentMethodInfo Information about the payment source (e.g., "UPI:xxx@ok", "Wallet").
 * @returns A promise that resolves to true if repayment is successful, false otherwise.
 * @throws Error if repayment fails.
 */
export async function repayBnplBill(statementId: string, amount: number, paymentMethodInfo: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User must be logged in.");
    const userId = currentUser.uid;
    console.log(`Processing Pay Later repayment via API: Statement ${statementId}, Amount ₹${amount}, Method ${paymentMethodInfo}`);

    try {
        const result = await apiClient<{ success: boolean; message?: string }>('/bnpl/repay', {
            method: 'POST',
            body: JSON.stringify({ statementId, amount, paymentMethodInfo }),
        });

        if (result.success) {
            console.log(`BNPL statement ${statementId} repayment successful via API.`);
            return true;
        } else {
            throw new Error(result.message || "Repayment processing failed.");
        }
    } catch (error: any) {
        console.error("Error repaying BNPL bill via API:", error);
        throw new Error(error.message || "Could not process Pay Later repayment.");
    }
}
