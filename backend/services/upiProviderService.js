
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
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    console.log('[PSP Sim] Account discovery simulation complete.');
};

const linkAccountWithPsp = async ({ userId, bankName, accountNumber, accountType, ifsc }) => {
    console.log(`[PSP Sim] Linking account with PSP: User ${userId}, Bank ${bankName}, Acc ${accountNumber.slice(-4)}, Type ${accountType}, IFSC ${ifsc}`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    // Simulate UPI ID generation based on bank
    const bankHandle = bankName.toLowerCase().includes('sbi') ? 'oksbi' :
                       bankName.toLowerCase().includes('icici') ? 'okicici' :
                       bankName.toLowerCase().includes('hdfc') ? 'okhdfcbank' : 'okaxis'; // Default
    const generatedUpiId = `${userId.substring(0,4)}${String(accountNumber).slice(-4)}@${bankHandle}`;
    console.log(`[PSP Sim] Account linked with PSP. UPI ID: ${generatedUpiId}`);
    return {
        success: true,
        upiId: generatedUpiId,
        maskedAccountNumber: `xxxx${String(accountNumber).slice(-4)}`,
        message: "Account linked and UPI ID generated with PSP.",
        pinLength: (Math.random() > 0.5 ? 6:4)
    };
};

const deregisterUpiId = async (upiId) => {
    console.log(`[PSP Sim] Deregistering UPI ID ${upiId} with PSP...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[PSP Sim] UPI ID ${upiId} deregistered.`);
    return { success: true, message: "UPI ID deregistered from provider." };
};

const verifyRecipient = async (upiId) => {
    console.log(`[PSP Sim] Verifying UPI ID: ${upiId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

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
    const namePart = upiId.split('@')[0].replace(/[._]/g, ' ').trim();
    const verifiedName = namePart
        .split(' ')
        .filter(part => part.length > 0)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    console.log(`[PSP Sim] Verified Name: ${verifiedName || 'Verified User'}`);
    return {
        accountHolderName: verifiedName || "Verified User",
        isMerchant: Math.random() > 0.7 // Simulate merchant status
    };
};

const initiatePayment = async ({ userId, sourceUpiId, recipientUpiId, amount, pin, note }) => {
     console.log(`[PSP Sim] Initiating payment from ${sourceUpiId} to ${recipientUpiId} for ₹${amount} with PIN: ****, User: ${userId}`);
     await new Promise(resolve => setTimeout(resolve, 1200));

     if (!pin || (pin !== '1234' && pin !== '123456' && pin !== '0000' && pin !== '000000')) { // Allow test PINs
          console.warn(`[PSP Sim] Payment failed: Incorrect PIN simulation for ${sourceUpiId}`);
          const error = new Error('Incorrect UPI PIN.');
          error.pspErrorCode = 'M4'; // Example PSP code for incorrect PIN
          error.npciErrorCode = 'ZM'; // Example NPCI code for incorrect PIN
          error.mightBeDebited = false;
          throw error;
     }

      if (recipientUpiId.toLowerCase().includes('limitexceeded')) {
          console.warn(`[PSP Sim] Payment failed: UPI Limit Exceeded simulation for ${recipientUpiId}`);
          const error = new Error('Daily UPI transaction limit exceeded.');
          error.pspErrorCode = 'L1';
          error.npciErrorCode = 'U09';
          error.mightBeDebited = false;
          throw error;
      }
       if (recipientUpiId.toLowerCase().includes('bankfunds')) {
            console.warn(`[PSP Sim] Payment failed: Insufficient bank funds simulation for ${recipientUpiId}`);
            const error = new Error('Insufficient funds in bank account.');
            error.pspErrorCode = 'B1';
            error.npciErrorCode = 'M1';
            error.mightBeDebited = false;
            throw error;
       }
       if (recipientUpiId.toLowerCase().includes('debitfail')) {
          console.warn(`[PSP Sim] Payment failed: Debit failed simulation (might be debited) for ${recipientUpiId}`);
          const error = new Error('Payment failed due to network error at bank. Please check account after some time.');
          error.pspErrorCode = 'N1';
          error.npciErrorCode = 'U69';
          error.mightBeDebited = true;
          throw error;
      }
      if (recipientUpiId.toLowerCase().includes('timeout')) {
           console.warn(`[PSP Sim] Payment failed: Timeout simulation for ${recipientUpiId}`);
           const error = new Error('Transaction timed out. Please check status later.');
           error.pspErrorCode = 'T1';
           error.npciErrorCode = 'BT';
           error.mightBeDebited = true;
           throw error;
      }
       if (recipientUpiId.toLowerCase().includes('bankdecline')) {
           console.warn(`[PSP Sim] Payment failed: Generic bank decline simulation for ${recipientUpiId}`);
           const error = new Error('Payment declined by recipient bank. Please try later.');
           error.pspErrorCode = 'X1';
           error.npciErrorCode = 'X0';
           error.mightBeDebited = false;
           throw error;
       }
        if (recipientUpiId.toLowerCase().includes('bankserverdown')) {
            console.warn(`[PSP Sim] Payment failed: Bank Server Down simulation for ${recipientUpiId}`);
            const error = new Error('Recipient bank server is temporarily unavailable. Please try later.');
            error.pspErrorCode = 'S1';
            error.npciErrorCode = 'U16';
            error.mightBeDebited = false;
            throw error;
        }


     if (Math.random() < 0.03) {
         console.warn(`[PSP Sim] Payment failed: Unknown PSP/Bank error simulation for ${recipientUpiId}`);
         const error = new Error('Payment failed due to an unexpected bank error. Please try again later.');
         error.pspErrorCode = 'G9';
         error.npciErrorCode = 'Z9';
         error.mightBeDebited = Math.random() < 0.2;
          throw error;
     }

      if (Math.random() < 0.05) {
          console.log(`[PSP Sim] Payment Pending for ${recipientUpiId}.`);
           return { status: 'Pending', message: 'Transaction is Pending Confirmation', pspTransactionId: `PSP_PENDING_${Date.now()}`, npciErrorCode: 'BP', mightBeDebited: true };
      }

     const pspTransactionId = `PSP_UPI_${Date.now()}`;
     console.log(`[PSP Sim] Payment successful to ${recipientUpiId}. Txn ID: ${pspTransactionId}`);
     return { status: 'Completed', message: 'Transaction Successful', pspTransactionId, npciErrorCode: '00', mightBeDebited: false };
 };

 const checkAccountBalance = async (upiId, pin, userId) => {
     console.log(`[PSP Sim] Checking balance for ${upiId} with PIN: ****, User: ${userId}`);
     await new Promise(resolve => setTimeout(resolve, 500));

     if (!pin || (pin !== '1234' && pin !== '123456' && pin !== '0000' && pin !== '000000')) {
          const error = new Error('Incorrect UPI PIN.');
          error.code = 'UPI_INCORRECT_PIN';
          throw error;
     }
     const balance = parseFloat((Math.random() * 50000 + 100).toFixed(2));
     console.log(`[PSP Sim] Balance for ${upiId}: ${balance}`);
     return balance;
 };

 const initiateDebit = async (upiId, amount, reason) => {
     console.log(`[PSP Sim] Initiating SECURE DEBIT of ₹${amount} from ${upiId} for reason: ${reason}`);
     await new Promise(resolve => setTimeout(resolve, 1000));
     const success = Math.random() > 0.1;

     if (!success) {
         console.warn(`[PSP Sim] Secure debit failed for ${upiId}. Simulating insufficient funds or mandate issue.`);
          const error = new Error('Automated debit failed (e.g., insufficient funds or mandate issue).');
          error.code = 'AUTO_DEBIT_FAILED';
          throw error;
     }

     const transactionId = `DEBIT_${Date.now()}`;
     console.log(`[PSP Sim] Secure debit successful. Txn ID: ${transactionId}`);
     return { success: true, transactionId, pspTransactionId: transactionId };
 };

 const setOrChangeUpiPin = async ({ userId, upiId, oldPin, newPin, bankAccountDetails }) => {
    console.log(`[PSP Sim] Setting/Changing UPI PIN for User ${userId}, UPI ID ${upiId}. Old PIN: ${oldPin ? '****' : 'N/A'}, New PIN: ****`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate bank account detail verification if it's a first time PIN set
    if (!oldPin && !bankAccountDetails) {
        return { success: false, message: "Bank account details (e.g., debit card last 6 digits, expiry) required for first time PIN set." };
    }
    if (!oldPin && bankAccountDetails) {
        console.log("[PSP Sim] Verified bank account details for PIN set (simulated).");
    }

    // Simulate old PIN verification if changing PIN
    if (oldPin && oldPin !== '1234' && oldPin !== '123456') { // Example old PINs
        return { success: false, message: "Incorrect old UPI PIN." };
    }

    // Simulate success
    console.log(`[PSP Sim] UPI PIN for ${upiId} set/changed successfully.`);
    return { success: true, message: 'UPI PIN set/changed successfully.' };
};


module.exports = {
    simulateAccountDiscovery,
    linkAccountWithPsp,
    deregisterUpiId,
    verifyRecipient,
    initiatePayment,
    checkAccountBalance,
    initiateDebit,
    setOrChangeUpiPin,
    initiateMandateSetup: async (details) => {
        console.log('[PSP Sim] Initiating mandate setup:', details);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const randomStatus = Math.random() > 0.2 ? 'Pending Approval' : 'Active';
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
