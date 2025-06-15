// SIMULATED RECHARGE PROVIDER SERVICE
// In reality, this would interact with APIs like BBPS or specific aggregators
const redisClient = require('../config/redisClient');
const CACHE_TTL_BILLERS = 3600; // 1 hour for biller list
const CACHE_TTL_PLANS = 600; // 10 minutes for plan list
const { mockBillersData, mockRechargePlansData, mockDthPlansData, mockDataCardPlansData } = require('../../src/mock-data/recharge');

const fetchBillers = async (type) => {
    const cacheKey = `billers_v3:${type}`;
    console.log(`[Aggregator Sim] Fetching billers for type: ${type}`);

    try {
        if (redisClient.isReady) {
            const cachedBillers = await redisClient.get(cacheKey);
            if (cachedBillers) {
                console.log(`[Aggregator Sim] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedBillers);
            }
            console.log(`[Aggregator Sim] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Aggregator Sim] Redis client not ready, skipping cache for billers.');
        }
    } catch (cacheError) {
        console.error(`[Aggregator Sim] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const billers = mockBillersData[type] || [];

    try {
        if (redisClient.isReady && billers.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(billers), { EX: CACHE_TTL_BILLERS });
            console.log(`[Aggregator Sim] Stored ${cacheKey} in cache.`);
        }
    } catch (cacheSetError) {
        console.error(`[Aggregator Sim] Redis SET error for ${cacheKey}:`, cacheSetError);
    }
    return billers;
};

const fetchPlans = async (billerId, type, identifier) => {
    const cacheKey = `plans_v3:${billerId}:${type}:${identifier || 'all'}`;
    console.log(`[Aggregator Sim] Fetching plans for: ${billerId}, Type: ${type}, Identifier: ${identifier || 'N/A'}`);

    try {
        if (redisClient.isReady) { 
            const cachedPlans = await redisClient.get(cacheKey);
            if (cachedPlans) {
                console.log(`[Aggregator Sim] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedPlans);
            }
            console.log(`[Aggregator Sim] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Aggregator Sim] Redis client not ready, skipping cache for plans.');
        }
    } catch (cacheError) {
        console.error(`[Aggregator Sim] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let plans = [];
    if (type.toLowerCase().includes('mobile')) plans = mockRechargePlansData[billerId] || mockRechargePlansData['jio-prepaid'] || []; // Fallback for demo
    else if (type.toLowerCase().includes('dth')) plans = mockDthPlansData[billerId] || mockDthPlansData['tata-play'] || [];
    else if (type.toLowerCase().includes('datacard')) plans = mockDataCardPlansData[billerId] || mockDataCardPlansData['jio-datacard'] || [];
    
    try {
        if (redisClient.isReady && plans.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(plans), { EX: CACHE_TTL_PLANS });
            console.log(`[Aggregator Sim] Stored ${cacheKey} in cache.`);
        }
    } catch (cacheSetError) {
        console.error(`[Aggregator Sim] Redis SET error for ${cacheKey}:`, cacheSetError);
    }
    return plans;
};

const executeRecharge = async ({ type, identifier, amount, billerId, planId, transactionId }) => {
    console.log(`[Aggregator Sim] Executing recharge: ${type} for ${identifier} (₹${amount}). Biller: ${billerId}, Plan: ${planId}, App Tx ID: ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 

    const random = Math.random();
    const operatorRef = `OPREF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (amount < 10 && type !== 'electricity') { // Electricity can be lower
        console.warn('[Aggregator Sim] Recharge failed: Amount too low.');
        return { status: 'Failed', message: 'Recharge amount too low.', operatorReferenceId: operatorRef, operatorMessage: 'MIN_AMOUNT_NOT_MET' };
    }
    if (identifier === '0000000000') { // Simulate specific identifier failure
        console.warn('[Aggregator Sim] Recharge failed: Invalid identifier (Simulated).');
        return { status: 'Failed', message: 'Invalid identifier provided to operator.', operatorReferenceId: operatorRef, operatorMessage: 'INVALID_IDENTIFIER_OPERATOR' };
    }

    if (random < 0.05) { 
        console.warn('[Aggregator Sim] Recharge failed (Simulated Operator Rejection).');
        return { status: 'Failed', message: 'Operator recharge failed.', operatorReferenceId: operatorRef, operatorMessage: 'TRANSACTION_FAILED_OPERATOR' };
    }
    if (random < 0.15) { 
        console.log('[Aggregator Sim] Recharge pending confirmation from operator.');
        return { status: 'Pending', message: 'Recharge submitted, awaiting confirmation from operator.', operatorReferenceId: operatorRef, operatorMessage: 'PENDING_OPERATOR_CONFIRMATION' };
    }
    if ((type === 'mobile' || type === 'dth') && random < 0.25) { 
         console.log('[Aggregator Sim] Recharge successful, activation processing by operator.');
         return { status: 'Processing Activation', message: 'Recharge successful, activation may take a few minutes.', operatorReferenceId: operatorRef, operatorMessage: 'ACTIVATION_IN_PROGRESS' };
     }

    console.log('[Aggregator Sim] Recharge successful with operator.');
    return { status: 'Completed', message: 'Recharge processed successfully by operator.', operatorReferenceId: operatorRef, operatorMessage: 'SUCCESS' };
};

const getActivationStatus = async (transactionId, operatorReferenceId) => {
    console.log(`[Aggregator Sim] Checking activation status for App Tx: ${transactionId}, Operator Ref: ${operatorReferenceId}`);
    await new Promise(resolve => setTimeout(resolve, 700));
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

const cancelRecharge = async (transactionId, operatorReferenceId) => {
     console.log(`[Aggregator Sim] Attempting cancellation for App Tx: ${transactionId}, Operator Ref: ${operatorReferenceId}`);
     await new Promise(resolve => setTimeout(resolve, 800)); 
     
     if (operatorReferenceId && operatorReferenceId.includes('ACTIVATION_IN_PROGRESS')) {
         console.warn(`[Aggregator Sim] Cancellation failed for ${transactionId}: Activation already in progress.`);
         return { success: false, message: 'Cancellation rejected by operator: Activation already started.' };
     }
      if (operatorReferenceId && operatorReferenceId.includes('SUCCESS')) {
         console.warn(`[Aggregator Sim] Cancellation failed for ${transactionId}: Already successful.`);
         return { success: false, message: 'Cannot cancel, recharge already successful.' };
     }


     const success = Math.random() > 0.25; 
     if(success) {
         console.log(`[Aggregator Sim] Cancellation successful for ${transactionId}.`);
         return { success: true, message: 'Cancellation request accepted by operator. Refund will be processed if applicable.' };
     } else {
          console.warn(`[Aggregator Sim] Cancellation failed for ${transactionId}.`);
          return { success: false, message: 'Cancellation rejected by operator (e.g., too late or policy restriction).' };
     }
 };

module.exports = {
    fetchBillers,
    fetchPlans,
    executeRecharge,
    getActivationStatus,
    cancelRecharge,
};
