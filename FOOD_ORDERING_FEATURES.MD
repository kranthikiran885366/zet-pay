# Zet Pay Super App: Food Ordering Feature Documentation

This document outlines the Online Food Ordering feature within the Zet Pay application, aiming to allow users to order food from local restaurants. It details the implemented backend structure designed for real API integration and the corresponding frontend interactions.

## 1. Introduction

The Food Ordering module in Zet Pay aims to provide a seamless experience for users to browse restaurants, view menus, place orders, and make payments, all within the super app. This feature is designed to integrate with food aggregators or directly with restaurant partners via backend APIs.

## 2. Core Functionalities

### 2.1. Restaurant Discovery & Listing
-   **Functionality:** Users can search for restaurants by name, cuisine, location, or specific dishes. The app displays a list of available restaurants, filterable by various criteria (e.g., rating, delivery time, price range, pure veg).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/food/page.tsx` handles restaurant discovery, filtering, and display.
    -   Backend:
        -   Route: `GET /api/food/restaurants/search` (Handles queries like `?location=...&cuisine=...&query=...`)
        -   Controller: `backend/controllers/foodController.js` (`searchRestaurants` method).
        -   Service: `backend/services/foodProviderService.js` (`searchRestaurantsFromApi` method)
            -   This service is structured to call a real external food aggregator API (e.g., `process.env.FOOD_DELIVERY_API_URL`).
            -   Uses placeholder `FOOD_DELIVERY_API_KEY`.
            -   Falls back to mock data (`mockRestaurantsData`) if the real API call is disabled or fails.
    -   Firestore: `restaurants` collection (conceptual, for direct partnerships if not using aggregator).
    -   **Redis Caching (Conceptual):** Restaurant listings for popular areas or frequently searched cuisines would be cached by `foodProviderService.js` after fetching from the real API.

### 2.2. Menu Browsing & Dish Selection
-   **Functionality:** Users can view a restaurant's menu, categorized by sections. They can see dish details (name, description, price, veg/non-veg indicators, images). Users can add items to their cart and customize them.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/food/[restaurantId]/page.tsx` displays the selected restaurant's menu.
    -   Backend:
        -   Route: `GET /api/food/restaurants/:restaurantId/menu`.
        -   Controller: `backend/controllers/foodController.js` (`getRestaurantMenu` method).
        -   Service: `backend/services/foodProviderService.js` (`fetchMenuFromApi` method)
            -   Designed to call an external API endpoint for a specific restaurant's menu.
            -   Falls back to mock data (`getMockRestaurantDetailsData`) if the real API call fails or is disabled.
    -   Firestore: `restaurants/{restaurantId}/menuItems` (conceptual for direct partnerships).

### 2.3. Cart Management & Order Placement
-   **Functionality:** Users can view their cart, modify quantities, apply coupons (conceptual), and proceed to checkout.
-   **Implementation:**
    -   Frontend: Cart management handled client-side (`src/app/(features)/food/page.tsx` and `src/app/(features)/food/[restaurantId]/page.tsx`). Checkout flow triggers order placement.
    -   Backend:
        -   Route: `POST /api/food/orders/place`.
        -   Controller: `backend/controllers/foodController.js` (`placeFoodOrder` method).
            -   This controller method:
                1.  Logs an initial 'Pending' transaction.
                2.  Processes payment via `payViaWalletInternal` (or conceptual UPI/Card via `paymentGatewayService`).
                3.  If payment is successful, calls `foodProviderService.js` (`placeOrderWithProviderApi`).
                4.  Updates transaction status based on provider response and logs to Firestore.
                5.  Saves order details to `users/{userId}/foodOrders` in Firestore.
        -   Service: `backend/services/foodProviderService.js` (`placeOrderWithProviderApi` method)
            -   Structured to call the external food aggregator's order placement API.
            -   Returns mock success/failure if the real API call is disabled.
    -   Firestore: `users/{userId}/foodOrders` stores user's order history.

### 2.4. Payment Processing
-   **Functionality:** Users pay for food orders using Zet Pay Wallet, UPI, or other integrated payment methods.
-   **Implementation:**
    -   Frontend: Payment selection integrated into the checkout flow on the food pages.
    -   Backend: `foodController.js` (`placeFoodOrder` method) handles payment processing:
        -   Calls internal payment services (`payViaWalletInternal` or conceptual UPI/Card).
        -   Logs the financial transaction to the `transactions` collection via `transactionLogger.ts`.
        -   Sends real-time updates via WebSockets.

### 2.5. Order Tracking
-   **Functionality:** Users can track the status of their order in real-time (e.g., Order Placed, Preparing, Out for Delivery, Delivered).
-   **Implementation:**
    -   Frontend: An order status page (e.g., part of `/history` or a dedicated order tracking page).
    -   Backend:
        -   Route: `GET /api/food/orders/:orderId` (Conceptual, uses `getFoodOrderStatus` in controller).
        -   Controller: `backend/controllers/foodController.js` (`getFoodOrderStatus` method).
        -   Service: `backend/services/foodProviderService.js` (`fetchOrderStatusFromApi` method)
            -   Designed to call the external aggregator's order status API.
            -   Returns mock status if the real API call is disabled.
        -   WebSockets for real-time updates pushed from the backend upon receiving updates from the aggregator/restaurant.

## 3. Advanced & UX Features (Conceptual)

### 3.1. AR Dish Preview
-   **Functionality:** Users could view a 3D Augmented Reality (AR) model of a dish before ordering.
-   **Implementation (Conceptual):** Requires 3D models of dishes and frontend AR library integration.

### 3.2. Personalized Recommendations
-   **Functionality:** AI-powered suggestions for restaurants or dishes.
-   **Implementation (Conceptual):** A Genkit AI flow (`src/ai/flows/food-recommendation-flow.ts` - conceptual) analyzing order history.

### 3.3. Group Ordering & Bill Splitting
-   **Functionality:** Allow multiple users to add items to a shared cart and split the bill.
-   **Implementation (Conceptual):** Complex frontend UI and backend logic for shared carts and payment splitting.

## 4. Technical Implementation Summary

-   **Frontend:**
    -   React components for restaurant listings, menus, cart, checkout (`src/app/(features)/food/`).
    -   API calls via `src/services/food.ts`.
-   **Backend:**
    -   Express.js routes in `backend/routes/foodRoutes.js`.
    -   `backend/controllers/foodController.js` for request handling.
    -   `backend/services/foodProviderService.js` for (conceptual) external API interactions and mock fallbacks.
    -   `backend/services/transactionLogger.ts` for payment logging.
    -   `backend/services/wallet.ts` (and conceptual `paymentGatewayService.js`) for payment processing.
-   **Data Storage (Firestore):**
    -   `restaurants` (conceptual, for direct listings or cached aggregator data).
    -   `users/{userId}/foodOrders` (order history).
    -   `transactions` (financial logs).
-   **Redis Caching (Conceptual):**
    -   `foodProviderService.js` would cache restaurant listings and popular menus fetched from real APIs.
-   **External Integrations (Conceptual):**
    -   APIs from food aggregators (Zomato, Swiggy) or direct restaurant POS systems.
    -   Environment variables: `FOOD_DELIVERY_API_URL`, `FOOD_DELIVERY_API_KEY`.

The Food Ordering feature is structured to accommodate real API integrations, providing a foundation for a comprehensive food discovery and ordering experience within Zet Pay.