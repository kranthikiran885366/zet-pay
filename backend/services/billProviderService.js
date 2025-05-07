// backend/services/billProviderService.js
// Placeholder for actual BBPS / Biller Aggregator interaction
const { addDays, format } = require('date-fns'); // Import if needed

// --- Biller Fetching (Simulated) ---
const mockBillersByType = {
    Electricity: [
         { billerId: 'bescom', billerName: 'BESCOM (Bangalore)', billerType: 'Electricity', logoUrl: '/logos/bescom.png'}, // Example logo
         { billerId: 'mseb', billerName: 'Mahadiscom (MSEB)', billerType: 'Electricity', logoUrl: '/logos/mseb.png'},
         { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity' },
         { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity' },
    ],
    Water: [
        { billerId: 'bwssb', billerName: 'BWSSB (Bangalore)', billerType: 'Water' },
        { billerId: 'delhi-jal', billerName: 'Delhi Jal Board', billerType: 'Water' },
    ],
    Insurance: [
        { billerId: 'lic', billerName: 'LIC Premium', billerType: 'Insurance' },
        { billerId: 'hdfc-life', billerName: 'HDFC Life', billerType: 'Insurance' },
    ],
    'Credit Card': [ // Use exact type string if needed
        { billerId: 'hdfc-cc', billerName: 'HDFC Bank Credit Card', billerType: 'Credit Card' },
        { billerId: 'icici-cc', billerName: 'ICICI Bank Credit Card', billerType: 'Credit Card' },
    ],
     Loan: [
        { billerId: 'bajaj-finance', billerName: 'Bajaj Finance Loan', billerType: 'Loan' },
        { billerId: 'hdfc-loan', billerName: 'HDFC Personal Loan', billerType: 'Loan' },
    ],
    Gas: [ { billerId: 'igl', billerName: 'Indraprastha Gas (IGL)', billerType: 'Gas' } ],
    Broadband: [ { billerId: 'act', billerName: 'ACT Fibernet', billerType: 'Broadband' } ],
    Education: [ // Added Education billers
        { billerId: 'mock-school-1', billerName: 'ABC Public School', billerType: 'Education', logoUrl: '/logos/abc_school.png' },
        { billerId: 'mock-college-1', billerName: 'XYZ Engineering College', billerType: 'Education', logoUrl: '/logos/xyz_college.png' },
        { billerId: 'mock-uni-1', billerName: 'University of Example', billerType: 'Education', logoUrl: '/logos/uni_example.png' },
    ],
    'Cable TV': [ { billerId: 'hathway-cable', billerName: 'Hathway Cable TV', billerType: 'Cable TV' }],
    'Housing Society': [ { billerId: 'mygate', billerName: 'MyGate Society (Mock)', billerType: 'Housing Society' }],
    'Club Fee': [ { billerId: 'city-sports', billerName: 'City Sports Club (Mock)', billerType: 'Club Fee' }],
    Donation: [ { billerId: 'akshaya-patra', billerName: 'Akshaya Patra Foundation', billerType: 'Donation' }],
    Fastag: [ // Added Fastag billers for consistency if this service manages them
             { billerId: 'paytm-fastag', billerName: 'Paytm Payments Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/paytm.png'},
             { billerId: 'icici-fastag', billerName: 'ICICI Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/icici.png'},
    ],
    'Mobile Postpaid': [ // If mobile postpaid is handled via bill payment system
        { billerId: 'airtel-postpaid', billerName: 'Airtel Postpaid', billerType: 'Mobile Postpaid', logoUrl: '/logos/airtel.png' },
        { billerId: 'jio-postpaid', billerName: 'Jio Postpaid', billerType: 'Mobile Postpaid', logoUrl: '/logos/jio.png' },
    ]
};

/**
 * Fetches billers based on type. SIMULATED.
 * @param {string} type - The type of biller (e.g., 'Electricity', 'Water', 'Education').
 * @returns {Promise<object[]>} A list of biller objects.
 */
async function fetchBillers(type) {
    console.log(`[Bill Provider Sim] Fetching billers for type: ${type}`);
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay
    return mockBillersByType[type] || [];
}


// --- Bill Fetching & Payment (Adjusted Simulation) ---

/**
 * Fetches bill details (amount, due date) from the provider.
 * SIMULATED.
 *
 * @param {string} billerId Biller ID from BBPS or aggregator.
 * @param {string} identifier Consumer number, account ID, policy number, student ID, etc.
 * @param {string} billType Type of bill (e.g., 'Electricity', 'Water', 'Education'). Used for potential logic differentiation.
 * @returns {Promise<object|null>} Bill details or null if not found/applicable.
 */
async function fetchBill(billerId, identifier, billType) {
    console.log(`[Bill Provider Sim] Fetching bill for Biller: ${billerId}, Identifier: ${identifier}, Type: ${billType}`);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Mock data based on controller examples or new ones
    if (billerId === 'bescom' && identifier === '12345') {
        return { success: true, amount: 1350.75, dueDate: addDays(new Date(), 10), consumerName: 'Chandra Sekhar', status: 'DUE' };
    }
    if (billerId === 'bwssb' && identifier === 'W9876') {
         return { success: true, amount: 420.00, dueDate: addDays(new Date(), 5), consumerName: 'Test User', status: 'DUE' };
    }
    if (billerId === 'mock-school-1' && identifier === 'S101' && billType === 'Education') {
         return { success: true, amount: 5000.00, dueDate: addDays(new Date(), 20), consumerName: 'Student Mock Name', status: 'DUE' };
    }
    if (billerId === 'mock-college-1' && identifier === 'C202' && billType === 'Education') {
         return { success: true, amount: 15000.00, dueDate: addDays(new Date(), 25), consumerName: 'College Student Mock', status: 'DUE' };
    }
    if (billerId === 'hdfc-cc' && identifier === '4111********1111') {
          return { success: true, amount: 12345.67, dueDate: addDays(new Date(), 15), consumerName: 'Card Holder', status: 'DUE', minAmountDue: 1000 };
    }
     // Add more mock cases as needed...

    console.log(`[Bill Provider Sim] No mock bill found for ${billerId}, ${identifier}, ${billType}. Manual entry allowed.`);
    // Return object indicating fetch failed but manual entry is allowed
    return { success: false, message: 'Bill details not found. Manual entry allowed.', amount: null };
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

    // Simulate different outcomes based on biller ID or amount
    if (billerId === 'fail-biller') {
         console.warn('[Bill Provider Sim] Bill payment failed (Simulated Biller).');
         return { status: 'Failed', message: 'Payment rejected by biller (Simulated).', operatorMessage: 'BILLER_REJECTED' };
    }
     if (amount > 50000 && type !== 'Education') { // Allow larger amounts for Education
         console.warn('[Bill Provider Sim] Bill payment failed (Simulated Amount Limit).');
         return { status: 'Failed', message: 'Payment amount exceeds limit (Simulated).', operatorMessage: 'AMOUNT_LIMIT_EXCEEDED' };
     }

    const random = Math.random();
    if (random < 0.08) { // 8% Generic Failure
        console.warn('[Bill Provider Sim] Bill payment failed (Random).');
        return { status: 'Failed', message: 'Payment rejected by biller.', operatorMessage: 'Biller Payment Failed' };
    }
    if (random < 0.20) { // 12% Pending
        console.log('[Bill Provider Sim] Bill payment pending confirmation.');
        return { status: 'Pending', message: 'Payment submitted, awaiting biller confirmation.', operatorMessage: 'Pending Biller Confirmation', billerReferenceId: `BILLPEND_${Date.now()}` };
    }

    console.log('[Bill Provider Sim] Bill payment successful.');
    return { status: 'Completed', message: `${type} payment of ₹${amount} successful.`, operatorMessage: 'Success', billerReferenceId: `BILLPAY_${Date.now()}` };
}


module.exports = {
    fetchBillers, // Export the new function
    fetchBill,
    payBill,
};
