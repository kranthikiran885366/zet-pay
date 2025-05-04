
// SIMULATED RECHARGE PROVIDER SERVICE
// In reality, this would interact with APIs like BBPS or specific aggregators

const fetchBillers = async (type) => {
    console.log(`[Aggregator Sim] Fetching billers for type: ${type}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const mockData = { /* ... (same mock data as in rechargeController for consistency) ... */
        Mobile: [
            { billerId: 'airtel-prepaid', billerName: 'Airtel Prepaid', billerType: 'Mobile', logoUrl: '/logos/airtel.png' },
            { billerId: 'jio-prepaid', billerName: 'Jio Prepaid', billerType: 'Mobile', logoUrl: '/logos/jio.png' },
            { billerId: 'vi-prepaid', billerName: 'Vodafone Idea (Vi)', billerType: 'Mobile', logoUrl: '/logos/vi.png' },
            { billerId: 'bsnl-prepaid', billerName: 'BSNL Prepaid', billerType: 'Mobile', logoUrl: '/logos/bsnl.png' },
        ],
        DTH: [
            { billerId: 'tata-play', billerName: 'Tata Play (Tata Sky)', billerType: 'DTH', logoUrl: '/logos/tataplay.png' },
            { billerId: 'dish-tv', billerName: 'Dish TV', billerType: 'DTH', logoUrl: '/logos/dishtv.png' },
            { billerId: 'airtel-dth', billerName: 'Airtel Digital TV', billerType: 'DTH', logoUrl: '/logos/airtel.png' },
            { billerId: 'd2h', billerName: 'd2h (Videocon)', billerType: 'DTH', logoUrl: '/logos/d2h.png' },
        ],
        Fastag: [
             { billerId: 'paytm-fastag', billerName: 'Paytm Payments Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/paytm.png'},
             { billerId: 'icici-fastag', billerName: 'ICICI Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/icici.png'},
             { billerId: 'hdfc-fastag', billerName: 'HDFC Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/hdfc.png'},
        ],
        Electricity: [
             { billerId: 'bescom', billerName: 'BESCOM (Bangalore)', billerType: 'Electricity'},
             { billerId: 'mseb', billerName: 'Mahadiscom (MSEB)', billerType: 'Electricity'},
             { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity' },
             { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity' },
        ],
        Datacard: [
             { billerId: 'jio-datacard', billerName: 'JioFi', billerType: 'Datacard', logoUrl: '/logos/jio.png' },
             { billerId: 'airtel-datacard', billerName: 'Airtel Data Card', billerType: 'Datacard', logoUrl: '/logos/airtel.png' },
             { billerId: 'vi-datacard', billerName: 'Vi Data Card', billerType: 'Datacard', logoUrl: '/logos/vi.png' },
        ],
    };
    return mockData[type] || [];
};

const fetchPlans = async (billerId, type, identifier) => {
    console.log(`[Aggregator Sim] Fetching plans for: ${billerId}, Type: ${type}, Identifier: ${identifier || 'N/A'}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    // Return mock plans based on type for simulation
    const mockRechargePlans = [ /* ... (from rechargeController) ... */];
    const mockDthPlans = [ /* ... (from rechargeController) ... */ ];
    const mockDataCardPlans = [ /* ... (from rechargeController) ... */ ];
    if (type === 'mobile') return mockRechargePlans;
    if (type === 'dth') return mockDthPlans;
    if (type === 'datacard') return mockDataCardPlans;
    return [];
};

const executeRecharge = async ({ type, identifier, amount, billerId, planId, transactionId }) => {
    console.log(`[Aggregator Sim] Executing recharge: ${type} ${identifier} for ₹${amount} (Ref: ${transactionId})`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate execution delay

    const random = Math.random();
    if (random < 0.05) { // 5% Failure
        console.warn('[Aggregator Sim] Recharge failed.');
        return { status: 'Failed', message: 'Operator recharge failed.', operatorMessage: 'Transaction Failed at Operator' };
    }
    if (random < 0.15) { // 10% Pending
        console.log('[Aggregator Sim] Recharge pending confirmation.');
        return { status: 'Pending', message: 'Recharge submitted, awaiting confirmation.', operatorMessage: 'Pending Confirmation' };
    }
    if (type === 'mobile' && random < 0.25) { // 10% Processing Activation (for mobile)
         console.log('[Aggregator Sim] Recharge successful, activation processing.');
         return { status: 'Processing Activation', message: 'Recharge successful, activation may take a few minutes.', operatorMessage: 'Activation in Progress' };
     }

    console.log('[Aggregator Sim] Recharge successful.');
    return { status: 'Completed', message: 'Recharge processed successfully.', operatorMessage: 'Success' };
};

const getActivationStatus = async (transactionId) => {
    console.log(`[Aggregator Sim] Checking activation status for: ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    // Simulate status check
    const random = Math.random();
    if (random < 0.7) return 'Completed';
    if (random < 0.9) return 'Processing Activation';
    return 'Failed';
};

const cancelRecharge = async (transactionId) => {
     console.log(`[Aggregator Sim] Attempting cancellation for: ${transactionId}`);
     await new Promise(resolve => setTimeout(resolve, 500));
     // Simulate cancellation success/failure
     const success = Math.random() > 0.2; // 80% success
     if(success) {
         console.log(`[Aggregator Sim] Cancellation successful for ${transactionId}.`);
         return { success: true, message: 'Cancellation request accepted by operator.' };
     } else {
          console.warn(`[Aggregator Sim] Cancellation failed for ${transactionId}.`);
          return { success: false, message: 'Cancellation rejected by operator (might be too late).' };
     }
 };

module.exports = {
    fetchBillers,
    fetchPlans,
    executeRecharge,
    getActivationStatus,
    cancelRecharge,
};
