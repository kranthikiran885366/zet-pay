/**
 * @fileOverview API client for making authenticated requests to the backend Express server.
 */
import { getIdToken } from './firebase';

// Ensure the correct environment variable is used for the backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9003/api';
console.log(`[API Client] Initialized with base URL: ${API_BASE_URL}`); // Log the base URL on initialization

interface ApiClientOptions extends RequestInit {
  // Additional options if needed
}

/**
 * Makes an authenticated API request to the backend.
 * Automatically includes the Firebase Auth ID token.
 * Handles basic error scenarios.
 *
 * @param endpoint The API endpoint (e.g., '/users/profile').
 * @param options Request options (method, body, etc.). Defaults to GET.
 * @returns A promise resolving to the JSON response from the API.
 * @throws Error if the user is not authenticated, the fetch fails, or the API returns an error status.
 */
export async function apiClient<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const token = await getIdToken(); // Get token before making the request
    if (!token) {
        console.error("[API Client] User not authenticated. Cannot make API call.");
        throw new Error("User not authenticated.");
    }

    const headers = new Headers(options.headers || {});
    headers.append('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) { // Don't set content-type for FormData
        headers.append('Content-Type', 'application/json');
    }

    const config: RequestInit = {
        ...options,
        headers: headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API Client] Request: ${config.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            // Attempt to parse error response from backend
            let errorData;
            const responseText = await response.text(); // Get text first to avoid parsing errors on empty/non-JSON bodies
            try {
                errorData = JSON.parse(responseText);
            } catch (parseError) {
                // If response is not JSON, use status text or the raw text
                console.error(`[API Client] Failed request to ${url}. Status: ${response.status}. Response: ${responseText}`);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            // Throw error with message from backend if available
            console.error(`[API Client] Error response from ${url}:`, errorData);
            throw new Error(errorData?.message || `API request failed: ${response.status}`);
        }

        // Handle cases where response might be empty (e.g., 204 No Content)
        if (response.status === 204) {
            console.log(`[API Client] Received 204 No Content for ${url}`);
            return null as T; // Or handle as appropriate for your use case
        }

        // Assume response is JSON for other successful statuses
        const data: T = await response.json();
        console.log(`[API Client] Received successful response from ${url}`);
        return data;

    } catch (error: any) {
        console.error(`[API Client] Network/Fetch Error (${endpoint}):`, error);
        // Re-throw the error to be caught by the calling service/component
        throw new Error(error.message || "An unexpected network error occurred.");
    }
}

// Example Usage (in service files):
//
// async function getUserProfile() {
//   return apiClient<UserProfile>('/users/profile');
// }
//
// async function updateProfile(data: Partial<UserProfile>) {
//   return apiClient<void>('/users/profile', {
//     method: 'PUT',
//     body: JSON.stringify(data),
//   });
// }
