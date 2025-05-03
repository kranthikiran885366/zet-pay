/**
 * Represents a bank account.
 */
export interface BankAccount {
  /**
   * The name of the bank.
   */
  bankName: string;
  /**
   * The account number (masked usually).
   */
  accountNumber: string;
  /**
   * The UPI ID associated with the bank account.
   */
  upiId: string;
  /**
   * Flag indicating if this is the primary/default account.
   */
  isDefault?: boolean;
}

/**
 * Represents a UPI transaction result.
 */
export interface UpiTransaction {
  /**
   * The transaction ID.
   */
  transactionId: string;
  /**
   * The amount transferred.
   */
  amount: number;
  /**
   * The recipient's UPI ID.
   */
  recipientUpiId: string;
  /**
   * The status of the transaction (e.g., Pending, Completed, Failed).
   */
  status: 'Pending' | 'Completed' | 'Failed';
   /**
    * Optional message associated with the transaction status.
    */
   message?: string;
}

/**
 * Asynchronously links a bank account for UPI transactions.
 * In a real app, this involves complex flows like fetching accounts from NPCI, SMS verification etc.
 *
 * @param bankAccount The bank account details to link.
 * @returns A promise that resolves to true if the account was successfully linked, false otherwise.
 */
export async function linkBankAccount(bankAccount: Omit<BankAccount, 'upiId'|'isDefault'>): Promise<boolean> {
  console.log("Simulating linking bank account:", bankAccount);
  // TODO: Implement actual bank linking flow.
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
  // For simulation, assume success
  return true;
}

/**
 * Asynchronously retrieves linked bank accounts.
 * @returns A promise that resolves to an array of BankAccount objects.
 */
export async function getLinkedAccounts(): Promise<BankAccount[]> {
   console.log("Fetching linked accounts...");
   // TODO: Implement API call
   await new Promise(resolve => setTimeout(resolve, 800));
   // Return mock data defined in the page for now
   return [
      { bankName: "State Bank of India", accountNumber: "******1234", upiId: "user123@oksbi", isDefault: true },
      { bankName: "HDFC Bank", accountNumber: "******5678", upiId: "user.hdfc@okhdfcbank" },
      { bankName: "ICICI Bank", accountNumber: "******9012", upiId: "user@okicici" },
    ];
}

/**
 * Asynchronously removes a UPI ID / linked account.
 * @param upiId The UPI ID to remove.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function removeUpiId(upiId: string): Promise<boolean> {
    console.log(`Simulating removal of UPI ID: ${upiId}`);
    // TODO: Implement API call
    await new Promise(resolve => setTimeout(resolve, 600));
    // Simulate success
    return true;
}

/**
 * Asynchronously sets a UPI ID as the default/primary account.
 * @param upiId The UPI ID to set as default.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function setDefaultAccount(upiId: string): Promise<boolean> {
    console.log(`Simulating setting ${upiId} as default`);
    // TODO: Implement API call
    await new Promise(resolve => setTimeout(resolve, 700));
    // Simulate success
    return true;
}


/**
 * Asynchronously checks the balance of a linked bank account using UPI.
 * Requires UPI PIN authentication in a real app.
 *
 * @param upiId The UPI ID of the bank account.
 * @param pin The UPI PIN (for simulation, not used securely here).
 * @returns A promise that resolves to the account balance.
 * @throws Error if balance check fails (e.g., invalid PIN, network issue).
 */
export async function checkBalance(upiId: string, pin?: string): Promise<number> {
  console.log(`Checking balance for ${upiId} (PIN simulation: ${pin ? 'Provided' : 'Not Provided'})`);
  // TODO: Implement actual secure balance check flow via UPI SDK/API.
  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate delay

  // Simulate success/failure based on UPI ID or PIN for demo
  if (upiId.includes('sbi') && pin === '1234') {
    return Math.random() * 10000; // Simulate random balance
  } else if (upiId.includes('hdfc') && pin === '5678') {
     return Math.random() * 50000;
  } else if (!pin) {
     throw new Error("UPI PIN required for balance check.");
  } else {
     throw new Error("Balance check failed. Invalid PIN or temporary issue.");
  }
}

/**
 * Asynchronously processes a UPI payment. Requires secure PIN entry in real implementation.
 *
 * @param recipientUpiId The UPI ID of the recipient.
 * @param amount The amount to transfer.
 * @param pin The UPI PIN for authentication.
 * @param note An optional transaction note/description.
 * @returns A promise that resolves to a UpiTransaction object representing the transaction details.
 * @throws Error if payment fails.
 */
export async function processUpiPayment(
  recipientUpiId: string,
  amount: number,
  pin: string,
  note?: string
): Promise<UpiTransaction> {
  console.log(`Processing UPI payment to ${recipientUpiId}, Amount: ${amount}, Note: ${note || 'N/A'} (PIN: ${pin})`);
  // TODO: Implement actual secure UPI payment flow via SDK/API.
   await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay

   // Simulate various outcomes for demo
   if (pin !== '1234' && pin !== '5678') { // Simulate incorrect PIN
      throw new Error("Incorrect UPI PIN entered.");
   }
   if (amount > 5000) { // Simulate insufficient balance
      return {
        transactionId: `TXN${Date.now()}`,
        amount: amount,
        recipientUpiId: recipientUpiId,
        status: 'Failed',
        message: 'Insufficient balance',
      };
   }
    if (recipientUpiId.includes('invalid')) { // Simulate invalid UPI ID scenario
       return {
           transactionId: `TXN${Date.now()}`,
           amount: amount,
           recipientUpiId: recipientUpiId,
           status: 'Failed',
           message: 'Invalid recipient UPI ID',
       };
   }


  // Simulate successful transaction
  return {
    transactionId: `TXN${Date.now()}`,
    amount: amount,
    recipientUpiId: recipientUpiId,
    status: 'Completed',
    message: 'Transaction Successful',
  };
}


/**
 * Asynchronously verifies a UPI ID with the bank/NPCI.
 * @param upiId The UPI ID to verify.
 * @returns A promise that resolves to the registered name of the UPI ID holder.
 * @throws Error if verification fails or UPI ID is invalid.
 */
export async function verifyUpiId(upiId: string): Promise<string> {
    console.log(`Verifying UPI ID: ${upiId}`);
    // TODO: Implement actual UPI ID verification API call.
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

    // Mock verification results
    if (upiId === 'alice@payfriend') return "Alice Smith";
    if (upiId === 'bob.j@okbank') return "Robert Johnson";
    if (upiId === 'charlie@paytm') return "Charles Brown";
    if (upiId === 'david.will@ybl') return "David Williams";
    if (upiId.includes('invalid') || !upiId.includes('@')) {
        throw new Error("Invalid UPI ID format or ID not found.");
    }
    // Default mock for any other valid-looking ID
    const namePart = upiId.split('@')[0].replace(/[._]/g, ' ');
     // Capitalize first letter of each part
    const verifiedName = namePart
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    return verifiedName || "Verified User"; // Fallback name
}
