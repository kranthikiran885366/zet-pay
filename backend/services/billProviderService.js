// backend/services/billProviderService.js
// Placeholder for actual BBPS / Biller Aggregator interaction

/**
 * Fetches bill details (amount, due date) from the provider.
 * SIMULATED.
 *
 * @param {string} billerId Biller ID from BBPS or aggregator.
 * @param {string} identifier Consumer number, account ID, policy number, etc.
 * @param {string} billType Type of bill (e.g., 'electricity', 'water').
 * @returns {Promise<object|null>} Bill details or null if not found/applicable.
 */
async function fetchBill(billerId, identifier, billType) {
    console.log(`[Bill Provider Sim] Fetching bill for Biller: ${billerId}, Identifier: ${identifier}, Type: ${billType}`);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Mock data based on controller examples
    if ((billerId === 'bescom' || billerId === 'mock-prepaid-bescom') && identifier === '12345') {
        return { amount: 1350.75, dueDate: addDays(new Date(), 10), consumerName: 'Chandra Sekhar', status: 'DUE' };
    }
    if ((billerId === 'bwssb') && identifier === 'W9876') {
         return { amount: 420.00, dueDate: addDays(new Date(), 5), consumerName: 'Test User', status: 'DUE' };
    }
     if ((billerId === 'mock-school-1') && identifier === 'S101') {
         return { amount: 5000.00, dueDate: addDays(new Date(), 20), consumerName: 'Student Name', status: 'DUE' };
     }
      if ((billerId === 'hdfc-cc') && identifier === '4111********1111') {
          return { amount: 12345.67, dueDate: addDays(new Date(), 15), consumerName: 'Card Holder', status: 'DUE', minAmountDue: 1000 };
      }

    console.log(`[Bill Provider Sim] No mock bill found for ${billerId}, ${identifier}.`);
    return null; // Bill fetch not supported or not found
}

/**
 * Executes the bill payment via the provider/aggregator.
 * SIMULATED.
 *
 * @param {object} details Payment details { billerId, identifier, amount, type, transactionId }.
 * @returns {Promise<object>} Result status and messages.
 */
async function payBill(details) {
    const { billerId, identifier, amount, type, transactionId } = details;
    console.log(`[Bill Provider Sim] Paying bill: Biller ${billerId}, ID ${identifier}, Amt ${amount}, Type ${type}, Ref ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate execution delay

    const random = Math.random();
    if (random < 0.08) { // 8% Failure
        console.warn('[Bill Provider Sim] Bill payment failed.');
        return { status: 'Failed', message: 'Payment rejected by biller.', operatorMessage: 'Biller Payment Failed' };
    }
    if (random < 0.20) { // 12% Pending
        console.log('[Bill Provider Sim] Bill payment pending confirmation.');
        return { status: 'Pending', message: 'Payment submitted, awaiting biller confirmation.', operatorMessage: 'Pending Biller Confirmation' };
    }

    console.log('[Bill Provider Sim] Bill payment successful.');
    return { status: 'Completed', message: 'Bill paid successfully.', operatorMessage: 'Success', billerReferenceId: `BILLPAY_${Date.now()}` };
}


module.exports = {
    fetchBill,
    payBill,
};

// Helper function (consider moving to a utils file)
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
