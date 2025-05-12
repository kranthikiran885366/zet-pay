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
  isDuplicateRecent: boolean;
  merchantNameFromDb?: string;
  message?: string;
  upiId?: string;
  hasValidSignature?: boolean;
  isReportedPreviously?: boolean;
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
): Promise<QrValidationResult> {
    console.log("[Client Scan Service] Validating QR via API:", qrData.substring(0,30));
    try {
      const result = await apiClient<QrValidationResult>('/scan/validate', {
        method: 'POST',
        body: JSON.stringify({
            qrData,
            userId: auth.currentUser?.uid, // Backend should verify this token anyway
            signature,
            stealthModeInitiated
        }),
      });
      return result;
    } catch (error: any) {
      console.error("QR Validation API Error:", error);
      // Return a default error structure or rethrow
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
    try {
        const result = await apiClient<{ success: boolean; message?: string; reportId?: string }>('/scan/report', {
            method: 'POST',
            body: JSON.stringify({
                qrData,
                userId: auth.currentUser?.uid, // Backend verifies token
                reason,
            }),
        });
        return result;
    } catch (error: any) {
        console.error("Report QR API Error:", error);
        throw new Error(error.message || "Could not submit QR report.");
    }
}
