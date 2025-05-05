

const { addDays, format } = require('date-fns');

// SIMULATED UPI PROVIDER SERVICE
// In reality, this would interact with a secure SDK/API from a licensed PSP

const verifyRecipient = async (upiId) => {
    console.log(`[PSP Sim] Verifying UPI ID: ${upiId}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call

    if (upiId.includes('invalid') || !upiId.includes('@')) {
        throw new Error("Invalid UPI ID format or ID not found.");
    }
     if (upiId.includes('unknown')) {
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
     console.log(`[PSP Sim] Initiating payment from ${sourceUpiId} to ${recipientUpiId} for ₹${amount}`);
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

     // Simulate PIN validation (basic)
     if (!pin || (pin !== '1234' && pin !== '123456')) {
          console.warn(`[PSP Sim] Payment failed: Incorrect PIN simulation`);
           // Use a specific error code or message pattern for incorrect PIN
          return { status: 'Failed', message: 'Incorrect UPI PIN.', code: 'UPI_INCORRECT_PIN' };
     }

      // Simulate specific failure scenarios based on recipient ID for demo
      if (recipientUpiId === 'limit@payfriend') {
          console.warn(`[PSP Sim] Payment failed: Limit Exceeded simulation`);
          return { status: 'Failed', message: 'Daily UPI transaction limit exceeded.', code: 'UPI_LIMIT_EXCEEDED' };
      }
      if (recipientUpiId === 'debitfail@payfriend') {
          console.warn(`[PSP Sim] Payment failed: Debit failed simulation`);
           // Simulate scenario where debit might have happened but confirmation failed
          return { status: 'Failed', message: 'Payment failed due to network error at bank. Please check account.', mightBeDebited: true, code: 'BANK_NETWORK_ERROR' };
      }
      if (recipientUpiId === 'timeout@payfriend') {
           console.warn(`[PSP Sim] Payment failed: Timeout simulation`);
           return { status: 'Failed', message: 'Transaction timed out. Please check status later.', code: 'TRANSACTION_TIMEOUT' };
      }
      if (amount > 10000 && !sourceUpiId.includes('default')) { // Simulate insufficient funds for non-default accounts over 10k
           console.warn(`[PSP Sim] Payment failed: Insufficient funds simulation`);
           return { status: 'Failed', message: 'Insufficient bank balance.', code: 'INSUFFICIENT_FUNDS' };
      }


     // Simulate random failure
     if (Math.random() < 0.05) { // 5% generic failure chance
         console.warn(`[PSP Sim] Payment failed: Generic bank decline simulation`);
         return { status: 'Failed', message: 'Payment declined by recipient bank.', code: 'BANK_DECLINED' };
     }

     // Simulate Success
     const transactionId = `UPI_${Date.now()}`;
     console.log(`[PSP Sim] Payment successful. Txn ID: ${transactionId}`);
     return { status: 'Completed', message: 'Transaction Successful', transactionId };
 };

 const checkAccountBalance = async (upiId, pin) => {
     console.log(`[PSP Sim] Checking balance for ${upiId}`);
     await new Promise(resolve => setTimeout(resolve, 500));

     if (!pin || (pin !== '1234' && pin !== '123456')) {
         throw new Error('Incorrect UPI PIN.');
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
         console.warn(`[PSP Sim] Secure debit failed for ${upiId}.`);
         return { success: false, message: 'Automated debit failed (e.g., insufficient funds or mandate issue).' };
     }

     const transactionId = `DEBIT_${Date.now()}`;
     console.log(`[PSP Sim] Secure debit successful. Txn ID: ${transactionId}`);
     return { success: true, transactionId };
 };


module.exports = {
    verifyRecipient,
    initiatePayment,
    checkAccountBalance,
    initiateDebit, // Export the new function
};
        