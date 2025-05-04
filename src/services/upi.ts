
/**
 * Represents a bank account.
 */
import { Transaction, addTransaction } from './transactions'; // Import Transaction interface and addTransaction
import { getUserProfileById, UserProfile } from './user'; // To check KYC and feature status
import { getWalletBalance, payViaWallet, WalletTransactionResult } from './wallet'; // Import wallet functions
import { scheduleRecovery } from './recovery'; // Import recovery scheduling function
import { format, addBusinessDays } from 'date-fns'; // Added addBusinessDays
import { runTransaction } from 'firebase/firestore'; // Import runTransaction

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
   /**
    * Optional: Expected length of the UPI PIN for this account (4 or 6).
    */
   pinLength?: 4 | 6;
}

/**
 * Represents a UPI transaction result.
 * Adding a flag to indicate if fallback was used, and ticket info for failures.
 */
export interface UpiTransactionResult {
  /**
   * The transaction ID.
   */
  transactionId?: string; // Optional if failed before getting ID
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
  status: 'Pending' | 'Completed' | 'Failed' | 'FallbackSuccess'; // Added FallbackSuccess
   /**
    * Optional message associated with the transaction status.
    */
   message?: string;
   /**
    * Flag indicating if the payment succeeded via wallet fallback.
    */
   usedWalletFallback?: boolean;
   /**
    * ID of the wallet transaction if fallback was used.
    */
   walletTransactionId?: string;
   /**
    * Unique ID for tracking failed-but-debited transactions.
    */
   ticketId?: string;
   /**
    * Estimated refund date/timeframe string.
    */
   refundEta?: string;
}

/**
 * Asynchronously links a bank account for UPI transactions.
 * In a real app, this involves complex flows like fetching accounts from NPCI, SMS verification etc.
 *
 * @param bankAccount The bank account details to link.
 * @returns A promise that resolves to true if the account was successfully linked, false otherwise.
 */
export async function linkBankAccount(bankAccount: Omit<BankAccount, 'upiId'|'isDefault'|'pinLength'>): Promise<boolean> {
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
   // Return mock data including pinLength
   return [
      { bankName: "State Bank of India", accountNumber: "******1234", upiId: "user123@oksbi", isDefault: true, pinLength: 6 },
      { bankName: "HDFC Bank", accountNumber: "******5678", upiId: "user.hdfc@okhdfcbank", pinLength: 4 },
      { bankName: "ICICI Bank", accountNumber: "******9012", upiId: "user@okicici", pinLength: 6 },
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
  if (upiId.includes('sbi') && pin?.length === 6) { // Check PIN length for SBI
    return Math.random() * 10000; // Simulate random balance
  } else if (upiId.includes('hdfc') && pin?.length === 4) { // Check PIN length for HDFC
     return Math.random() * 50000;
  } else if (!pin) {
     throw new Error("UPI PIN required for balance check.");
  } else {
     throw new Error("Balance check failed. Invalid PIN or temporary issue.");
  }
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
    // Simulate a specific ID hitting the limit for testing fallback
    if (upiId === 'limit@payfriend') return "Limit Exceeded User";
     // Simulate a failed payment where money might be debited
    if (upiId === 'debitfail@payfriend') return "Debit Fail User";
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


/**
 * Asynchronously processes a UPI payment. Attempts fallback via wallet if UPI limit is exceeded.
 * Requires secure PIN entry in real implementation.
 *
 * @param recipientUpiId The UPI ID of the recipient.
 * @param amount The amount to transfer.
 * @param pin The UPI PIN for authentication.
 * @param note An optional transaction note/description.
 * @param userId The ID of the user making the payment.
 * @param sourceAccountUpiId The specific UPI ID to use for payment.
 * @returns A promise that resolves to a UpiTransactionResult object representing the transaction details.
 * @throws Error if payment fails and fallback is not possible or also fails.
 */
export async function processUpiPayment(
  recipientUpiId: string,
  amount: number,
  pin: string,
  note?: string,
  userId?: string, // Make userId optional for now, but needed for fallback checks
  sourceAccountUpiId?: string // Added source account UPI ID
): Promise<UpiTransactionResult> {
  console.log(`Processing UPI payment to ${recipientUpiId} from ${sourceAccountUpiId}, Amount: ${amount}, Note: ${note || 'N/A'} (PIN: ${pin})`);
  // TODO: Implement actual secure UPI payment flow via SDK/API.
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate UPI API delay

  let upiFailedDueToLimit = false;
  let upiFailedDueToBankDown = false; // New flag for bank server issues
  let upiFailureMessage = 'Payment failed.';
  let mightBeDebited = false; // Flag for simulation

  // Simulate various UPI outcomes for demo
  try {
    // Simulate bank server down based on source UPI ID
    if (sourceAccountUpiId === 'user@okicici') { // Simulate ICICI down
        upiFailedDueToBankDown = true;
        upiFailureMessage = 'Bank server is currently down. Please try later.';
        throw new Error(upiFailureMessage);
    }

    if (pin !== '1234' && pin !== '123456') { // Example PIN check
      throw new Error("Incorrect UPI PIN entered.");
    }
    if (recipientUpiId === 'limit@payfriend') { // Simulate limit exceeded
      upiFailedDueToLimit = true;
      upiFailureMessage = 'UPI daily limit exceeded.';
      throw new Error(upiFailureMessage);
    }
    if (recipientUpiId === 'debitfail@payfriend') { // Simulate failure where debit *might* happen
        mightBeDebited = true;
        upiFailureMessage = 'Payment failed due to network error at bank. Money may be debited.';
        throw new Error(upiFailureMessage);
    }
    if (amount > 10000) { // Simulate insufficient balance (different from limit)
        throw new Error('Insufficient bank balance.');
    }
    if (recipientUpiId.includes('invalid')) { // Simulate invalid UPI ID scenario
        throw new Error('Invalid recipient UPI ID.');
    }

    // Simulate successful UPI transaction if no error thrown above
    return {
      transactionId: `TXN_UPI_${Date.now()}`,
      amount: amount,
      recipientUpiId: recipientUpiId,
      status: 'Completed',
      message: 'Transaction Successful',
      usedWalletFallback: false,
    };

  } catch (upiError: any) {
    console.warn("UPI Payment failed:", upiError.message);
    upiFailureMessage = upiError.message || upiFailureMessage; // Update failure message

     // --- Smart Wallet Bridge Logic ---
    if (upiFailedDueToLimit && userId) {
        console.log("UPI limit exceeded, attempting Wallet Fallback...");
        try {
            // 1. Check User Eligibility & Settings
            const userProfile = await getUserProfileById(userId); // Fetch user profile
            if (userProfile?.kycStatus !== 'Verified' || !userProfile.isSmartWalletBridgeEnabled) {
                console.log("Wallet Fallback disabled for user.");
                throw new Error(upiFailureMessage); // Re-throw original UPI error
            }
            if (amount > (userProfile.smartWalletBridgeLimit || 0)) {
                console.log(`Amount ${amount} exceeds wallet fallback limit ${userProfile.smartWalletBridgeLimit}`);
                throw new Error(`${upiFailureMessage} Wallet fallback limit exceeded.`); // More specific error
            }

            // 2. Check Wallet Balance
            const walletBalance = await getWalletBalance(userId);
            if (walletBalance < amount) {
                console.log(`Insufficient wallet balance (${walletBalance}) for fallback amount (${amount}).`);
                // TODO: Check for auto-debit setup if needed
                throw new Error(`${upiFailureMessage} Insufficient wallet balance for fallback.`);
            }

            // 3. Attempt Payment via Wallet
            const walletPaymentResult = await payViaWallet(userId, recipientUpiId, amount, `Wallet Fallback: ${note || ''}`);

            if (walletPaymentResult.success) {
              console.log("Payment successful via Wallet Fallback!");

              // 4. Schedule Recovery from Bank Account
              const recoveryScheduled = await scheduleRecovery(userId, amount, recipientUpiId);
              if (!recoveryScheduled) {
                console.error("CRITICAL: Failed to schedule wallet recovery!");
                // Handle this critical error - maybe notify admin, attempt retry later?
              } else {
                console.log("Wallet recovery scheduled successfully.");
              }

              // Return a specific status indicating fallback success
              return {
                // transactionId: upiPaymentResult.transactionId, // Can still use original ID or wallet ID // Error: upiPaymentResult is not defined here
                walletTransactionId: walletPaymentResult.transactionId,
                amount: amount,
                recipientUpiId: recipientUpiId,
                status: 'FallbackSuccess', // Use a distinct status
                message: `Paid via Wallet (UPI Limit Exceeded). Recovery scheduled.`,
                usedWalletFallback: true,
              };
            } else {
              // Wallet payment also failed
              console.error("Wallet Fallback payment failed:", walletPaymentResult.message);
              throw new Error(`${upiFailureMessage} Wallet fallback also failed: ${walletPaymentResult.message}`);
            }
        } catch (fallbackError: any) {
            console.error("Wallet Fallback process failed:", fallbackError.message);
            // Ensure the final thrown error includes the original UPI failure reason if possible
            throw new Error(fallbackError.message || upiFailureMessage);
        }
    } else { // --- End Smart Wallet Bridge Logic ---
       // Handle non-limit related UPI failures
       // If it *might* be debited, generate ticket ID and ETA
       if (mightBeDebited) {
           const ticketId = `ZET_TKT_${Date.now()}`;
           const refundDate = addBusinessDays(new Date(), 3); // Example: 3 business days
           const refundEtaString = `Expected refund by ${format(refundDate, 'PPP')}`;
            console.log(`Generating ticket ${ticketId} for potentially debited failed transaction.`);
           return {
               transactionId: `TXN_UPI_FAILED_${Date.now()}`, // Still generate a failure ID
               amount: amount,
               recipientUpiId: recipientUpiId,
               status: 'Failed',
               message: upiFailureMessage,
               usedWalletFallback: false,
               ticketId: ticketId,
               refundEta: refundEtaString,
           };
       } else {
            // Normal failure without potential debit (or bank server down)
             return {
                 transactionId: `TXN_UPI_FAILED_${Date.now()}`,
                 amount: amount,
                 recipientUpiId: recipientUpiId,
                 status: 'Failed',
                 message: upiFailureMessage,
                 usedWalletFallback: false,
             };
       }
    }

  }
}


/**
 * Simulates fetching the status of a bank's UPI server.
 * @param bankIdentifier A unique identifier for the bank (e.g., the handle like 'oksbi', 'okhdfcbank').
 * @returns A promise resolving to the status: 'Active', 'Slow', or 'Down'.
 */
export async function getBankStatus(bankIdentifier: string): Promise<'Active' | 'Slow' | 'Down'> {
    console.log(`Checking server status for bank: ${bankIdentifier}`);
    // TODO: Implement actual API call to a status monitoring service (e.g., NPCI feed, third-party provider)
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate short delay

    // Mock status based on identifier for demo
    if (bankIdentifier === 'okicici') return 'Down'; // Simulate ICICI down
    if (bankIdentifier === 'okhdfcbank') return 'Slow'; // Simulate HDFC slow
    return 'Active'; // Default to active
}
