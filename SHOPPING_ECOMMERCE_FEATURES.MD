# Zet Pay Super App: Shopping & eCommerce Features Documentation

This document outlines the Online Shopping and Grocery Shopping features within the Zet Pay application. It details the implemented backend structure designed for real API integration and the corresponding frontend interactions.

## 1. Introduction

Zet Pay's eCommerce module aims to provide users with an integrated shopping experience, allowing them to browse products, add to cart, and make purchases from various online stores or for groceries, all within the super app. This feature is designed for integrations with eCommerce platforms, aggregators, or direct partnerships via backend APIs.

## 2. Core Shopping Functionalities

### 2.1. Product Discovery & Browsing
-   **Functionality:** Users can browse products across various categories (electronics, fashion, home goods, groceries, etc.). Search for specific products and filter them.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/shopping/online/page.tsx`: For general eCommerce.
        -   `/src/app/(features)/shopping/grocery/page.tsx`: For grocery shopping.
        -   UI includes product listings, category filters, search bar.
    -   Backend:
        -   Routes: `GET /api/shopping/categories`, `GET /api/shopping/products` (handles queries like `?categoryId=...&searchTerm=...`).
        -   Controller: `backend/controllers/shoppingController.js` (`getCategories`, `getProducts` methods).
        -   Service: `backend/services/shoppingProviderService.js` (`fetchCategoriesFromApi`, `fetchProductsFromApi` methods)
            -   Structured to call a real external eCommerce platform API (e.g., `process.env.ECOMMERCE_PLATFORM_API_URL`).
            -   Uses placeholder `ECOMMERCE_PLATFORM_API_KEY`.
            -   Falls back to mock data (`mockCategoriesData`, `mockProductsData`) if the real API call is disabled or fails.
    -   Firestore: `products`, `productCategories` (conceptual, for direct listings or cached data).
    -   **Redis Caching (Conceptual):** `shoppingProviderService.js` would cache categories, popular products, etc., fetched from real APIs.

### 2.2. Product Details Page
-   **Functionality:** Users can view detailed information about a selected product, including images, specifications, and reviews.
-   **Implementation:**
    -   Frontend: A dynamic page like `/src/app/(features)/shopping/product/[productId]/page.tsx` (conceptual).
    -   Backend:
        -   Route: `GET /api/shopping/products/:productId`.
        -   Controller: `backend/controllers/shoppingController.js` (`getProductDetails` method).
        -   Service: `backend/services/shoppingProviderService.js` (`fetchProductDetailsFromApi` method)
            -   Designed to call an external API for specific product details.
            -   Falls back to mock data.

### 2.3. Shopping Cart & Wishlist
-   **Functionality:** Users can add products to a cart, adjust quantities, and save items to a wishlist.
-   **Implementation:**
    -   Frontend: Cart management (add, update, remove items) handled client-side (e.g., within `src/app/(features)/shopping/online/page.tsx`). Wishlist is conceptual.
    -   Backend (Conceptual for cart/wishlist persistence):
        -   Routes: `POST /api/shopping/cart/add`, `GET /api/shopping/cart` etc. would be needed.
        -   Controller: `shoppingController.js` or a dedicated `cartController.js`.
    -   Firestore: `users/{userId}/shoppingCart`, `users/{userId}/wishlist` (conceptual for persistent storage).

### 2.4. Checkout & Payment
-   **Functionality:** Secure checkout process including shipping address, delivery options, coupon application, and payment.
-   **Implementation:**
    -   Frontend: Multi-step checkout UI within shopping pages.
    -   Backend:
        -   Route: `POST /api/shopping/orders`.
        -   Controller: `backend/controllers/shoppingController.js` (`placeOrder` method).
            -   This controller method:
                1.  Logs an initial 'Pending' transaction.
                2.  Processes payment via `payViaWalletInternal` (or conceptual UPI/Card).
                3.  If payment is successful, calls `shoppingProviderService.js` (`placeOrderWithProviderApi`).
                4.  Updates transaction status and logs order details to Firestore.
        -   Service: `backend/services/shoppingProviderService.js` (`placeOrderWithProviderApi` method)
            -   Structured to call the external eCommerce partner's order placement API.
            -   Returns mock success/failure if the real API call is disabled.
    -   **Transaction Logging:** Shopping order payments logged to the `transactions` collection via `transactionLogger.ts`.
    -   Firestore: `users/{userId}/shoppingOrders` stores user's order history.

### 2.5. Order Management & Tracking
-   **Functionality:** Users can view order history, track current order status, and manage returns/cancellations.
-   **Implementation:**
    -   Frontend: "My Orders" section (e.g., part of user profile or `/history`).
    -   Backend:
        -   Routes: `GET /api/shopping/orders`, `GET /api/shopping/orders/:orderId`.
        -   Controller: `backend/controllers/shoppingController.js` (`getOrderHistory`, `getOrderDetails` methods).
        -   Service: `shoppingProviderService.js` (conceptual, would fetch order status from partner APIs or internal Firestore data).

## 3. Advanced Shopping Features (Conceptual)

### 3.1. Personalized Recommendations & AI Deal Finder
-   **Functionality:** AI suggests products and finds best deals.
-   **Implementation (Conceptual):** A Genkit AI flow (`src/ai/flows/shopping-recommendation-flow.ts` - conceptual).

### 3.2. Group Buying / Social Shopping
-   **Functionality:** Users invite friends for group discounts.
-   **Implementation (Conceptual):** Frontend UI and backend logic for group management.

### 3.3. Visual Search
-   **Functionality:** Upload image to search for similar products.
-   **Implementation (Conceptual):** Integration with a visual search AI API.

## 4. Technical Implementation Summary

-   **Frontend:**
    -   React components for product discovery, product pages, cart, checkout, order history (`src/app/(features)/shopping/`).
    -   API calls via `src/services/shopping.ts`.
-   **Backend:**
    -   Express.js routes in `backend/routes/shoppingRoutes.js`.
    -   `backend/controllers/shoppingController.js` for request handling.
    -   `backend/services/shoppingProviderService.js` for (conceptual) external API interactions and mock fallbacks.
    -   `backend/services/transactionLogger.ts` for payment logging.
-   **Data Storage (Firestore):**
    -   `products`, `productCategories` (conceptual).
    -   `users/{userId}/shoppingCart`, `users/{userId}/wishlist` (conceptual).
    -   `users/{userId}/shoppingOrders` (order history).
    -   `transactions` (financial logs).
-   **Redis Caching (Conceptual):**
    -   `shoppingProviderService.js` would cache product listings, categories from real APIs.
-   **External Integrations (Conceptual):**
    -   APIs from eCommerce platforms (Shopify, Magento), aggregators, or specific brands.
    -   Environment variables: `ECOMMERCE_PLATFORM_API_URL`, `ECOMMERCE_PLATFORM_API_KEY`.

The Shopping & eCommerce features in Zet Pay are architected to integrate with real online retail systems, providing a foundation for a convenient and integrated shopping experience.