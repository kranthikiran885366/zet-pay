
// SIMULATED RECHARGE PROVIDER SERVICE
// In reality, this would interact with APIs like BBPS or specific aggregators (e.g., PaySprint, Euronet)
const redisClient = require('../config/redisClient');
const CACHE_TTL_BILLERS = 3600; // 1 hour for biller list
const CACHE_TTL_PLANS = 600; // 10 minutes for plan list
const { mockBillersData, mockRechargePlansData, mockDthPlansData, mockDataCardPlansData } = require('../../src/mock-data/recharge'); // Ensure correct path if moved

/**
 * Fetches billers (operators) for a given recharge type.
 * Attempts to use Redis cache first.
 * @param {string} type - e.g., 'Mobile', 'DTH', 'Fastag', 'Electricity', 'Datacard'
 * @returns {Promise<Array<object>>} List of billers.
 */
const fetchBillers = async (type) => {
    const cacheKey = `recharge_billers_v3:${type}`; // Updated cache key version
    console.log(`[Recharge Provider Sim] Fetching billers for type: ${type}`);

    try {
        if (redisClient.isReady) {
            const cachedBillers = await redisClient.get(cacheKey);
            if (cachedBillers) {
                console.log(`[Recharge Provider Sim] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedBillers);
            }
            console.log(`[Recharge Provider Sim] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Recharge Provider Sim] Redis client not ready, skipping cache for billers.');
        }
    } catch (cacheError) {
        console.error(`[Recharge Provider Sim] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    // Simulate API call delay if not cached
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    // Use mock data based on type. Ensure mockBillersData is structured correctly.
    // e.g., mockBillersData['Mobile'], mockBillersData['Dth']
    const billers = mockBillersData[type] || [];
    console.log(`[Recharge Provider Sim] Fetched ${billers.length} billers for ${type} from mock data.`);

    try {
        if (redisClient.isReady && billers.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(billers), { EX: CACHE_TTL_BILLERS });
            console.log(`[Recharge Provider Sim] Stored ${cacheKey} in cache.`);
        }
    } catch (cacheSetError) {
        console.error(`[Recharge Provider Sim] Redis SET error for ${cacheKey}:`, cacheSetError);
    }
    return billers;
};

/**
 * Fetches recharge plans for a given biller and recharge type.
 * Attempts to use Redis cache first.
 * @param {string} billerId - The ID of the biller (operator).
 * @param {string} type - The type of recharge (e.g., 'mobile', 'dth', 'datacard').
 * @param {string} [identifier] - Optional identifier (e.g., mobile number for circle-specific mobile plans).
 * @returns {Promise<Array<object>>} List of recharge plans.
 */
const fetchPlans = async (billerId, type, identifier) => {
    const cacheKey = `recharge_plans_v3:${billerId}:${type}:${identifier || 'all'}`;
    console.log(`[Recharge Provider Sim] Fetching plans for: ${billerId}, Type: ${type}, Identifier: ${identifier || 'N/A'}`);

    try {
        if (redisClient.isReady) { 
            const cachedPlans = await redisClient.get(cacheKey);
            if (cachedPlans) {
                console.log(`[Recharge Provider Sim] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedPlans);
            }
            console.log(`[Recharge Provider Sim] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Recharge Provider Sim] Redis client not ready, skipping cache for plans.');
        }
    } catch (cacheError) {
        console.error(`[Recharge Provider Sim] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400)); // Simulate API delay
    
    let plans = [];
    // Select mock data based on type and billerId
    if (type.toLowerCase().includes('mobile')) {
        plans = (mockRechargePlansData[billerId] || mockRechargePlansData['jio-prepaid'] || []).map(p => ({...p, planId: p.planId || `${billerId}_${p.price}_${p.data || p.validity}`})); // Ensure planId
    } else if (type.toLowerCase().includes('dth')) {
        plans = (mockDthPlansData[billerId] || mockDthPlansData['tata-play'] || []).map(p => ({...p, planId: p.planId || `${billerId}_${p.price}_${p.category}`}));
    } else if (type.toLowerCase().includes('datacard')) {
        plans = (mockDataCardPlansData[billerId] || mockDataCardPlansData['jio-datacard'] || []).map(p => ({...p, planId: p.planId || `${billerId}_${p.price}_${p.data}`}));
    }
    console.log(`[Recharge Provider Sim] Fetched ${plans.length} plans for ${billerId} from mock data.`);
    
    try {
        if (redisClient.isReady && plans.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(plans), { EX: CACHE_TTL_PLANS });
            console.log(`[Recharge Provider Sim] Stored ${cacheKey} in cache.`);
        }
    } catch (cacheSetError) {
        console.error(`[Recharge Provider Sim] Redis SET error for ${cacheKey}:`, cacheSetError);
    }
    return plans;
};

/**
 * Simulates executing a recharge with an external provider.
 * @param {object} details - Recharge details { type, identifier, amount, billerId, planId, transactionId }.
 * @returns {Promise<object>} Result of the recharge execution.
 */
const executeRecharge = async ({ type, identifier, amount, billerId, planId, transactionId }) => {
    console.log(`[Recharge Provider Sim] Executing recharge: ${type} for ${identifier} (₹${amount}). Biller: ${billerId}, Plan: ${planId}, App Tx ID: ${transactionId}`);
    // In a real app, this would make an API call to a recharge aggregator (e.g., PaySprint, BBPS via Setu/Cashfree)
    // Request: { operatorCode: billerId, mobileNumber: identifier, amount: amount, clientRefId: transactionId, planCode: planId }
    // Response: { status: 'SUCCESS'/'PENDING'/'FAILED', operatorTxnId: '...', message: '...' }
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 

    const random = Math.random();
    const operatorRef = `OPREF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (amount < 10 && type !== 'electricity') {
        console.warn('[Recharge Provider Sim] Recharge failed: Amount too low.');
        return { status: 'Failed', message: 'Recharge amount too low.', operatorReferenceId: operatorRef, operatorMessage: 'MIN_AMOUNT_NOT_MET' };
    }
    if (identifier === '0000000000') {
        console.warn('[Recharge Provider Sim] Recharge failed: Invalid identifier (Simulated).');
        return { status: 'Failed', message: 'Invalid identifier provided to operator.', operatorReferenceId: operatorRef, operatorMessage: 'INVALID_IDENTIFIER_OPERATOR' };
    }

    if (random < 0.05) { 
        console.warn('[Recharge Provider Sim] Recharge failed (Simulated Operator Rejection).');
        return { status: 'Failed', message: 'Operator recharge failed.', operatorReferenceId: operatorRef, operatorMessage: 'TRANSACTION_FAILED_OPERATOR' };
    }
    if (random < 0.15) { 
        console.log('[Recharge Provider Sim] Recharge pending confirmation from operator.');
        return { status: 'Pending', message: 'Recharge submitted, awaiting confirmation from operator.', operatorReferenceId: operatorRef, operatorMessage: 'PENDING_OPERATOR_CONFIRMATION' };
    }
    if ((type === 'mobile' || type === 'dth') && random < 0.25) { 
         console.log('[Recharge Provider Sim] Recharge successful, activation processing by operator.');
         return { status: 'Processing Activation', message: 'Recharge successful, activation may take a few minutes.', operatorReferenceId: operatorRef, operatorMessage: 'ACTIVATION_IN_PROGRESS' };
     }

    console.log('[Recharge Provider Sim] Recharge successful with operator.');
    return { status: 'Completed', message: 'Recharge processed successfully by operator.', operatorReferenceId: operatorRef, operatorMessage: 'SUCCESS' };
};

/**
 * Simulates checking the activation status of a recharge.
 * @param {string} transactionId - App's internal transaction ID.
 * @param {string} [operatorReferenceId] - Optional reference ID from the operator.
 * @returns {Promise<string>} Status string (e.g., 'Completed', 'Pending', 'Failed', 'Processing Activation').
 */
const getActivationStatus = async (transactionId, operatorReferenceId) => {
    console.log(`[Recharge Provider Sim] Checking activation status for App Tx: ${transactionId}, Operator Ref: ${operatorReferenceId || 'N/A'}`);
    // In a real app, call provider's status check API using operatorReferenceId or transactionId.
    await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));
    const random = Math.random();
    
    if (operatorReferenceId && operatorReferenceId.includes('PENDING')) {
        if (random < 0.6) return 'Processing Activation';
        if (random < 0.9) return 'Completed';
        return 'Failed';
    }
    
    if (random < 0.7) return 'Completed';
    if (random < 0.9) return 'Processing Activation';
    return 'Failed';
};

/**
 * Simulates cancelling a recent recharge with the provider.
 * @param {string} transactionId - App's internal transaction ID.
 * @param {string} [operatorReferenceId] - Optional reference ID from the operator.
 * @returns {Promise<object>} Result of the cancellation attempt { success: boolean, message: string }.
 */
const cancelRecharge = async (transactionId, operatorReferenceId) => {
     console.log(`[Recharge Provider Sim] Attempting cancellation for App Tx: ${transactionId}, Operator Ref: ${operatorReferenceId || 'N/A'}`);
     // Real API would require operatorReferenceId or their transaction ID.
     await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400)); 
     
     if (operatorReferenceId && operatorReferenceId.includes('ACTIVATION_IN_PROGRESS')) {
         console.warn(`[Recharge Provider Sim] Cancellation failed for ${transactionId}: Activation already in progress.`);
         return { success: false, message: 'Cancellation rejected by operator: Activation already started.' };
     }
      if (operatorReferenceId && operatorReferenceId.includes('SUCCESS')) {
         console.warn(`[Recharge Provider Sim] Cancellation failed for ${transactionId}: Already successful.`);
         return { success: false, message: 'Cannot cancel, recharge already successful.' };
     }

     const success = Math.random() > 0.25; 
     if(success) {
         console.log(`[Recharge Provider Sim] Cancellation successful for ${transactionId}.`);
         return { success: true, message: 'Cancellation request accepted by operator. Refund will be processed if applicable.' };
     } else {
          console.warn(`[Recharge Provider Sim] Cancellation failed for ${transactionId}.`);
          return { success: false, message: 'Cancellation rejected by operator (e.g., too late or policy restriction).' };
     }
 };

/**
 * Simulates detecting mobile operator and circle based on number.
 * @param {string} mobileNumber - The 10-digit mobile number.
 * @returns {Promise<object>} { operator: Biller | null, circle: string | null, error?: string }
 */
const detectOperator = async (mobileNumber) => {
    console.log(`[Recharge Provider Sim] Detecting operator for ${mobileNumber}`);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

    if (!mobileNumber || !mobileNumber.match(/^[6-9]\d{9}$/)) {
        return { operator: null, circle: null, error: "Invalid mobile number." };
    }

    let operatorName;
    let circle = "Karnataka"; // Mock circle
    const firstDigit = mobileNumber.charAt(0);
    
    if (['9', '8'].includes(firstDigit) && (mobileNumber.charAt(1) > '5' || firstDigit === '8')) {
        operatorName = 'Jio';
    } else if (['7', '6'].includes(firstDigit)) {
        operatorName = 'Airtel';
    } else {
        operatorName = 'Vi'; // Vodafone Idea
    }
    // Find the biller object from mockBillersData
    const allMobileBillers = mockBillersData['Mobile'] || [];
    const detectedBiller = allMobileBillers.find(b => b.billerName.toLowerCase().includes(operatorName.toLowerCase()));

    if (detectedBiller) {
        return { operator: detectedBiller, circle, error: null };
    }
    return { operator: null, circle, error: "Could not determine operator." };
};


module.exports = {
    fetchBillers,
    fetchPlans,
    executeRecharge,
    getActivationStatus,
    cancelRecharge,
    detectOperator, // Add new function
};

</description>
    <content><![CDATA[

