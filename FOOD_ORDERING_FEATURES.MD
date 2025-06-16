
# Zet Pay Super App: Food Ordering Feature Documentation

This document outlines the (conceptual) Online Food Ordering feature within the Zet Pay application, aiming to allow users to order food from local restaurants.

## 1. Introduction

The Food Ordering module in Zet Pay aims to provide a seamless experience for users to browse restaurants, view menus, place orders, and make payments, all within the super app. This feature would typically integrate with food aggregators or directly with restaurant partners.

## 2. Core Functionalities (Conceptual)

### 2.1. Restaurant Discovery & Listing
-   **Functionality:** Users can search for restaurants by name, cuisine, location, or specific dishes. The app would display a list of available restaurants, filterable by various criteria (e.g., rating, delivery time, price range, pure veg).
-   **Implementation (Conceptual):**
    -   Frontend: `/src/app/(features)/food/page.tsx` would handle restaurant discovery, filtering, and display.
    -   Backend:
        -   Routes: `GET /api/food/restaurants/search`, `GET /api/food/restaurants/categories`.
        -   Controller: `foodController.js` (conceptual).
        -   Service: `foodProviderService.js` (conceptual) would simulate fetching restaurant listings from an aggregator API (like Zomato/Swiggy) or a Firestore collection of partnered restaurants.
    -   Firestore: `restaurants` collection to store details of partnered restaurants (if direct integration).
    -   **Redis Caching:** Restaurant listings for popular areas or frequently searched cuisines could be cached.

### 2.2. Menu Browsing & Dish Selection
-   **Functionality:** Users can view a restaurant's menu, categorized by sections (e.g., Starters, Main Course, Desserts). They can see dish details (name, description, price, veg/non-veg indicators, images). Users can add items to their cart and customize them (e.g., toppings, spice level, quantity).
-   **Implementation (Conceptual):**
    -   Frontend: `/src/app/(features)/food/[restaurantId]/page.tsx` would display the selected restaurant's menu.
    -   Backend:
        -   Route: `GET /api/food/restaurants/:restaurantId/menu`.
        -   Controller: `foodController.js`.
        -   Service: `foodProviderService.js` (simulates fetching menu data).
    -   Firestore: `restaurants/{restaurantId}/menuItems` subcollection or embedded menu data.

### 2.3. Cart Management & Order Placement
-   **Functionality:** Users can view their cart, modify quantities, apply coupons, and proceed to checkout.
-   **Implementation (Conceptual):**
    -   Frontend: Cart component, checkout flow.
    -   Backend:
        -   Route: `POST /api/food/orders/place`.
        -   Controller: `foodController.js`.
        -   Service: `foodProviderService.js` (simulates placing the order with the restaurant/aggregator).
    -   Firestore: `users/{userId}/foodOrders` to store user's order history.

### 2.4. Payment Processing
-   **Functionality:** Users can pay for their food orders using Zet Pay Wallet, UPI, or other integrated payment methods.
-   **Implementation (Conceptual):**
    -   Frontend: Payment selection during checkout.
    -   Backend: `foodController.js` (`placeOrder` method) would handle payment processing via internal payment services (`payViaWalletInternal`, `processUpiPaymentInternal`) and log the transaction.
    -   **Transaction Logging:** Food order payments logged to the `transactions` collection.

### 2.5. Order Tracking (Conceptual)
-   **Functionality:** Users can track the status of their order in real-time (e.g., Order Placed, Preparing, Out for Delivery, Delivered). Live map tracking of the delivery agent.
-   **Implementation (Conceptual):**
    -   Frontend: Order status page with map view.
    -   Backend: WebSockets for real-time updates from the aggregator/restaurant.
    -   **Live Tracking:** Integration with delivery partner's tracking system.

## 3. Advanced & UX Features (Conceptual)

### 3.1. AR Dish Preview
-   **Functionality:** Users can view a 3D Augmented Reality (AR) model of a dish before ordering to get a better sense of its appearance and portion size.
-   **Implementation (Conceptual):**
    -   Requires 3D models of dishes.
    -   Frontend integration with AR libraries (e.g., ARKit, ARCore, WebXR).

### 3.2. Personalized Recommendations
-   **Functionality:** AI-powered suggestions for restaurants or dishes based on user's past orders, preferences, time of day, and location.
-   **Implementation (Conceptual):**
    -   Backend AI Flow: Genkit flow to analyze order history and provide recommendations.

### 3.3. Group Ordering & Bill Splitting
-   **Functionality:** Allow multiple users to add items to a shared cart and easily split the bill.
-   **Implementation (Conceptual):**
    -   Frontend UI for group cart and bill splitting.
    -   Backend logic for managing shared carts and payment splitting.

## 4. Technical Implementation Summary (Conceptual)

-   **Frontend:** React components for restaurant listings, menus, cart, checkout. API calls via a `src/services/food.ts` (conceptual).
-   **Backend:** Express.js routes (`foodRoutes.js`), `foodController.js`, `foodProviderService.js`.
-   **Data Storage:**
    -   Firestore: `restaurants` (partnered restaurants and menus), `users/{userId}/foodOrders`.
    -   Redis: Caching restaurant listings, popular menus.
-   **Transaction Logging:** Food order payments logged via `transactionLogger.ts`.
-   **External Integrations:** APIs from food aggregators (Zomato, Swiggy) or direct restaurant POS systems.

The Food Ordering feature, while conceptual in the current Zet Pay build, would aim to provide a comprehensive and convenient food discovery and ordering experience.

    