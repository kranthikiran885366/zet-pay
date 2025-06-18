
# Zet Pay Super App: Hyperlocal Services Documentation

This document outlines the Hyperlocal Services feature within the Zet Pay application, detailing the implemented backend structure designed for real API integration and the corresponding frontend interactions.

## 1. Introduction

The Hyperlocal Services module in Zet Pay connects users with local service providers for a range of needs, from home repairs to personal care, facilitating easy booking and payment. It is designed for integration with hyperlocal service aggregators or individual provider platforms via backend APIs.

## 2. Core Functionalities

### 2.1. Service Discovery & Provider Listing
-   **Functionality:** Users can browse available hyperlocal services (e.g., Electrician, Plumber, AC Repair, Salon, Car Wash, Laundry, Courier, Pest Control, Tailoring) within their city or a specified location.
-   **Implementation:**
    -   Frontend: Service-specific pages like `/src/app/(features)/hyperlocal/repair/page.tsx`, `/src/app/(features)/hyperlocal/ac-repair/page.tsx`, etc. A central hyperlocal hub page (`/services`) lists categories.
    -   Backend:
        -   Route: `GET /api/hyperlocal/services` (Handles queries like `?lat=...&lon=...&pincode=...&serviceType=...`)
        -   Controller: `backend/controllers/hyperlocalController.js` (`getAvailableServices` method).
        -   Service: `backend/services/hyperlocalProviderService.js` (`findServicesNearby` method)
            -   Structured to call a real external hyperlocal aggregator API (e.g., `process.env.HYPERLOCAL_API_URL`).
            -   Uses placeholder `HYPERLOCAL_API_KEY`.
            -   Falls back to mock data if the real API call is disabled or fails.
    -   Firestore: `hyperlocalProviders` collection (conceptual, for direct listings or cached aggregator data).
    -   **Redis Caching (Conceptual):** `hyperlocalProviderService.js` would cache lists of service providers or service types for a given area fetched from real APIs.

### 2.2. Service Details & Slot Booking
-   **Functionality:** Users can view details about a specific service or provider, including pricing, available time slots, and service descriptions. They can then select a slot and book the service.
-   **Implementation:**
    -   Frontend: UI to display service details and a calendar/time-slot picker on specific service pages (e.g., `/hyperlocal/ac-repair/page.tsx`).
    -   Backend:
        -   Route: `GET /api/hyperlocal/:serviceType/details` (Handles queries like `?providerId=...&date=...`)
        -   Controller: `backend/controllers/hyperlocalController.js` (`getServiceDetails` method).
        -   Service: `backend/services/hyperlocalProviderService.js` (`getServiceInfo` method)
            -   Designed to call an external API for service/provider details and slot availability.
            -   Falls back to mock data.
        -   Route: `POST /api/hyperlocal/:serviceType` (to book a service).
        -   Controller: `backend/controllers/hyperlocalController.js` (`bookService` method).
            -   Handles payment processing (via Wallet, UPI) and then calls `hyperlocalProviderService.js`.
        -   Service: `backend/services/hyperlocalProviderService.js` (`confirmBooking` method)
            -   Structured to call the external provider's booking confirmation API.
            -   Returns mock success/failure if the real API call is disabled.
    -   Firestore: User bookings stored in `users/{userId}/hyperlocalBookings` (conceptual).

### 2.3. Payment for Services
-   **Functionality:** Users pay for booked services through Zet Pay using Wallet, UPI, or other integrated payment methods.
-   **Implementation:**
    -   Frontend: Payment integration at the time of booking on service-specific pages.
    -   Backend: `hyperlocalController.js` (`bookService` method) handles payment processing:
        -   Calls internal payment services (`payViaWalletInternal` or conceptual UPI/Card).
        -   Logs the financial transaction to the `transactions` collection via `transactionLogger.ts`.
        -   Sends real-time updates via WebSockets.

## 3. Example Hyperlocal Service Categories (Conceptual/Implemented as Placeholders)

*   **AC Repair & Service:** `/src/app/(features)/hyperlocal/ac-repair/page.tsx`
*   **Car Wash at Home:** `/src/app/(features)/hyperlocal/carwash/page.tsx`
*   **Home Cleaning / Pest Control:** `/src/app/(features)/hyperlocal/cleaning/page.tsx`
*   **Instant Courier (Local):** `/src/app/(features)/hyperlocal/courier/page.tsx`
*   **Coworking Space Booking:** `/src/app/(features)/hyperlocal/coworking/page.tsx`
*   **Laundry Pickup & Delivery:** `/src/app/(features)/hyperlocal/laundry/page.tsx`
*   **Pet Services (Grooming, Vet):** `/src/app/(features)/hyperlocal/petcare/page.tsx`
*   **Home Repairs (Electrician, Plumber):** `/src/app/(features)/hyperlocal/repair/page.tsx`
*   **Salon & Barber Appointments:** `/src/app/(features)/hyperlocal/salon/page.tsx`
*   **Tailoring Services:** `/src/app/(features)/hyperlocal/tailor/page.tsx`

## 4. Advanced Features (Conceptual)

### 4.1. Real-time Service Provider Tracking
-   **Functionality:** Track the provider's location in real-time.
-   **Implementation (Conceptual):** Requires GPS capabilities from provider's app and live tracking backend.

### 4.2. In-app Chat with Provider
-   **Functionality:** Communicate with the service provider via Zet Pay after booking.
-   **Implementation (Conceptual):** Leverage existing `ZetChat` component and backend chat infrastructure.

### 4.3. Service Ratings & Reviews
-   **Functionality:** Users rate and review providers.
-   **Implementation (Conceptual):** Firestore would store ratings/reviews linked to providers.

## 5. Technical Implementation Summary

-   **Frontend:**
    -   React components for service category pages, provider listings, booking forms (`src/app/(features)/hyperlocal/`).
    -   API calls via `src/services/hyperlocal.ts`.
-   **Backend:**
    -   Express.js routes in `backend/routes/hyperlocalRoutes.js`.
    -   `backend/controllers/hyperlocalController.js` for request handling.
    -   `backend/services/hyperlocalProviderService.js` for (conceptual) external API interactions and mock fallbacks.
-   **Data Storage (Firestore):**
    -   `hyperlocalProviders` (conceptual, for direct listings or cached aggregator data).
    -   `users/{userId}/hyperlocalBookings` (conceptual for user's booking history).
    -   `transactions` (financial logs).
-   **Redis Caching (Conceptual):**
    -   `hyperlocalProviderService.js` would cache provider lists and service details from real APIs.
-   **Transaction Logging:** Service payments logged via `transactionLogger.ts`.
-   **External Integrations (Conceptual):**
    -   APIs from hyperlocal service aggregators (e.g., Urban Company style platforms) or direct provider systems.
    -   Environment variables: `HYPERLOCAL_API_URL