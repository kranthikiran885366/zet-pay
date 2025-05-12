
import type { Biller, RechargePlan } from '@/services/recharge';

export const mockBillersData: { [key: string]: Biller[] } = {
    Mobile: [
        { billerId: 'airtel-prepaid', billerName: 'Airtel Prepaid', billerType: 'Mobile', logoUrl: '/logos/airtel.png' },
        { billerId: 'jio-prepaid', billerName: 'Jio Prepaid', billerType: 'Mobile', logoUrl: '/logos/jio.png' },
        { billerId: 'vi-prepaid', billerName: 'Vodafone Idea (Vi)', billerType: 'Mobile', logoUrl: '/logos/vi.png' },
        { billerId: 'bsnl-prepaid', billerName: 'BSNL Prepaid', billerType: 'Mobile', logoUrl: '/logos/bsnl.png' },
    ],
    Dth: [
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
     Electricity: [ // Used for prepaid electricity example too
        { billerId: 'bescom', billerName: 'BESCOM (Bangalore)', billerType: 'Electricity'},
        { billerId: 'mseb', billerName: 'Mahadiscom (MSEB)', billerType: 'Electricity'},
        { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity', logoUrl: '/logos/bescom.png' },
        { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity', logoUrl: '/logos/tneb.png' },
    ],
    Datacard: [
        { billerId: 'jio-datacard', billerName: 'JioFi', billerType: 'Datacard', logoUrl: '/logos/jio.png' },
        { billerId: 'airtel-datacard', billerName: 'Airtel Data Card', billerType: 'Datacard', logoUrl: '/logos/airtel.png' },
        { billerId: 'vi-datacard', billerName: 'Vi Data Card', billerType: 'Datacard', logoUrl: '/logos/vi.png' },
    ],
    // Adding mock billers for Bus Pass & Metro as they might be listed via getBillers
    Buspass: [
      { billerId: 'bmtc-pass', billerName: 'BMTC Pass', billerType: 'Buspass', logoUrl: '/logos/bmtc.png' },
      { billerId: 'best-pass', billerName: 'BEST Pass (Mumbai)', billerType: 'Buspass', logoUrl: '/logos/best.png' },
    ],
    Metro: [
      { billerId: 'blr-metro', name: 'Namma Metro (Bangalore)', billerType: 'Metro', logoUrl: '/logos/namma_metro.png' },
      { billerId: 'del-metro', name: 'Delhi Metro (DMRC)', billerType: 'Metro', logoUrl: '/logos/dmrc.png' },
    ],
};


export const mockRechargePlansData: RechargePlan[] = [
    { planId: 'jio239', description: 'Unlimited Calls, 1.5GB/Day, 100 SMS/Day', price: 239, validity: '28 Days', data: '1.5GB/Day', talktime: -1, sms: 100, category: 'Popular', isOffer: true },
    { planId: 'jio149', description: 'Unlimited Calls, 1GB/Day, 100 SMS/Day', price: 149, validity: '20 Days', data: '1GB/Day', talktime: -1, sms: 100, category: 'Unlimited' },
    { planId: 'jioData15', description: '1GB Data Add-on', price: 15, validity: 'Existing Plan', data: '1GB', category: 'Data' },
    { planId: 'jioTalk20', description: '₹14.95 Talktime', price: 20, validity: 'Unlimited', talktime: 14.95, category: 'Top-up' },
    { planId: 'jioAnnual2999', description: 'Unlimited Calls, 2.5GB/Day, Disney+Hotstar', price: 2999, validity: '365 Days', data: '2.5GB/Day', talktime: -1, sms: 100, category: 'Annual', isOffer: true  },
    { planId: 'jioSms100', description: '1000 Local/National SMS', price: 51, validity: '28 Days', sms: 1000, category: 'SMS' },
    { planId: 'jioIR575', description: 'International Roaming Pack - USA', price: 575, validity: '1 Day', data: '250MB', category: 'Roaming' },
];

export const mockDthPlansData: RechargePlan[] = [
    { planId: 'tpBasic', description: 'Basic Pack - Hindi Entertainment', price: 250, validity: '30 Days', channels: '150+ Channels', category: 'Basic Packs' },
    { planId: 'tpHDMega', description: 'HD Mega Pack - All Channels', price: 599, validity: '30 Days', channels: '250+ Channels (Includes HD)', category: 'HD Packs', isOffer: true },
    { planId: 'tpSports', description: 'Sports Add-on', price: 150, validity: '30 Days', channels: 'All Sports Channels', category: 'Add-Ons' },
    { planId: 'tpTopup100', description: 'Account Top-up', price: 100, validity: 'N/A', category: 'Top-Up Packs' },
];

export const mockDataCardPlansData: RechargePlan[] = [
    { planId: 'dc10gb', description: '10GB High-Speed Data', price: 199, validity: '28 Days', data: '10GB', category: 'Monthly' },
    { planId: 'dc25gb', description: '25GB High-Speed Data', price: 349, validity: '28 Days', data: '25GB', category: 'Monthly', isOffer: true },
    { planId: 'dc5gbAddon', description: '5GB Data Add-on', price: 99, validity: 'Existing Plan', data: '5GB', category: 'Add-On' },
];

export const mockFastagBillersData: Biller[] = [
    { billerId: 'paytm-fastag', billerName: 'Paytm Payments Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/paytm.png' },
    { billerId: 'icici-fastag', billerName: 'ICICI Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/icici.png' },
    { billerId: 'hdfc-fastag', billerName: 'HDFC Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/hdfc.png' },
    { billerId: 'axis-fastag', billerName: 'Axis Bank FASTag', billerType: 'Fastag', logoUrl: '/logos/axis.png' },
];
