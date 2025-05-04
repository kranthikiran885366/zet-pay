/**
 * @fileOverview Service functions for processing recharges and bill payments via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Use shared types
import type { DateRange } from "react-day-picker";
import { auth } from '@/lib/firebase'; // Keep for client-side user ID if needed

/**
 * Represents a biller for recharge and bill payments.
 * Align with backend structure.
 */
export interface Biller {
  billerId: string;
  billerName: string;
  billerType: string;
  logoUrl?: string;
  // Add other fields returned by the API if necessary
}

/**
 * Represents a recharge plan.
 * Align with backend structure.
 */
export interface RechargePlan {
    planId: string;
    description: string;
    price: number;
    validity: string;
    data?: string;
    talktime?: number | string; // Allow string for 'Unlimited' etc. from backend
    sms?: number | string;
    isOffer?: boolean;
    category?: string;
    channels?: string | number;
    // Add other fields returned by the API if necessary
}

/**
 * Asynchronously retrieves a list of available billers (operators) from the backend API.
 *
 * @param billerType The type of biller to retrieve (e.g., Mobile, DTH, Electricity, Fastag).
 * @returns A promise that resolves to an array of Biller objects.
 */
export async function getBillers(billerType: string): Promise<Biller[]> {
  console.log(`Fetching billers via API for type: ${billerType}`);
  try {
    const billers = await apiClient<Biller[]>(`/recharge/billers?type=${encodeURIComponent(billerType)}`);
    return billers;
  } catch (error) {
    console.error("Error fetching billers via API:", error);
    return []; // Return empty array on error
  }
}

/**
 * Asynchronously retrieves available recharge plans for a specific biller from the backend API.
 * @param billerId The ID of the biller (operator).
 * @param type The type of recharge ('mobile', 'dth', 'datacard', etc.)
 * @param identifier Optional identifier (e.g., mobile number for circle-specific plans).
 * @returns A promise that resolves to an array of RechargePlan objects.
 */
export async function getRechargePlans(billerId: string, type: string, identifier?: string): Promise<RechargePlan[]> {
   console.log(`Fetching plans via API for biller ID: ${billerId}, Type: ${type}, Identifier: ${identifier || 'N/A'}`);
   const params = new URLSearchParams({ billerId, type });
   if (identifier) {
       params.append('identifier', identifier);
   }
   const endpoint = `/recharge/plans?${params.toString()}`;
   try {
       const plans = await apiClient<RechargePlan[]>(endpoint);
       return plans;
   } catch (error) {
       console.error("Error fetching recharge plans via API:", error);
       return []; // Return empty array on error
   }
}


/**
 * Asynchronously processes a recharge or bill payment via the backend API.
 * The backend handles payment processing and transaction logging.
 *
 * @param type The type of recharge/payment (e.g., 'mobile', 'dth').
 * @param identifier The number/ID to recharge.
 * @param amount The amount to pay.
 * @param billerId The ID of the biller (operator).
 * @param planId The ID of the selected plan. Optional.
 * @param couponCode Optional coupon code.
 * @param paymentMethod Optional payment method hint (backend might prioritize default).
 * @returns A promise that resolves to the Transaction object returned by the backend.
 */
export async function processRecharge(
  type: string,
  identifier: string,
  amount: number,
  billerId?: string,
  planId?: string,
  couponCode?: string,
  paymentMethod?: 'wallet' | 'upi' | 'card' // Allow specifying payment method
): Promise<Transaction> { // Return the Transaction object from backend
    console.log('Processing recharge via API:', { type, identifier, amount, billerId, planId, couponCode, paymentMethod });

    const payload = {
        type,
        identifier,
        amount,
        billerId: billerId || undefined,
        planId: planId || undefined,
        couponCode: couponCode || undefined,
        paymentMethod: paymentMethod || undefined, // Send hint to backend
    };

    try {
        // The backend API endpoint '/recharge' should handle everything:
        // - Payment deduction (wallet, UPI, card)
        // - Calling the recharge provider API
        // - Logging the final transaction (success, pending, failed)
        // - Returning the final Transaction object
        const resultTransaction = await apiClient<Transaction>('/recharge', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        console.log("Recharge API response (Transaction):", resultTransaction);
        // Convert date string from API to Date object
        return {
            ...resultTransaction,
            date: new Date(resultTransaction.date),
             avatarSeed: resultTransaction.avatarSeed || resultTransaction.name?.toLowerCase().replace(/\s+/g, '') || resultTransaction.id,
        };
    } catch (error: any) {
         console.error("Error processing recharge via API:", error);
         // Throw the error so the UI can display it using toast
         throw error;
    }
}

/**
 * Asynchronously retrieves the recharge history for a specific identifier from the backend API.
 * This is now covered by the `getTransactionHistory` service.
 *
 * @param identifier The number/ID to fetch history for.
 * @param type The type of recharge ('mobile', 'dth', etc.).
 * @returns A promise that resolves to an array of Transaction objects.
 */
// export async function getRechargeHistory(identifier: string, type: string): Promise<Transaction[]> {
//     // Use the generic getTransactionHistory service instead
//     console.warn("getRechargeHistory is deprecated. Use getTransactionHistory with filters.");
//     const filters: TransactionFilters = {
//         type: 'Recharge',
//         searchTerm: identifier, // Use searchTerm to find by identifier (adjust backend if needed)
//     };
//     return getTransactionHistory(filters, 10); // Example limit
// }

/**
 * Checks the activation status of a recent recharge via the backend API.
 * @param transactionId The ID of the transaction to check.
 * @returns A promise that resolves to the current status string.
 */
export async function checkActivationStatus(transactionId: string): Promise<Transaction['status']> {
    console.log(`Checking activation status via API for: ${transactionId}`);
    try {
        const result = await apiClient<{ status: Transaction['status'] }>(`/recharge/status/${transactionId}`);
        return result.status;
    } catch (error) {
        console.error("Error checking activation status via API:", error);
        // Decide fallback status on error
        return 'Failed';
    }
}

/**
 * Schedules a future recharge via the backend API.
 * @param identifier The number/ID to recharge.
 * @param amount The amount to recharge.
 * @param frequency How often to recharge ('monthly', 'weekly').
 * @param startDate The date for the first scheduled recharge.
 * @param billerId Optional biller ID.
 * @param planId Optional plan ID.
 * @returns A promise resolving to an object indicating success and a schedule ID from the backend.
 */
export async function scheduleRecharge(
    identifier: string,
    amount: number,
    frequency: 'monthly' | 'weekly',
    startDate: Date,
    billerId?: string,
    planId?: string
): Promise<{success: boolean; scheduleId: string}> {
     console.log('Scheduling recharge via API:', { identifier, amount, frequency, startDate, billerId, planId });

     const payload = {
        identifier,
        amount,
        frequency,
        startDate: startDate.toISOString(), // Send date as ISO string
        billerId: billerId || undefined,
        planId: planId || undefined,
     };

     try {
         const result = await apiClient<{success: boolean; scheduleId: string}>('/recharge/schedule', {
             method: 'POST',
             body: JSON.stringify(payload),
         });
         console.log("Recharge scheduled successfully via API:", result);
         return result;
     } catch (error: any) {
         console.error("Error scheduling recharge via API:", error);
         throw error;
     }
}

/**
 * Cancels a scheduled recharge via the backend API.
 * @param scheduleId The ID of the schedule to cancel.
 */
export async function cancelScheduledRecharge(scheduleId: string): Promise<void> {
     console.log("Cancelling scheduled recharge via API:", scheduleId);
     try {
        await apiClient<void>(`/recharge/schedule/${scheduleId}`, {
            method: 'DELETE',
        });
        console.log("Scheduled recharge cancelled via API.");
     } catch (error) {
         console.error("Error cancelling scheduled recharge via API:", error);
         throw error;
     }
}

/**
 * Asynchronously attempts to cancel a recently submitted recharge transaction via the backend API.
 *
 * @param transactionId The Firestore document ID of the transaction to cancel.
 * @returns A promise resolving to an object indicating success and a message.
 */
export async function cancelRechargeService(transactionId: string): Promise<{ success: boolean; message: string }> {
     console.log(`Requesting cancellation for recharge transaction via API: ${transactionId}`);
     try {
         // The backend endpoint handles permission checks and external API calls
         const result = await apiClient<{ success: boolean; message: string }>(`/recharge/cancel/${transactionId}`, {
             method: 'POST', // Use POST as per backend route definition
         });
         return result;
     } catch (error: any) {
         console.error("Error cancelling recharge via API:", error);
         // Return a generic failure object based on the caught error
         return { success: false, message: error.message || "Could not cancel recharge." };
     }
}


// Remove mock plan exports if no longer needed directly by components
// export { mockRechargePlans, mockDthPlans, mockDataCardPlans };
