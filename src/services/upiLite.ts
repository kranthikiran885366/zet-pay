/**
 * @fileOverview Service functions for managing UPI Lite functionality.
 */

export interface UpiLiteDetails {
    isEnabled: boolean;
    balance: number;
    maxBalance: number; // Typically 2000 INR
    maxTxnAmount: number; // Typically 500 INR
    linkedAccountUpiId?: string; // UPI ID of the account linked to Lite
}

/**
 * Asynchronously retrieves the user's UPI Lite status and balance.
 *
 * @returns A promise that resolves to the UpiLiteDetails object.
 */
export async function getUpiLiteBalance(): Promise<UpiLiteDetails> {
    console.log("Fetching UPI Lite details...");
    // TODO: Implement actual API call to backend/SDK to get Lite status/balance
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay

    // Mock Data - Simulate if Lite is enabled or not
    const isEnabledMock = Math.random() > 0.3; // 70% chance it's enabled for demo
    const balanceMock = isEnabledMock ? Math.random() * 1500 : 0; // Random balance if enabled

    return {
        isEnabled: isEnabledMock,
        balance: parseFloat(balanceMock.toFixed(2)),
        maxBalance: 2000,
        maxTxnAmount: 500,
        linkedAccountUpiId: isEnabledMock ? 'user123@oksbi' : undefined, // Example linked account
    };
}

/**
 * Asynchronously adds funds to the UPI Lite balance from a selected bank account.
 *
 * @param amount The amount to add.
 * @param fundingSourceUpiId The UPI ID of the bank account to debit.
 * @returns A promise that resolves to true if the top-up was successful, false otherwise.
 * @throws Error if the top-up fails.
 */
export async function topUpUpiLite(amount: number, fundingSourceUpiId: string): Promise<boolean> {
    console.log(`Topping up UPI Lite with ₹${amount} from ${fundingSourceUpiId}...`);
    // TODO: Implement actual API call to backend/SDK to initiate top-up
    // This might involve a PIN if bank rules require it, though often not for Lite top-up.
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Simulate potential failures
    if (amount > 2000) { // Example failure condition
        throw new Error("Top-up amount exceeds limit.");
    }

    // Simulate success
    return true;
}

/**
 * Asynchronously disables UPI Lite for the user.
 * The current UPI Lite balance should be automatically transferred back to the linked bank account.
 *
 * @returns A promise that resolves to true if disabling was successful, false otherwise.
 * @throws Error if disabling fails.
 */
export async function disableUpiLite(): Promise<boolean> {
    console.log("Disabling UPI Lite...");
    // TODO: Implement actual API call to backend/SDK to disable Lite and initiate balance transfer
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    // Simulate success
    return true;
}

/**
 * Asynchronously enables UPI Lite for the user, linking it to a specific bank account.
 *
 * @param linkedAccountUpiId The UPI ID of the bank account to link with UPI Lite.
 * @returns A promise that resolves to true if enabling was successful, false otherwise.
 * @throws Error if enabling fails (e.g., bank doesn't support Lite, PIN entry failed).
 */
export async function enableUpiLite(linkedAccountUpiId: string): Promise<boolean> {
    console.log(`Enabling UPI Lite with account: ${linkedAccountUpiId}...`);
    // TODO: Implement actual API call to backend/SDK to enable Lite
    // This might involve PIN authentication depending on the flow.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay

    // Simulate potential failures
     if (linkedAccountUpiId.includes('icici')) { // Example: Simulate bank not supporting Lite
         throw new Error("Selected bank does not support UPI Lite yet.");
     }

    // Simulate success
    return true;
}

/**
 * Processes a payment specifically using the UPI Lite balance.
 * This function might not be strictly necessary if the main `processUpiPayment`
 * intelligently chooses Lite for small amounts when enabled, but is included for clarity.
 *
 * @param recipientUpiId The UPI ID of the recipient.
 * @param amount The amount to transfer (should be <= maxTxnAmount).
 * @returns A promise that resolves with transaction details (Simplified for Lite).
 * @throws Error if payment fails (e.g., insufficient Lite balance).
 */
export async function processUpiLitePayment(
    recipientUpiId: string,
    amount: number
): Promise<{ success: boolean; message: string; transactionId?: string }> {
    console.log(`Processing UPI Lite payment of ₹${amount} to ${recipientUpiId}...`);
    // TODO: Implement actual API call to SDK/backend for Lite payment
    await new Promise(resolve => setTimeout(resolve, 500)); // Lite payments are faster

    // Fetch current details to check balance (simulation)
    const currentDetails = await getUpiLiteBalance();
    if (!currentDetails.isEnabled || currentDetails.balance < amount) {
        throw new Error("Insufficient UPI Lite balance.");
    }
    if (amount > currentDetails.maxTxnAmount) {
         throw new Error(`Amount exceeds UPI Lite transaction limit of ₹${currentDetails.maxTxnAmount}.`);
    }


    // Simulate success
    return {
        success: true,
        message: "Payment Successful via UPI Lite",
        transactionId: `LITETXN${Date.now()}`,
    };
}
