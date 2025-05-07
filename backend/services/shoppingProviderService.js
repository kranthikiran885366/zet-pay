// backend/services/shoppingProviderService.js
// Mock data source for shopping features

const mockCategories = [
    { id: 'electronics', name: 'Electronics', imageUrl: 'https://picsum.photos/seed/electronics_cat/200/150' },
    { id: 'fashion', name: 'Fashion', imageUrl: 'https://picsum.photos/seed/fashion_cat/200/150' },
    { id: 'home', name: 'Home & Kitchen', imageUrl: 'https://picsum.photos/seed/home_cat/200/150' },
    { id: 'grocery', name: 'Grocery', imageUrl: 'https://picsum.photos/seed/grocery_cat/200/150' },
    { id: 'beauty', name: 'Beauty & Personal Care', imageUrl: 'https://picsum.photos/seed/beauty_cat/200/150' },
    { id: 'books', name: 'Books & Media', imageUrl: 'https://picsum.photos/seed/books_cat/200/150' },
];

const mockProducts = [
    // Electronics
    { id: 'prod1', name: 'Wireless Bluetooth Headphones', description: 'Noise-cancelling over-ear headphones with long battery life.', price: 2999, imageUrl: 'https://picsum.photos/seed/headphones/300/300', categoryId: 'electronics', categoryName: 'Electronics', stock: 50, rating: 4.5, brand: 'SoundMagic' },
    { id: 'prod2', name: 'Smartwatch Fitness Tracker', description: 'Tracks heart rate, steps, sleep, and notifications.', price: 3499, imageUrl: 'https://picsum.photos/seed/smartwatch/300/300', categoryId: 'electronics', categoryName: 'Electronics', stock: 30, rating: 4.2, brand: 'FitTech', offer: "10% OFF" },
    { id: 'prod3', name: 'Portable Power Bank 20000mAh', description: 'Fast charging power bank for all your devices.', price: 1899, imageUrl: 'https://picsum.photos/seed/powerbank/300/300', categoryId: 'electronics', categoryName: 'Electronics', stock: 100, rating: 4.0, brand: 'ChargeUp' },
    // Fashion
    { id: 'prod4', name: 'Men\'s Casual T-Shirt', description: 'Comfortable cotton t-shirt, available in various colors.', price: 499, imageUrl: 'https://picsum.photos/seed/tshirt_men/300/300', categoryId: 'fashion', categoryName: 'Fashion', stock: 200, rating: 4.3, brand: 'UrbanStyle' },
    { id: 'prod5', name: 'Women\'s Skinny Fit Jeans', description: 'Stretchable denim jeans for a perfect fit.', price: 1299, imageUrl: 'https://picsum.photos/seed/jeans_women/300/300', categoryId: 'fashion', categoryName: 'Fashion', stock: 150, rating: 4.0, brand: 'DenimCo' },
    { id: 'prod6', name: 'Unisex Sports Sneakers', description: 'Lightweight and durable sneakers for all activities.', price: 2200, imageUrl: 'https://picsum.photos/seed/sneakers/300/300', categoryId: 'fashion', categoryName: 'Fashion', stock: 80, rating: 4.6, brand: 'ActiveRun', offer: "Launch Offer!" },
    // Home & Kitchen
    { id: 'prod7', name: 'Non-Stick Cookware Set (3 pcs)', description: 'Induction compatible cookware set.', price: 1999, imageUrl: 'https://picsum.photos/seed/cookware/300/300', categoryId: 'home', categoryName: 'Home & Kitchen', stock: 60, rating: 4.1, brand: 'KitchenMaster' },
    { id: 'prod8', name: 'Microfiber Bed Sheet Set (Queen)', description: 'Soft and comfortable double bedsheet with 2 pillow covers.', price: 899, imageUrl: 'https://picsum.photos/seed/bedsheet/300/300', categoryId: 'home', categoryName: 'Home & Kitchen', stock: 120, rating: 3.9, brand: 'HomeComfort' },
    // Grocery (Example)
    { id: 'prod9', name: 'Organic Honey 500g', description: 'Pure and natural organic honey.', price: 350, imageUrl: 'https://picsum.photos/seed/honey/300/300', categoryId: 'grocery', categoryName: 'Grocery', stock: 0, rating: 4.7, brand: 'NaturePure' }, // Out of stock example
    { id: 'prod10', name: 'Basmati Rice - Premium 1kg', description: 'Long grain premium basmati rice.', price: 120, imageUrl: 'https://picsum.photos/seed/rice/300/300', categoryId: 'grocery', categoryName: 'Grocery', stock: 300, rating: 4.4, brand: 'RoyalGrain' },
];

/**
 * Fetches all shopping categories.
 * @returns {Promise<object[]>} A list of category objects.
 */
async function fetchCategories() {
    console.log("[Shopping Provider Sim] Fetching categories...");
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    return mockCategories;
}

/**
 * Fetches products, optionally filtered by category.
 * @param {string} [categoryId] - Optional category ID to filter by.
 * @returns {Promise<object[]>} A list of product objects.
 */
async function fetchProducts(categoryId) {
    console.log(`[Shopping Provider Sim] Fetching products ${categoryId ? `for category ${categoryId}` : 'all'}...`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    if (categoryId) {
        return mockProducts.filter(p => p.categoryId === categoryId);
    }
    return mockProducts;
}

/**
 * Fetches a single product by its ID.
 * @param {string} productId - The ID of the product.
 * @returns {Promise<object|null>} The product object or null if not found.
 */
async function fetchProductById(productId) {
    console.log(`[Shopping Provider Sim] Fetching product by ID: ${productId}...`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    return mockProducts.find(p => p.id === productId) || null;
}

/**
 * Simulates saving an order to a database.
 * In a real app, this would write to Firestore or another DB.
 * @param {object} orderData - The order details.
 * @returns {Promise<string>} The mock order ID.
 */
async function saveOrder(orderData) {
    console.log("[Shopping Provider Sim] Saving order (mock):", orderData);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate save delay
    // This is where you would typically interact with db.collection('orders').add(orderData)
    const mockOrderId = `MOCK_ORD_${Date.now()}`;
    console.log(`[Shopping Provider Sim] Mock order ${mockOrderId} 'saved'.`);
    return mockOrderId;
}


module.exports = {
    fetchCategories,
    fetchProducts,
    fetchProductById,
    saveOrder,
};
