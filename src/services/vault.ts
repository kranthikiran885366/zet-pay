
/**
 * @fileOverview Service functions for Secure Vault, interacting with backend APIs for metadata and conceptual file handling.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // For user ID

export interface VaultItem {
    id: string;
    userId: string;
    name: string;
    type: 'Ticket' | 'Bill' | 'Document' | 'Plan' | 'Image' | 'Other' | 'Health'; // Added Health
    source?: string;
    notes?: string;
    fileUrl?: string; // URL to the file in Firebase Storage or external
    filePath?: string; // Path in Firebase Storage
    fileName?: string;
    fileType?: string; // MIME type
    fileSize?: number;
    isEncrypted?: boolean; // If client-side encryption was applied
    tags?: string[];
    dateAdded: string; // ISO Date string
    updatedAt: string; // ISO Date string
    originalTransactionId?: string;
    expiryDate?: string; // ISO Date string
    healthDocumentType?: string; // Specific for health documents
}

/**
 * Retrieves all vault items for the current user from the backend API.
 * @param itemType Optional: Filter by item type (e.g., 'Health', 'Ticket').
 * @returns A promise resolving to an array of VaultItem objects.
 */
export async function getUserVaultItems(itemType?: string): Promise<VaultItem[]> {
    if (!auth.currentUser) {
        console.warn("[Client Vault Service] User not authenticated. Cannot fetch vault items.");
        return [];
    }
    console.log(`[Client Vault Service] Fetching vault items via API${itemType ? ` for type ${itemType}` : ''}...`);
    const params = new URLSearchParams();
    if (itemType) params.append('type', itemType);
    const endpoint = `/vault/items?${params.toString()}`;
    try {
        const items = await apiClient<VaultItem[]>(endpoint);
        return items.map(item => ({
            ...item,
            dateAdded: new Date(item.dateAdded).toISOString(),
            updatedAt: new Date(item.updatedAt).toISOString(),
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : undefined,
        }));
    } catch (error) {
        console.error("Error fetching vault items via API:", error);
        return [];
    }
}

/**
 * Adds metadata of a new item to the user's vault via the backend API.
 * File upload to storage is handled conceptually by the backend or via signed URLs.
 * @param itemData Metadata of the item.
 * @returns A promise resolving to the newly created VaultItem object.
 */
export async function addVaultItemMetadata(
    itemData: Omit<VaultItem, 'id' | 'userId' | 'dateAdded' | 'updatedAt'>
): Promise<VaultItem> {
     if (!auth.currentUser) throw new Error("User not authenticated.");
    console.log("[Client Vault Service] Adding vault item metadata via API:", itemData.name);
    try {
        // Backend infers userId from token
        const newItem = await apiClient<VaultItem>('/vault/items', {
            method: 'POST',
            body: JSON.stringify(itemData),
        });
        return {
            ...newItem,
            dateAdded: new Date(newItem.dateAdded).toISOString(),
            updatedAt: new Date(newItem.updatedAt).toISOString(),
            expiryDate: newItem.expiryDate ? new Date(newItem.expiryDate).toISOString() : undefined,
        };
    } catch (error: any) {
        console.error("Error adding vault item metadata via API:", error);
        throw new Error(error.message || "Could not add item to vault.");
    }
}

/**
 * Updates metadata of an existing vault item via the backend API.
 * @param itemId The ID of the vault item to update.
 * @param updateData The partial data to update.
 * @returns A promise resolving to the updated VaultItem object.
 */
export async function updateVaultItemMetadata(
    itemId: string,
    updateData: Partial<Omit<VaultItem, 'id' | 'userId' | 'dateAdded' | 'updatedAt'>>
): Promise<VaultItem> {
    if (!auth.currentUser) throw new Error("User not authenticated.");
    console.log(`[Client Vault Service] Updating vault item ${itemId} via API:`, updateData);
    try {
        const updatedItem = await apiClient<VaultItem>(`/vault/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        return {
            ...updatedItem,
            dateAdded: new Date(updatedItem.dateAdded).toISOString(),
            updatedAt: new Date(updatedItem.updatedAt).toISOString(),
            expiryDate: updatedItem.expiryDate ? new Date(updatedItem.expiryDate).toISOString() : undefined,
        };
    } catch (error: any) {
        console.error("Error updating vault item metadata via API:", error);
        throw new Error(error.message || "Could not update vault item.");
    }
}

/**
 * Deletes a vault item (metadata and associated file) via the backend API.
 * @param itemId The ID of the vault item to delete.
 * @returns A promise resolving when deletion is complete.
 */
export async function deleteVaultItemAndFile(itemId: string): Promise<void> {
    if (!auth.currentUser) throw new Error("User not authenticated.");
    console.log(`[Client Vault Service] Deleting vault item ${itemId} via API`);
    try {
        await apiClient<void>(`/vault/items/${itemId}`, {
            method: 'DELETE',
        });
    } catch (error: any) {
        console.error("Error deleting vault item via API:", error);
        throw new Error(error.message || "Could not delete vault item.");
    }
}

/**
 * Generates a signed URL for client-side direct upload to Firebase Storage, via the backend.
 * @param fileName Original name of the file.
 * @param contentType MIME type of the file.
 * @returns Promise resolving to object with signed URL and file path (for backend to save in metadata).
 */
export async function getSignedUploadUrl(fileName: string, contentType: string): Promise<{ signedUrl: string; filePath: string }> {
    if (!auth.currentUser) throw new Error("User not authenticated.");
    console.log(`[Client Vault Service] Requesting signed upload URL for: ${fileName}`);
    try {
        const result = await apiClient<{ signedUrl: string; filePath: string }>('/vault/upload-url', {
            method: 'POST',
            body: JSON.stringify({ fileName, contentType }),
        });
        return result;
    } catch (error: any) {
        console