/**
 * @fileOverview Service functions for interacting with the booking backend API.
 */

import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Import common Transaction type
// Import specific interfaces if defined in types.ts or define inline
// import type { BusRoute, TrainAvailability, Movie, CinemaShowtime, EventDetails, BookingConfirmation } from './types';

// --- Interfaces (Define or import from ./types) ---

// Simplified interfaces for frontend use. Align with backend responses.
export interface BookingSearchResult {
    // Common fields for any search result type
    id: string;
    name: string; // Movie title, Bus operator, Train name etc.
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event';
    // Type-specific details
    imageUrl?: string;
    departureTime?: string;
    arrivalTime?: string;
    priceRange?: string; // e.g., "₹500 - ₹1200"
    rating?: number;
    // ... other relevant summary fields
}

export interface BookingDetails {
    // Common fields
    id: string;
    name: string;
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event';
    // Type-specific details
    // Movie:
    movieDetails?: any; // Replace 'any' with specific Movie interface
    cinemas?: any[]; // Array of Cinema interfaces with showtimes
    // Bus:
    busDetails?: any; // Replace 'any' with specific BusRoute interface
    seatLayout?: any[]; // Array of Seat interfaces
    // Train:
    trainDetails?: any; // Replace 'any' with specific TrainAvailability interface
    // ... add details for flight, event
}

export interface BookingConfirmation {
    status: Transaction['status']; // Use status from Transaction type
    message?: string;
    transactionId?: string;
    bookingDetails?: { // Details returned by the provider/backend on success
        bookingId?: string;
        pnr?: string;
        seatNumbers?: string;
        providerMessage?: string;
        // ... other confirmation details
    } | null;
}

export interface CancellationResult {
    success: boolean;
    message?: string;
    refundAmount?: number;
}


// --- Service Functions ---

/**
 * Searches for available bookings (movies, buses, trains, etc.) via the backend API.
 * @param type The type of booking (e.g., 'movie', 'bus').
 * @param params Search parameters specific to the type (e.g., { city: 'Bangalore', date: '...' } for movies).
 * @returns A promise resolving to an array of search results.
 */
export async function searchBookings(type: string, params: Record<string, any>): Promise<BookingSearchResult[]> {
    console.log(`[Client Service] Searching ${type} bookings via API with params:`, params);
    const query = new URLSearchParams(params).toString();
    const endpoint = `/bookings/${type}/search?${query}`;
    try {
        const results = await apiClient<BookingSearchResult[]>(endpoint);
        return results;
    } catch (error) {
        console.error(`Error searching ${type} bookings via API:`, error);
        throw error; // Re-throw for UI handling
    }
}

/**
 * Fetches detailed information for a specific booking item (e.g., movie showtimes, bus seat layout) via the backend API.
 * @param type The type of booking (e.g., 'movie', 'bus').
 * @param id The ID of the item (e.g., movieId, busRouteId).
 * @param params Additional parameters (e.g., { date: '...', cinemaId: '...' } for movie showtimes).
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
        // Handle 404 specifically
        if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
            console.log(`Details not found for ${type}/${id}`);
            return null;
        }
        console.error(`Error getting ${type} details via API:`, error);
        throw error; // Re-throw other errors
    }
}

/**
 * Confirms a booking via the backend API.
 * The backend handles payment processing and interaction with the booking provider.
 * @param type The type of booking (e.g., 'movie', 'bus').
 * @param bookingData Data required for the booking confirmation (selection, passenger details, total amount, payment method).
 * @returns A promise resolving to the booking confirmation result.
 */
export async function confirmBooking(type: string, bookingData: any): Promise<BookingConfirmation> {
    console.log(`[Client Service] Confirming ${type} booking via API:`, bookingData);
    const endpoint = `/bookings/${type}`;
    try {
        const result = await apiClient<BookingConfirmation>(endpoint, {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
        return result;
    } catch (error: any) {
        console.error(`Error confirming ${type} booking via API:`, error);
        // Return a standardized failure response
        return {
            status: 'Failed',
            message: error.message || `Failed to confirm ${type} booking.`,
        };
    }
}

/**
 * Requests cancellation of a booking via the backend API.
 * @param type The type of booking (e.g., 'movie', 'bus').
 * @param bookingId The ID of the booking to cancel.
 * @returns A promise resolving to the cancellation result.
 */
export async function cancelBooking(type: string, bookingId: string): Promise<CancellationResult> {
    console.log(`[Client Service] Cancelling ${type} booking via API: ${bookingId}`);
    const endpoint = `/bookings/${type}/${bookingId}/cancel`;
    try {
        const result = await apiClient<CancellationResult>(endpoint, {
            method: 'POST', // Or DELETE depending on backend design
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
