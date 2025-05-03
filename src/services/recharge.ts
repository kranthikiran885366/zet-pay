/**
 * Represents a biller for recharge and bill payments.
 */
export interface Biller {
  /**
   * The ID of the biller.
   */
  billerId: string;
  /**
   * The name of the biller.
   */
  billerName: string;
  /**
   * The type of biller (e.g., Mobile, DTH, Electricity).
   */
  billerType: string;
}

/**
 * Represents a recharge plan. - Copied from recharge page for consistency
 */
export interface RechargePlan {
    planId: string;
    description: string;
    price: number;
    validity: string;
    data: string;
    talktime?: number | -1; // -1 for Unlimited
    sms?: number | -1; // -1 for Unlimited
    isOffer?: boolean;
    category?: string;
}


/**
 * Represents a recharge or bill payment transaction.
 */
export interface RechargeTransaction {
  /**
   * The transaction ID.
   */
  transactionId: string;
  /**
   * The identifier used (e.g., mobile number, DTH ID).
   */
  identifier: string;
   /**
   * The biller ID (Operator ID). Optional if only identifier is needed.
   */
  billerId?: string;
  /**
   * The name of the biller/operator. Optional.
   */
  billerName?: string;
  /**
   * The amount paid.
   */
  amount: number;
   /**
   * Optional description of the plan recharged.
   */
  planDescription?: string;
  /**
   * The date of the transaction.
   */
  date: Date;
  /**
   * The status of the transaction (e.g., Pending, Completed, Failed, Processing Activation).
   */
  status: 'Pending' | 'Completed' | 'Failed' | 'Processing Activation';
}

/**
 * Represents an entry in the recharge history.
 * Reuses fields from RechargeTransaction for simplicity.
 */
export interface RechargeHistoryEntry extends RechargeTransaction {}


/**
 * Asynchronously retrieves a list of available billers (operators).
 *
 * @param billerType The type of biller to retrieve (e.g., Mobile, DTH, Electricity, Fastag).
 * @returns A promise that resolves to an array of Biller objects.
 */
export async function getBillers(billerType: string): Promise<Biller[]> {
  console.log(`Fetching billers for type: ${billerType}`);
  // TODO: Implement this by calling an API based on billerType.
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 300));

   // Mock data based on type
  const mockData: { [key: string]: Biller[] } = {
    Mobile: [
      { billerId: 'airtel-prepaid', billerName: 'Airtel Prepaid', billerType: 'Mobile' },
      { billerId: 'jio-prepaid', billerName: 'Jio Prepaid', billerType: 'Mobile' },
      { billerId: 'vi-prepaid', billerName: 'Vodafone Idea (Vi)', billerType: 'Mobile' },
      { billerId: 'bsnl-prepaid', billerName: 'BSNL Prepaid', billerType: 'Mobile' },
    ],
    DTH: [
      { billerId: 'tata-sky', billerName: 'Tata Play (Tata Sky)', billerType: 'DTH' },
      { billerId: 'dish-tv', billerName: 'Dish TV', billerType: 'DTH' },
      { billerId: 'airtel-dth', billerName: 'Airtel Digital TV', billerType: 'DTH' },
      { billerId: 'videocon-d2h', billerName: 'd2h (Videocon)', billerType: 'DTH' },
    ],
    Fastag: [
        { billerId: 'paytm-fastag', billerName: 'Paytm Payments Bank FASTag', billerType: 'Fastag'},
        { billerId: 'icici-fastag', billerName: 'ICICI Bank FASTag', billerType: 'Fastag'},
        { billerId: 'hdfc-fastag', billerName: 'HDFC Bank FASTag', billerType: 'Fastag'},
        // Add more FASTag issuers
    ],
    Electricity: [
         { billerId: 'bescom', billerName: 'BESCOM (Bangalore)', billerType: 'Electricity'},
         { billerId: 'mseb', billerName: 'Mahadiscom (MSEB)', billerType: 'Electricity'},
         // Add more electricity boards
    ],
    // Add mock data for other biller types as needed
  };

  return mockData[billerType] || [];
}

/**
 * Asynchronously retrieves available recharge plans for a specific biller.
 * Note: This is a placeholder. Implementation in the page itself for now.
 *
 * @param billerId The ID of the biller (operator).
 * @returns A promise that resolves to an array of RechargePlan objects.
 */
export async function getRechargePlans(billerId: string): Promise<RechargePlan[]> {
   console.log(`Fetching plans for biller ID: ${billerId}`);
   // TODO: Implement API call to fetch plans for the given operator ID.
   await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
   // Return mock plans based on billerId or a generic set
   const mockPlans: RechargePlan[] = [
        { planId: 'p1', description: 'Unlimited Calls, 1.5GB/Day', price: 299, validity: '28 Days', data: '1.5GB/day', sms: 100, category: 'Popular', isOffer: false },
        { planId: 'p2', description: '50GB Data Pack', price: 149, validity: '30 Days', data: '50GB', category: 'Data', isOffer: false },
        // ... other plans
   ];
    return mockPlans; // Return the same mock plans as in the page for now
}


/**
 * Asynchronously processes a recharge or bill payment.
 *
 * @param type The type of recharge/payment (e.g., 'mobile', 'dth').
 * @param identifier The number/ID to recharge.
 * @param amount The amount to pay.
 * @param billerId The ID of the biller (operator). Optional.
 * @param planId The ID of the selected plan. Optional.
 * @returns A promise that resolves to a RechargeTransaction object representing the transaction details.
 */
export async function processRecharge(
  type: string,
  identifier: string,
  amount: number,
  billerId?: string,
  planId?: string
): Promise<RechargeTransaction> {
  console.log('Processing recharge:', { type, identifier, amount, billerId, planId });
  // TODO: Implement this by calling the appropriate backend API.
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simulate different outcomes
  const randomStatus = Math.random();
  let status: RechargeTransaction['status'] = 'Completed';
  if (randomStatus < 0.1) status = 'Failed';
  else if (randomStatus < 0.2) status = 'Pending';
  else if (randomStatus < 0.3) status = 'Processing Activation'; // Simulate activation delay


  return {
    transactionId: `TXN${Date.now()}`, // Generate a mock transaction ID
    identifier: identifier,
    billerId: billerId,
    // billerName: 'Fetched Biller Name', // Could fetch this based on billerId
    amount: amount,
    // planDescription: 'Fetched Plan Description', // Could fetch this based on planId
    date: new Date(),
    status: status,
  };
}


/**
 * Asynchronously retrieves the recharge history for a specific identifier (e.g., mobile number).
 *
 * @param identifier The number/ID to fetch history for.
 * @returns A promise that resolves to an array of RechargeHistoryEntry objects.
 */
export async function getRechargeHistory(identifier: string): Promise<RechargeHistoryEntry[]> {
    console.log(`Fetching history for: ${identifier}`);
    // TODO: Implement API call to fetch history.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

     // Return mock history based on identifier (simple mock logic)
    if (identifier === '9876543210') {
        return [
            { transactionId: 'hist1', identifier: '9876543210', amount: 299, planDescription: 'UL Calls, 1.5GB/D', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), status: 'Completed', billerId: 'airtel-prepaid' },
            { transactionId: 'hist2', identifier: '9876543210', amount: 100, planDescription: 'Talktime Top-up', date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), status: 'Completed', billerId: 'airtel-prepaid' },
             { transactionId: 'hist3', identifier: '9876543210', amount: 599, planDescription: 'UL Calls, 2GB/D + Stream', date: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000), status: 'Completed', billerId: 'airtel-prepaid' },
        ].sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort newest first
    } else if (identifier === '9988776655') {
         return [
            { transactionId: 'hist4', identifier: '9988776655', amount: 239, planDescription: 'UL Calls, 1GB/D', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), status: 'Completed', billerId: 'jio-prepaid' },
        ];
    }

    return []; // No history for other numbers in mock
}

/**
 * Simulates checking the activation status of a recent recharge.
 * @param transactionId The ID of the transaction to check.
 * @returns A promise that resolves to the current status.
 */
export async function checkActivationStatus(transactionId: string): Promise<RechargeTransaction['status']> {
    console.log(`Checking activation status for: ${transactionId}`);
    // TODO: Implement API call
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    // Simulate status update
    const random = Math.random();
    if (random < 0.7) return 'Completed';
    if (random < 0.9) return 'Processing Activation';
    return 'Failed'; // Simulate rare failure during activation
}

// Placeholder for scheduling recharge
export async function scheduleRecharge(identifier: string, amount: number, frequency: 'monthly' | 'weekly', billerId?: string, planId?: string): Promise<{success: boolean; scheduleId: string}> {
     console.log('Scheduling recharge:', { identifier, amount, frequency, billerId, planId });
     await new Promise(resolve => setTimeout(resolve, 500));
     return { success: true, scheduleId: `SCH${Date.now()}`};
}

// Placeholder for managing top-up vouchers (if applicable as separate items)
export async function getTopupVouchers(billerId: string): Promise<RechargePlan[]> {
     console.log(`Fetching top-up vouchers for: ${billerId}`);
     // This might return specific voucher plans or integrate into getRechargePlans
      await new Promise(resolve => setTimeout(resolve, 500));
      // Example: Filter from general plans or fetch separately
      const mockVouchers = await getRechargePlans(billerId); // Reuse for now
      return mockVouchers.filter(p => p.category === 'Top-up');
}
