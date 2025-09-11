/**
 * @fileOverview API client for making authenticated requests to the backend Express server.
 */
import { getIdToken } from './firebase';

// Use a same-origin relative API base by default so both client and server use the proxy in dev/preview
const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
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
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    } else {
        // Don't throw here - allow unauthenticated requests to go through (backend may return 401/403)
        // This avoids runtime crashes in preview/dev when no user is logged in. Callers should handle auth-required errors.
        console.warn("[API Client] User not authenticated. Proceeding without Authorization header.");
    }

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

        // Read the response body once to avoid "body stream already read" errors
        let responseText = '';
        try {
            if (!response.bodyUsed) {
                responseText = await response.text();
            } else {
                console.warn(`[API Client] Response body already consumed for ${url}. Falling back to status text.`);
                responseText = '';
            }
        } catch (readErr) {
            console.error(`[API Client] Error reading response body for ${url}:`, readErr);
            responseText = '';
        }

        if (!response.ok) {
            // Attempt to parse JSON error from the body, otherwise include raw text
            let errorData: any = null;
            if (responseText) {
                try {
                    errorData = JSON.parse(responseText);
                } catch (parseErr) {
                    // Not JSON - will use raw text below
                }
            }

            if (errorData && errorData.message) {
                console.error(`[API Client] Error response from ${url}:`, errorData);
                throw new Error(errorData.message);
            }

            // If we couldn't read body, include status information
            if (!responseText) {
                console.error(`[API Client] Failed request to ${url}. Status: ${response.status}. Could not read response body.`);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            console.error(`[API Client] Failed request to ${url}. Status: ${response.status}. Response: ${responseText}`);
            throw new Error(`API request failed: ${response.status}`);
        }

        // Handle cases where response might be empty (e.g., 204 No Content)
        if (response.status === 204) {
            console.log(`[API Client] Received 204 No Content for ${url}`);
            return null as T; // Or handle as appropriate for your use case
        }

        // Parse successful response JSON from the previously-read text
        try {
            const data: T = responseText ? JSON.parse(responseText) : (null as unknown as T);
            console.log(`[API Client] Received successful response from ${url}`);
            return data;
        } catch (parseError) {
            console.error(`[API Client] Failed to parse JSON response from ${url}:`, parseError, 'Raw response:', responseText);
            throw new Error('Invalid JSON response from API');
        }

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
