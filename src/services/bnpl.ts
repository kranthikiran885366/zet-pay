/**
 * @fileOverview Service functions for managing Pay Later (BNPL) functionality.
 */

export interface BnplDetails {
    isActive: boolean;
    creditLimit: number; // Total approved credit limit
    providerName?: string; // e.g., "ICICI PayLater", "Simpl"
    partnerBank?: string; // Underlying bank/NBFC
}

export interface BnplStatement {
    statementId: string;
    statementPeriodStart: string; // ISO Date string
    statementPeriodEnd: string; // ISO Date string
    dueDate: string; // ISO Date string
    dueAmount: number; // Total outstanding amount
    minAmountDue: number; // Minimum amount required
    transactions: BnplTransaction[]; // List of transactions in this statement
}

export interface BnplTransaction {
    transactionId: string;
    date: string; // ISO Date string
    merchantName: string;
    amount: number;
}

/**
 * Asynchronously retrieves the user's Pay Later status and credit limit.
 *
 * @returns A promise that resolves to the BnplDetails object.
 */
export async function getBnplStatus(): Promise<BnplDetails> {
    console.log("Fetching Pay Later (BNPL) status...");
    // TODO: Implement actual API call to backend/partner to get BNPL status
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay

    // Mock Data - Simulate if BNPL is active or not
    const isActiveMock = Math.random() > 0.4; // 60% chance it's active for demo
    const creditLimitMock = isActiveMock ? 10000 : 0; // Example limit if active

    return {
        isActive: isActiveMock,
        creditLimit: creditLimitMock,
        providerName: isActiveMock ? "PayFriend PayLater (Powered by MockBank)" : undefined,
        partnerBank: isActiveMock ? "MockBank NBFC" : undefined,
    };
}

/**
 * Asynchronously initiates the activation process for Pay Later.
 * This might involve redirects or further steps depending on the provider.
 *
 * @returns A promise that resolves to true if activation initiated successfully, false otherwise.
 * @throws Error if activation fails (e.g., eligibility criteria not met).
 */
export async function activateBnpl(): Promise<boolean> {
    console.log("Initiating Pay Later (BNPL) activation...");
    // TODO: Implement actual API call to backend/partner to start activation flow
    // This might check eligibility and start the process.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate activation process delay

    // Simulate eligibility check failure
    if (Math.random() < 0.2) { // 20% chance of failure for demo
        throw new Error("You are not eligible for Pay Later at this time.");
    }

    // Simulate success
    return true;
}

/**
 * Asynchronously retrieves the latest Pay Later statement details.
 *
 * @returns A promise that resolves to the BnplStatement object or null if no statement is available.
 */
export async function getBnplStatement(): Promise<BnplStatement | null> {
    console.log("Fetching latest Pay Later (BNPL) statement...");
    // TODO: Implement actual API call to backend/partner to get the statement
    await new Promise(resolve => setTimeout(resolve, 900)); // Simulate API delay

    // Check current status first (optional, but good practice)
    const status = await getBnplStatus();
    if (!status.isActive) {
        return null; // No statement if not active
    }

    // Mock Statement Data
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() -1, 1); // Start of previous month
    const endDate = new Date(today.getFullYear(), today.getMonth(), 0); // End of previous month
    const dueDate = new Date(today.getFullYear(), today.getMonth(), 15); // Due on 15th of current month

    const dueAmount = Math.random() * 1500 + 100; // Random due amount > 0
    const minAmountDue = Math.max(50, dueAmount * 0.1); // 10% or 50, whichever is higher

    return {
        statementId: `STMT${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        statementPeriodStart: startDate.toISOString(),
        statementPeriodEnd: endDate.toISOString(),
        dueDate: dueDate.toISOString(),
        dueAmount: parseFloat(dueAmount.toFixed(2)),
        minAmountDue: parseFloat(minAmountDue.toFixed(2)),
        transactions: [ // Example transactions
            { transactionId: 'bnpl_tx1', date: new Date(endDate.getTime() - 5 * 86400000).toISOString(), merchantName: 'Zomato', amount: 350.50 },
            { transactionId: 'bnpl_tx2', date: new Date(endDate.getTime() - 10 * 86400000).toISOString(), merchantName: 'Amazon', amount: 800.00 },
            { transactionId: 'bnpl_tx3', date: new Date(endDate.getTime() - 15 * 86400000).toISOString(), merchantName: 'Mobile Recharge', amount: 299.00 },
        ]
    };
}

/**
 * Asynchronously processes a repayment for the Pay Later bill.
 *
 * @param amount The amount being paid.
 * @param paymentMethod Details of the payment method used (e.g., UPI ID, Bank Account).
 * @returns A promise that resolves to true if repayment is successful, false otherwise.
 * @throws Error if repayment fails.
 */
export async function repayBnplBill(amount: number, paymentMethod: string): Promise<boolean> {
    console.log(`Processing Pay Later repayment of ₹${amount} using ${paymentMethod}...`);
    // TODO: Implement actual API call to backend/partner to process repayment
    await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate payment processing

    // Simulate potential failure
    if (amount < 10) { // Example failure
        throw new Error("Payment amount is too low.");
    }

    // Simulate success
    return true;
}
