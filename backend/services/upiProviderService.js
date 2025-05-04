
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
    const namePart = upiId.split('@')[0].replace(/[._]/g, ' ');
    const verifiedName = namePart
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    console.log(`[PSP Sim] Verified Name: ${verifiedName || 'Verified User'}`);
    return verifiedName || "Verified User";
};

const initiatePayment = async ({ sourceUpiId, recipientUpiId, amount, pin, note }) => {
     console.log(`[PSP Sim] Initiating payment from ${sourceUpiId} to ${recipientUpiId} for ₹${amount}`);
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

     // Simulate PIN validation (basic)
     if (!pin || (pin !== '1234' && pin !== '123456')) {
          console.warn(`[PSP Sim] Payment failed: Incorrect PIN simulation`);
          return { status: 'Failed', message: 'Incorrect UPI PIN.' };
     }

      // Simulate specific failure scenarios based on recipient ID for demo
      if (recipientUpiId === 'limit@payfriend') {
          console.warn(`[PSP Sim] Payment failed: Limit Exceeded simulation`);
          return { status: 'Failed', message: 'Daily UPI transaction limit exceeded.', code: 'UPI_LIMIT_EXCEEDED' };
      }
      if (recipientUpiId === 'debitfail@payfriend') {
          console.warn(`[PSP Sim] Payment failed: Debit failed simulation`);
          return { status: 'Failed', message: 'Payment failed due to network error at bank.', mightBeDebited: true };
      }
      if (recipientUpiId === 'timeout@payfriend') {
           console.warn(`[PSP Sim] Payment failed: Timeout simulation`);
           return { status: 'Failed', message: 'Transaction timed out. Please check status later.' };
      }
      if (amount > 10000 && !sourceUpiId.includes('default')) { // Simulate insufficient funds
           console.warn(`[PSP Sim] Payment failed: Insufficient funds simulation`);
           return { status: 'Failed', message: 'Insufficient bank balance.' };
      }


     // Simulate random failure
     if (Math.random() < 0.05) { // 5% generic failure chance
         console.warn(`[PSP Sim] Payment failed: Generic bank decline simulation`);
         return { status: 'Failed', message: 'Payment declined by recipient bank.' };
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


module.exports = {
    verifyRecipient,
    initiatePayment,
    checkAccountBalance,
};
