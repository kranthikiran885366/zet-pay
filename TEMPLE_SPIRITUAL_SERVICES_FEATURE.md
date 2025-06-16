
# Zet Pay Super App: Temple & Spiritual Services Documentation

This document provides an overview of the Temple and Spiritual Services feature within the Zet Pay application.

## 1. Introduction

Zet Pay offers a dedicated module for users to access various services related to temples and spiritual activities, aiming to provide convenience and a seamless digital experience for devotees.

## 2. Core Temple Services

### 2.1. Darshan Slot Booking
-   **Functionality:** Users can search for available darshan slots at various temples, select a time, specify the number of persons, and book their visit.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/darshan/page.tsx` handles UI for selecting temple, date, viewing slots, and confirming booking.
    -   Backend:
        -   Routes: `GET /api/temple/darshan/slots`, `POST /api/temple/darshan/book`.
        -   Controller: `templeController.js`.
        -   Service: `temple.js` (backend service) simulates fetching slot availability (conceptually from Firestore, cached with Redis) and processing bookings.
    -   Firestore:
        -   `temples/{templeId}/darshanSlots/{date}` could store daily slot availability.
        -   `users/{userId}/templeBookings` stores user's darshan bookings.
    -   **Redis Caching:** Darshan slot availability for popular temples/dates is cached.
    -   **Transaction Logging:** If a booking fee is involved, it's logged.

### 2.2. Live Darshan Video Streaming
-   **Functionality:** Users can watch live video feeds from temples that offer online streaming.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/live/page.tsx` allows users to select a temple and embeds the official live stream (e.g., YouTube embed).
    -   Backend: Could provide a list of available live stream URLs per temple (managed in Firestore or config).

### 2.3. Virtual Pooja Booking
-   **Functionality:** Users can book various virtual pooja services offered by temples, providing devotee names and gotra details.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/pooja/page.tsx` for selecting temple, pooja type, date, and entering details.
    -   Backend:
        -   Routes: `GET /api/temple/pooja/list`, `POST /api/temple/pooja/book`.
        -   Controller: `templeController.js`.
        -   Service: `temple.js` (backend service) simulates fetching pooja list and processing bookings.
    -   Firestore: `users/{userId}/templeBookings` stores virtual pooja bookings.
    -   **Transaction Logging:** Pooja booking payments are logged.

### 2.4. Prasadam Order & Delivery
-   **Functionality:** Users can order prasadam online from select temples for home delivery.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/prasadam/page.tsx` for selecting temple, prasadam items, quantity, and providing delivery address.
    -   Backend:
        -   Routes: `GET /api/temple/prasadam/list`, `POST /api/temple/prasadam/order`.
        -   Controller: `templeController.js`.
        -   Service: `temple.js` (backend service) simulates fetching prasadam list and processing orders.
    -   Firestore: `users/{userId}/prasadamOrders` stores order details.
    -   **Transaction Logging:** Prasadam order payments are logged.

### 2.5. Temple Donations
-   **Functionality:** Users can make secure donations to temples and trusts, selecting specific schemes if available.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/donate/page.tsx`.
    -   Backend:
        -   Route: `POST /api/temple/donate`.
        -   Controller: `templeController.js`.
        -   Service: `temple.js` (backend service) processes donation payments.
    -   **Transaction Logging:** Donations are logged.

### 2.6. Temple Information & Audio
-   **Functionality:**
    -   **Info:** Access temple timings, live queue status estimates, dress codes, and other important information.
    -   **Audio:** Listen to Aartis, Mantras, and Bhajans.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/info/page.tsx`, `/src/app/(features)/temple/audio/page.tsx`.
    -   Backend: Routes like `GET /api/temple/info`, `GET /api/temple/audio` would fetch data from Firestore or mock services.
    -   Firestore: `temples/{templeId}` could store general info, `templeAudioTracks` could store audio metadata.

## 3. Advanced Temple Service Features

### 3.1. Smart Access Pass
-   **Functionality:** Generate a QR code based on confirmed Darshan or event bookings, which can be scanned for entry at the temple.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/access/page.tsx` displays the QR code for a selected booking.
    -   Backend: When a booking is confirmed, `templeController.js` would generate `accessPassData` (a unique string) and store it with the booking.

### 3.2. Accommodation & Group Visits (Conceptual)
-   **Functionality:** Find nearby accommodation options (guest houses, dormitories) related to temples. Request and manage group visits.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/temple/accommodation/page.tsx`, `/src/app/(features)/temple/group/page.tsx` (Placeholders with basic UI).
    -   Backend: Would require APIs for accommodation listings and group visit request management.

### 3.3. AI Queue Prediction (Conceptual)
-   **Functionality:** Use AI to predict Darshan queue wait times more accurately based on historical data, special events, and real-time inputs.
-   **Implementation:** Would involve a Genkit AI flow and data analysis capabilities.

## 4. Technical Implementation Summary

-   **Frontend:** React components, API calls via `src/services/temple.ts`.
-   **Backend:** Express.js routes, `templeController.js`, `temple.js` (backend service).
-   **Data Storage:**
    -   Firestore: `temples` (general info), `users/{userId}/templeBookings`, `users/{userId}/prasadamOrders`, potentially `darshanSlots`, `virtualPoojasList`, `prasadamItemsList`, `templeAudioTracks`.
    -   Redis: Caching darshan slot availability, pooja lists, prasadam lists.
-   **Transaction Logging:** All financial transactions (booking fees, pooja payments, prasadam orders, donations) are logged.

This suite of temple services in Zet Pay aims to cater to the diverse spiritual needs of users by digitizing common temple interactions.

