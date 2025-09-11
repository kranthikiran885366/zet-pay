/**
 * @fileOverview API client for making authenticated requests to the backend Express server.
 */
import { getIdToken } from './firebase';

// Ensure the correct environment variable is used for the backend URL
let API_BASE_URL: string;
if (typeof window !== 'undefined') {
    // In the browser prefer same-origin relative path to avoid cross-origin failures in preview environments
    API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
} else {
    // Server-side or standalone backend fallback
    API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9003/api';
}
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

        if (!response.ok) {
            // Attempt to parse error response from backend. Use clones so we don't consume the original response body
            try {
                // Try parsing JSON first (most APIs return JSON errors)
                const jsonClone = await response.clone().json();
                console.error(`[API Client] Error response from ${url}:`, jsonClone);
                throw new Error(jsonClone?.message || `API request failed: ${response.status}`);
            } catch (jsonErr) {
                // If JSON parsing fails, fallback to reading text from a fresh clone
                try {
                    const text = await response.clone().text();
                    console.error(`[API Client] Failed request to ${url}. Status: ${response.status}. Response: ${text}`);
                    throw new Error(text || `API request failed: ${response.status} ${response.statusText}`);
                } catch (textErr) {
                    console.error(`[API Client] Failed request to ${url}. Status: ${response.status}. Could not read response body.`);
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }
            }
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
