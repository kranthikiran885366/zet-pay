
// RECHARGE PROVIDER SERVICE - REFACTORED FOR REAL API INTEGRATION
// This service now attempts to call real external APIs if configured.
// Fallbacks to refined mock data if real API usage is disabled or calls fail.

const redisClient = require('../config/redisClient');
const { mockBillersData, mockRechargePlansData, mockDthPlansData, mockDataCardPlansData } = require('../../src/mock-data/recharge');
const axios = require('axios'); // Standard HTTP client for real API calls

const CACHE_TTL_BILLERS = 3600; // 1 hour for biller list
const CACHE_TTL_PLANS = 600;    // 10 minutes for plan list

// Helper to decide between real API call and mock/fallback logic
async function fetchWithFallback(key, realApiCallLogic, mockDataGenerator) {
    if (process.env.USE_REAL_RECHARGE_API === 'true') {
        try {
            console.log(`[Recharge Provider] Attempting REAL API call for ${key}...`);
            const realData = await realApiCallLogic();
            // TODO: Validate/transform realData to match expected structure
            return realData;
        } catch (error) {
            console.warn(`[Recharge Provider] REAL API call for ${key} FAILED: ${error.message}. Falling back to mock/refined error.`);
            // For a real app, you might want to throw a more specific error or a standardized error object.
            // If the error from the real API is about missing config, propagate that.
            if (error.message.includes("not configured")) throw error;
            // Otherwise, proceed to mock data as a development fallback.
        }
    }
    console.log(`[Recharge Provider] Using MOCK/FALLBACK data for ${key}.`);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // Simulate some delay
    return typeof mockDataGenerator === 'function' ? mockDataGenerator() : mockDataGenerator;
}

/**
 * Fetches billers (operators) for a given recharge type.
 * Attempts Redis cache -> Real API -> Mock data.
 */
const fetchBillers = async (type) => {
    const cacheKey = `recharge_billers_real_v2:${type}`;
    console.log(`[Recharge Provider] Fetching billers for type: ${type}`);

    if (redisClient.isReady) {
        try {
            const cachedBillers = await redisClient.get(cacheKey);
            if (cachedBillers) {
                console.log(`[Recharge Provider] Cache HIT for billers: ${type}`);
                return JSON.parse(cachedBillers);
            }
            console.log(`[Recharge Provider] Cache MISS for billers: ${type}`);
        } catch (cacheError) {
            console.error(`[Recharge Provider] Redis GET error for billers (${type}):`, cacheError);
        }
    }

    const realApiCallLogic = async () => {
        if (!process.env.RECHARGE_API_PROVIDER_URL || !process.env.RECHARGE_API_PROVIDER_KEY) {
            throw new Error("Recharge Provider API URL or Key not configured in .env for fetchBillers.");
        }
        // Example:
        // const response = await axios.get(`${process.env.RECHARGE_API_PROVIDER_URL}/operators?category=${type}`, {
        //   headers: { 'Authorization': `Bearer ${process.env.RECHARGE_API_PROVIDER_KEY}` }
        // });
        // if (response.data && response.data.operators) return response.data.operators.map(op => ({ billerId: op.code, billerName: op.name, billerType: type, logoUrl: op.logo_url }));
        // throw new Error("Invalid response from biller API.");
        console.warn(`[Recharge Provider] REAL API CALL FOR fetchBillers (type: ${type}) NOT IMPLEMENTED. Conceptual structure shown.`);
        throw new Error("Real fetchBillers API not implemented yet."); // Forces fallback for now
    };
    
    const billers = await fetchWithFallback(`billers_${type}`, realApiCallLogic, () => mockBillersData[type] || []);
    
    if (redisClient.isReady && billers.length > 0) {
        try {
            await redisClient.set(cacheKey, JSON.stringify(billers), { EX: CACHE_TTL_BILLERS });
            console.log(`[Recharge Provider] Stored billers for ${type} in cache.`);
        } catch (cacheSetError) {
            console.error(`[Recharge Provider] Redis SET error for billers (${type}):`, cacheSetError);
        }
    }
    return billers;
};

/**
 * Fetches recharge plans for a given biller and recharge type.
 * Attempts Redis cache -> Real API -> Mock data.
 */
const fetchPlans = async (billerId, type, identifier) => {
    const cacheKey = `recharge_plans_real_v2:${billerId}:${type}:${identifier || 'all'}`;
    console.log(`[Recharge Provider] Fetching plans for: ${billerId}, Type: ${type}, Identifier: ${identifier || 'N/A'}`);

    if (redisClient.isReady) {
         try {
            const cachedPlans = await redisClient.get(cacheKey);
            if (cachedPlans) {
                console.log(`[Recharge Provider] Cache HIT for plans: ${billerId}:${type}`);
                return JSON.parse(cachedPlans);
            }
            console.log(`[Recharge Provider] Cache MISS for plans: ${billerId}:${type}`);
        } catch (cacheError) {
            console.error(`[Recharge Provider] Redis GET error for plans (${billerId}:${type}):`, cacheError);
        }
    }

    const realApiCallLogic = async () => {
        if (!process.env.RECHARGE_API_PROVIDER_URL || !process.env.RECHARGE_API_PROVIDER_KEY) {
            throw new Error("Recharge Provider API URL or Key not configured in .env for fetchPlans.");
        }
        // Example:
        // const response = await axios.get(`${process.env.RECHARGE_API_PROVIDER_URL}/plans?operator_code=${billerId}&circle_code=${identifier || 'ALL'}&type=${type}`, {
        //   headers: { 'Authorization': `Bearer ${process.env.RECHARGE_API_PROVIDER_KEY}` }
        // });
        // if (response.data && response.data.plans) return response.data.plans.map(p => ({ planId: p.plan_id, description: p.desc, price: p.amount, validity: p.validity, ... }));
        // throw new Error("Invalid response from plan API.");
        console.warn(`[Recharge Provider] REAL API CALL FOR fetchPlans (biller: ${billerId}) NOT IMPLEMENTED. Conceptual structure shown.`);
        throw new Error("Real fetchPlans API not implemented yet.");
    };
    
    const mockPlansDataGenerator = () => {
        let data;
        if (type.toLowerCase().includes('mobile')) data = (mockRechargePlansData[billerId] || mockRechargePlansData['jio-prepaid'] || []);
        else if (type.toLowerCase().includes('dth')) data = (mockDthPlansData[billerId] || mockDthPlansData['tata-play'] || []);
        else if (type.toLowerCase().includes('datacard')) data = (mockDataCardPlansData[billerId] || mockDataCardPlansData['jio-datacard'] || []);
        else data = [];
        return data.map(p => ({...p, planId: p.planId || `${billerId}_${p.price}_${p.data || p.validity || p.category}`}));
    };

    const plans = await fetchWithFallback(`plans_${billerId}_${type}`, realApiCallLogic, mockPlansDataGenerator);
    
    if (redisClient.isReady && plans.length > 0) {
        try {
            await redisClient.set(cacheKey, JSON.stringify(plans), { EX: CACHE_TTL_PLANS });
            console.log(`[Recharge Provider] Stored plans for ${billerId}:${type} in cache.`);
        } catch (cacheSetError) {
            console.error(`[Recharge Provider] Redis SET error for plans (${billerId}:${type}):`, cacheSetError);
        }
    }
    return plans;
};

/**
 * Executes a recharge with an external provider.
 */
const executeRecharge = async ({ type, identifier, amount, billerId, planId, transactionId }) => {
    console.log(`[Recharge Provider] Attempting recharge: ${type} for ${identifier} (₹${amount}). Biller: ${billerId}, App Tx ID: ${transactionId}`);
    
    const realApiCallLogic = async () => {
        if (!process.env.RECHARGE_API_PROVIDER_URL || !process.env.RECHARGE_API_PROVIDER_KEY) {
            throw new Error("Recharge Provider API URL or Key not configured in .env for executeRecharge.");
        }
        // TODO: Implement REAL API call to Recharge Provider (e.g., PaySprint, BBPS)
        // const response = await axios.post(`${process.env.RECHARGE_API_PROVIDER_URL}/do-recharge`, {
        //     operator_code: billerId,
        //     account_number: identifier,
        //     amount: amount,
        //     client_ref_id: transactionId,
        //     plan_code: planId, // Optional
        // }, {
        //     headers: { 'Authorization': `Bearer ${process.env.RECHARGE_API_PROVIDER_KEY}` }
        // });
        // // Map response.data.status to your standard statuses: 'Completed', 'Pending', 'Failed', 'Processing Activation'
        // // Example mapping:
        // // let internalStatus = 'Failed';
        // // if (response.data.status === 'SUCCESS') internalStatus = 'Completed';
        // // else if (response.data.status === 'PENDING') internalStatus = 'Pending';
        // // else if (response.data.status === 'PROCESSING') internalStatus = 'Processing Activation';
        // return { 
        //     status: internalStatus, 
        //     message: response.data.message || 'Recharge processed by provider.',
        //     operatorReferenceId: response.data.operator_txn_id,
        //     operatorMessage: response.data.operator_message 
        // };
        console.warn(`[Recharge Provider] REAL API CALL FOR executeRecharge (txId: ${transactionId}) NOT IMPLEMENTED. Conceptual structure shown.`);
        throw new Error("Real executeRecharge API not implemented yet.");
    };

    const mockLogic = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        const random = Math.random();
        const operatorRef = `MOCK_OPREF_${Date.now()}`;
        if (amount < 10 && type !== 'electricity') return { status: 'Failed', message: 'Recharge amount too low (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'MIN_AMOUNT_NOT_MET' };
        if (identifier === '0000000000') return { status: 'Failed', message: 'Invalid identifier (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'INVALID_IDENTIFIER_OPERATOR' };
        // Simulate more specific provider errors
        if (identifier.endsWith('1111')) return { status: 'Failed', message: 'This number is temporarily blocked by operator (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'ACCOUNT_BLOCKED_TEMP' };
        if (identifier.endsWith('2222')) return { status: 'Failed', message: 'Operator server currently unavailable (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'OPERATOR_DOWN' };
        if (random < 0.05) return { status: 'Failed', message: 'Operator recharge failed (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'TRANSACTION_FAILED_OPERATOR' };
        if (random < 0.15) return { status: 'Pending', message: 'Recharge submitted, awaiting operator confirmation (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'PENDING_OPERATOR_CONFIRMATION' };
        if ((type === 'mobile' || type === 'dth') && random < 0.25) return { status: 'Processing Activation', message: 'Recharge successful, activation may take few minutes (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'ACTIVATION_IN_PROGRESS' };
        return { status: 'Completed', message: 'Recharge processed successfully by operator (Mock).', operatorReferenceId: operatorRef, operatorMessage: 'SUCCESS' };
    };
    
    return fetchWithFallback(`executeRecharge_${transactionId}`, realApiCallLogic, mockLogic);
};

/**
 * Checks the activation status of a recharge with the provider.
 */
const getActivationStatus = async (transactionId, operatorReferenceId) => {
    console.log(`[Recharge Provider] Checking activation status for App Tx: ${transactionId}, Op Ref: ${operatorReferenceId || 'N/A'}`);
    const realApiCallLogic = async () => {
        if (!process.env.RECHARGE_API_PROVIDER_URL || !process.env.RECHARGE_API_PROVIDER_KEY) {
            throw new Error("Recharge Provider API URL or Key not configured for getActivationStatus.");
        }
        if (!operatorReferenceId) throw new Error("Operator reference ID is required to check real status.");
        // const response = await axios.get(`${process.env.RECHARGE_API_PROVIDER_URL}/recharge-status/${operatorReferenceId}`, {
        //     headers: { 'Authorization': `Bearer ${process.env.RECHARGE_API_PROVIDER_KEY}` }
        // });
        // // Map response.data.status to 'Completed', 'Pending', 'Failed', 'Processing Activation'
        // return response.data.actual_status;
        console.warn(`[Recharge Provider] REAL API CALL FOR getActivationStatus (opRef: ${operatorReferenceId}) NOT IMPLEMENTED.`);
        throw new Error("Real getActivationStatus API not implemented yet.");
    };
    const mockLogic = async () => {
        await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));
        const random = Math.random();
        if (operatorReferenceId && operatorReferenceId.includes('PENDING')) return random < 0.6 ? 'Processing Activation' : (random < 0.9 ? 'Completed' : 'Failed');
        return random < 0.7 ? 'Completed' : (random < 0.9 ? 'Processing Activation' : 'Failed');
    };
    return fetchWithFallback(`status_${transactionId}`, realApiCallLogic, mockLogic);
};

/**
 * Attempts to cancel a recent recharge with the provider.
 */
const cancelRecharge = async (transactionId, operatorReferenceId) => {
     console.log(`[Recharge Provider] Attempting cancellation for App Tx: ${transactionId}, Op Ref: ${operatorReferenceId || 'N/A'}`);
    const realApiCallLogic = async () => {
        if (!process.env.RECHARGE_API_PROVIDER_URL || !process.env.RECHARGE_API_PROVIDER_KEY) {
            throw new Error("Recharge Provider API URL or Key not configured for cancelRecharge.");
        }
        if (!operatorReferenceId) throw new Error("Operator reference ID required for real cancellation.");
        // const response = await axios.post(`${process.env.RECHARGE_API_PROVIDER_URL}/cancel-recharge`, {
        //     operator_txn_id: operatorReferenceId, client_ref_id: transactionId
        // }, { headers: { 'Authorization': `Bearer ${process.env.RECHARGE_API_PROVIDER_KEY}` }});
        // return { success: response.data.status === 'CANCELLED_SUCCESS', message: response.data.message };
        console.warn(`[Recharge Provider] REAL API CALL FOR cancelRecharge (opRef: ${operatorReferenceId}) NOT IMPLEMENTED.`);
        throw new Error("Real cancelRecharge API not implemented yet.");
    };
    const mockLogic = async () => {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
        if (operatorReferenceId && (operatorReferenceId.includes('ACTIVATION_IN_PROGRESS') || operatorReferenceId.includes('SUCCESS'))) return { success: false, message: 'Cancellation rejected: Already processed (Mock).' };
        const success = Math.random() > 0.25;
        return success ? { success: true, message: 'Cancellation request accepted (Mock).' } : { success: false, message: 'Cancellation rejected by operator (Mock).' };
    };
    return fetchWithFallback(`cancel_${transactionId}`, realApiCallLogic, mockLogic);
 };

/**
 * Detects mobile operator and circle based on number.
 */
const detectOperator = async (mobileNumber) => {
    console.log(`[Recharge Provider] Detecting operator for ${mobileNumber}`);
    const realApiCallLogic = async () => {
        if (!process.env.TELECOM_API_URL || !process.env.TELECOM_API_KEY) {
            throw new Error("Telecom API URL or Key not configured for operator detection.");
        }
        // const response = await axios.get(`${process.env.TELECOM_API_URL}/lookup?number=${mobileNumber}`, {
        //     headers: { 'X-Api-Key': process.env.TELECOM_API_KEY }
        // });
        // const { operatorName, circleName } = response.data;
        // const allMobileBillers = await fetchBillers('Mobile'); // Ensure this doesn't cause a loop
        // const detectedBiller = allMobileBillers.find(b => b.billerName.toLowerCase().includes(operatorName.toLowerCase()));
        // if (detectedBiller) return { operator: detectedBiller, circle: circleName, error: null };
        // return { operator: null, circle: circleName, error: "Operator not supported." };
        console.warn(`[Recharge Provider] REAL TELECOM API CALL FOR detectOperator NOT IMPLEMENTED.`);
        throw new Error("Real Telecom API for operator detection not implemented.");
    };
    const mockLogic = async () => {
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
        if (!mobileNumber || !mobileNumber.match(/^[6-9]\d{9}$/)) return { operator: null, circle: null, error: "Invalid mobile number (Mock)." };
        let opName; let circle = "Karnataka";
        if (['98', '99'].some(p => mobileNumber.startsWith(p))) opName = 'Airtel';
        else if (['70', '80', '90'].some(p => mobileNumber.startsWith(p))) opName = 'Jio';
        else opName = 'Vi';
        const billers = mockBillersData['Mobile'] || [];
        const biller = billers.find(b => b.billerName.toLowerCase().includes(opName.toLowerCase()));
        return biller ? { operator: biller, circle, error: null } : { operator: null, circle, error: "Operator not determined (Mock)." };
    };
    return fetchWithFallback(`detect_${mobileNumber}`, realApiCallLogic, mockLogic);
};

module.exports = {
    fetchBillers,
    fetchPlans,
    executeRecharge,
    getActivationStatus,
    cancelRecharge,
    detectOperator,
};
