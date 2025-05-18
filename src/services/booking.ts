
/**
 * @fileOverview Service functions for interacting with the booking backend API.
 */

import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Import common Transaction type
// Import specific interfaces if defined in types.ts or define inline
import type { FlightListing, BookingConfirmation, MarriageVenue, MarriageBookingDetails } from './types';

// --- Interfaces (Define or import from ./types) ---

// Simplified interfaces for frontend use. Align with backend responses.
export interface BookingSearchResult {
    // Common fields for any search result type
    id: string;
    name: string; // Movie title, Bus operator, Train name etc.
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event' | 'marriage' | 'car' | 'bike';
    // Type-specific details
    imageUrl?: string;
    priceRange?: string; // e.g., "₹500 - ₹1200"
    rating?: number;
    location?: string; // For venues
    capacity?: number; // For venues
    description?: string;
    amenities?: string[];
    price?: number;
    transmission?: string;
    fuelType?: string;
    seats?: number;
    pricePerDay?: number; 
    pricePerHour?: number; 
    kmsLimit?: string;
    isAvailable?: boolean; 
    availability?: 'Available' | 'In Use' | 'Low Battery'; 
    batteryPercent?: number; 
    requiresHelmet?: boolean; 
}

export interface BookingDetails {
    // Common fields
    id: string;
    name: string;
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event' | 'marriage' | 'car' | 'bike';
    // Type-specific details
    // Movie:
    movieDetails?: any; // Replace 'any' with specific Movie interface
    cinemas?: any[]; // Array of Cinema interfaces with showtimes
    // Bus:
    busDetails?: any; // Replace 'any' with specific BusRoute interface
    seatLayout?: any[]; // Array of Seat interfaces
    // Train:
    trainDetails?: any; // Replace 'any' with specific TrainAvailability interface
    // Marriage Venue:
    venueDetails?: MarriageVenue;
    // Flight:
    flightDetails?: FlightListing; 
    // Car:
    carDetails?: CarListing;
    // Bike:
    bikeDetails?: BikeListing;
    // ... add details for event
}

// Re-export for convenience
export type { BookingConfirmation, FlightListing, MarriageVenue, MarriageBookingDetails, CarListing, BikeListing };


export interface CancellationResult {
    success: boolean;
    message?: string;
    refundAmount?: number;
    originalPaymentTxId?: string; 
}


// --- Service Functions ---

/**
 * Searches for available bookings (movies, buses, trains, etc.) via the backend API.
 * @param type The type of booking (e.g., 'movie', 'bus', 'marriage').
 * @param params Search parameters specific to the type.
 * @returns A promise resolving to an array of search results.
 */
export async function searchBookings(type: string, params: Record<string, any>): Promise<BookingSearchResult[]> {
    console.log(`[Client Service] Searching ${type} bookings via API with params:`, params);
    // Filter out undefined or empty string params before creating URLSearchParams
    const validParams: Record<string, string> = {};
    for (const key in params) {
        if (params[key] !== undefined && params[key] !== '') {
            validParams[key] = String(params[key]);
        }
    }
    const query = new URLSearchParams(validParams).toString();
    const endpoint = `/bookings/${type}/search${query ? `?${query}` : ''}`;
    try {
        const results = await apiClient<BookingSearchResult[]>(endpoint);
        return results;
    } catch (error) {
        console.error(`Error searching ${type} bookings via API:`, error);
        throw error; // Re-throw for UI handling
    }
}

/**
 * Fetches detailed information for a specific booking item via the backend API.
 * @param type The type of booking.
 * @param id The ID of the item.
 * @param params Additional parameters.
 * @returns A promise resolving to the detailed booking information.
 */
export async function getBookingDetails(type: string, id: string, params?: Record<string, any>): Promise<BookingDetails | null> {
    console.log(`[Client Service] Getting ${type} details via API for ID: ${id}, Params:`, params);
    const query = params ? new URLSearchParams(params).toString() : '';
    const endpoint = `/bookings/${type}/${id}/details${query ? `?${query}` : ''}`;
    try {
        const details = await apiClient<BookingDetails>(endpoint);
        return details;
    } catch (error: any) {
        if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
            console.log(`Details not found for ${type}/${id}`);
            return null;
        }
        console.error(`Error getting ${type} details via API:`, error);
        throw error;
    }
}

/**
 * Confirms a booking via the backend API.
 * @param type The type of booking.
 * @param bookingData Data required for the booking confirmation.
 * @returns A promise resolving to the booking confirmation result.
 */
export async function confirmBooking(type: string, bookingData: any): Promise<BookingConfirmation> {
    console.log(`[Client Service] Confirming ${type} booking via API:`, bookingData);
    const idForPath = bookingData.venueId || bookingData.providerId || bookingData.selection?.movieId || bookingData.selection?.busId || bookingData.selection?.flightId || bookingData.selection?.vehicleId || bookingData.selection?.eventId || bookingData.id; // Added bookingData.id as fallback
    let endpoint = `/bookings/${type}`; 

    if (type === 'marriage' && idForPath) {
        endpoint = `/bookings/marriage/${idForPath}/book`;
    }


    try {
        const result = await apiClient<BookingConfirmation>(endpoint, {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
        return result;
    } catch (error: any) {
        console.error(`Error confirming ${type} booking via API:`, error);
        return {
            status: 'Failed',
            message: error.message || `Failed to confirm ${type} booking.`,
            bookingDetails: null
        };
    }
}

/**
 * Requests cancellation of a booking via the backend API.
 * @param type The type of booking.
 * @param bookingId The ID of the booking to cancel.
 * @returns A promise resolving to the cancellation result.
 */
export async function cancelBooking(type: string, bookingId: string): Promise<CancellationResult> {
    console.log(`[Client Service] Cancelling ${type} booking via API: ${bookingId}`);
    const endpoint = `/bookings/${type}/${bookingId}/cancel`;
    try {
        const result = await apiClient<CancellationResult>(endpoint, {
            method: 'POST', 
        });
        return result;
    } catch (error: any) {
        console.error(`Error cancelling ${type} booking ${bookingId} via API:`, error);
        return {
            success: false,
            message: error.message || `Failed to cancel ${type} booking.`,
        };
    }
}


// --- Marriage Venue Specific Service Functions ---

/**
 * Searches for marriage venues via the backend API.
 * @param params Search parameters (city, date, guests, hallType, hasParking, etc.).
 * @returns A promise resolving to an array of MarriageVenue objects.
 */
export async function searchMarriageVenues(params: { 
    city: string; 
    date: string; 
    guests?: string;
    hallType?: string;
    hasParking?: boolean;
    cateringAvailable?: boolean;
    decorationIncluded?: boolean;
}): Promise<MarriageVenue[]> {
    return searchBookings('marriage', params) as Promise<MarriageVenue[]>;
}

/**
 * Fetches details for a specific marriage venue via the backend API.
 * @param venueId The ID of the venue.
 * @returns A promise resolving to the MarriageVenue object or null.
 */
export async function getMarriageVenueDetails(venueId: string): Promise<MarriageVenue | null> {
    const result = await getBookingDetails('marriage', venueId);
    return result ? (result.venueDetails || result as unknown as MarriageVenue) : null;
}

/**
 * Confirms a marriage venue booking via the backend API.
 * @param venueIdFromPath The ID of the venue (will be passed in URL by confirmBooking).
 * @param bookingData Data for the booking request (as MarriageBookingDetails).
 * @returns A promise resolving to the booking confirmation result.
 */
export async function confirmMarriageVenueBooking(venueIdFromPath: string, bookingData: MarriageBookingDetails): Promise<BookingConfirmation> {
    const payloadToSend = { ...bookingData, venueId: venueIdFromPath }; 
    return confirmBooking('marriage', payloadToSend);
}

    