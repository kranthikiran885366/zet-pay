
// backend/services/foodProviderService.js
const axios = require('axios'); // Example HTTP client
const { mockRestaurantsData, mockCuisinesData, getMockRestaurantDetailsData } = require('../../src/mock-data/food'); // Import mock data

const FOOD_API_URL = process.env.FOOD_DELIVERY_API_URL || 'https://api.examplefood.com/v1';
const FOOD_API_KEY = process.env.FOOD_DELIVERY_API_KEY || 'YOUR_FOOD_API_KEY_PLACEHOLDER';

// Helper to simulate API call or make a real one if configured
async function makeApiCall(endpoint, params = {}, method = 'GET', data = null) {
    const headers = { 'Authorization': `Bearer ${FOOD_API_KEY}`, 'Content-Type': 'application/json' };
    const config = { headers, params, method, data };

    if (process.env.USE_REAL_FOOD_API !== 'true' || FOOD_API_KEY === 'YOUR_FOOD_API_KEY_PLACEHOLDER') {
        console.warn(`[Food Provider] MOCK API call for ${endpoint}. Real API not configured or not enabled.`);
        // Fallback to mock logic here or in calling function
        throw new Error("Mock logic needs to be handled by caller or this function should return mock.");
    }

    // TODO: Implement REAL API call
    // const response = await axios({ url: `${FOOD_API_URL}${endpoint}`, ...config });
    // if (response.status < 200 || response.status >= 300) {
    //     throw new Error(response.data?.message || `API Error: ${response.status}`);
    // }
    // return response.data;
    console.error(`[Food Provider] REAL API call for ${endpoint} NOT IMPLEMENTED.`);
    throw new Error("Real Food API integration not implemented.");
}

/**
 * Fetches restaurants from the provider API.
 */
async function searchRestaurantsFromApi({ location, cuisine, query }) {
    console.log(`[Food Provider] Searching restaurants (API):`, { location, cuisine, query });
    const endpoint = '/restaurants/search';
    const params = { location, cuisine, query, limit: 20 };

    try {
        // return await makeApiCall(endpoint, params); // For REAL API
        // Simulate API call with mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        let results = mockRestaurantsData;
        if (query) {
            results = results.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || r.cuisine.some(c => c.toLowerCase().includes(query.toLowerCase())));
        }
        if (cuisine && cuisine !== "All") {
            results = results.filter(r => r.cuisine.some(c => c.toLowerCase() === cuisine.toLowerCase()));
        }
        // Simulate location filtering loosely
        if (location) {
            results = results.filter(() => Math.random() > 0.3);
        }
        return results;
    } catch (error) {
        console.warn(`[Food Provider] Falling back to basic mock for searchRestaurants due to error: ${error.message}`);
        return mockRestaurantsData.slice(0, 5); // Basic fallback
    }
}

/**
 * Fetches menu for a specific restaurant from the provider API.
 */
async function fetchMenuFromApi(restaurantId) {
    console.log(`[Food Provider] Fetching menu for restaurant ${restaurantId} (API)`);
    const endpoint = `/restaurants/${restaurantId}/menu`;
    try {
        // return await makeApiCall(endpoint); // For REAL API
        return await getMockRestaurantDetailsData(restaurantId); // Use refined mock
    } catch (error) {
        console.warn(`[Food Provider] Falling back to basic mock for fetchMenu due to error: ${error.message}`);
        const mockDetails = await getMockRestaurantDetailsData(restaurantId);
        return mockDetails ? mockDetails.menuItems : []; // Return only menuItems or handle error
    }
}

/**
 * Fetches details for a specific restaurant (used internally for name, etc.).
 */
async function fetchRestaurantDetailsFromApi(restaurantId) {
    console.log(`[Food Provider] Fetching details for restaurant ${restaurantId} (API)`);
    const endpoint = `/restaurants/${restaurantId}`;
    try {
        // return await makeApiCall(endpoint); // For REAL API
        return await getMockRestaurantDetailsData(restaurantId); // Use refined mock
    } catch (error) {
        console.warn(`[Food Provider] Falling back to basic mock for fetchRestaurantDetails due to error: ${error.message}`);
        return mockRestaurantsData.find(r => r.id === restaurantId) || null;
    }
}


/**
 * Places a food order with the provider API.
 */
async function placeOrderWithProviderApi(orderDetails) {
    const { userId, restaurantId, items, totalAmount, deliveryAddress, paymentTransactionId } = orderDetails;
    console.log(`[Food Provider] Placing order with provider (API): Restaurant ${restaurantId}, User ${userId}`);
    const endpoint = '/orders';
    const payload = {
        restaurant_id: restaurantId,
        user_id: userId, // Provider might have its own user mapping
        items: items.map(item => ({ item_id: item.itemId, quantity: item.quantity, price_at_order: item.price })),
        total_amount: totalAmount,
        delivery_address: deliveryAddress,
        payment_reference: paymentTransactionId, // Link our transaction
        client_order_id: `ZET_${paymentTransactionId || Date.now()}` // Our unique order ID
    };

    try {
        // return await makeApiCall(endpoint, {}, 'POST', payload); // For REAL API
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
            return {
                success: true,
                orderId: `FOODPROV_ORD_${Date.now()}`,
                estimatedDeliveryTime: `${Math.floor(Math.random() * 20) + 25} minutes`,
                message: 'Order successfully placed with the restaurant.'
            };
        } else {
            return { success: false, message: 'Restaurant is currently too busy or unable to accept orders.' };
        }
    } catch (error) {
        console.warn(`[Food Provider] Falling back to mock failure for placeOrder due to error: ${error.message}`);
        return { success: false, message: `Order placement failed: ${error.message}` };
    }
}

/**
 * Fetches the status of an existing food order from the provider API.
 */
async function fetchOrderStatusFromApi(orderId) {
    console.log(`[Food Provider] Fetching order status for ${orderId} (API)`);
    const endpoint = `/orders/${orderId}/status`;
    try {
        // return await makeApiCall(endpoint); // For REAL API
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 700));
        const statuses = ['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        return {
            orderId,
            status: randomStatus,
            estimatedTime: randomStatus === 'Preparing' ? '15 mins' : randomStatus === 'Out for Delivery' ? '10 mins to arrival' : 'N/A',
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.warn(`[Food Provider] Falling back to mock status for fetchOrderStatus due to error: ${error.message}`);
        return { orderId, status: 'Unknown', message: `Error fetching status: ${error.message}` };
    }
}

module.exports = {
    searchRestaurantsFromApi,
    fetchMenuFromApi,
    fetchRestaurantDetailsFromApi,
    placeOrderWithProviderApi,
    fetchOrderStatusFromApi,
};
