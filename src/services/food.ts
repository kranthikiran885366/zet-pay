
/**
 * @fileOverview Service functions for Food Ordering feature, interacting with backend APIs.
 */
import { apiClient } from '@/lib/apiClient';
import type { Restaurant, RestaurantDetails, MenuItem, OrderItem } from './types'; // Assuming types will be in shared types or defined here
import type { Transaction } from './types'; // For order result

// Re-export for components
export type { Restaurant, RestaurantDetails, MenuItem };

export interface FoodOrderPayload {
    restaurantId: string;
    items: Array<{ itemId: string; quantity: number; price: number }>;
    totalAmount: number;
    deliveryAddress: { line1: string; city: string; pincode: string; line2?: string; landmark?: string };
    paymentMethod?: 'wallet' | 'upi' | 'card'; // Optional, backend might use default
}

export interface FoodOrderConfirmation extends Transaction { // Extends Transaction for consistency
    orderId: string; // Specific food order ID from provider
    restaurantName?: string;
    estimatedDeliveryTime?: string;
}


/**
 * Searches for restaurants based on location, cuisine, or query.
 * @param params Search parameters.
 * @returns A promise resolving to an array of Restaurant objects.
 */
export async function searchRestaurants(params: { location?: string; cuisine?: string; query?: string }): Promise<Restaurant[]> {
    console.log("[Client Food Service] Searching restaurants via API:", params);
    const queryParams = new URLSearchParams();
    if (params.location) queryParams.append('location', params.location);
    if (params.cuisine) queryParams.append('cuisine', params.cuisine);
    if (params.query) queryParams.append('query', params.query);

    try {
        const results = await apiClient<Restaurant[]>(`/food/restaurants/search?${queryParams.toString()}`);
        return results;
    } catch (error) {
        console.error("Error searching restaurants via API:", error);
        throw error;
    }
}

/**
 * Fetches the menu for a specific restaurant.
 * @param restaurantId ID of the restaurant.
 * @returns A promise resolving to the RestaurantDetails object (which includes menu).
 */
export async function getRestaurantMenu(restaurantId: string): Promise<RestaurantDetails | null> {
    console.log(`[Client Food Service] Fetching menu for restaurant ${restaurantId} via API`);
    try {
        const menuDetails = await apiClient<RestaurantDetails>(`/food/restaurants/${restaurantId}/menu`);
        return menuDetails;
    } catch (error: any) {
         if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
            console.log(`Menu not found for restaurant ${restaurantId}`);
            return null;
        }
        console.error("Error fetching restaurant menu via API:", error);
        throw error;
    }
}

/**
 * Places a food order.
 * @param orderPayload Details of the order.
 * @returns A promise resolving to the FoodOrderConfirmation object.
 */
export async function placeFoodOrder(orderPayload: FoodOrderPayload): Promise<FoodOrderConfirmation> {
    console.log("[Client Food Service] Placing food order via API:", orderPayload);
    try {
        const confirmation = await apiClient<FoodOrderConfirmation>('/food/orders/place', {
            method: 'POST',
            body: JSON.stringify(orderPayload),
        });
        // Ensure date fields are Date objects
        return {
            ...confirmation,
            date: new Date(confirmation.date),
        };
    } catch (error) {
        console.error("Error placing food order via API:", error);
        throw error;
    }
}

/**
 * Fetches the status of a specific food order.
 * @param orderId ID of the order.
 * @returns A promise resolving to an object containing order status details.
 */
export async function getFoodOrderStatus(orderId: string): Promise<{ orderId: string; status: string; estimatedTime?: string; lastUpdated?: string } | null> {
    console.log(`[Client Food Service] Fetching status for food order ${orderId} via API`);
    try {
        const statusDetails = await apiClient<{ orderId: string; status: string; estimatedTime?: string; lastUpdated?: string }>(`/food/orders/${orderId}`);
        return statusDetails;
    } catch (error: any) {
         if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
            console.log(`Order status not found for ${orderId}`);
            return null;
        }
        console.error("Error fetching food order status via API:", error);
        throw error;
    }
}

// Add any additional types required by the food feature's UI components
// For example, if the backend returns more detailed items in restaurant menu:
// export interface RestaurantMenuItem extends MenuItem {
//     isVeg?: boolean;
//     isBestseller?: boolean;
//     rating?: number;
//     // ... other fields
// }
