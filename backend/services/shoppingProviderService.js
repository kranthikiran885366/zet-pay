
// backend/services/shoppingProviderService.js
const axios = require('axios');
const { mockCategoriesData, mockProductsData } = require('../../src/mock-data/shopping'); // Import mock data

const ECOMMERCE_API_URL = process.env.ECOMMERCE_PLATFORM_API_URL || 'https://api.examplecommerce.com/v1';
const ECOMMERCE_API_KEY = process.env.ECOMMERCE_PLATFORM_API_KEY || 'YOUR_ECOMMERCE_API_KEY_PLACEHOLDER';

async function makeApiCall(endpoint, params = {}, method = 'GET', data = null) {
    const headers = { 'Authorization': `Bearer ${ECOMMERCE_API_KEY}`, 'Content-Type': 'application/json' };
    const config = { headers, params, method, data };

    if (process.env.USE_REAL_SHOPPING_API !== 'true' || ECOMMERCE_API_KEY === 'YOUR_ECOMMERCE_API_KEY_PLACEHOLDER') {
        console.warn(`[Shopping Provider] MOCK API call for ${endpoint}. Real API not configured or not enabled.`);
        throw new Error("Mock logic needs to be handled by caller or this function should return mock.");
    }

    // TODO: Implement REAL API call
    // const response = await axios({ url: `${ECOMMERCE_API_URL}${endpoint}`, ...config });
    // if (response.status < 200 || response.status >= 300) {
    //     throw new Error(response.data?.message || `API Error: ${response.status}`);
    // }
    // return response.data;
    console.error(`[Shopping Provider] REAL API call for ${ECOMMERCE_API_URL}${endpoint} NOT IMPLEMENTED.`);
    throw new Error("Real Shopping API integration not implemented.");
}

/**
 * Fetches shopping categories from the provider API.
 */
async function fetchCategoriesFromApi() {
    console.log(`[Shopping Provider] Fetching categories (API)`);
    const endpoint = '/categories';
    try {
        // return await makeApiCall(endpoint); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockCategoriesData;
    } catch (error) {
        console.warn(`[Shopping Provider] Falling back to mock for fetchCategories: ${error.message}`);
        return mockCategoriesData;
    }
}

/**
 * Fetches products from the provider API, optionally filtered.
 */
async function fetchProductsFromApi(categoryId, searchTerm) {
    console.log(`[Shopping Provider] Fetching products (API):`, { categoryId, searchTerm });
    const endpoint = '/products';
    const params = { category_id: categoryId, search: searchTerm, limit: 50 };
    try {
        // return await makeApiCall(endpoint, params); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 700));
        let results = mockProductsData;
        if (categoryId) {
            results = results.filter(p => p.categoryId === categoryId);
        }
        if (searchTerm) {
            results = results.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return results;
    } catch (error) {
        console.warn(`[Shopping Provider] Falling back to mock for fetchProducts: ${error.message}`);
        return mockProductsData.slice(0, 10);
    }
}

/**
 * Fetches details for a specific product from the provider API.
 */
async function fetchProductDetailsFromApi(productId) {
    console.log(`[Shopping Provider] Fetching product details for ${productId} (API)`);
    const endpoint = `/products/${productId}`;
    try {
        // return await makeApiCall(endpoint); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 400));
        const product = mockProductsData.find(p => p.id === productId);
        return product || null;
    } catch (error) {
        console.warn(`[Shopping Provider] Falling back to mock for fetchProductDetails: ${error.message}`);
        return mockProductsData.find(p => p.id === productId) || null;
    }
}

/**
 * Places an order with the E-commerce provider API.
 */
async function placeOrderWithProviderApi(orderDetails) {
    const { userId, items, totalAmount, shippingAddress, paymentTransactionId } = orderDetails;
    console.log(`[Shopping Provider] Placing order with provider (API): User ${userId}`);
    const endpoint = '/orders';
    const payload = {
        user_identifier: userId,
        order_items: items.map(item => ({ product_id: item.productId, quantity: item.quantity, unit_price: item.priceAtPurchase })),
        total_value: totalAmount,
        shipping_details: shippingAddress,
        payment_ref: paymentTransactionId,
        client_order_id: `ZET_SHOP_${paymentTransactionId || Date.now()}`
    };

    try {
        // return await makeApiCall(endpoint, {}, 'POST', payload); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 1800));
        const success = Math.random() > 0.05; // 95% success
        if (success) {
            return {
                success: true,
                orderId: `ECOMPROV_ORD_${Date.now()}`,
                message: 'Order confirmed by shopping partner. Preparing for shipment.'
            };
        } else {
            return { success: false, message: 'Shopping partner could not confirm the order (e.g., stock issue).' };
        }
    } catch (error) {
        console.warn(`[Shopping Provider] Falling back to mock failure for placeOrder: ${error.message}`);
        return { success: false, message: `Order placement with provider failed: ${error.message}` };
    }
}

module.exports = {
    fetchCategoriesFromApi,
    fetchProductsFromApi,
    fetchProductDetailsFromApi,
    placeOrderWithProviderApi,
};
