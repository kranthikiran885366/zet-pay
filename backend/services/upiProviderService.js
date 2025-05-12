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
        const error = new Error("Invalid UPI ID format.");
        error.code = 'UPI_INVALID_ID_FORMAT';
        throw error;
    }
    if (upiId.toLowerCase().includes('invalid') || upiId.toLowerCase().includes('notfound')) {
        const error = new Error("UPI ID not found or invalid.");
        error.code = 'UPI_ID_NOT_FOUND';
        throw error;
    }
     if (upiId.toLowerCase().includes('unknown') || upiId.toLowerCase().includes('notreg')) {
         const error = new Error("UPI ID not registered.");
         error.code = 'UPI_ID_NOT_REGISTERED';
         throw error;
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

     if (!pin || (pin !== '1234' && pin !== '123456')) { // Basic PIN check for demo
          console.warn(`[PSP Sim] Payment failed: Incorrect PIN simulation for ${sourceUpiId}`);
          const error = new Error('Incorrect UPI PIN.');
          error.code = 'UPI_INCORRECT_PIN';
          error.mightBeDebited = false;
          throw error;
     }

      if (recipientUpiId.toLowerCase().includes('limitexceeded')) {
          console.warn(`[PSP Sim] Payment failed: UPI Limit Exceeded simulation for ${recipientUpiId}`);
          const error = new Error('Daily UPI transaction limit exceeded.');
          error.code = 'UPI_LIMIT_EXCEEDED';
          error.mightBeDebited = false;
          throw error;
      }
       if (recipientUpiId.toLowerCase().includes('bankfunds')) { // Specific for bank insufficient funds
            console.warn(`[PSP Sim] Payment failed: Insufficient bank funds simulation for ${recipientUpiId}`);
            const error = new Error('Insufficient funds in bank account.');
            error.code = 'BANK_INSUFFICIENT_FUNDS';
            error.mightBeDebited = false;
            throw error;
       }
       if (recipientUpiId.toLowerCase().includes('debitfail')) {
          console.warn(`[PSP Sim] Payment failed: Debit failed simulation (might be debited) for ${recipientUpiId}`);
          const error = new Error('Payment failed due to network error at bank. Please check account after some time.');
          error.code = 'BANK_NETWORK_ERROR';
          error.mightBeDebited = true;
          throw error;
      }
      if (recipientUpiId.toLowerCase().includes('timeout')) {
           console.warn(`[PSP Sim] Payment failed: Timeout simulation for ${recipientUpiId}`);
           const error = new Error('Transaction timed out. Please check status later.');
           error.code = 'TRANSACTION_TIMEOUT';
           error.mightBeDebited = true; // Timeout can sometimes result in debit
           throw error;
      }
       if (recipientUpiId.toLowerCase().includes('bankdecline')) {
           console.warn(`[PSP Sim] Payment failed: Generic bank decline simulation for ${recipientUpiId}`);
           const error = new Error('Payment declined by recipient bank. Please try later.');
           error.code = 'BANK_DECLINED';
           error.mightBeDebited = false;
           throw error;
       }
        if (recipientUpiId.toLowerCase().includes('bankserverdown')) {
            console.warn(`[PSP Sim] Payment failed: Bank Server Down simulation for ${recipientUpiId}`);
            const error = new Error('Recipient bank server is temporarily unavailable. Please try later.');
            error.code = 'BANK_SERVER_DOWN';
            error.mightBeDebited = false;
            throw error;
        }


     if (Math.random() < 0.03) { // Reduced generic failure
         console.warn(`[PSP Sim] Payment failed: Unknown PSP/Bank error simulation for ${recipientUpiId}`);
         const error = new Error('Payment failed due to an unexpected bank error. Please try again later.');
         error.code = 'UNKNOWN_BANK_ERROR';
         error.mightBeDebited = Math.random() < 0.2; // 20% chance might be debited on unknown errors
          throw error;
     }

      if (Math.random() < 0.05) { // 5% chance of pending
          console.log(`[PSP Sim] Payment Pending for ${recipientUpiId}.`);
           return { status: 'Pending', message: 'Transaction is Pending Confirmation', transactionId: `PSP_PENDING_${Date.now()}`, code: 'TRANSACTION_PENDING', mightBeDebited: true };
      }

     const transactionId = `PSP_UPI_${Date.now()}`;
     console.log(`[PSP Sim] Payment successful to ${recipientUpiId}. Txn ID: ${transactionId}`);
     return { status: 'Completed', message: 'Transaction Successful', transactionId, code: 'TRANSACTION_SUCCESS', mightBeDebited: false };
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
     const success = Math.random() > 0.1; // 90% success simulation

     if (!success) {
         console.warn(`[PSP Sim] Secure debit failed for ${upiId}. Simulating insufficient funds or mandate issue.`);
          const error = new Error('Automated debit failed (e.g., insufficient funds or mandate issue).');
          error.code = 'AUTO_DEBIT_FAILED'; // Custom code
          throw error;
     }

     const transactionId = `DEBIT_${Date.now()}`;
     console.log(`[PSP Sim] Secure debit successful. Txn ID: ${transactionId}`);
     return { success: true, transactionId };
 };


module.exports = {
    simulateAccountDiscovery,
    verifyRecipient,
    initiatePayment,
    checkAccountBalance,
    initiateDebit,
    // Mandate related functions from autopayController can be moved here if PSP directly handles them
    initiateMandateSetup: async (details) => {
        console.log('[PSP Sim] Initiating mandate setup:', details);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const randomStatus = Math.random() > 0.2 ? 'Pending Approval' : 'Active'; // Simulate approval process
        return { success: true, mandateUrn: `URN${Date.now()}`, referenceId: `PSPMAND${Date.now()}`, status: randomStatus, message: 'Mandate setup initiated with PSP.' };
    },
    pauseMandate: async (mandateUrn) => {
        console.log('[PSP Sim] Pausing mandate:', mandateUrn);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'Mandate paused successfully with PSP.' };
    },
    resumeMandate: async (mandateUrn) => {
        console.log('[PSP Sim] Resuming mandate:', mandateUrn);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'Mandate resumed successfully with PSP.' };
    },
    cancelMandate: async (mandateUrn) => {
        console.log('[PSP Sim] Cancelling mandate:', mandateUrn);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'Mandate cancelled successfully with PSP.' };
    },
     simulateEnableUpiLite: async (userId, linkedAccountUpiId) => {
        console.log(`[PSP Sim] Enabling UPI Lite for ${userId} with ${linkedAccountUpiId}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'UPI Lite enabled with PSP.' };
    },
    simulateDisableUpiLite: async (userId, linkedAccountUpiId, balanceToTransfer) => {
        console.log(`[PSP Sim] Disabling UPI Lite for ${userId}. Transferring ₹${balanceToTransfer} to ${linkedAccountUpiId}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'UPI Lite disabled and balance transferred with PSP.' };
    },
};

```