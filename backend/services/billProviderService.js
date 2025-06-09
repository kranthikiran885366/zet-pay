
// backend/services/billProviderService.js
// Placeholder for actual BBPS / Biller Aggregator interaction
const { addDays, format } = require('date-fns'); 

const mockBillersByType = {
    Electricity: [
         { billerId: 'bescom', billerName: 'BESCOM (Bangalore)', billerType: 'Electricity', logoUrl: '/logos/bescom.png'}, 
         { billerId: 'mseb', billerName: 'Mahadiscom (MSEB)', billerType: 'Electricity', logoUrl: '/logos/mseb.png'},
         { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity' },
         { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity' },
    ],
    Water: [
        { billerId: 'bwssb', billerName: 'BWSSB (Bangalore)', billerType: 'Water' },
        { billerId: 'delhi-jal', billerName: 'Delhi Jal Board', billerType: 'Water' },
    ],
    Insurance: [
        { billerId: 'lic', billerName: 'LIC Premium', billerType: 'Insurance', logoUrl: '/logos/lic.png' },
        { billerId: 'hdfc-life', billerName: 'HDFC Life', billerType: 'Insurance', logoUrl: '/logos/hdfc_life.png' },
        { billerId: 'star-health', billerName: 'Star Health Insurance', billerType: 'Insurance', logoUrl: '/logos/star_health.png' },
        { billerId: 'bajaj-allianz-gen', billerName: 'Bajaj Allianz General Insurance', billerType: 'Insurance', logoUrl: '/logos/bajaj_allianz.png' },
    ],
    'Credit Card': [ 
        { billerId: 'hdfc-cc', billerName: 'HDFC Bank Credit Card', billerType: 'Credit Card' },
        { billerId: 'icici-cc', billerName: 'ICICI Bank Credit Card', billerType: 'Credit Card' },
    ],
     Loan: [
        { billerId: 'bajaj-finance', billerName: 'Bajaj Finance Loan', billerType: 'Loan' },
        { billerId: 'hdfc-loan', billerName: 'HDFC Personal Loan', billerType: 'Loan' },
    ],
    Gas: [ { billerId: 'igl', billerName: 'Indraprastha Gas (IGL)', billerType: 'Gas' } ],
    Broadband: [ { billerId: 'act', billerName: 'ACT Fibernet', billerType: 'Broadband' } ],
    Education: [ 
        { billerId: 'mock-school-1', billerName: 'ABC Public School', billerType: 'Education', logoUrl: '/logos/abc_school.png' },
        { billerId: 'mock-college-1', billerName: 'XYZ Engineering College', billerType: 'Education', logoUrl: '/logos/xyz_college.png' },
        { billerId: 'mock-uni-1', billerName: 'University of Example', billerType: 'Education', logoUrl: '/logos/uni_example.png' },
    ],
    'Cable TV': [ 
        { billerId: 'hathway-cable', billerName: 'Hathway Cable TV', billerType: 'Cable TV', logoUrl: '/logos/hathway.png' },
        { billerId: 'den-cable', billerName: 'DEN Networks', billerType: 'Cable TV', logoUrl: '/logos/den.png' },
    ],
    'Housing Society': [ 
        { billerId: 'mygate-society', billerName: 'MyGate Society (Mock)', billerType: 'Housing Society', logoUrl: '/logos/mygate.png' },
        { billerId: 'nobroker-society', billerName: 'NoBrokerHood Society (Mock)', billerType: 'Housing Society', logoUrl: '/logos/nobroker.png'}
    ],
    'Club Fee': [ 
        { billerId: 'city-sports-club', billerName: 'City Sports Club (Mock)', billerType: 'Club Fee', logoUrl: '/logos/sports_club.png' },
        { billerId: 'golf-club-intl', billerName: 'International Golf Club (Mock)', billerType: 'Club Fee', logoUrl: '/logos/golf_club.png'}
    ],
    Donation: [ 
        { billerId: 'akshaya-patra', billerName: 'Akshaya Patra Foundation', billerType: 'Donation', logoUrl: '/logos/akshayapatra.png' },
        { billerId: 'cry-india', billerName: 'CRY - Child Rights and You', billerType: 'Donation', logoUrl: '/logos/cry.png' }
    ],
    Fastag: [ 
             { billerId: 'paytm-fastag', billerName: 'Paytm Payments Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/paytm.png'},
             { billerId: 'icici-fastag', billerName: 'ICICI Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/icici.png'},
    ],
    'Mobile Postpaid': [ 
        { billerId: 'airtel-postpaid', billerName: 'Airtel Postpaid', billerType: 'Mobile Postpaid', logoUrl: '/logos/airtel.png' },
        { billerId: 'jio-postpaid', billerName: 'Jio Postpaid', billerType: 'Mobile Postpaid', logoUrl: '/logos/jio.png' },
    ],
    LPG: [ // Added LPG
        { billerId: 'indane', billerName: 'Indane Gas (IndianOil)', billerType: 'LPG', logoUrl: '/logos/indane.png', fixedPrice: 950.50 },
        { billerId: 'hp-gas', billerName: 'HP Gas', billerType: 'LPG', logoUrl: '/logos/hp_gas.png', fixedPrice: 945.00 },
        { billerId: 'bharat-gas', billerName: 'Bharat Gas', billerType: 'LPG', logoUrl: '/logos/bharat_gas.png', fixedPrice: 960.00 },
    ],
    'Property Tax': [ // Added Property Tax
        { billerId: 'bbmp-tax', billerName: 'BBMP Property Tax (Bangalore)', billerType: 'Property Tax', logoUrl: '/logos/bbmp.png' },
        { billerId: 'mcgm-tax', billerName: 'MCGM Property Tax (Mumbai)', billerType: 'Property Tax', logoUrl: '/logos/mcgm.png' },
    ]
};

async function fetchBillers(type) {
    console.log(`[Bill Provider Sim] Fetching billers for type: ${type}`);
    await new Promise(resolve => setTimeout(resolve, 400)); 
    return mockBillersByType[type] || [];
}

async function fetchBill(billerId, identifier, billType) {
    console.log(`[Bill Provider Sim] Fetching bill for Biller: ${billerId}, Identifier: ${identifier}, Type: ${billType}`);
    await new Promise(resolve => setTimeout(resolve, 1200)); 

    if (billerId === 'bescom' && identifier === '12345') {
        return { success: true, amount: 1350.75, dueDate: addDays(new Date(), 10), consumerName: 'Chandra Sekhar', status: 'DUE' };
    }
    if (billerId === 'bwssb' && identifier === 'W9876') {
         return { success: true, amount: 420.00, dueDate: addDays(new Date(), 5), consumerName: 'Test User', status: 'DUE' };
    }
    if (billerId === 'mock-school-1' && identifier === 'S101' && billType === 'Education') {
         return { success: true, amount: 5000.00, dueDate: addDays(new Date(), 20), consumerName: 'Student Mock Name', status: 'DUE' };
    }
    if (billerId === 'hdfc-cc' && identifier === '4111********1111') {
          return { success: true, amount: 12345.67, dueDate: addDays(new Date(), 15), consumerName: 'Card Holder', status: 'DUE', minAmountDue: 1000 };
    }
    if (billType === 'LPG' && mockBillersByType['LPG'].some(p => p.billerId === billerId)) {
        const provider = mockBillersByType['LPG'].find(p => p.billerId === billerId);
        if (provider && provider.fixedPrice) {
            return { success: true, amount: provider.fixedPrice, consumerName: `LPG Customer ${identifier.slice(-4)}`, status: 'DUE' };
        }
    }
    if (billType === 'Property Tax' && identifier.startsWith('PTAX')) {
        return { success: true, amount: parseFloat((Math.random() * 5000 + 500).toFixed(2)), consumerName: `Property Owner ${identifier.slice(-3)}`, status: 'DUE', dueDate: addDays(new Date(), 30) };
    }


    console.log(`[Bill Provider Sim] No mock bill found for ${billerId}, ${identifier}, ${billType}. Manual entry allowed.`);
    return { success: false, message: 'Bill details not found. Manual entry allowed.', amount: null };
}

async function payBill(details) {
    const { billerId, identifier, amount, type, transactionId } = details;
    console.log(`[Bill Provider Sim] Paying bill: Biller ${billerId}, ID ${identifier}, Amt ${amount}, Type ${type}, Ref ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    if (billerId === 'fail-biller') {
         console.warn('[Bill Provider Sim] Bill payment failed (Simulated Biller).');
         return { status: 'Failed', message: 'Payment rejected by biller (Simulated).', operatorMessage: 'BILLER_REJECTED' };
    }
     if (amount > 50000 && type !== 'Education' && type !== 'Property Tax') { 
         console.warn('[Bill Provider Sim] Bill payment failed (Simulated Amount Limit).');
         return { status: 'Failed', message: 'Payment amount exceeds limit (Simulated).', operatorMessage: 'AMOUNT_LIMIT_EXCEEDED' };
     }

    const random = Math.random();
    if (random < 0.08) { 
        console.warn('[Bill Provider Sim] Bill payment failed (Random).');
        return { status: 'Failed', message: 'Payment rejected by biller.', operatorMessage: 'Biller Payment Failed' };
    }
    if (random < 0.20) { 
        console.log('[Bill Provider Sim] Bill payment pending confirmation.');
        return { status: 'Pending', message: 'Payment submitted, awaiting biller confirmation.', operatorMessage: 'Pending Biller Confirmation', billerReferenceId: `BILLPEND_${Date.now()}` };
    }

    console.log('[Bill Provider Sim] Bill payment successful.');
    return { status: 'Completed', message: `${type} payment of ₹${amount} successful.`, operatorMessage: 'Success', billerReferenceId: `BILLPAY_${Date.now()}` };
}


module.exports = {
    fetchBillers, 
    fetchBill,
    payBill,
};
