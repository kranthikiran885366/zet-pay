
/**
 * @fileOverview Service functions for purchasing digital and gaming vouchers.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Use shared types

export interface VoucherPurchasePayload {
    brandId: string;
    amount: number;
    playerId?: string; // For gaming vouchers
    recipientMobile?: string; // For digital vouchers sent via SMS
    billerName?: string; // For logging, e.g., "Google Play Voucher"
    voucherType: 'gaming' | 'digital'; // To differentiate backend logic if needed
}

export interface VoucherPurchaseResult extends Transaction {
    voucherCode?: string; // The actual voucher code
    receiptId?: string;
}

/**
 * Purchases a voucher via the backend API.
 * @param payload Details of the voucher purchase.
 * @returns A promise resolving to the VoucherPurchaseResult.
 */
export async function purchaseVoucher(payload: VoucherPurchasePayload): Promise<VoucherPurchaseResult> {
    console.log(`[Client Service] Purchasing ${payload.voucherType} voucher via API:`, payload);
    const endpoint = payload.voucherType === 'gaming' ? '/entertainment/vouchers/gaming/purchase' : '/vouchers/digital/purchase'; // Example distinct endpoints

    try {
        const result = await apiClient<VoucherPurchaseResult>(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        console.log("Voucher Purchase API response:", result);
        return {
            ...result,
            date: new Date(result.date),
            avatarSeed: result.avatarSeed || result.name?.toLowerCase().replace(/\s+/g, '') || result.id,
        };
    } catch (error: any) {
        console.error(`Error purchasing ${payload.voucherType} voucher via API:`, error);
        throw error;
    }
}
