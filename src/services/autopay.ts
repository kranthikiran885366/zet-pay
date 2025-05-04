/**
 * @fileOverview Service functions for managing UPI Autopay mandates.
 */

export interface Mandate {
    id: string; // Unique mandate ID (e.g., UMRN)
    merchantName: string;
    upiId: string; // User's UPI ID used for the mandate
    maxAmount: number;
    frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented'; // Common frequencies
    startDate: string; // ISO Date string
    validUntil: string; // ISO Date string
    status: 'Active' | 'Paused' | 'Cancelled' | 'Failed';
}

/**
 * Asynchronously retrieves the list of UPI Autopay mandates for the user.
 *
 * @returns A promise that resolves to an array of Mandate objects.
 */
export async function getMandates(): Promise<Mandate[]> {
    console.log("Fetching UPI Autopay Mandates...");
    // TODO: Implement actual API call to fetch mandates from backend/aggregator
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    // Mock Data
    return [
        {
            id: 'MANDATE123XYZ',
            merchantName: 'Netflix Subscription',
            upiId: 'user123@oksbi',
            maxAmount: 649,
            frequency: 'Monthly',
            startDate: new Date(2024, 0, 15).toISOString(),
            validUntil: new Date(2025, 0, 14).toISOString(),
            status: 'Active',
        },
        {
            id: 'MANDATEABC789',
            merchantName: 'Spotify Premium',
            upiId: 'user.hdfc@okhdfcbank',
            maxAmount: 149,
            frequency: 'Monthly',
            startDate: new Date(2023, 11, 1).toISOString(),
            validUntil: new Date(2024, 10, 30).toISOString(),
            status: 'Active',
        },
        {
            id: 'MANDATEOLD456',
            merchantName: 'Old Insurance Policy',
            upiId: 'user123@oksbi',
            maxAmount: 1200,
            frequency: 'Yearly',
            startDate: new Date(2023, 5, 1).toISOString(),
            validUntil: new Date(2024, 4, 30).toISOString(),
            status: 'Cancelled', // Example of a cancelled mandate
        },
         {
            id: 'MANDATEPAUSED111',
            merchantName: 'Gym Membership',
            upiId: 'user@okicici',
            maxAmount: 1500,
            frequency: 'Monthly',
            startDate: new Date(2024, 2, 1).toISOString(),
            validUntil: new Date(2025, 1, 28).toISOString(),
            status: 'Paused', // Example of a paused mandate
        },
    ].sort((a,b) => new Date(b.validUntil).getTime() - new Date(a.validUntil).getTime()); // Sort by expiry descending
}

/**
 * Asynchronously initiates the setup flow for a new UPI Autopay mandate.
 * This would typically redirect to a UPI app or SDK flow.
 *
 * @param merchantId The ID of the merchant requesting the mandate.
 * @param maxAmount The maximum amount per debit.
 * @param frequency The frequency of the debit.
 * @returns A promise that resolves with details of the initiated mandate setup (e.g., status, mandate ID if available immediately).
 */
export async function setupMandate(
    merchantId: string,
    maxAmount: number,
    frequency: Mandate['frequency']
): Promise<{ success: boolean; mandateId?: string; message?: string }> {
    console.log("Initiating mandate setup:", { merchantId, maxAmount, frequency });
    // TODO: Implement API call to start mandate setup flow
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate success
    return { success: true, message: "Mandate setup initiated. Please approve in your UPI app." };
}

/**
 * Asynchronously pauses an active UPI Autopay mandate.
 *
 * @param mandateId The ID of the mandate to pause.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function pauseMandate(mandateId: string): Promise<boolean> {
    console.log(`Pausing mandate ID: ${mandateId}`);
    // TODO: Implement API call to pause the mandate
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate success
    return true;
}

/**
 * Asynchronously resumes a paused UPI Autopay mandate.
 *
 * @param mandateId The ID of the mandate to resume.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function resumeMandate(mandateId: string): Promise<boolean> {
    console.log(`Resuming mandate ID: ${mandateId}`);
    // TODO: Implement API call to resume the mandate
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate success
    return true;
}

/**
 * Asynchronously cancels an active or paused UPI Autopay mandate.
 *
 * @param mandateId The ID of the mandate to cancel.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function cancelMandate(mandateId: string): Promise<boolean> {
    console.log(`Cancelling mandate ID: ${mandateId}`);
    // TODO: Implement API call to cancel the mandate
    await new Promise(resolve => setTimeout(resolve, 900));
    // Simulate success
    return true;
}
