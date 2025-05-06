/**
 * @fileOverview SIMULATED UPI Provider Service (PSP/Bank Integration)
 */

const { addDays, format } = require('date-fns');

// SIMULATED UPI PROVIDER SERVICE
// In reality, this would interact with a secure SDK/API from a licensed PSP

/**
 * Simulates the account discovery process during bank linking.
 * @param {string} userId User ID (often derived from mobile number used for binding).
 */
const simulateAccountDiscovery = async (userId) => {
    console.log(`[PSP Sim] Simulating account discovery for user associated with ${userId}...`);
    // In real scenario, PSP uses device binding info (like mobile number hash)
    // to query NPCI mapper and return accounts linked to that number.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    console.log('[PSP Sim] Account discovery simulation complete.');
    // Returns mock account list to the linking flow internally, not exposed directly here.
};


const verifyRecipient = async (upiId) => {
    console.log(`[PSP Sim] Verifying UPI ID: ${upiId}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call

    if (!upiId || typeof upiId !== 'string' || !upiId.includes('@')) {
        throw new Error("Invalid UPI ID format.");
    }
    if (upiId.toLowerCase().includes('invalid') || upiId.toLowerCase().includes('notfound')) {
        throw new Error("UPI ID not found or invalid.");
    }
     if (upiId.toLowerCase().includes('unknown') || upiId.toLowerCase().includes('notreg')) {
         throw new Error("UPI ID not registered.");
     }
    // Simulate name verification - replace spaces/dots with space, capitalize
    const namePart = upiId.split('@')[0].replace(/[._]/g, ' ').trim();
    const verifiedName = namePart
        .split(' ')
        .filter(part => part.length > 0) // Remove empty strings from multiple spaces
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    console.log(`[PSP Sim] Verified Name: ${verifiedName || 'Verified User'}`);
    return verifiedName || "Verified User"; // Fallback name
};

const initiatePayment = async ({ sourceUpiId, recipientUpiId, amount, pin, note }) => {
     console.log(`[PSP Sim] Initiating payment from ${sourceUpiId} to ${recipientUpiId} for ₹${amount} with PIN: ****`);
     await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate processing and bank communication delay

     // Simulate PIN validation (basic)
     if (!pin || (pin !== '1234' && pin !== '123456')) {
          console.warn(`[PSP Sim] Payment failed: Incorrect PIN simulation for ${sourceUpiId}`);
          const error = new Error('Incorrect UPI PIN.');
          error.code = 'UPI_INCORRECT_PIN'; // Add custom code
          throw error;
     }

      // Simulate specific failure scenarios based on recipient ID or amount for demo
      if (recipientUpiId.toLowerCase().includes('limit')) {
          console.warn(`[PSP Sim] Payment failed: Limit Exceeded simulation`);
          const error = new Error('Daily UPI transaction limit exceeded.');
          error.code = 'UPI_LIMIT_EXCEEDED';
          throw error;
      }
       if (recipientUpiId.toLowerCase().includes('funds')) {
            console.warn(`[PSP Sim] Payment failed: Insufficient funds simulation`);
            const error = new Error('Insufficient bank balance.');
            error.code = 'INSUFFICIENT_FUNDS';
            throw error;
       }
       if (recipientUpiId.toLowerCase().includes('debitfail')) {
          console.warn(`[PSP Sim] Payment failed: Debit failed simulation`);
          const error = new Error('Payment failed due to network error at bank. Please check account.');
          error.code = 'BANK_NETWORK_ERROR';
          error.mightBeDebited = true; // Add custom property
          throw error;
      }
      if (recipientUpiId.toLowerCase().includes('timeout')) {
           console.warn(`[PSP Sim] Payment failed: Timeout simulation`);
           const error = new Error('Transaction timed out. Please check status later.');
           error.code = 'TRANSACTION_TIMEOUT';
           throw error;
      }
       if (recipientUpiId.toLowerCase().includes('bankdecline')) {
           console.warn(`[PSP Sim] Payment failed: Generic bank decline simulation`);
           const error = new Error('Payment declined by recipient bank.');
           error.code = 'BANK_DECLINED';
           throw error;
       }


     // Simulate random failure (reduced chance now specific errors are handled)
     if (Math.random() < 0.02) { // 2% generic failure chance
         console.warn(`[PSP Sim] Payment failed: Unknown PSP/Bank error simulation`);
         const error = new Error('Payment failed due to an unexpected bank error.');
         error.code = 'UNKNOWN_BANK_ERROR';
          throw error;
     }

      // Simulate Pending Status
      if (Math.random() < 0.05) { // 5% chance of pending
          console.log('[PSP Sim] Payment Pending.');
           return { status: 'Pending', message: 'Transaction is Pending Confirmation', transactionId: `PSP_PENDING_${Date.now()}` };
      }

     // Simulate Success
     const transactionId = `PSP_UPI_${Date.now()}`;
     console.log(`[PSP Sim] Payment successful. Txn ID: ${transactionId}`);
     return { status: 'Completed', message: 'Transaction Successful', transactionId };
 };

 const checkAccountBalance = async (upiId, pin) => {
     console.log(`[PSP Sim] Checking balance for ${upiId} with PIN: ****`);
     await new Promise(resolve => setTimeout(resolve, 500));

     if (!pin || (pin !== '1234' && pin !== '123456')) {
          const error = new Error('Incorrect UPI PIN.');
          error.code = 'UPI_INCORRECT_PIN'; // Use specific code
          throw error;
     }
     // Simulate balance
     const balance = parseFloat((Math.random() * 50000 + 100).toFixed(2));
     console.log(`[PSP Sim] Balance for ${upiId}: ${balance}`);
     return balance;
 };

/**
 * Simulates a secure, non-interactive debit from a user's bank account.
 * Required for features like wallet recovery or potentially BNPL auto-debit.
 * In reality, this requires mandates (Autopay) or specific PSP integrations.
 * @param upiId The UPI ID to debit from.
 * @param amount The amount to debit.
 * @param reason A description for the debit.
 * @returns A promise resolving to an object indicating success and a transaction ID.
 */
 const initiateDebit = async (upiId, amount, reason) => {
     console.log(`[PSP Sim] Initiating SECURE DEBIT of ₹${amount} from ${upiId} for reason: ${reason}`);
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

     // Simulate success/failure (e.g., mandate inactive, insufficient funds)
     // Make failure more likely for simulation purposes if needed
     const success = Math.random() > 0.1; // 90% success simulation

     if (!success) {
         console.warn(`[PSP Sim] Secure debit failed for ${upiId}. Simulating insufficient funds or mandate issue.`);
          const error = new Error('Automated debit failed (e.g., insufficient funds or mandate issue).');
          error.code = 'AUTO_DEBIT_FAILED'; // Custom code
          throw error; // Throw error for failed debit
         // return { success: false, message: 'Automated debit failed (e.g., insufficient funds or mandate issue).' };
     }

     const transactionId = `DEBIT_${Date.now()}`;
     console.log(`[PSP Sim] Secure debit successful. Txn ID: ${transactionId}`);
     return { success: true, transactionId };
 };


module.exports = {
    simulateAccountDiscovery, // Added for clarity
    verifyRecipient,
    initiatePayment,
    checkAccountBalance,
    initiateDebit, // Export the new function
};

