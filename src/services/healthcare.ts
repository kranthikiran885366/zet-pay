/**
 * @fileOverview Service functions for Healthcare & Wellness features, interacting with backend APIs.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // For booking/order results if they extend Transaction
import type { Doctor, LabTest, Medicine, FitnessTrainer, HealthPackage, HealthAppointment, LabTestBooking, MedicineOrder, MedicineSubscription } from './types'; // Import shared types

// Re-export types for component usage
export type { Doctor, LabTest, Medicine, FitnessTrainer, HealthPackage, HealthAppointment, LabTestBooking, MedicineOrder, MedicineSubscription };

// --- Doctor Appointments & Video Consultations ---
export async function searchDoctors(params: { specialty?: string; location?: string; name?: string }): Promise<Doctor[]> {
    console.log("[Client Healthcare Service] Searching doctors via API:", params);
    const queryParams = new URLSearchParams();
    if (params.specialty) queryParams.append('specialty', params.specialty);
    if (params.location) queryParams.append('location', params.location);
    if (params.name) queryParams.append('name', params.name);
    try {
        return await apiClient<Doctor[]>(`/healthcare/doctors/search?${queryParams.toString()}`);
    } catch (error) { console.error("Error searching doctors:", error); throw error; }
}

export async function getDoctorSlots(doctorId: string, date: string): Promise<string[]> { // date in YYYY-MM-DD
    console.log(`[Client Healthcare Service] Fetching slots for doctor ${doctorId}, date ${date} via API`);
    try {
        return await apiClient<string[]>(`/healthcare/doctors/slots?doctorId=${doctorId}&date=${date}`);
    } catch (error) { console.error("Error fetching doctor slots:", error); throw error; }
}

export async function bookAppointment(details: Omit<HealthAppointment, 'userId' | 'bookingId'>): Promise<HealthAppointment> {
    console.log("[Client Healthcare Service] Booking appointment via API:", details);
    try {
        const result = await apiClient<HealthAppointment>('/healthcare/appointments/book', {
            method: 'POST', body: JSON.stringify(details),
        });
        return { ...result, date: new Date(result.date).toISOString() };
    } catch (error) { console.error("Error booking appointment:", error); throw error; }
}

// --- Lab Tests ---
export async function searchLabTests(query: string): Promise<LabTest[]> {
    console.log("[Client Healthcare Service] Searching lab tests via API:", query);
    try {
        return await apiClient<LabTest[]>(`/healthcare/labs/tests?query=${encodeURIComponent(query)}`);
    } catch (error) { console.error("Error searching lab tests:", error); throw error; }
}

export async function getLabTestSlots(labId: string, testId: string | undefined, date: string): Promise<string[]> {
    console.log(`[Client Healthcare Service] Fetching slots for lab ${labId}, test ${testId}, date ${date} via API`);
    const params = new URLSearchParams({ labId, date });
    if (testId) params.append('testId', testId);
    try {
        return await apiClient<string[]>(`/healthcare/labs/slots?${params.toString()}`);
    } catch (error) { console.error("Error fetching lab slots:", error); throw error; }
}

export async function bookLabTest(details: Omit<LabTestBooking, 'userId' | 'bookingId'>): Promise<LabTestBooking> {
    console.log("[Client Healthcare Service] Booking lab test via API:", details);
    try {
        const result = await apiClient<LabTestBooking>('/healthcare/labtests/book', {
            method: 'POST', body: JSON.stringify(details),
        });
        return { ...result, date: new Date(result.date).toISOString() };
    } catch (error) { console.error("Error booking lab test:", error); throw error; }
}

// --- Pharmacy / Order Medicines ---
export async function searchMedicines(query: string): Promise<Medicine[]> {
    console.log("[Client Healthcare Service] Searching medicines via API:", query);
    try {
        return await apiClient<Medicine[]>(`/healthcare/pharmacy/search-medicines?query=${encodeURIComponent(query)}`);
    } catch (error) { console.error("Error searching medicines:", error); throw error; }
}

export async function uploadPrescription(file: File): Promise<{ success: boolean; prescriptionId?: string; fileUrl?: string; message?: string }> {
    console.log("[Client Healthcare Service] Uploading prescription via API:", file.name);
    const formData = new FormData();
    formData.append('prescriptionFile', file); // Name 'prescriptionFile' must match backend (e.g., multer fieldname)
    try {
        return await apiClient<{ success: boolean; prescriptionId?: string; fileUrl?: string; message?: string }>('/healthcare/pharmacy/upload-prescription', {
            method: 'POST', body: formData, // Let browser set Content-Type for FormData
        });
    } catch (error) { console.error("Error uploading prescription:", error); throw error; }
}

export async function orderMedicines(details: Omit<MedicineOrder, 'userId' | 'orderId'>): Promise<MedicineOrder> {
    console.log("[Client Healthcare Service] Ordering medicines via API:", details);
    try {
        return await apiClient<MedicineOrder>('/healthcare/pharmacy/order', {
            method: 'POST', body: JSON.stringify(details),
        });
    } catch (error) { console.error("Error ordering medicines:", error); throw error; }
}

export async function setupMedicineSubscription(details: Omit<MedicineSubscription, 'userId' | 'subscriptionId'>): Promise<MedicineSubscription> {
    console.log("[Client Healthcare Service] Setting up medicine subscription via API:", details);
    try {
        const result = await apiClient<MedicineSubscription>('/healthcare/med-subscriptions/setup', {
            method: 'POST', body: JSON.stringify(details),
        });
        return { ...result, startDate: new Date(result.startDate).toISOString() };
    } catch (error) { console.error("Error setting up medicine subscription:", error); throw error; }
}

// --- Emergency Ambulance ---
export async function requestAmbulance(location: { lat: number; lon: number }, type: 'BLS' | 'ALS'): Promise<{ success: boolean; eta?: string; vehicleNo?: string; driverContact?: string; message?: string }> {
    console.log("[Client Healthcare Service] Requesting ambulance via API:", { location, type });
    try {
        return await apiClient<{ success: boolean; eta?: string; vehicleNo?: string; driverContact?: string; message?: string }>('/healthcare/ambulance/request', {
            method: 'POST', body: JSON.stringify({ location, type }),
        });
    } catch (error) { console.error("Error requesting ambulance:", error); throw error; }
}

// --- Fitness Trainers & Health Packages ---
export async function getFitnessTrainers(params: { specialty?: string; location?: string }): Promise<FitnessTrainer[]> {
    const queryParams = new URLSearchParams();
    if(params.specialty) queryParams.append('specialty', params.specialty);
    if(params.location) queryParams.append('location', params.location);
    try { return await apiClient<FitnessTrainer[]>(`/healthcare/fitness/trainers?${queryParams.toString()}`); }
    catch (e) { console.error("Error fetching trainers:", e); throw e; }
}
export async function bookFitnessSession(details: any): Promise<{success: boolean, bookingId?: string}> {
    try { return await apiClient('/healthcare/fitness/book-session', {method: 'POST', body: JSON.stringify(details)}); }
    catch (e) { console.error("Error booking session:", e); throw e; }
}
export async function getHealthPackages(): Promise<HealthPackage[]> {
    try { return await apiClient<HealthPackage[]>('/healthcare/health-packages'); }
    catch (e) { console.error("Error fetching packages:", e); throw e; }
}
export async function purchaseHealthPackage(details: any): Promise<{success: boolean, purchaseId?: string}> {
    try { return await apiClient('/healthcare/health-packages/purchase', {method: 'POST', body: JSON.stringify(details)}); }
    catch (e) { console.error("Error purchasing package:", e); throw e; }
}