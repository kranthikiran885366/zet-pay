/**
 * @fileOverview Service functions for QR code scanning and validation.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // To get current user ID if needed by backend

export interface ParsedUpiData {
  payeeName?: string;
  payeeAddress?: string;
  amount?: string;
  note?: string;
  isValidUpi: boolean;
  originalData: string;
  signature?: string;
  isZetPayUser?: boolean;
}

export interface QrValidationResult {
  isVerifiedMerchant: boolean;
  isBlacklisted: boolean;
  // isDuplicateRecent: boolean; // This is now client-side only for immediate UX, backend might have its own checks
  merchantNameFromDb?: string;
  message?: string;
  upiId?: string; // This should be the `pa` from the QR
  hasValidSignature?: boolean;
  isReportedPreviously?: boolean;
  pastPaymentSuggestions?: number[];
  isFavorite?: boolean;
  customTagName?: string;
}

// Interface for recent scans returned by API
export interface RecentScan {
    qrDataHash: string;
    qrData: string; // Full QR data for re-scan simulation
    payeeName?: string;
    payeeUpi: string;
    lastAmountPaid?: number;
    lastPaidDate: string; // ISO Date string
    paymentTransactionId?: string;
}


/**
 * Validates a scanned QR code via the backend API.
 * @param qrData The raw string data from the QR code.
 * @param signature Optional signature extracted from the QR.
 * @param stealthModeInitiated Flag indicating if the scan was initiated in stealth mode.
 * @returns A promise resolving to the validation result.
 */
export async function validateQrCodeApi(
    qrData: string,
    signature?: string,
    stealthModeInitiated?: boolean
): Promise<ApiQrValidationResult> { // Expect ApiQrValidationResult (which might differ from client's QrValidationResult)
    console.log("[Client Scan Service] Validating QR via API:", qrData.substring(0,30));
    if (!auth.currentUser) {
        throw new Error("User not authenticated. Please log in.");
    }
    try {
      const result = await apiClient<ApiQrValidationResult>('/scan/validate', { // Ensure this matches the type from backend
        method: 'POST',
        body: JSON.stringify({
            qrData,
            // userId is inferred from token by backend
            signature: signature || undefined, // Send undefined if not present
            stealthModeInitiated: stealthModeInitiated || false,
        }),
      });
      return result;
    } catch (error: any) {
      console.error("QR Validation API Error:", error);
      throw new Error(error.message || "Could not validate QR code with backend.");
    }
}

/**
 * Reports a QR code as fraudulent or suspicious via the backend API.
 * @param qrData The raw string data of the QR code being reported.
 * @param reason The user-provided reason for reporting.
 * @returns A promise resolving to the report confirmation from the backend.
 */
export async function reportQrCodeApi(
    qrData: string,
    reason: string
): Promise<{ success: boolean; message?: string; reportId?: string }> {
    console.log("[Client Scan Service] Reporting QR via API:", qrData.substring(0,30));
    if (!auth.currentUser) {
        throw new Error("User not authenticated. Please log in to report.");
    }
    try {
        const result = await apiClient<{ success: boolean; message?: string; reportId?: string }>('/scan/report', {
            method: 'POST',
            body: JSON.stringify({
                qrData,
                // userId is inferred from token by backend
                reason,
            }),
        });
        return result;
    } catch (error: any) {
        console.error("Report QR API Error:", error);
        throw new Error(error.message || "Could not submit QR report.");
    }
}

/**
 * Fetches recently scanned and paid QRs for the current user from the backend.
 * @returns A promise resolving to an array of RecentScan objects.
 */
export async function getRecentScansApi(): Promise<RecentScan[]> {
    console.log("[Client Scan Service] Fetching recent scans via API...");
    if (!auth.currentUser) {
        console.warn("[Client Scan Service] User not authenticated, cannot fetch recent scans.");
        return [];
    }
    try {
        const recentScans = await apiClient<RecentScan[]>('/scan/recent');
        return recentScans.map(scan => ({
            ...scan,
            lastPaidDate: new Date(scan.lastPaidDate).toISOString()
        }));
    } catch (error) {
        console.error("Error fetching recent scans via API:", error);
        return [];
    }
}

// Re-exporting QrValidationResult from API as ApiQrValidationResult
// if client needs to distinguish from its own QrValidationResult type.
export type { QrValidationResult as ApiQrValidationResult };
