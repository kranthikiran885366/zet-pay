
# Zet Pay Super App: Healthcare & Wellness Features Documentation

This document outlines the Healthcare and Wellness services module within the Zet Pay application, aiming to provide users with convenient access to various health-related services.

## 1. Introduction

Zet Pay's Healthcare & Wellness module integrates various services to help users manage their health needs, from booking doctor appointments and lab tests to ordering medicines and accessing emergency services.

## 2. Core Healthcare Services

### 2.1. Doctor Appointments & Video Consultation
-   **Functionality:**
    -   Users can search for doctors by specialty (e.g., General Physician, Dentist, Cardiologist), name, clinic, or hospital.
    -   Filter search results by location, availability, consultation fees, and ratings.
    -   View doctor profiles with details like qualifications, experience, consultation timings, and fees.
    -   Book in-person clinic appointments or schedule secure video consultations.
    -   Receive appointment confirmations and reminders.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/healthcare/doctor/page.tsx`: UI for searching doctors and booking in-person appointments.
        -   `/src/app/(features)/healthcare/video-consult/page.tsx`: UI for searching doctors and scheduling video consultations.
    -   Backend:
        -   Routes: `GET /api/healthcare/doctors/search`, `GET /api/healthcare/doctors/:doctorId/slots`, `POST /api/healthcare/appointments/book`.
        -   Controller: `healthcareController.js`.
        -   Service: `healthcareProviderService.js` simulates fetching doctor listings, availability (from mock data or partner API), and confirming appointments.
    -   Firestore: User's appointments stored under `users/{userId}/healthAppointments`. Doctor profiles and availability might be stored in `doctors` and `doctorAvailability` collections or fetched from a partner.
    -   **Video Consultation Platform:** Integration with a secure video call SDK/platform (e.g., WebRTC, third-party provider like Twilio Video).

### 2.2. Lab Test Booking
-   **Functionality:**
    -   Users can search for various diagnostic lab tests (e.g., Blood Test, Lipid Profile, Thyroid Test).
    -   Select from a list of partnered labs and diagnostic centers.
    -   Book tests with options for home sample collection or visiting a lab center.
    -   View test prerequisites and pricing.
    -   Receive digital reports directly in the app (via Health Wallet).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/healthcare/lab/page.tsx` for searching tests, selecting labs, and booking.
    -   Backend:
        -   Routes: `GET /api/healthcare/labs/tests`, `GET /api/healthcare/labs/:labId/slots`, `POST /api/healthcare/labtests/book`.
        -   Controller: `healthcareController.js`.
        -   Service: `healthcareProviderService.js` (simulates fetching test lists, lab details, and booking).
    -   Firestore: `labTests` (master list), `partnerLabs`, `users/{userId}/labBookings`.

### 2.3. Order Medicines & Subscription
-   **Functionality:**
    -   Users can order prescribed and over-the-counter (OTC) medicines from partnered pharmacies.
    -   Option to upload a prescription.
    -   Search for medicines, view alternatives/generics, and check availability.
    -   Set up subscriptions for regular medicines with automated reminders or refills.
    -   Home delivery of medicines.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/healthcare/pharmacy/page.tsx`: UI for searching medicines, uploading prescriptions, and placing orders.
        -   `/src/app/(features)/healthcare/med-subscription/page.tsx`: UI for managing medicine subscriptions.
    -   Backend:
        -   Routes: `POST /api/healthcare/pharmacy/upload-prescription`, `GET /api/healthcare/pharmacy/search-medicines`, `POST /api/healthcare/pharmacy/order`, `POST /api/healthcare/med-subscriptions/setup`.
        -   Controller: `healthcareController.js`.
        -   Service: `healthcareProviderService.js` (simulates pharmacy integration, prescription validation, and order processing).
    -   Firestore: `userPrescriptions`, `medicineOrders`, `medicineSubscriptions`.

### 2.4. Emergency Ambulance Booking
-   **Functionality:** Users can quickly request an ambulance in case of emergencies.
    -   The app can attempt to use the user's current location (with permission).
    -   Options for Basic Life Support (BLS) or Advanced Life Support (ALS) ambulances.
    -   Connects to partnered ambulance service providers.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/healthcare/ambulance/page.tsx` provides a simple interface to request an ambulance.
    -   Backend:
        -   Route: `POST /api/healthcare/ambulance/request`.
        -   Controller: `healthcareController.js`.
        -   Service: `healthcareProviderService.js` (simulates dispatching to the nearest available ambulance).
    -   **Location Services:** Requires integration with device location services.

## 3. Wellness & Other Health Tools

### 3.1. Health Wallet
-   **Functionality:** A secure digital repository for users to store and manage their health records.
    -   Upload prescriptions, lab reports, vaccination certificates, insurance details, etc.
    -   View and share records easily with doctors or family members (with consent).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/healthcare/wallet/page.tsx` for uploading, viewing, and managing documents.
    -   Backend:
        -   Routes: `/api/healthcare/wallet/upload`, `/api/healthcare/wallet/documents`.
        -   Controller: `healthcareController.js` (or a dedicated `vaultController.js` could be extended).
        -   Service: `vaultService.js` or a specific `healthRecordService.js`.
    -   **Storage:** Secure file storage (e.g., Firebase Storage with appropriate access controls). Metadata in Firestore.

### 3.2. Fitness Trainers & Health Packages
-   **Functionality:**
    -   **Fitness Trainers:** Find and book sessions with certified fitness trainers, yoga instructors, or specialized coaches.
    -   **Health Packages:** Explore and purchase discounted preventive health checkup packages from partner labs/hospitals.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/healthcare/fitness/page.tsx`: UI for browsing and booking trainers.
        -   `/src/app/(features)/healthcare/offers/page.tsx`: UI for viewing and purchasing health packages.
    -   Backend:
        -   Routes: `GET /api/healthcare/fitness/trainers`, `POST /api/healthcare/fitness/book-session`, `GET /api/healthcare/health-packages`.
        -   Controller: `healthcareController.js`.
        -   Service: `healthcareProviderService.js` (simulates fetching trainer/package lists and processing bookings).

## 4. Technical Implementation Summary

-   **Frontend:** React components for service-specific pages, API calls via `src/services/healthcare.ts` and `src/services/vault.ts`.
-   **Backend:** Express.js routes (`healthcareRoutes.js`), `healthcareController.js`, `healthcareProviderService.js`.
-   **Data Storage:**
    -   Firestore: User health records metadata, appointments, lab bookings, medicine orders, subscriptions. Master lists for doctors, labs, tests, medicines (or fetched from partners).
    -   Firebase Storage: Secure storage for uploaded health documents.
    -   Redis: Conceptual caching for doctor lists, lab tests, health packages.
-   **Transaction Logging:** Payments for appointments, lab tests, medicines, and packages are logged via `transactionLogger.ts`.
-   **Security:** Adherence to data privacy and security standards for handling sensitive health information (HIPAA compliance considerations if expanding to relevant regions, or equivalent local regulations).

Zet Pay's healthcare module aims to provide a convenient and integrated platform for users to manage their health and wellness needs.

    