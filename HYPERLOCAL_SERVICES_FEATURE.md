
# Zet Pay Super App: Hyperlocal Services Documentation

This document outlines the Hyperlocal Services feature within the Zet Pay application, enabling users to book various local services.

## 1. Introduction

The Hyperlocal Services module in Zet Pay connects users with local service providers for a range of needs, from home repairs to personal care, facilitating easy booking and payment.

## 2. Core Functionalities

### 2.1. Service Discovery & Provider Listing
-   **Functionality:** Users can browse available hyperlocal services (e.g., Electrician, Plumber, AC Repair, Salon, Car Wash, Laundry, Courier, Pest Control, Tailoring) within their city or a specified location. They can view a list of providers or available service types.
-   **Implementation:**
    -   Frontend: Service-specific pages like `/src/app/(features)/hyperlocal/repair/page.tsx` (for Electrician/Plumber), `/src/app/(features)/hyperlocal/ac-repair/page.tsx`, etc. A central hyperlocal hub page could list categories.
    -   Backend:
        -   Route: `GET /api/hyperlocal/services` (to get types or providers based on location query).
        -   Controller: `hyperlocalController.js` (`getAvailableServices`).
        -   Service: `hyperlocalProviderService.js` simulates fetching service types or provider listings (conceptually from Firestore, cached in Redis).
    -   Firestore: `hyperlocalProviders` collection could store details of registered service providers.
    -   **Redis Caching:** Lists of service providers or service types for a given area can be cached.

### 2.2. Service Details & Slot Booking
-   **Functionality:** Users can view details about a specific service or provider, including pricing (or estimates), available time slots, and service descriptions. They can then select a slot and book the service.
-   **Implementation:**
    -   Frontend: UI to display service details and a calendar/time-slot picker.
    -   Backend:
        -   Route: `GET /api/hyperlocal/:serviceType/details` (to get info/slots for a provider or service type).
        -   Controller: `hyperlocalController.js` (`getServiceDetails`).
        -   Service: `hyperlocalProviderService.js` (`getServiceInfo`) simulates fetching details.
        -   Route: `POST /api/hyperlocal/:serviceType` (to book a service).
        -   Controller: `hyperlocalController.js` (`bookService`).
        -   Service: `hyperlocalProviderService.js` (`confirmBooking`) simulates confirming the booking with the provider.
    -   Firestore: User bookings would be stored, e.g., `users/{userId}/hyperlocalBookings`.

### 2.3. Payment for Services
-   **Functionality:** Users can pay for booked services through Zet Pay using Wallet, UPI, or other integrated payment methods. Payment might occur at booking (for fixed price services) or after service completion (for variable cost services, conceptual).
-   **Implementation:**
    -   Frontend: Payment integration at the time of booking or a "Pay Now" option for completed services.
    -   Backend: `hyperlocalController.js` (`bookService` or a separate payment endpoint) would handle payment processing via `payViaWalletInternal` or `processUpiPaymentInternal`, then log the transaction.
    -   **Transaction Logging:** Service payments are logged to the `transactions` collection.

## 3. Example Hyperlocal Service Categories Implemented (Placeholders/Conceptual)

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
-   **Functionality:** For services like courier or home repair, users could track the provider's location in real-time as they approach.
-   **Implementation:** Would require GPS capabilities from the provider's app and a live tracking backend.

### 4.2. In-app Chat with Provider
-   **Functionality:** Allow users to communicate with the service provider directly through Zet Pay after booking.
-   **Implementation:** Leverage the existing `ZetChat` component and backend chat infrastructure.

### 4.3. Service Ratings & Reviews
-   **Functionality:** Users can rate and review service providers after service completion.
-   **Implementation:** Firestore would store ratings/reviews linked to providers.

## 5. Technical Implementation Summary

-   **Frontend:** React components for service category pages, provider listings, booking forms. API calls via `src/services/hyperlocal.ts`.
-   **Backend:** Express.js routes (`hyperlocalRoutes.js`), `hyperlocalController.js`, `hyperlocalProviderService.js`.
-   **Data Storage:**
    -   Firestore: `hyperlocalProviders`, `users/{userId}/hyperlocalBookings`.
    -   Redis: Caching provider lists.
-   **Transaction Logging:** Service payments logged via `transactionLogger.ts`.

The Hyperlocal Services module in Zet Pay connects users with a variety of local service providers, aiming for a convenient booking and payment experience.

