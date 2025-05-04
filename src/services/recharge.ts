
/**
 * @fileOverview Service functions for processing recharges and bill payments.
 * Includes fetching billers, plans, history, and processing/scheduling/cancelling recharges.
 */
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDoc, writeBatch, runTransaction, setDoc } from 'firebase/firestore';
import { addTransaction, Transaction, cancelRecharge as cancelTransaction } from './transactions'; // Use the centralized transaction service, import cancelRecharge from transactions
import { format, differenceInMinutes, addDays } from 'date-fns'; // Keep date-fns imports

/**
 * Represents a biller for recharge and bill payments.
 */
export interface Biller {
  billerId: string;
  billerName: string;
  billerType: string;
  logoUrl?: string;
}

/**
 * Represents a recharge plan.
 */
export interface RechargePlan {
    planId: string;
    description: string;
    price: number;
    validity: string;
    data?: string;
    talktime?: number | -1; // -1 for Unlimited
    sms?: number | -1; // -1 for Unlimited
    isOffer?: boolean;
    category?: string;
    channels?: string | number;
}


/**
 * Asynchronously retrieves a list of available billers (operators).
 * SIMULATED: Uses mock data. Actual implementation would fetch from Firestore or an API.
 *
 * @param billerType The type of biller to retrieve (e.g., Mobile, DTH, Electricity, Fastag).
 * @returns A promise that resolves to an array of Biller objects.
 */
export async function getBillers(billerType: string): Promise<Biller[]> {
  console.log(`Fetching billers for type: ${billerType}`);
  // TODO: Replace mock data with Firestore fetch or API call
  // Example Firestore fetch (assuming 'billers' collection exists):
  // const billersColRef = collection(db, 'billers');
  // const q = query(billersColRef, where('billerType', '==', billerType), orderBy('billerName'));
  // const querySnapshot = await getDocs(q);
  // return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Biller));

  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay

  // Keep Mock Data for billers as it's often static or fetched from specific APIs
  const mockData: { [key: string]: Biller[] } = {
      Mobile: [
        { billerId: 'airtel-prepaid', billerName: 'Airtel Prepaid', billerType: 'Mobile', logoUrl: '/logos/airtel.png' },
        { billerId: 'jio-prepaid', billerName: 'Jio Prepaid', billerType: 'Mobile', logoUrl: '/logos/jio.png' },
        { billerId: 'vi-prepaid', billerName: 'Vodafone Idea (Vi)', billerType: 'Mobile', logoUrl: '/logos/vi.png' },
        { billerId: 'bsnl-prepaid', billerName: 'BSNL Prepaid', billerType: 'Mobile', logoUrl: '/logos/bsnl.png' },
      ],
      DTH: [
        { billerId: 'tata-play', billerName: 'Tata Play (Tata Sky)', billerType: 'DTH', logoUrl: '/logos/tataplay.png' },
        { billerId: 'dish-tv', billerName: 'Dish TV', billerType: 'DTH', logoUrl: '/logos/dishtv.png' },
        { billerId: 'airtel-dth', billerName: 'Airtel Digital TV', billerType: 'DTH', logoUrl: '/logos/airtel.png' },
        { billerId: 'd2h', billerName: 'd2h (Videocon)', billerType: 'DTH', logoUrl: '/logos/d2h.png' },
      ],
      Fastag: [
          { billerId: 'paytm-fastag', billerName: 'Paytm Payments Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/paytm.png'},
          { billerId: 'icici-fastag', billerName: 'ICICI Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/icici.png'},
          { billerId: 'hdfc-fastag', billerName: 'HDFC Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/hdfc.png'},
      ],
       Electricity: [
           { billerId: 'bescom', billerName: 'BESCOM (Bangalore)', billerType: 'Electricity'},
           { billerId: 'mseb', billerName: 'Mahadiscom (MSEB)', billerType: 'Electricity'},
           { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity' }, // Keep mock if needed
           { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity' }, // Keep mock if needed
      ],
       Datacard: [ // Added Datacard billers
            { billerId: 'jio-datacard', billerName: 'JioFi', billerType: 'Datacard', logoUrl: '/logos/jio.png' },
            { billerId: 'airtel-datacard', billerName: 'Airtel Data Card', billerType: 'Datacard', logoUrl: '/logos/airtel.png' },
            { billerId: 'vi-datacard', billerName: 'Vi Data Card', billerType: 'Datacard', logoUrl: '/logos/vi.png' },
       ],
       // Add other biller types as needed
  };
  return mockData[billerType] || [];
}

// Keep Mock Plans data as it's often complex/external
export const mockRechargePlans: RechargePlan[] = [
    { planId: 'p1', description: 'UL Calls, 1.5GB/D, 100SMS/D', price: 299, validity: '28 Days', data: '1.5GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: false },
    { planId: 'p1a', description: 'UL Calls, 1GB/D, 100SMS/D', price: 239, validity: '24 Days', data: '1GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: false },
    { planId: 'p4', description: 'UL Calls, 2GB/D + Streaming App', price: 599, validity: '56 Days', data: '2GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: true },
    { planId: 'p2', description: '50GB Bulk Data Pack', price: 301, validity: 'Existing Plan', data: '50GB', category: 'Data', isOffer: false },
    { planId: 'p2a', description: '12GB Data Add-on', price: 121, validity: 'Existing Plan', data: '12GB', category: 'Data', isOffer: false },
    { planId: 'ul1', description: 'Truly Unlimited Calls, 2GB/Day', price: 719, validity: '84 Days', data: '2GB/day', sms: 100, talktime: -1, category: 'Unlimited', isOffer: false },
    { planId: 'p3', description: '₹81.75 Talktime', price: 100, validity: 'Unlimited', data: 'N/A', talktime: 81.75, category: 'Talktime', isOffer: false },
    { planId: 'p7', description: '₹190 Talktime + 1GB Offer', price: 200, validity: 'Unlimited', data: '1GB', talktime: 190, category: 'Talktime', isOffer: true },
    { planId: 'p5', description: 'Intl Roaming USA 30D', price: 2999, validity: '30 Days', data: '5GB', talktime: 100, category: 'Roaming', isOffer: false },
    { planId: 'p6', description: 'UL Calls, 24GB/Yr', price: 1799, validity: '365 Days', data: '24GB Total', sms: 3600, talktime: -1, category: 'Annual', isOffer: false },
    { planId: 'sms1', description: '1000 SMS Pack', price: 49, validity: '28 Days', data: 'N/A', sms: 1000, category: 'SMS', isOffer: false },
];
export const mockDthPlans: RechargePlan[] = [
    { planId: 'dth1', description: 'Family Entertainment Pack', price: 350, validity: '1 Month', channels: '200+ Channels', category: 'Recommended' },
    { planId: 'dth2', description: 'Value Sports Pack', price: 280, validity: '1 Month', channels: '150+ Channels + Sports', category: 'Recommended', isOffer: true },
    { planId: 'dth3', description: 'HD Premium Pack', price: 499, validity: '1 Month', channels: '250+ Channels (50 HD)', category: 'HD Packs' },
    { planId: 'dth7', description: 'Flexi Top-Up ₹100', price: 100, validity: 'N/A', channels: 'N/A', category: 'Top-Up Packs' },
];
export const mockDataCardPlans: RechargePlan[] = [
     { planId: 'dc1', description: '10GB High-Speed Data', price: 199, validity: '28 Days', data: '10GB', category: 'Monthly' },
     { planId: 'dc2', description: '25GB High-Speed Data', price: 349, validity: '28 Days', data: '25GB', category: 'Monthly', isOffer: true },
];

/**
 * Asynchronously retrieves available recharge plans for a specific biller.
 * SIMULATED: Uses mock data based on type.
 * @param billerId The ID of the biller (operator).
 * @param type The type of recharge ('mobile', 'dth', 'datacard', etc.)
 * @returns A promise that resolves to an array of RechargePlan objects.
 */
export async function getRechargePlans(billerId: string, type: string): Promise<RechargePlan[]> {
   console.log(`Fetching plans for biller ID: ${billerId}, Type: ${type}`);
   await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
   if (type === 'mobile') return mockRechargePlans;
   if (type === 'dth') return mockDthPlans;
   if (type === 'datacard') return mockDataCardPlans;
   return []; // Return empty for other types in mock
}


/**
 * Asynchronously processes a recharge or bill payment.
 * Logs the transaction to Firestore using the addTransaction service.
 * SIMULATED: Does not perform actual payment processing.
 *
 * @param type The type of recharge/payment (e.g., 'mobile', 'dth').
 * @param identifier The number/ID to recharge.
 * @param amount The amount to pay.
 * @param billerId The ID of the biller (operator).
 * @param planId The ID of the selected plan. Optional.
 * @param couponCode Optional coupon code.
 * @returns A promise that resolves to the logged Transaction object.
 */
export async function processRecharge(
  type: string,
  identifier: string,
  amount: number,
  billerId?: string,
  planId?: string,
  couponCode?: string,
): Promise<Transaction> { // Return the standard Transaction object
    console.log('Processing recharge (Simulated):', { type, identifier, amount, billerId, planId, couponCode });
    // TODO: Integrate with actual payment gateway & recharge APIs.
    // This would involve:
    // 1. Selecting payment method (Wallet/UPI/Card)
    // 2. Initiating payment via the chosen method (e.g., calling processUpiPayment)
    // 3. If payment successful, calling the recharge aggregator API
    // 4. Handling potential failures at each step
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing delay

    const randomStatus = Math.random();
    let status: Transaction['status'] = 'Completed';
    let descriptionSuffix = '';
    if (randomStatus < 0.1) {
        status = 'Failed';
        descriptionSuffix = ' - Failed';
    } else if (randomStatus < 0.2) {
        status = 'Pending';
        descriptionSuffix = ' - Pending Confirmation';
    } else if (type === 'mobile' && randomStatus < 0.3) {
        status = 'Processing Activation';
        descriptionSuffix = ' - Activating...';
    }

    // Find Biller Name and Plan Description for logging
    const billers = await getBillers(capitalize(type)); // Fetch billers to get name
    const biller = billers.find(b => b.billerId === billerId);
    const billerName = biller?.billerName || capitalize(type); // Fallback to type name

    // Combine mock plans (adjust if plans become type-specific)
    const allPlans = [...mockRechargePlans, ...mockDthPlans, ...mockDataCardPlans];
    const plan = allPlans.find(p => p.planId === planId);
    const description = plan ? `${plan.description}${descriptionSuffix}` : `${billerName} recharge for ${identifier}${descriptionSuffix}`;


    // Log transaction using the central service
    try {
         const transaction = await addTransaction({
            type: 'Recharge', // Use a consistent type
            name: billerName, // Log Biller name
            description: description,
            amount: -amount, // Negative for outgoing payment
            status: status,
            billerId: billerId,
            upiId: identifier, // Store identifier here, might rename field later
            // Add planId if needed: planId: planId,
        });
        console.log(`Recharge transaction logged with ID: ${transaction.id} and status: ${status}`);
        // Log to blockchain (optional, non-blocking)
        logTransactionToBlockchain(transaction.id, {
            userId: transaction.userId,
            type: transaction.type,
            amount: transaction.amount,
            date: transaction.date,
            recipient: billerName, // Or billerId
        }).catch(blockchainError => {
            console.error(`Failed to log recharge ${transaction.id} to blockchain:`, blockchainError);
        });
        return transaction; // Return the logged transaction
    } catch (error) {
         console.error("Error logging recharge transaction:", error);
         // Create a fallback local object if logging fails, but payment was simulated
         const fallbackTransaction: Transaction = {
             id: `local_${Date.now()}`,
             userId: auth.currentUser?.uid || 'unknown',
             type: 'Recharge',
             name: billerName,
             description: `${description} (Logging Failed)`,
             amount: -amount,
             status: status,
             date: new Date(),
             avatarSeed: billerName.toLowerCase(),
             billerId: billerId,
             upiId: identifier,
         };
         return fallbackTransaction;
    }
}

/**
 * Asynchronously retrieves the recharge history for a specific identifier from Firestore.
 *
 * @param identifier The number/ID to fetch history for.
 * @param type The type of recharge ('mobile', 'dth', etc.) to potentially filter history.
 * @returns A promise that resolves to an array of Transaction objects.
 */
export async function getRechargeHistory(identifier: string, type: string): Promise<Transaction[]> {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    const userId = currentUser.uid;

    console.log(`Fetching ${type} history for: ${identifier} (User: ${userId})`);
    try {
        const transColRef = collection(db, 'transactions');
        const q = query(transColRef,
            where('userId', '==', userId),
            where('type', '==', 'Recharge'), // Filter by Recharge type
            where('upiId', '==', identifier), // Assuming identifier is stored in upiId field for recharges
            orderBy('date', 'desc'),
            limit(10) // Limit results
        );
        // Note: May need to adjust query if identifier is stored differently for different recharge types.

        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => {
            const data = doc.data() as TransactionFirestore; // Use Firestore type
            return {
                id: doc.id,
                ...data,
                date: data.date.toDate(), // Convert Timestamp to Date
                avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || doc.id, // Ensure avatarSeed
            } as Transaction;
        });
        console.log(`Fetched ${history.length} history entries.`);
        return history;

    } catch (error) {
        console.error("Error fetching recharge history:", error);
        throw new Error("Could not fetch recharge history.");
    }
}

/**
 * Simulates checking the activation status of a recent recharge.
 * In a real app, this would query the backend or the recharge provider.
 * @param transactionId The ID of the transaction to check.
 * @returns A promise that resolves to the current status.
 */
export async function checkActivationStatus(transactionId: string): Promise<Transaction['status']> {
    console.log(`Checking activation status for: ${transactionId}`);
    // TODO: Implement API call to check status with provider/aggregator using transactionId

    // Simulation based on Firestore status (assuming status might update)
    try {
        const txDocRef = doc(db, 'transactions', transactionId);
        const txSnap = await getDoc(txDocRef);
        if (txSnap.exists()) {
             return txSnap.data().status as Transaction['status'];
        } else {
            return 'Failed'; // If transaction doc doesn't exist, assume failed
        }
    } catch (e) {
         console.error("Error checking status from Firestore:", e);
         // Fallback simulation if Firestore check fails
         await new Promise(resolve => setTimeout(resolve, 1000));
         const random = Math.random();
         if (random < 0.7) return 'Completed';
         if (random < 0.9) return 'Processing Activation';
         return 'Failed';
    }

}

/**
 * Schedules a future recharge. Adds a record to a 'scheduledRecharges' collection in Firestore.
 * @param identifier The number/ID to recharge.
 * @param amount The amount to recharge.
 * @param frequency How often to recharge ('monthly', 'weekly').
 * @param startDate The date for the first scheduled recharge.
 * @param billerId Optional biller ID.
 * @param planId Optional plan ID.
 * @returns A promise resolving to an object indicating success and a schedule ID.
 */
export async function scheduleRecharge(
    identifier: string,
    amount: number,
    frequency: 'monthly' | 'weekly',
    startDate: Date,
    billerId?: string,
    planId?: string
): Promise<{success: boolean; scheduleId: string}> {
     const currentUser = auth.currentUser;
     if (!currentUser) throw new Error("User must be logged in.");
     const userId = currentUser.uid;

     console.log('Scheduling recharge:', { userId, identifier, amount, frequency, startDate, billerId, planId });

     // Basic validation for start date
     if (startDate < new Date(new Date().setHours(0,0,0,0))) {
         throw new Error("Schedule start date cannot be in the past.");
     }

     const scheduleData = {
        userId,
        identifier,
        amount,
        frequency,
        nextRunDate: Timestamp.fromDate(startDate), // Store as Timestamp
        billerId: billerId || null,
        planId: planId || null,
        isActive: true, // Active by default
        createdAt: serverTimestamp(), // Use server timestamp
        updatedAt: serverTimestamp(),
     };

     try {
         const scheduleColRef = collection(db, 'scheduledRecharges');
         const docRef = await addDoc(scheduleColRef, scheduleData);
         console.log("Recharge scheduled successfully with ID:", docRef.id);
         return { success: true, scheduleId: docRef.id };
     } catch (error) {
         console.error("Error scheduling recharge:", error);
         throw new Error("Could not schedule recharge.");
     }
}

/**
 * Cancels a scheduled recharge by marking it inactive in Firestore.
 * @param scheduleId The Firestore document ID of the schedule to cancel.
 */
export async function cancelScheduledRecharge(scheduleId: string): Promise<void> {
     const currentUser = auth.currentUser;
     if (!currentUser) throw new Error("User must be logged in.");
     const userId = currentUser.uid;
     console.log("Cancelling scheduled recharge:", scheduleId);

     try {
        const scheduleDocRef = doc(db, 'scheduledRecharges', scheduleId);
        // Optional: Check if the document exists and belongs to the user before updating
        const scheduleDoc = await getDoc(scheduleDocRef);
        if (!scheduleDoc.exists() || scheduleDoc.data()?.userId !== userId) {
            throw new Error("Schedule not found or permission denied.");
        }

        await updateDoc(scheduleDocRef, {
            isActive: false,
            updatedAt: serverTimestamp()
        });
        console.log("Scheduled recharge cancelled.");
     } catch (error) {
         console.error("Error cancelling scheduled recharge:", error);
         throw new Error("Could not cancel scheduled recharge.");
     }
}

/**
 * Asynchronously attempts to cancel a recently submitted recharge transaction.
 * Updates the corresponding transaction document in Firestore.
 * Uses the central `cancelRecharge` function from transactions service.
 *
 * @param transactionId The Firestore document ID of the transaction to cancel.
 * @returns A promise resolving to an object indicating success and a message.
 */
export async function cancelRechargeService(transactionId: string): Promise<{ success: boolean; message: string }> {
    // This now just wraps the function from transactions.ts
    return cancelTransaction(transactionId);
}

// Placeholder - requires actual implementation
async function logTransactionToBlockchain(transactionId: string, data: any): Promise<void> {
    console.log(`[Blockchain Simulation] Logging ${transactionId}:`, data);
    await new Promise(resolve => setTimeout(resolve, 100));
}

function capitalize(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
