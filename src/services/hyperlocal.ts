
/**
 * @fileOverview Service functions for Hyperlocal Services, interacting with backend APIs.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // For booking result if it includes transaction details

export interface HyperlocalProvider {
    id: string;
    name: string;
    rating?: number;
    basePrice?: number;
    area?: string;
    logoUrl?: string;
    distance?: string; // Added distance
}

export interface HyperlocalServiceType {
    type: string;
    displayName: string;
    icon?: string; // lucide-react icon name string
    description?: string;
    availableProviders?: number; // Count of providers for this service type
    providers?: HyperlocalProvider[]; // List of actual providers if fetched for a specific type
}

export interface HyperlocalServiceDetails extends HyperlocalProvider { // A provider's details for a service
    serviceType: string;
    slots?: string[]; // Available time slots for a given date
}

export interface HyperlocalBookingPayload {
    serviceType: string; // e.g., 'AC Repair', 'Plumber'
    providerId: string;
    slotTime: string; // e.g., '10:00 AM'
    address: { line1: string; city: string; pincode: string; line2?: string; landmark?: string; };
    description?: string; // User's description of the issue/need
    estimatedCost: number;
    paymentMethod?: 'wallet' | 'upi' | 'card';
}

export interface HyperlocalBookingConfirmation extends Transaction { // Extend transaction for consistency
    bookingId: string; // Specific hyperlocal booking ID
    providerName?: string;
    providerContact?: string;
    // other details...
}

/**
 * Fetches available hyperlocal service types or providers based on location/service type.
 * @param params Search parameters (latitude, longitude, pincode, serviceType).
 * @returns A promise resolving to an array of HyperlocalServiceType objects.
 */
export async function getAvailableServices(params: {
    lat?: number;
    lon?: number;
    pincode?: string;
    serviceType?: string;
}): Promise<HyperlocalServiceType[]> {
    console.log("[Client Hyperlocal Service] Fetching available services via API:", params);
    const queryParams = new URLSearchParams();
    if (params.lat) queryParams.append('lat', String(params.lat));
    if (params.lon) queryParams.append('lon', String(params.lon));
    if (params.pincode) queryParams.append('pincode', params.pincode);
    if (params.serviceType) queryParams.append('serviceType', params.serviceType);

    try {
        const results = await apiClient<HyperlocalServiceType[]>(`/hyperlocal/services?${queryParams.toString()}`);
        return results;
    } catch (error) {
        console.error("Error fetching available hyperlocal services via API:", error);
        throw error;
    }
}

/**
 * Fetches details (pricing, slots) for a specific service type or provider.
 * @param serviceType The type of service (e.g., 'electrician').
 * @param providerId Optional: ID of a specific provider.
 * @param date Optional: Date for checking slot availability (YYYY-MM-DD).
 * @returns A promise resolving to HyperlocalServiceDetails or general service info.
 */
export async function getServiceDetails(serviceType: string, providerId?: string, date?: string): Promise<HyperlocalServiceDetails | HyperlocalServiceType | null> {
    console.log(`[Client Hyperlocal Service] Fetching details for service ${serviceType} via API`, { providerId, date });
    const params = new URLSearchParams();
    if (providerId) params.append('providerId', providerId);
    if (date) params.append('date', date);
    const endpoint = `/hyperlocal/${serviceType}/details?${params.toString()}`;

    try {
        const details = await apiClient<HyperlocalServiceDetails | HyperlocalServiceType>(endpoint);
        return details;
    } catch (error: any) {
        if (error.message?.includes('404')) return null;
        console.error("Error fetching hyperlocal service details via API:", error);
        throw error;
    }
}

/**
 * Books a hyperlocal service.
 * @param serviceType The type of service being booked.
 * @param bookingPayload Details of the booking.
 * @returns A promise resolving to the HyperlocalBookingConfirmation object.
 */
export async function bookHyperlocalService(serviceType: string, bookingPayload: HyperlocalBookingPayload): Promise<HyperlocalBookingConfirmation> {
    console.log(`[Client Hyperlocal Service] Booking ${serviceType} service via API:`, bookingPayload);
    try {
        const confirmation = await apiClient<HyperlocalBookingConfirmation>(`/hyperlocal/${serviceType.toLowerCase().replace(/\s+/g, '-')}`, {
            method: 'POST',
            body: JSON.stringify(bookingPayload),
        });
        return {
            ...confirmation,
            date: new Date(confirmation.date),
        };
    } catch (error) {
        console.error(`Error booking ${serviceType} service via API:`, error);
        throw error;
    }
}

/**
 * Cancels a hyperlocal service booking.
 * @param serviceType The type of service of the booking.
 * @param bookingId ID of the booking to cancel.
 * @returns A promise resolving to an object indicating success and message.
 */
export async function cancelHyperlocalBooking(serviceType: string, bookingId: string): Promise<{ success: boolean; message?: string }> {
    console.log(`[Client Hyperlocal Service] Cancelling ${serviceType} booking ${bookingId} via API`);
    try {
        const result = await apiClient<{ success: boolean; message?: string }>(`/hyperlocal/${serviceType.toLowerCase().replace(/\s+/g, '-')}/${bookingId}/cancel`, {
            method: 'POST', // Or DELETE, depending on backend design
        });
        return result;
    } catch (error: any) {
        console.error(`Error cancelling ${serviceType} booking ${bookingId} via API:`, error);
        