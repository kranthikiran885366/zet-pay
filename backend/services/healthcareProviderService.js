
// backend/services/healthcareProviderService.js
const axios = require('axios');
const { mockDoctorsData, mockLabsData, mockLabTestsData, mockMedicinesData, mockFitnessTrainersData, mockHealthPackagesData } = require('../../src/mock-data/healthcare');

const HEALTHCARE_API_URL = process.env.HEALTHCARE_API_URL || 'https://api.examplehealth.com/v1';
const HEALTHCARE_API_KEY = process.env.HEALTHCARE_API_KEY || 'YOUR_HEALTHCARE_API_KEY_PLACEHOLDER';

async function makeApiCall(endpoint, params = {}, method = 'GET', data = null) {
    const headers = { 'Authorization': `Bearer ${HEALTHCARE_API_KEY}`, 'Content-Type': 'application/json' };
    const config = { headers, params, method, data };
    if (process.env.USE_REAL_HEALTHCARE_API !== 'true' || HEALTHCARE_API_KEY === 'YOUR_HEALTHCARE_API_KEY_PLACEHOLDER') {
        console.warn(`[Healthcare Provider] MOCK API call for ${endpoint}. Real API not configured or not enabled.`);
        throw new Error("Mock logic needs to be handled by caller or this function should return mock.");
    }
    // TODO: Implement REAL API call
    // const response = await axios({ url: `${HEALTHCARE_API_URL}${endpoint}`, ...config });
    // if (response.status < 200 || response.status >= 300) throw new Error(response.data?.message || `API Error: ${response.status}`);
    // return response.data;
    console.error(`[Healthcare Provider] REAL API call for ${HEALTHCARE_API_URL}${endpoint} NOT IMPLEMENTED.`);
    throw new Error("Real Healthcare API integration not implemented.");
}

// --- Doctors ---
async function searchDoctors({ specialty, location, name }) {
    console.log("[Healthcare Provider] Searching Doctors (API):", { specialty, location, name });
    try {
        // return await makeApiCall('/doctors/search', { specialty, location, name }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockDoctorsData.filter(doc =>
            (!specialty || doc.specialty.toLowerCase().includes(specialty.toLowerCase())) &&
            (!location || doc.location.toLowerCase().includes(location.toLowerCase())) &&
            (!name || doc.name.toLowerCase().includes(name.toLowerCase()))
        );
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for searchDoctors: ${error.message}`);
        return mockDoctorsData.slice(0, 2);
    }
}

async function getDoctorAvailability(doctorId, date) {
    console.log("[Healthcare Provider] Getting availability for Doctor (API):", doctorId, "Date:", date);
    try {
        // return await makeApiCall(`/doctors/${doctorId}/availability`, { date }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 300));
        const doctor = mockDoctorsData.find(d => d.id === doctorId);
        return doctor?.availability?.[date] || [];
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for getDoctorAvailability: ${error.message}`);
        return ['10:00 AM', '11:00 AM', '02:00 PM'];
    }
}

async function confirmAppointment(bookingDetails) {
    console.log("[Healthcare Provider] Confirming Doctor Appointment (API):", bookingDetails);
    try {
        // return await makeApiCall('/appointments', {}, 'POST', bookingDetails); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 700));
        return { success: true, bookingId: `APT_REAL_${Date.now()}`, message: "Appointment confirmed via provider.", ...bookingDetails };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for confirmAppointment: ${error.message}`);
        return { success: true, bookingId: `APT_MOCK_${Date.now()}`, message: "Appointment confirmed (Mock).", ...bookingDetails };
    }
}

// --- Labs ---
async function searchLabTests(query) {
    console.log("[Healthcare Provider] Searching Lab Tests (API):", query);
    try {
        // return await makeApiCall('/labs/tests/search', { query }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockLabTestsData.filter(test => test.name.toLowerCase().includes(query.toLowerCase()));
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for searchLabTests: ${error.message}`);
        return mockLabTestsData;
    }
}

async function getLabAvailability(labId, testId, date) {
    console.log("[Healthcare Provider] Getting Lab Availability (API):", { labId, testId, date });
    try {
        // return await makeApiCall(`/labs/${labId}/availability`, { test_id: testId, date }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 300));
        return ['09:00 AM (Home)', '11:00 AM (Lab)', '03:00 PM (Home)'];
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for getLabAvailability: ${error.message}`);
        return ['10:00 AM (Home)', '02:00 PM (Lab Visit)'];
    }
}

async function confirmLabTestBooking(bookingDetails) {
    console.log("[Healthcare Provider] Confirming Lab Test Booking (API):", bookingDetails);
    try {
        // return await makeApiCall('/labs/book', {}, 'POST', bookingDetails); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 600));
        return { success: true, bookingId: `LAB_REAL_${Date.now()}`, message: "Lab test booked with provider.", ...bookingDetails };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for confirmLabTestBooking: ${error.message}`);
        return { success: true, bookingId: `LAB_MOCK_${Date.now()}`, message: "Lab test booked (Mock).", ...bookingDetails };
    }
}

// --- Pharmacy ---
async function searchPharmacyMedicines(query) {
    console.log("[Healthcare Provider] Searching Medicines (API):", query);
    try {
        // return await makeApiCall('/pharmacy/medicines/search', { query }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockMedicinesData.filter(med => med.name.toLowerCase().includes(query.toLowerCase()));
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for searchPharmacyMedicines: ${error.message}`);
        return mockMedicinesData;
    }
}

async function placePharmacyOrder(orderDetails) {
    console.log("[Healthcare Provider] Placing Pharmacy Order (API):", orderDetails);
    try {
        // return await makeApiCall('/pharmacy/orders', {}, 'POST', orderDetails); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, orderId: `PHARM_ORD_REAL_${Date.now()}`, message: "Medicine order placed with pharmacy.", ...orderDetails };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for placePharmacyOrder: ${error.message}`);
        return { success: true, orderId: `PHARM_ORD_MOCK_${Date.now()}`, message: "Medicine order placed (Mock).", ...orderDetails };
    }
}

async function createMedicineSubscription(subscriptionDetails) {
    console.log("[Healthcare Provider] Creating Medicine Subscription (API):", subscriptionDetails);
    try {
        // return await makeApiCall('/pharmacy/subscriptions', {}, 'POST', subscriptionDetails); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 600));
        return { success: true, subscriptionId: `SUB_REAL_${Date.now()}`, message: "Subscription created with provider.", ...subscriptionDetails };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for createMedicineSubscription: ${error.message}`);
        return { success: true, subscriptionId: `SUB_MOCK_${Date.now()}`, message: "Subscription created (Mock).", ...subscriptionDetails };
    }
}

// --- Ambulance ---
async function dispatchAmbulance({ userId, location, type }) {
    console.log("[Healthcare Provider] Dispatching Ambulance (API):", { userId, location, type });
    try {
        // return await makeApiCall('/ambulance/request', {}, 'POST', { userId, location, type }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true, eta: `${Math.floor(Math.random() * 10) + 5} mins`, vehicleNo: `REAL_AMB_${Math.floor(Math.random()*1000)}`, driverContact: '9876500111' };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for dispatchAmbulance: ${error.message}`);
        return { success: true, eta: `${Math.floor(Math.random() * 12) + 8} mins (Mock ETA)`, vehicleNo: `MOCK_AMB_${Math.floor(Math.random()*100)}`, driverContact: '9998887770' };
    }
}

// --- Fitness Trainers & Health Packages ---
async function searchFitnessTrainers({ specialty, location }) {
    console.log("[Healthcare Provider] Searching Fitness Trainers (API):", { specialty, location });
    try {
        // return await makeApiCall('/fitness/trainers/search', { specialty, location }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockFitnessTrainersData.filter(t => 
            (!specialty || t.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))) &&
            (!location || t.location.toLowerCase().includes(location.toLowerCase()))
        );
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for searchFitnessTrainers: ${error.message}`);
        return mockFitnessTrainersData;
    }
}

async function bookFitnessSession(details) {
    console.log("[Healthcare Provider] Booking Fitness Session (API):", details);
    try {
        // return await makeApiCall('/fitness/sessions', {}, 'POST', details); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 700));
        return { success: true, bookingId: `FIT_REAL_${Date.now()}`, message: "Session booked with trainer." };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for bookFitnessSession: ${error.message}`);
        return { success: true, bookingId: `FIT_MOCK_${Date.now()}`, message: "Session booked (Mock)." };
    }
}

async function fetchHealthPackages() {
    console.log("[Healthcare Provider] Fetching Health Packages (API)");
    try {
        // return await makeApiCall('/health/packages'); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockHealthPackagesData;
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for fetchHealthPackages: ${error.message}`);
        return mockHealthPackagesData;
    }
}

async function purchaseHealthPackage(details) {
    console.log("[Healthcare Provider] Purchasing Health Package (API):", details);
    try {
        // return await makeApiCall('/health/packages/purchase', {}, 'POST', details); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 900));
        return { success: true, purchaseId: `HP_PUR_REAL_${Date.now()}`, message: "Package purchased from provider." };
    } catch (error) {
        console.warn(`[Healthcare Provider] Falling back to mock for purchaseHealthPackage: ${error.message}`);
        return { success: true, purchaseId: `HP_PUR_MOCK_${Date.now()}`, message: "Package purchased (Mock)." };
    }
}

module.exports = {
    searchDoctors, getDoctorAvailability, confirmAppointment,
    searchLabTests, getLabAvailability, confirmLabTestBooking,
    searchPharmacyMedicines, placePharmacyOrder, createMedicineSubscription,
    dispatchAmbulance,
    searchFitnessTrainers, bookFitnessSession, fetchHealthPackages, purchaseHealthPackage,
};
