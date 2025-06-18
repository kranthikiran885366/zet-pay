
// backend/services/investmentProviderService.js
const axios = require('axios');
const { mockFundsData, mockFundDetailsData: mockFundDetailsSeed, mockGoldPriceData, mockDepositSchemesData } = require('../../src/mock-data/investment');

// Environment variable placeholders for real APIs
const INVESTMENT_API_URL = process.env.BSE_STAR_API_URL || 'https://api.exampleinvest.com/v1'; // Example for MF
const INVESTMENT_API_KEY = process.env.BSE_STAR_API_KEY || 'YOUR_INVESTMENT_API_KEY_PLACEHOLDER';
const GOLD_API_URL = process.env.GOLD_PROVIDER_API_URL || 'https://api.examplegold.com/v1';
const GOLD_API_KEY = process.env.GOLD_API_KEY_PLACEHOLDER || 'YOUR_GOLD_API_KEY_PLACEHOLDER';
const DEPOSIT_API_URL = process.env.DEPOSIT_AGGREGATOR_API_URL || 'https://api.exampledeposits.com/v1';
const DEPOSIT_API_KEY = process.env.DEPOSIT_API_KEY_PLACEHOLDER || 'YOUR_DEPOSIT_API_KEY_PLACEHOLDER';


async function makeApiCall(baseUrl, apiKey, endpoint, params = {}, method = 'GET', data = null) {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const config = { headers, params, method, data };

    if (apiKey === 'YOUR_INVESTMENT_API_KEY_PLACEHOLDER' || apiKey === 'YOUR_GOLD_API_KEY_PLACEHOLDER' || apiKey === 'YOUR_DEPOSIT_API_KEY_PLACEHOLDER' || process.env.USE_REAL_INVESTMENT_API !== 'true') {
        console.warn(`[Investment Provider] MOCK API call for ${endpoint}. Real API not configured or not enabled.`);
        throw new Error("Mock logic needs to be handled by caller or this function should return mock.");
    }
    // TODO: Implement REAL API call
    // const response = await axios({ url: `${baseUrl}${endpoint}`, ...config });
    // if (response.status < 200 || response.status >= 300) throw new Error(response.data?.message || `API Error: ${response.status}`);
    // return response.data;
    console.error(`[Investment Provider] REAL API call for ${baseUrl}${endpoint} NOT IMPLEMENTED.`);
    throw new Error("Real Investment API integration not implemented.");
}

// --- Mutual Funds ---
async function searchFunds({ query, category, riskLevel, fundHouse }) {
    console.log("[Investment Provider] Searching MF (API):", { query, category, riskLevel, fundHouse });
    const endpoint = '/funds/search';
    const params = { q: query, category, risk: riskLevel, amc: fundHouse };
    try {
        // return await makeApiCall(INVESTMENT_API_URL, INVESTMENT_API_KEY, endpoint, params); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 700));
        let results = mockFundsData;
        if (query) results = results.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.amc?.toLowerCase().includes(query.toLowerCase()));
        if (category) results = results.filter(f => f.category === category);
        if (riskLevel) results = results.filter(f => f.risk === riskLevel);
        if (fundHouse) results = results.filter(f => f.amc === fundHouse);
        return results;
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for searchFunds: ${error.message}`);
        return mockFundsData.slice(0,3);
    }
}

async function getFundDetails(fundId) {
    console.log("[Investment Provider] Getting details for MF (API):", fundId);
    const endpoint = `/funds/${fundId}`;
    try {
        // return await makeApiCall(INVESTMENT_API_URL, INVESTMENT_API_KEY, endpoint); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 500));
        const baseFund = mockFundsData.find(f => f.fundId === fundId);
        if (!baseFund) return null;
        return { ...baseFund, ...(mockFundDetailsSeed[fundId] || { nav: Math.random()*100 + 50, returns: {'1Y':0,'3Y':0,'5Y':0}, expenseRatio:0, minInvestment:0, minSip:0 }) };
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for getFundDetails: ${error.message}`);
        const baseFund = mockFundsData.find(f => f.fundId === fundId);
        return baseFund ? { ...baseFund, nav: 100, returns:{'1Y':10,'3Y':12,'5Y':15}, expenseRatio:0.5, minInvestment:1000, minSip:500 } : null;
    }
}

async function placeInvestmentOrder(orderDetails) {
    console.log("[Investment Provider] Placing MF Order with provider (API):", orderDetails);
    const endpoint = '/orders'; // Example for BSE StAR MF
    const payload = { /* Transform orderDetails to provider's expected format */ ...orderDetails };
    try {
        // return await makeApiCall(INVESTMENT_API_URL, INVESTMENT_API_KEY, endpoint, {}, 'POST', payload); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1200));
        const success = Math.random() > 0.05;
        if (success) {
            return { status: orderDetails.investmentType === 'SIP' ? 'SIP Registered' : 'Pending Allotment', orderId: `MFORD_REAL_${Date.now()}`, folioNumber: `FOLIO_${Math.floor(Math.random()*10000)}`, message: `${orderDetails.investmentType} order placed with platform.` };
        }
        return { status: 'Failed', message: 'Failed to place investment order with platform (Simulated provider error).' };
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock failure for placeInvestmentOrder: ${error.message}`);
        return { status: 'Failed', message: `Investment order failed: ${error.message}` };
    }
}

// --- Digital Gold ---
async function fetchGoldPrice() {
    console.log("[Investment Provider] Fetching Gold Price from provider (API)...");
    const endpoint = '/price';
    try {
        // return await makeApiCall(GOLD_API_URL, GOLD_API_KEY, endpoint); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockGoldPriceData;
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for fetchGoldPrice: ${error.message}`);
        return { buyPricePerGram: 7000, sellPricePerGram: 6900, timestamp: new Date().toISOString() };
    }
}

async function buyDigitalGold(details) {
    console.log("[Investment Provider] Buying Digital Gold (API):", details);
    const endpoint = '/buy';
    const payload = { userId: details.userId, amount_inr: details.amountInINR, amount_grams: details.amountInGrams, client_txn_id: details.paymentTransactionId };
    try {
        // return await makeApiCall(GOLD_API_URL, GOLD_API_KEY, endpoint, {}, 'POST', payload); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1000));
        const success = Math.random() > 0.05;
        if (success) {
            const grams = details.amountInINR ? (details.amountInINR / 7050).toFixed(4) : details.amountInGrams;
            return { success: true, goldTxnId: `GOLD_BUY_REAL_${Date.now()}`, gramsAllotted: grams, rateApplied: 7050, message: `Successfully bought ${grams}g of Gold.` };
        }
        return { success: false, message: 'Gold purchase failed (Simulated provider issue).' };
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for buyDigitalGold: ${error.message}`);
        return { success: false, message: `Gold purchase failed: ${error.message}` };
    }
}

async function sellDigitalGold(details) {
    console.log("[Investment Provider] Selling Digital Gold (API):", details);
    const endpoint = '/sell';
    const payload = { userId: details.userId, amount_grams: details.amountInGrams, credit_account_id: details.bankAccountIdForCredit };
    try {
        // return await makeApiCall(GOLD_API_URL, GOLD_API_KEY, endpoint, {}, 'POST', payload); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1100));
        const success = Math.random() > 0.05;
        if (success) {
            const amountCredited = (details.amountInGrams * 6950).toFixed(2);
            return { success: true, goldTxnId: `GOLD_SELL_REAL_${Date.now()}`, amountCredited: amountCredited, rateApplied: 6950, message: `Successfully sold ${details.amountInGrams}g. Amount ₹${amountCredited} will be credited.` };
        }
        return { success: false, message: 'Gold sell failed (Simulated provider issue).' };
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for sellDigitalGold: ${error.message}`);
        return { success: false, message: `Gold sell failed: ${error.message}` };
    }
}

async function getGoldHoldings(userId) {
    console.log("[Investment Provider] Fetching user's Gold Holdings (API):", userId);
    const endpoint = `/holdings/${userId}`;
    try {
        // return await makeApiCall(GOLD_API_URL, GOLD_API_KEY, endpoint); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 400));
        return { grams: (Math.random() * 10).toFixed(4), currentValue: (Math.random() * 70000).toFixed(2), lastUpdated: new Date().toISOString() };
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for getGoldHoldings: ${error.message}`);
        return { grams: (Math.random() * 5).toFixed(4), currentValue: (Math.random() * 35000).toFixed(2), lastUpdated: new Date().toISOString() };
    }
}

// --- Deposits (FD/RD) ---
async function getDepositSchemes(bankId, depositType) {
    console.log("[Investment Provider] Fetching Deposit Schemes (API) for bank:", bankId, "Type:", depositType);
    const endpoint = '/schemes';
    const params = { bank_id: bankId, type: depositType };
    try {
        // return await makeApiCall(DEPOSIT_API_URL, DEPOSIT_API_KEY, endpoint, params); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 600));
        return mockDepositSchemesData;
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for getDepositSchemes: ${error.message}`);
        return mockDepositSchemesData;
    }
}

async function bookDeposit(details) {
    console.log("[Investment Provider] Booking Deposit (API):", details);
    const endpoint = '/book';
    const payload = { userId: details.userId, scheme_id: details.schemeId, amount: details.amount, tenure: details.tenureMonths, source_account_id: details.sourceAccountId, client_txn_id: details.paymentTransactionId };
    try {
        // return await makeApiCall(DEPOSIT_API_URL, DEPOSIT_API_KEY, endpoint, {}, 'POST', payload); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1300));
        const success = Math.random() > 0.05;
        if (success) {
            return { success: true, depositId: `DEP_REAL_${Date.now()}`, maturityDate: new Date(Date.now() + details.tenureMonths * 30 * 86400000).toISOString(), maturityAmount: (details.amount * (1 + (0.07/12) * details.tenureMonths)).toFixed(2), message: 'Deposit booked successfully with bank.' };
        }
        return { success: false, message: 'Deposit booking failed with bank (Simulated provider error).' };
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock failure for bookDeposit: ${error.message}`);
        return { success: false, message: `Deposit booking failed: ${error.message}` };
    }
}

async function getUserDeposits(userId) {
    console.log("[Investment Provider] Fetching user's Deposits (API):", userId);
    const endpoint = `/holdings/${userId}`; // Assuming deposits are part of holdings endpoint or a specific one
    try {
        // return await makeApiCall(DEPOSIT_API_URL, DEPOSIT_API_KEY, endpoint); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 600));
        return [{ depositId: `FD_MOCK_${Date.now()-100000}`, type: 'FD', bankName: 'Mock Bank', principal: 50000, interestRate: 6.8, maturityDate: new Date(Date.now() + 365 * 86400000).toISOString(), status: 'Active' }];
    } catch (error) {
        console.warn(`[Investment Provider] Falling back to mock for getUserDeposits: ${error.message}`);
        return [{ depositId: `FD_ERR_MOCK`, type: 'FD', bankName: 'Mock Bank', principal: 1000, interestRate: 5, maturityDate: new Date().toISOString(), status: 'Active' }];
    }
}

module.exports = {
    searchFunds, getFundDetails, placeInvestmentOrder,
    fetchGoldPrice, buyDigitalGold, sellDigitalGold, getGoldHoldings,
    getDepositSchemes, bookDeposit, getUserDeposits,
};
