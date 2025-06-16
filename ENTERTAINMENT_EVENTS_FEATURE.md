
# Zet Pay Super App: Entertainment & Events Documentation

This document outlines the features related to booking tickets for movies, events, and managing entertainment subscriptions within the Zet Pay application.

## 1. Introduction

Zet Pay provides a convenient platform for users to discover, book, and manage their entertainment needs, from movie tickets to event passes and digital vouchers.

## 2. Core Entertainment Features

### 2.1. Movie Ticket Booking
-   **Functionality:** Users can search for movies playing in their city, view showtimes across different cinemas, select seats from a layout, and book tickets.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/movies/page.tsx` handles movie discovery, cinema/showtime selection, seat layout display, and booking confirmation UI.
    -   Backend:
        -   Routes: `GET /api/entertainment/movies/search`, `GET /api/entertainment/movies/:movieId/details`, `POST /api/entertainment/movies/book`.
        -   Controller: `entertainmentController.js`.
        -   Service: `entertainmentProviderService.js` simulates fetching movie listings, showtimes (from mock data, could be cached with Redis), and confirming bookings with a mock provider.
    -   Firestore: User's movie bookings are stored under `users/{userId}/genericBookings` (or a dedicated `movieBookings` subcollection).
    -   **Redis Caching:** Movie listings and showtimes for popular cities/movies could be cached.

### 2.2. Event Ticket Booking (Generic)
-   **Functionality:** Users can search for various events (concerts, sports, comedy shows, workshops), view details, and book tickets.
-   **Implementation:**
    -   Frontend: Placeholder pages like `/src/app/(features)/entertainment/events/page.tsx`, `/src/app/(features)/entertainment/comedy/page.tsx`, `/src/app/(features)/entertainment/sports/page.tsx`. A more fleshed-out search and booking UI would be similar to movies.
    -   Backend:
        -   Routes: `GET /api/entertainment/events/search`, `GET /api/entertainment/events/:eventId/details`, `POST /api/entertainment/events/book`.
        -   Controller: `entertainmentController.js`.
        -   Service: `entertainmentProviderService.js` (simulates fetching event data and confirming bookings).
    -   Firestore: Event bookings stored in `users/{userId}/genericBookings`.

### 2.3. Gaming & Digital Vouchers
-   **Functionality:** Purchase digital vouchers for gaming platforms (e.g., Free Fire diamonds, Google Play codes) and other digital services.
-   **Implementation:**
    -   Frontend:
        -   Gaming Vouchers: `/src/app/(features)/vouchers/gaming/page.tsx`.
        -   Digital Vouchers: `/src/app/(features)/vouchers/digital/page.tsx`.
        -   Gift Cards: `/src/app/(features)/vouchers/giftcards/page.tsx`.
    -   Backend:
        -   Routes: `GET /api/entertainment/vouchers/gaming/brands`, `GET /api/entertainment/vouchers/gaming/denominations`, `POST /api/entertainment/vouchers/gaming/purchase`, `POST /api/entertainment/vouchers/digital/purchase`.
        -   Controller: `entertainmentController.js`.
        -   Service: `entertainmentProviderService.js` (simulates fetching voucher brands/denominations and processing purchases).
    -   **Transaction Logging:** Voucher purchases are logged as transactions.

### 2.4. Game Zones & Amusement Parks (Conceptual)
-   **Functionality:** Users can find and book tickets or slots for game zones and amusement parks.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/entertainment/gamezone/page.tsx` (Placeholder page).
    -   Backend: Conceptual routes and services.

## 3. Advanced & UX Features

### 3.1. Subscription Manager (Conceptual)
-   **Functionality:** Helps users track their recurring subscriptions (OTT, music, software), view upcoming payments, and potentially manage them (pause/cancel if provider API supports).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/subscription-manager/page.tsx` (Placeholder for UI).
    -   Backend: Would require APIs to detect recurring payments (e.g., from transaction history analysis or by user manual input) and potentially integrate with subscription provider APIs.
    -   Firestore: `users/{userId}/subscriptions` to store tracked subscriptions.

### 3.2. AR/VR Event Viewing (Conceptual)
-   **Functionality:** Integration for viewing select events in an immersive Augmented Reality (AR) or Virtual Reality (VR) format.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/entertainment/arvr/page.tsx` (Placeholder page).

### 3.3. Group Movie Booking (Conceptual)
-   **Functionality:** Allow users to book movie tickets for a group, split the cost, and send invites to friends.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/entertainment/group/page.tsx` (Placeholder page).
    -   Backend: Would need logic for group creation, payment splitting, and notifications.

### 3.4. Event Reminders & Ticket Sync (Conceptual)
-   **Functionality:** Integrate with user's calendar to add booked events/movies and set reminders.
-   **Implementation:** Would require calendar API access and notification services.

### 3.5. Regional Event Discovery (Conceptual)
-   **Functionality:** Suggest events based on user's location and preferences.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/entertainment/discover/page.tsx` (Placeholder page).
    -   Backend: Location services and potentially an AI recommendation engine.

### 3.6. Watch Party Creation (Conceptual)
-   **Functionality:** Schedule and invite friends for synchronized online watch parties of movies or shows.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/entertainment/watchparty/page.tsx` (Placeholder page).
    -   Backend: Would require real-time communication features.

## 4. Technical Implementation Summary

-   **Frontend:** React components, API calls via `src/services/entertainment.ts` and `src/services/booking.ts`.
-   **Backend:** Express.js routes, `entertainmentController.js`, `entertainmentProviderService.js`.
-   **Data Storage:**
    -   Firestore: User bookings, potentially mock data for movies/events if not from a live API.
    -   Redis: Caching movie/event listings.
-   **Transaction Logging:** Financial transactions for ticket/voucher purchases are logged.

Zet Pay's entertainment features provide a central hub for users to engage with various leisure activities, from movies to gaming.

