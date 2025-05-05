
/**
 * @fileOverview Service functions for managing temple bookings and donations via the backend API.
 */

import { apiClient } from '@/lib/apiClient';
import { addTransaction } from '@/services/transactionLogger'; // Import centralized logger
import type { Transaction } from './types'; // Import Transaction type
import { format } from "date-fns";

// --- Interfaces ---

// Corresponds to backend/controllers/templeController.js mock data structures
export interface DarshanSlot {
    time: string;
    availability: 'Available' | 'Filling Fast' | 'Full';
    quota: string; // e.g., "Free", "Special Entry (₹300)", "VIP"
    ticketsLeft?: number;
}

export interface VirtualPooja {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: string;
}

export interface PrasadamItem {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    minQuantity?: number;
    maxQuantity?: number;
}

interface CartItemData {
    id: string;
    quantity: number;
}

export interface TempleBooking { // For user's booking history
    bookingId: string;
    templeId: string;
    templeName: string;
    bookingType: 'Darshan' | 'Virtual Pooja';
    bookingDate: Date;
    visitDate?: Date; // For Darshan
    poojaDate?: Date; // For Pooja
    slotTime?: string; // For Darshan
    quota?: string; // For Darshan
    poojaName?: string; // For Pooja
    numberOfPersons?: number; // For Darshan
    devoteeName?: string; // For Pooja
    gotra?: string; // For Pooja
    totalAmount: number;
    status: 'Confirmed' | 'Cancelled' | 'Pending'; // Add more statuses if needed
    accessPassData?: string; // QR code data for Darshan
}

// --- Service Functions ---

/**
 * Fetches available Darshan slots for a specific temple and date from the backend.
 * @param templeId ID of the temple.
 * @param date Selected date (YYYY-MM-DD format).
 * @returns Promise resolving to an array of DarshanSlot objects.
 */
export async function searchDarshanSlots(templeId: string, date: string): Promise<DarshanSlot[]> {
    console.log(`Fetching Darshan slots via API for: ${templeId}, Date: ${date}`);
    try {
        const slots = await apiClient<DarshanSlot[]>('/temple/darshan/slots', {
            params: { templeId, date } // Assuming backend takes query params
        });
        return slots;
    } catch (error) {
        console.error("Error fetching Darshan slots via API:", error);
        return [];
    }
}

/**
 * Books a Darshan slot via the backend API.
 * @param details Booking details.
 * @returns Promise resolving to an object with success status, booking ID, and access pass data.
 */
export async function bookDarshanSlot(details: {
    templeId: string;
    templeName: string;
    date: string; // YYYY-MM-DD
    slotTime: string;
    quota: string;
    persons: number;
    totalAmount: number;
}): Promise<{ success: boolean; bookingId?: string; accessPassData?: string; message?: string }> {
    console.log("Booking Darshan slot via API:", details);
    try {
        const result = await apiClient<{ success: boolean; bookingId?: string; accessPassData?: string; message?: string }>('/temple/darshan/book', {
            method: 'POST',
            body: JSON.stringify(details),
        });
        return result;
    } catch (error: any) {
        console.error("Error booking Darshan slot via API:", error);
        return { success: false, message: error.message || "Failed to book slot." };
    }
}

/**
 * Fetches available Virtual Poojas for a specific temple from the backend.
 * @param templeId ID of the temple.
 * @returns Promise resolving to an array of VirtualPooja objects.
 */
export async function getAvailablePoojas(templeId: string): Promise<VirtualPooja[]> {
    console.log(`Fetching Virtual Poojas via API for: ${templeId}`);
    try {
        const poojas = await apiClient<VirtualPooja[]>('/temple/pooja/list', {
            params: { templeId }
        });
        return poojas;
    } catch (error) {
        console.error("Error fetching Virtual Poojas via API:", error);
        return [];
    }
}

/**
 * Books a Virtual Pooja via the backend API.
 * @param details Booking details.
 * @returns Promise resolving to an object with success status and booking ID.
 */
export async function bookVirtualPooja(details: {
    templeId: string;
    templeName: string;
    poojaId: string;
    poojaName: string;
    date: string; // YYYY-MM-DD
    devoteeName: string;
    gotra?: string;
    amount: number;
}): Promise<{ success: boolean; bookingId?: string; message?: string }> {
    console.log("Booking Virtual Pooja via API:", details);
    try {
        const result = await apiClient<{ success: boolean; bookingId?: string; message?: string }>('/temple/pooja/book', {
            method: 'POST',
            body: JSON.stringify(details),
        });
        return result;
    } catch (error: any) {
        console.error("Error booking Virtual Pooja via API:", error);
        return { success: false, message: error.message || "Failed to book pooja." };
    }
}


/**
 * Fetches available Prasadam items for a specific temple from the backend.
 * @param templeId ID of the temple.
 * @returns Promise resolving to an array of PrasadamItem objects.
 */
export async function getAvailablePrasadam(templeId: string): Promise<PrasadamItem[]> {
    console.log(`Fetching Prasadam items via API for: ${templeId}`);
    try {
        const items = await apiClient<PrasadamItem[]>('/temple/prasadam/list', {
            params: { templeId }
        });
        return items;
    } catch (error) {
        console.error("Error fetching Prasadam items via API:", error);
        return [];
    }
}

/**
 * Places an order for Prasadam via the backend API.
 * @param details Order details including cart and address.
 * @returns Promise resolving to an object with success status and order ID.
 */
export async function orderPrasadam(details: {
    templeId: string;
    templeName: string;
    cartItems: CartItemData[]; // Array of { id: string, quantity: number }
    totalAmount: number; // Backend should recalculate/validate
    deliveryAddress: any; // Use a specific address interface later
}): Promise<{ success: boolean; orderId?: string; message?: string }> {
    console.log("Ordering Prasadam via API:", details);
    try {
        const result = await apiClient<{ success: boolean; orderId?: string; message?: string }>('/temple/prasadam/order', {
            method: 'POST',
            body: JSON.stringify(details),
        });
        return result;
    } catch (error: any) {
        console.error("Error ordering Prasadam via API:", error);
        return { success: false, message: error.message || "Failed to place prasadam order." };
    }
}

/**
 * Submits a donation to a temple via the backend API.
 * @param details Donation details.
 * @returns Promise resolving to an object with success status and transaction ID.
 */
export async function donateToTemple(details: {
    templeId: string;
    templeName: string;
    scheme?: string;
    amount: number;
    donorName?: string;
    panNumber?: string;
    isAnonymous?: boolean;
}): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    console.log("Submitting donation via API:", details);
    try {
        const result = await apiClient<{ success: boolean; transactionId?: string; message?: string }>('/temple/donate', {
            method: 'POST',
            body: JSON.stringify(details),
        });
        return result;
    } catch (error: any) {
        console.error("Error submitting donation via API:", error);
        return { success: false, message: error.message || "Failed to process donation." };
    }
}

/**
 * Fetches the user's temple booking history from the backend.
 * @returns Promise resolving to an array of TempleBooking objects.
 */
export async function getMyTempleBookings(): Promise<TempleBooking[]> {
    console.log("Fetching user's temple bookings via API...");
    try {
        const bookings = await apiClient<TempleBooking[]>('/temple/my-bookings');
        // Convert date strings
        return bookings.map(b => ({
            ...b,
            bookingDate: new Date(b.bookingDate),
            visitDate: b.visitDate ? new Date(b.visitDate) : undefined,
            poojaDate: b.poojaDate ? new Date(b.poojaDate) : undefined,
        }));
    } catch (error) {
        console.error("Error fetching temple bookings via API:", error);
        return [];
    }
}

// Add functions for other temple service endpoints (Live URL, Audio, Events, Accommodation, Group Visit, Access Pass Info)
// Example:
// export async function getLiveDarshanUrl(templeId: string): Promise<string | null> { ... }
// export async function getTempleAudio(templeId?: string, category?: string): Promise<AudioTrack[]> { ... }
// ... and so on

