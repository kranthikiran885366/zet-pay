
/**
 * @fileOverview Service functions for Online Shopping features.
 * Interacts with backend shopping APIs.
 */
import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // For order result

export interface ShoppingCategory {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface ShoppingProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    categoryName?: string;
    stock?: number;
    rating?: number;
    brand?: string;
    offer?: string;
}

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number; // Price at the time of order
}

export interface OrderDetailsPayload { // Renamed to avoid conflict with backend's OrderDetails
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: { line1: string; city: string; pincode: string; line2?: string; landmark?: string };
    paymentMethod?: 'wallet' | 'upi' | 'card';
}

export interface ShoppingOrderConfirmation extends Transaction {
    orderId: string;
    // Add other e-commerce specific confirmation details if needed
}


/**
 * Fetches shopping categories from the backend API.
 * @returns A promise resolving to an array of ShoppingCategory objects.
 */
export async function getShoppingCategories(): Promise<ShoppingCategory[]> {
    console.log("[Client Shopping Service] Fetching categories via API...");
    try {
        const categories = await apiClient<ShoppingCategory[]>('/shopping/categories');
        return categories;
    } catch (error) {
        console.error("Error fetching shopping categories via API:", error);
        throw error;
    }
}

/**
 * Fetches shopping products from the backend API, optionally filtered by category or search term.
 * @param categoryId Optional category ID to filter products.
 * @param searchTerm Optional search term.
 * @returns A promise resolving to an array of ShoppingProduct objects.
 */
export async function getShoppingProducts(categoryId?: string, searchTerm?: string): Promise<ShoppingProduct[]> {
    console.log(`[Client Shopping Service] Fetching products via API ${categoryId ? `for cat ${categoryId}` : ''} ${searchTerm ? `matching "${searchTerm}"` : ''}...`);
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (searchTerm) params.append('searchTerm', searchTerm);
    const endpoint = `/shopping/products?${params.toString()}`;
    try {
        const products = await apiClient<ShoppingProduct[]>(endpoint);
        return products;
    } catch (error) {
        console.error("Error fetching shopping products via API:", error);
        throw error;
    }
}

/**
 * Fetches details for a specific product from the backend API.
 * @param productId The ID of the product.
 * @returns A promise resolving to the ShoppingProduct object or null.
 */
export async function getShoppingProductDetails(productId: string): Promise<ShoppingProduct | null> {
    console.log(`[Client Shopping Service] Fetching product details for ${productId} via API`);
    try {
        const product = await apiClient<ShoppingProduct>(`/shopping/products/${productId}`);
        return product;
    } catch (error: any) {
        if (error.message?.includes('404')) return null;
        console.error("Error fetching product details via API:", error);
        throw error;
    }
}


/**
 * Places an online shopping order via the backend API.
 * Backend handles payment processing and creates a transaction log.
 * @param orderDetails Details of the order to be placed.
 * @returns A promise resolving to an ShoppingOrderConfirmation object (which extends Transaction).
 */
export async function placeOrder(orderDetails: OrderDetailsPayload): Promise<ShoppingOrderConfirmation> {
    console.log("[Client Shopping Service] Placing order via API:", orderDetails);
    try {
        const result = await apiClient<ShoppingOrderConfirmation>('/shopping/orders', {
            method: 'POST',
            body: JSON.stringify(orderDetails),
        });
        return {
            ...result,
            date: new Date(result.date),
        };
    } catch (error: any) {
        console.error("Error placing order via API:", error);
        throw error;
    }
}

// --- Conceptual: Order History & Details ---
export interface UserShoppingOrder {
    id: string; // Firestore document ID
    orderId: string; // Provider's order ID
    items: Array<{ productId: string; productName?: string; quantity: number; priceAtPurchase: number; imageUrl?: string; }>;
    totalAmount: number;
    shippingAddress: any;
    paymentMethod: string;
    paymentTransactionId: string;
    status: string; // 'Processing', 'Shipped', 'Delivered', 'Cancelled'
    orderDate: string; // ISO Date string
    userId: string;
}

export async function getOrderHistory(): Promise<UserShoppingOrder[]> {
    console.log("[Client Shopping Service] Fetching order history via API...");
    try {
        const orders = await apiClient<UserShoppingOrder[]>('/shopping/orders');
        return orders.map(o => ({...o, orderDate: new Date(o.orderDate).toISOString()}));
    } catch (error) {
        console.error("Error fetching order history:", error);
        throw error;
    }
}

export async function getOrderDetails(orderId: string): Promise<UserShoppingOrder | null> {
    console.log(`[Client Shopping Service] Fetching details for order ${orderId} via API...`);
    try {
        const order = await apiClient<UserShoppingOrder>(`/shopping/orders/${orderId}`);
        return order ? {...order, orderDate: new Date(order.orderDate).toISOString()} : null;
    } catch (error: any) {
        if (error.message?.includes('404')) return null;
        console.error("Error fetching order details:", error);
        throw error;
    }
}
