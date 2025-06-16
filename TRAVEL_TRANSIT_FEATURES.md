
# Zet Pay Super App: Travel & Transit Features Documentation

This document details the travel and transit booking and information features within the Zet Pay application.

## 1. Introduction

Zet Pay aims to be a comprehensive solution for travel needs, allowing users to search, book, and manage various modes of transport, find amenities, and access real-time travel information.

## 2. Core Travel Booking Features

### 2.1. Flight Booking
-   **Functionality:** Search for domestic and international flights, compare prices and timings, select seats (conceptual), and book tickets.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/flight/page.tsx` provides UI for search (from, to, dates, passengers, class) and displaying results. A booking modal handles passenger details and simulated payment.
    -   Backend:
        -   Route: `GET /api/bookings/flight/search`, `POST /api/bookings/flight` (for confirmation).
        -   Controller: `bookingController.js` (`searchBookings`, `confirmBooking`).
        -   Service: `bookingProviderService.js` simulates fetching flight listings (conceptually from Firestore, cached in Redis) and confirming bookings.
    -   Firestore: `flightListings` (mock data source), `users/{userId}/travelBookings` stores user's flight bookings.
    -   **Redis Caching:** Flight search results (especially for popular routes/dates) are cached.

### 2.2. Bus Booking
-   **Functionality:** Search for inter-city buses, filter by operator/bus type, select seats, and book tickets.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/bus/page.tsx` for search and results. Includes seat selection UI.
    -   Backend:
        -   Route: `GET /api/bookings/bus/search`, `POST /api/bookings/bus`.
        -   Controller: `bookingController.js`.
        -   Service: `bookingProviderService.js` (simulates fetching routes and confirming bookings).
    -   Firestore: `users/{userId}/travelBookings` stores bus bookings.

### 2.3. Train Ticket Booking (Conceptual / PNR Status)
-   **Functionality:** Search for trains, check seat availability (conceptual), and book tickets (conceptual, often requires IRCTC direct integration). Users can also check PNR status.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/train/page.tsx` provides UI for search and PNR status check. Booking is largely a placeholder.
    -   Backend: Routes for train search (mocked) and PNR status check (mocked).
    -   *Note: Full train booking is complex and typically requires direct IRCTC agent license or deep API integration, which is outside the scope of simulation.*

### 2.4. Hotel/Hostel Booking (Conceptual)
-   **Functionality:** Search for hotels or hostels, view details, and book rooms.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/hostels/page.tsx` provides a basic search UI.
    -   Backend: Placeholder routes and services.

### 2.5. Cab Booking (Conceptual)
-   **Functionality:** Book local and outstation cabs (integration with Ola/Uber conceptual).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/cab/page.tsx` provides a basic search UI.
    -   Backend: Placeholder routes and services.

### 2.6. Car & Bike Rentals (Conceptual)
-   **Functionality:** Rent self-drive cars or bikes.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/rent-vehicle/page.tsx` provides a tabbed UI for car/bike search.
    -   Backend:
        -   Route: `GET /api/bookings/car/search`, `GET /api/bookings/bike/search`, `POST /api/bookings/car`, `POST /api/bookings/bike`.
        -   Controller: `bookingController.js`.
        -   Service: `bookingProviderService.js` simulates fetching vehicle listings and confirming bookings.
    -   Firestore: `users/{userId}/travelBookings` stores rental bookings.

## 3. Transit & Information Services

### 3.1. Live Tracking (Bus & Train)
-   **Functionality:**
    -   **Bus:** Track buses by vehicle number or reservation ID. View live location, ETA, and route progress.
    -   **Train:** Track live running status of trains by train number or name.
-   **Implementation:**
    -   Frontend:
        -   Bus Hub: `/src/app/(features)/live/bus/page.tsx`
        -   Track Bus by Vehicle: `/src/app/(features)/live/bus/track-vehicle/page.tsx`
        -   Track Bus by Reservation: `/src/app/(features)/live/bus/track-reservation/page.tsx`
        -   Nearby Bus Stops: `/src/app/(features)/live/bus/nearby-stops/page.tsx`
        -   Train Status: `/src/app/(features)/live/train/page.tsx`
    -   Backend:
        -   Routes: `/api/live/bus/:identifier`, `/api/live/train/:identifier`.
        -   Controller: `liveTrackingController.js`.
        -   Service: `liveTrackingProviderService.js` (simulates fetching real-time data from transport APIs like NTES or state RTC systems).

### 3.2. EV Charging Stations
-   **Functionality:** Find nearby Electric Vehicle (EV) charging stations, view connector types, availability, and pricing.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/ev-charging/page.tsx`.
    -   Backend:
        -   Route: `GET /api/travel/ev-stations`.
        -   Controller: `travelController.js`.
        -   Service: `travelProviderService.js` (simulates fetching station data, cached with Redis).
    -   **Redis Caching:** List of EV stations can be cached.

### 3.3. Highway Rest Stops
-   **Functionality:** Discover rest stops on highways with details about amenities (food, restrooms, fuel, etc.).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/rest-stop/page.tsx`.
    -   Backend:
        -   Route: `GET /api/travel/rest-stops`.
        -   Controller: `travelController.js`.
        -   Service: `travelProviderService.js` (simulates fetching rest stop data, cached with Redis).
    -   **Redis Caching:** List of rest stops can be cached.

### 3.4. Transit Payments (FASTag, Metro)
-   **Functionality:** Recharge FASTag accounts and Metro cards.
-   **Implementation:** These are handled under the "Recharge & Bill Payments" feature.
    -   FASTag: `/src/app/(features)/recharge/fastag/page.tsx`.
    -   Metro: `/src/app/(features)/recharge/metro/page.tsx`.

## 4. Advanced Travel Features

### 4.1. AI Travel Assistant
-   **Functionality (Conceptual):** A conversational AI to help plan trips, suggest itineraries, and initiate bookings based on user preferences, calendar, and weather.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/assistant/page.tsx` (Placeholder UI).
    -   Backend AI Flow: Potentially a Genkit flow in `src/ai/flows/` (e.g., `travel-planning-flow.ts`) that would parse user requests and interact with booking services.

### 4.2. Emergency Travel Assistance
-   **Functionality:** Users can quickly request roadside assistance (flat tire, towing) or medical help during travel.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/travels/assistance/page.tsx`. Buttons to simulate requesting help.
    -   Backend: A conceptual endpoint (`POST /api/travel/request-assistance`) would log the request and simulate notifying a provider. User's location (with permission) would be key.

## 5. Technical Implementation Summary

-   **Frontend:** React components, API calls via `src/services/booking.ts`, `src/services/travel.ts`, `src/services/liveTracking.ts`.
-   **Backend:** Express.js routes, controllers (`bookingController.js`, `travelController.js`, `liveTrackingController.js`), services (`bookingProviderService.js`, `travelProviderService.js`, `liveTrackingProviderService.js`).
-   **Data Storage:**
    -   Firestore: Stores user bookings (`users/{userId}/travelBookings`), mock flight listings (`flightListings`), mock EV stations (`evStations`), mock rest stops (`restStops`).
    -   Redis: Caching flight search results, EV station lists, rest stop lists.
-   **Transaction Logging:** Financial transactions for bookings are logged via `transactionLogger.ts`.

Zet Pay's travel and transit features aim to provide a seamless experience from planning to booking and on-the-go assistance.

