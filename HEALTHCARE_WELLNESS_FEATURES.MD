# Zet Pay Super App: Healthcare & Wellness Features Documentation

This document outlines the Healthcare and Wellness services module within the Zet Pay application, detailing the implemented backend structure designed for real API integration and the corresponding frontend interactions.

## 1. Introduction

Zet Pay's Healthcare & Wellness module integrates various services to help users manage their health needs, from booking doctor appointments and lab tests to ordering medicines and accessing emergency services. It is designed for integration with healthcare service aggregators, pharmacies, labs, and emergency providers via backend APIs.

## 2. Core Healthcare Services

### 2.1. Doctor Appointments & Video Consultation
-   **Functionality:** Search doctors, filter results, view profiles, and book in-person or video consultations.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/healthcare/doctor/page.tsx`: UI for in-person appointment booking.
        -   `/src/app/(features)/healthcare/video-consult/page.tsx`: UI for video consultations.
    -   Backend:
        -   Routes: `GET /api/healthcare/doctors/search`, `GET /api/healthcare/doctors/slots`, `POST /api/healthcare/appointments/book`.
        -   Controller: `backend/controllers/healthcareController.js` (`searchDoctors`, `getDoctorSlots`, `bookAppointment` methods).
        -   Service: `backend/services/healthcareProviderService.js` (`searchDoctors`, `getDoctorAvailability`, `confirmAppointment` methods)
            -   Structured to call a real external healthcare platform API (e.g., `process.env.HEALTHCARE_API_URL`).
            -   Uses placeholder `HEALTHCARE_API_KEY`.
            -   Falls back to mock data if the real API call is disabled or fails.
    -   Firestore: `users/{userId}/healthAppointments` stores user's appointments. Doctor profiles conceptually fetched from partner or `doctors` collection.
    -   **Video Consultation Platform (Conceptual):** Integration with a secure video call SDK (e.g., WebRTC, Twilio Video).

### 2.2. Lab Test Booking
-   **Functionality:** Search diagnostic tests, select labs, book tests (home collection/lab visit), view prerequisites, and receive digital reports.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/healthcare/lab/page.tsx` for searching and booking.
    -   Backend:
        -   Routes: `GET /api/healthcare/labs/tests`, `GET /api/healthcare/labs/slots`, `POST /api/healthcare/labtests/book`.
        -   Controller: `backend/controllers/healthcareController.js` (`searchLabTests`, `getLabTestSlots`, `bookLabTest` methods).
        -   Service: `backend/services/healthcareProviderService.js` (`searchLabTests`, `getLabAvailability`, `confirmLabTestBooking` methods)
            -   Designed for external lab aggregator API integration.
            -   Falls back to mock data.
    -   Firestore: `labTests` (master list, conceptual), `partnerLabs` (conceptual), `users/{userId}/labBookings`.

### 2.3. Order Medicines & Subscription
-   **Functionality:** Order prescribed and OTC medicines, upload prescriptions, search medicines, set up subscriptions, and get home delivery.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/healthcare/pharmacy/page.tsx`: UI for medicine orders.
        -   `/src/app/(features)/healthcare/med-subscription/page.tsx`: UI for subscriptions.
    -   Backend:
        -   Routes: `POST /api/healthcare/pharmacy/upload-prescription`, `GET /api/healthcare/pharmacy/search-medicines`, `POST /api/healthcare/pharmacy/order`, `POST /api/healthcare/med-subscriptions/setup`.
        -   Controller: `backend/controllers/healthcareController.js` (`uploadPrescription`, `searchMedicines`, `orderMedicines`, `setupMedicineSubscription` methods).
        -   Service: `backend/services/healthcareProviderService.js` (`searchPharmacyMedicines`, `placePharmacyOrder`, `createMedicineSubscription` methods)
            -   Designed for pharmacy aggregator API integration.
            -   Falls back to mock data.
        -   **Prescription Upload:** Conceptual, involves file upload to Firebase Storage via `vaultService.js` and linking.
    -   Firestore: `userPrescriptions`, `users/{userId}/medicineOrders`, `users/{userId}/medicineSubscriptions`.

### 2.4. Emergency Ambulance Booking
-   **Functionality:** Quickly request BLS or ALS ambulances using user's location.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/healthcare/ambulance/page.tsx` for ambulance requests.
    -   Backend:
        -   Route: `POST /api/healthcare/ambulance/request`.
        -   Controller: `backend/controllers/healthcareController.js` (`requestAmbulance` method).
        -   Service: `backend/services/healthcareProviderService.js` (`dispatchAmbulance` method)
            -   Designed for ambulance service provider API integration.
            -   Falls back to mock response.
    -   **Location Services:** Requires device location access.

## 3. Wellness & Other Health Tools

### 3.1. Health Wallet
-   **Functionality:** Secure digital repository for health records (prescriptions, lab reports, etc.).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/healthcare/wallet/page.tsx` for document management.
    -   Backend:
        -   Routes: `GET /api/vault/items` (filtered by type 'Health'), `POST /api/vault/items` (for uploading health docs, conceptual integration with file upload).
        -   Controller: `backend/controllers/vaultController.js` (uses `vaultService.js`).
        -   Service: `backend/services/vaultService.js` handles file uploads to Firebase Storage and metadata in Firestore `vaultItems` collection.
    -   **Storage:** Secure file storage (Firebase Storage with access controls). Metadata in `vaultItems` Firestore collection.

### 3.2. Fitness Trainers & Health Packages
-   **Functionality:** Find/book fitness trainers and purchase preventive health checkup packages.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/healthcare/fitness/page.tsx`: UI for trainers.
        -   `/src/app/(features)/healthcare/offers/page.tsx`: UI for health packages.
    -   Backend:
        -   Routes: `GET /api/healthcare/fitness/trainers`, `POST /api/healthcare/fitness/book-session`, `GET /api/healthcare/health-packages`, `POST /api/healthcare/health-packages/purchase`.
        -   Controller: `backend/controllers/healthcareController.js` (`getFitnessTrainers`, `bookFitnessSession`, `getHealthPackages`, `purchaseHealthPackage` methods).
        -   Service: `backend/services/healthcareProviderService.js` (`searchFitnessTrainers`, `bookFitnessSession`, `fetchHealthPackages`, `purchaseHealthPackage` methods)
            -   Designed for partner API integration.
            -   Falls back to mock data.

## 4. Technical Implementation Summary

-   **Frontend:**
    -   React components for service-specific pages (`src/app/(features)/healthcare/`).
    -   API calls via `src/services/healthcare.ts` and `src/services/vault.ts`.
-   **Backend:**
    -   Express.js routes in `backend/routes/healthcareRoutes.js`.
    -   `backend/controllers/healthcareController.js` for request handling.
    -   `backend/services/healthcareProviderService.js` for (conceptual) external API interactions and mock fallbacks.
    -   `backend/services/vaultService.js` for Health Wallet file management.
-   **Data Storage (Firestore):**
    -   `users/{userId}/healthAppointments`, `users/{userId}/labBookings`, `users/{userId}/medicineOrders`, `users/{userId}/medicineSubscriptions`.
    -   `vaultItems` (for health documents with type 'Health').
    -   Master lists (conceptual): `doctors`, `labs`, `labTests`, `medicines`, `healthPackages`.
-   **Firebase Storage:** Secure storage for uploaded health documents (prescriptions, reports).
-   **Redis Caching (Conceptual):** `healthcareProviderService.js` would cache doctor lists, lab tests, health packages from real APIs.
-   **Transaction Logging:** Payments for appointments, tests, medicines, and packages are logged via `transactionLogger.ts`.
-   **Security:** Adherence to data privacy and security standards (HIPAA, DISHA considerations if expanding to relevant regions/data types).
-   **External Integrations (Conceptual):**
    -   APIs from healthcare aggregators, Telemedicine platforms, e-pharmacies, lab chains, emergency dispatch systems.
    -   Environment variables: `HEALTHCARE_API_URL`, `HEALTHCARE_API_KEY`.

Zet Pay's healthcare module is structured to provide a convenient and integrated platform for users to manage their health and wellness needs through real API integrations.