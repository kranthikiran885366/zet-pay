// SIMULATED RECHARGE PROVIDER SERVICE
// In reality, this would interact with APIs like BBPS or specific aggregators
const redisClient = require('../config/redisClient');
const CACHE_TTL_BILLERS = 3600; // 1 hour for biller list
const CACHE_TTL_PLANS = 600; // 10 minutes for plan list

const fetchBillers = async (type) => {
    const cacheKey = `billers:${type}`;
    console.log(`[Aggregator Sim] Fetching billers for type: ${type}`);

    try {
        if (redisClient.isOpen) {
            const cachedBillers = await redisClient.get(cacheKey);
            if (cachedBillers) {
                console.log(`[Aggregator Sim] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedBillers);
            }
            console.log(`[Aggregator Sim] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Aggregator Sim] Redis client not open, skipping cache for billers.');
        }
    } catch (cacheError) {
        console.error(`[Aggregator Sim] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    const mockData = { 
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
    const billers = mockData[type] || [];

    try {
        if (redisClient.isOpen && billers.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(billers), { EX: CACHE_TTL_BILLERS });
            console.log(`[Aggregator Sim] Stored ${cacheKey} in cache.`);
        }
    } catch (cacheSetError) {
        console.error(`[Aggregator Sim] Redis SET error for ${cacheKey}:`, cacheSetError);
    }
    return billers;
};

const fetchPlans = async (billerId, type, identifier) => {
    const cacheKey = `plans:${billerId}:${type}:${identifier || 'all'}`;
    console.log(`[Aggregator Sim] Fetching plans for: ${billerId}, Type: ${type}, Identifier: ${identifier || 'N/A'}`);

    try {
        if (redisClient.isOpen) {
            const cachedPlans = await redisClient.get(cacheKey);
            if (cachedPlans) {
                console.log(`[Aggregator Sim] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedPlans);
            }
            console.log(`[Aggregator Sim] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Aggregator Sim] Redis client not open, skipping cache for plans.');
        }
    } catch (cacheError) {
        console.error(`[Aggregator Sim] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const mockRechargePlans = [ 
      { planId: 'jio239', description: 'Unlimited Calls, 1.5GB/Day, 100 SMS/Day', price: 239, validity: '28 Days', data: '1.5GB/Day', talktime: -1, sms: 100, category: 'Popular', isOffer: true },
      { planId: 'jio149', description: 'Unlimited Calls, 1GB/Day, 100 SMS/Day', price: 149, validity: '20 Days', data: '1GB/Day', talktime: -1, sms: 100, category: 'Unlimited' },
    ];
    const mockDthPlans = [ 
      { planId: 'tpBasic', description: 'Basic Pack - Hindi Entertainment', price: 250, validity: '30 Days', channels: '150+ Channels', category: 'Basic Packs' },
      { planId: 'tpHDMega', description: 'HD Mega Pack - All Channels', price: 599, validity: '30 Days', channels: '250+ Channels (Includes HD)', category: 'HD Packs', isOffer: true },
    ];
    const mockDataCardPlans = [ 
      { planId: 'dc10gb', description: '10GB High-Speed Data', price: 199, validity: '28 Days', data: '10GB', category: 'Monthly' },
    ];
    
    let plans = [];
    if (type === 'mobile') plans = mockRechargePlans;
    else if (type === 'dth') plans = mockDthPlans;
    else if (type === 'datacard') plans = mockDataCardPlans;
    
    try {
        if (redisClient.isOpen && plans.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(plans), { EX: CACHE_TTL_PLANS });
            console.log(`[Aggregator Sim] Stored ${cacheKey} in cache.`);
        }
    } catch (cacheSetError) {
        console.error(`[Aggregator Sim] Redis SET error for ${cacheKey}:`, cacheSetError);
    }
    return plans;
};

const executeRecharge = async ({ type, identifier, amount, billerId, planId, transactionId }) => {
    console.log(`[Aggregator Sim] Executing recharge: ${type} ${identifier} for ₹${amount} (Ref: ${transactionId})`);
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    const random = Math.random();
    if (random < 0.05) { 
        console.warn('[Aggregator Sim] Recharge failed.');
        return { status: 'Failed', message: 'Operator recharge failed.', operatorMessage: 'Transaction Failed at Operator' };
    }
    if (random < 0.15) { 
        console.log('[Aggregator Sim] Recharge pending confirmation.');
        return { status: 'Pending', message: 'Recharge submitted, awaiting confirmation.', operatorMessage: 'Pending Confirmation' };
    }
    if (type === 'mobile' && random < 0.25) { 
         console.log('[Aggregator Sim] Recharge successful, activation processing.');
         return { status: 'Processing Activation', message: 'Recharge successful, activation may take a few minutes.', operatorMessage: 'Activation in Progress' };
     }

    console.log('[Aggregator Sim] Recharge successful.');
    return { status: 'Completed', message: 'Recharge processed successfully.', operatorMessage: 'Success' };
};

const getActivationStatus = async (transactionId) => {
    console.log(`[Aggregator Sim] Checking activation status for: ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const random = Math.random();
    if (random < 0.7) return 'Completed';
    if (random < 0.9) return 'Processing Activation';
    return 'Failed';
};

const cancelRecharge = async (transactionId) => {
     console.log(`[Aggregator Sim] Attempting cancellation for: ${transactionId}`);
     await new Promise(resolve => setTimeout(resolve, 500));
     const success = Math.random() > 0.2; 
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
