/**
 * @fileOverview Service functions for Online Shopping features.
 * Interacts with backend shopping APIs.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // For order result

export interface ShoppingCategory {
    id: string;
    name: string;
    imageUrl?: string; // Optional image for category
}

export interface ShoppingProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    categoryId: string; // To link product to a category
    categoryName?: string; // Denormalized for display
    stock?: number; // Optional stock level
    rating?: number; // Optional product rating
    brand?: string; // Optional brand name
    offer?: string; // e.g., "20% OFF"
}

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number; // Price at the time of order
}

export interface OrderDetails {
    items: OrderItem[];
    totalAmount: number;
    // Add shippingAddress, paymentMethod, userId (from token) etc.
}

export interface OrderConfirmation extends Transaction {
    orderId: string; // Specific order ID from e-commerce system
    // Inherits fields from Transaction like id (as transactionId), status, date, amount etc.
}


/**
 * Fetches shopping categories from the backend API.
 * @returns A promise resolving to an array of ShoppingCategory objects.
 */
export async function getShoppingCategories(): Promise<ShoppingCategory[]> {
    console.log("[Client Service] Fetching shopping categories via API...");
    try {
        const categories = await apiClient<ShoppingCategory[]>('/shopping/categories');
        return categories;
    } catch (error) {
        console.error("Error fetching shopping categories via API:", error);
        return [];
    }
}

/**
 * Fetches shopping products from the backend API, optionally filtered by category.
 * @param categoryId Optional category ID to filter products.
 * @returns A promise resolving to an array of ShoppingProduct objects.
 */
export async function getShoppingProducts(categoryId?: string): Promise<ShoppingProduct[]> {
    console.log(`[Client Service] Fetching shopping products via API ${categoryId ? `for category ${categoryId}` : ''}...`);
    let endpoint = '/shopping/products';
    if (categoryId) {
        endpoint += `?categoryId=${encodeURIComponent(categoryId)}`;
    }
    try {
        const products = await apiClient<ShoppingProduct[]>(endpoint);
        return products;
    } catch (error) {
        console.error("Error fetching shopping products via API:", error);
        return [];
    }
}

/**
 * Simulates placing an order via the backend API.
 * Backend handles payment processing and creates a transaction log.
 * @param orderDetails Details of the order to be placed.
 * @returns A promise resolving to an OrderConfirmation object (which extends Transaction).
 */
export async function placeMockOrder(orderDetails: OrderDetails): Promise<OrderConfirmation> {
    console.log("[Client Service] Placing mock order via API:", orderDetails);
    try {
        // Backend endpoint '/shopping/orders' creates order and associated transaction.
        // The response should be compatible with the Transaction type, plus an orderId.
        const result = await apiClient<OrderConfirmation>('/shopping/orders', {
            method: 'POST',
            body: JSON.stringify(orderDetails),
        });
        console.log("Mock Order API response:", result);
        // Convert date string from API to Date object
        return {
            ...result,
            date: new Date(result.date),
            avatarSeed: result.avatarSeed || result.name?.toLowerCase().replace(/\s+/g, '') || result.id,
        };
    } catch (error: any) {
        console.error("Error placing mock order via API:", error);
        throw error; // Re-throw for UI handling
    }
}
