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
   /**
    * Optional URL for the biller's logo.
    */
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
    data: string;
    talktime?: number | -1; // -1 for Unlimited
    sms?: number | -1; // -1 for Unlimited
    isOffer?: boolean;
    category?: string; // e.g., Popular, Data, Unlimited, Talktime, SMS, Roaming, Annual, Offers, Recommended
}


/**
 * Represents a recharge or bill payment transaction.
 */
export interface RechargeTransaction {
  transactionId: string;
  identifier: string;
  billerId?: string;
  billerName?: string;
  amount: number;
  planDescription?: string;
  date: Date;
  status: 'Pending' | 'Completed' | 'Failed' | 'Processing Activation';
}

export interface RechargeHistoryEntry extends RechargeTransaction {}


/**
 * Asynchronously retrieves a list of available billers (operators).
 *
 * @param billerType The type of biller to retrieve (e.g., Mobile, DTH, Electricity, Fastag).
 * @returns A promise that resolves to an array of Biller objects.
 */
export async function getBillers(billerType: string): Promise<Biller[]> {
  console.log(`Fetching billers for type: ${billerType}`);
  await new Promise(resolve => setTimeout(resolve, 300));

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
      { billerId: 'airtel-dth', billerName: 'Airtel Digital TV', billerType: 'DTH', logoUrl: '/logos/airtel.png' }, // Reuse airtel logo
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
    ],
  };

  return mockData[billerType] || [];
}

// Moved mock plans here for better organization
export const mockRechargePlans: RechargePlan[] = [
    // Popular
    { planId: 'p1', description: 'UL Calls, 1.5GB/D, 100SMS/D', price: 299, validity: '28 Days', data: '1.5GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: false },
    { planId: 'p1a', description: 'UL Calls, 1GB/D, 100SMS/D', price: 239, validity: '24 Days', data: '1GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: false },
    { planId: 'p4', description: 'UL Calls, 2GB/D + Streaming App', price: 599, validity: '56 Days', data: '2GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: true }, // Moved to popular/offer
    // Data
    { planId: 'p2', description: '50GB Bulk Data Pack', price: 301, validity: 'Existing Plan', data: '50GB', category: 'Data', isOffer: false },
    { planId: 'p2a', description: '12GB Data Add-on', price: 121, validity: 'Existing Plan', data: '12GB', category: 'Data', isOffer: false },
    // Unlimited (Often similar to Popular)
    { planId: 'ul1', description: 'Truly Unlimited Calls, 2GB/Day', price: 719, validity: '84 Days', data: '2GB/day', sms: 100, talktime: -1, category: 'Unlimited', isOffer: false },
    // Talktime (Top-up)
    { planId: 'p3', description: '₹81.75 Talktime', price: 100, validity: 'Unlimited', data: 'N/A', talktime: 81.75, category: 'Talktime', isOffer: false },
    { planId: 'p7', description: '₹190 Talktime + 1GB Offer', price: 200, validity: 'Unlimited', data: '1GB', talktime: 190, category: 'Talktime', isOffer: true },
    // Roaming
    { planId: 'p5', description: 'Intl Roaming USA 30D', price: 2999, validity: '30 Days', data: '5GB', talktime: 100, category: 'Roaming', isOffer: false },
    { planId: 'p5a', description: 'Intl Roaming UK 10D', price: 1101, validity: '10 Days', data: '1GB', talktime: 50, category: 'Roaming', isOffer: false },
    // Annual
    { planId: 'p6', description: 'UL Calls, 24GB/Yr', price: 1799, validity: '365 Days', data: '24GB Total', sms: 3600, talktime: -1, category: 'Annual', isOffer: false },
    // SMS
    { planId: 'sms1', description: '1000 SMS Pack', price: 49, validity: '28 Days', data: 'N/A', sms: 1000, category: 'SMS', isOffer: false },
];


/**
 * Asynchronously retrieves available recharge plans for a specific biller.
 * @param billerId The ID of the biller (operator).
 * @returns A promise that resolves to an array of RechargePlan objects.
 */
export async function getRechargePlans(billerId: string): Promise<RechargePlan[]> {
   console.log(`Fetching plans for biller ID: ${billerId}`);
   // TODO: Implement API call to fetch plans for the given operator ID.
   await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
   // Return mock plans based on billerId or a generic set
   return mockRechargePlans;
}


/**
 * Asynchronously processes a recharge or bill payment.
 *
 * @param type The type of recharge/payment (e.g., 'mobile', 'dth').
 * @param identifier The number/ID to recharge.
 * @param amount The amount to pay.
 * @param billerId The ID of the biller (operator). Optional.
 * @param planId The ID of the selected plan. Optional.
 * @param couponCode Optional coupon code.
 * @returns A promise that resolves to a RechargeTransaction object representing the transaction details.
 */
export async function processRecharge(
  type: string,
  identifier: string,
  amount: number,
  billerId?: string,
  planId?: string,
  couponCode?: string,
): Promise<RechargeTransaction> {
  console.log('Processing recharge:', { type, identifier, amount, billerId, planId, couponCode });
  // TODO: Implement this by calling the appropriate backend API.
  await new Promise(resolve => setTimeout(resolve, 1500));

  const randomStatus = Math.random();
  let status: RechargeTransaction['status'] = 'Completed';
  if (randomStatus < 0.1) status = 'Failed';
  else if (randomStatus < 0.2) status = 'Pending';
  else if (randomStatus < 0.3) status = 'Processing Activation';

  const plan = mockRechargePlans.find(p => p.planId === planId);

  return {
    transactionId: `TXN${Date.now()}`,
    identifier: identifier,
    billerId: billerId,
    amount: amount,
    planDescription: plan?.description,
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
    const random = Math.random();
    if (random < 0.7) return 'Completed';
    if (random < 0.9) return 'Processing Activation';
    return 'Failed';
}

/**
 * Simulates scheduling a future recharge.
 * @param identifier The number/ID to recharge.
 * @param amount The amount to recharge.
 * @param frequency How often to recharge ('monthly', 'weekly', etc.).
 * @param startDate The date to start the schedule.
 * @param billerId Optional biller ID.
 * @param planId Optional plan ID.
 * @returns A promise resolving to an object indicating success and a schedule ID.
 */
export async function scheduleRecharge(
    identifier: string,
    amount: number,
    frequency: 'monthly' | 'weekly', // Add more frequencies as needed
    startDate: Date,
    billerId?: string,
    planId?: string
): Promise<{success: boolean; scheduleId: string}> {
     console.log('Scheduling recharge:', { identifier, amount, frequency, startDate, billerId, planId });
     // TODO: Implement API call to backend to create schedule
     await new Promise(resolve => setTimeout(resolve, 500));
     return { success: true, scheduleId: `SCH${Date.now()}`};
}


/**
 * Retrieves Top-up voucher plans (potentially filtering from general plans).
 * @param billerId The operator ID.
 * @returns A promise that resolves to an array of Top-up RechargePlan objects.
 */
export async function getTopupVouchers(billerId: string): Promise<RechargePlan[]> {
     console.log(`Fetching top-up vouchers for: ${billerId}`);
     await new Promise(resolve => setTimeout(resolve, 500));
     const allPlans = await getRechargePlans(billerId); // Reuse general plan fetching
     return allPlans.filter(p => p.category === 'Talktime'); // Filter for Talktime/Top-up category
}
```
  </change>
  <change>