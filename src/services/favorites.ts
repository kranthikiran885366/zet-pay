/**
 * @fileOverview Service functions for managing Favorite QRs via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase';

export interface FavoriteQr {
    userId: string;
    qrDataHash: string; 
    qrData: string; 
    payeeUpi: string;
    payeeName: string;
    customTagName?: string; 
    defaultAmount?: number; 
    frequencyCount?: number; 
    lastPaidDate?: string; 
    createdAt: string; 
    updatedAt: string; 
}

interface AddFavoriteQrPayload {
    qrData: string;
    payeeUpi: string;
    payeeName: string;
    customTagName?: string;
    defaultAmount?: number;
}

/**
 * Adds a QR code to the user's favorites via the backend API.
 * @param payload Data for the new favorite QR.
 * @returns A promise resolving to the created FavoriteQr object.
 */
export async function addFavoriteQrApi(payload: AddFavoriteQrPayload): Promise<FavoriteQr> {
    console.log("[Client Favorites Service] Adding favorite QR via API:", payload.payeeName);
    if (!auth.currentUser) {
        throw new Error("User not authenticated. Please log in to add favorites.");
    }
    try {
        const newFavorite = await apiClient<FavoriteQr>('/favorites/qr', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return newFavorite;
    } catch (error: any) {
        console.error("Error adding favorite QR via API:", error);
        throw new Error(error.message || "Could not add to favorites.");
    }
}

/**
 * Fetches all favorite QRs for the current user from the backend API.
 * @returns A promise resolving to an array of FavoriteQr objects.
 */
export async function getFavoriteQrsApi(): Promise<FavoriteQr[]> {
    console.log("[Client Favorites Service] Fetching favorite QRs via API...");
    if (!auth.currentUser) {
        console.warn("[Client Favorites Service] User not authenticated, cannot fetch favorites.");
        return [];
    }
    try {
        const favorites = await apiClient<FavoriteQr[]>('/favorites/qr');
        return favorites;
    } catch (error) {
        console.error("Error fetching favorite QRs via API:", error);
        return [];
    }
}

/**
 * Removes a QR code from the user's favorites via the backend API.
 * @param qrDataHash The hash of the QR data to remove.
 * @returns A promise resolving when the operation is complete.
 */
export async function removeFavoriteQrApi(qrDataHash: string): Promise<void> {
    console.log(`[Client Favorites Service] Removing favorite QR via API, hash: ${qrDataHash}`);
    if (!auth.currentUser) {
        throw new Error("User not authenticated. Please log in to remove favorites.");
    }
    try {
        await apiClient<void>(`/favorites/qr/${qrDataHash}`, {
            method: 'DELETE',
        });
    } catch (error: any) {
        console.error("Error removing favorite QR via API:", error);
        throw new Error(error.message || "Could not remove favorite.");
    }
}
