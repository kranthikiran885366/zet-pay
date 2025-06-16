
# Zet Pay Super App: Overall Feature Overview

This document provides a high-level summary of the key features and modules available or planned within the Zet Pay Super App. For detailed documentation on specific features, please refer to their respective `.md` files (e.g., `MOBILE_RECHARGE_FEATURE.md`, `UPI_WALLET_FEATURES.md`).

## 1. Core Mission & Goal

**Mission:** To be the "digital remote control" for everyday Indian life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance.
**Goal:** Evolve into India’s Everyday Operating System – a lifestyle AI, financial brain, spiritual guide, hyperlocal commerce engine, and personal wellness tool.

## 2. Key Feature Modules

### 2.1. Payments & Wallet
-   **UPI:** Send/Receive Money (Contact, Bank/UPI ID, Scan & Pay), QR Code Generation, Balance Check.
-   **Wallet:** Top-up, Pay via Wallet, Balance & History.
-   **Advanced:** UPI Lite, UPI Autopay, Smart Wallet Bridge, Cardless Cash Withdrawal.
-   *Details: `UPI_WALLET_FEATURES.md`*

### 2.2. Recharges & Bill Payments
-   **Mobile Recharge:** Prepaid/Postpaid, Operator Detection, Plan Browsing, Bill Fetch, Undo Recharge.
-   **Utility Bills:** Electricity, Water, Gas, Broadband, etc.
-   **Other Payments:** DTH, FASTag, Loan EMIs, Insurance, Education Fees, Credit Card Bills, Subscriptions.
-   **Tools:** Bill Reminders, Scheduled Payments.
-   *Details: `MOBILE_RECHARGE_FEATURE.md`, `GENERAL_BILL_PAYMENT_FEATURE.md`*

### 2.3. Travel & Transit
-   **Bookings:** Flights, Buses, Trains (conceptual), Hotels/Hostels (conceptual), Cab Booking (conceptual), Car/Bike Rentals.
-   **Information:** Live Bus/Train Tracking, EV Charging Stations, Highway Rest Stops.
-   **Payments:** Metro Recharge, FASTag (covered in Bills).
-   **Advanced:** AI Travel Assistant (conceptual), Emergency Travel Assistance.
-   *Details: `TRAVEL_TRANSIT_FEATURES.md`*

### 2.4. Financial Services
-   **Investments:** Mutual Funds, Digital Gold (conceptual), Stocks (conceptual).
-   **Deposits:** FD/RD (conceptual).
-   **Loans:** Micro-Loans (including "Study Now, Pay Later"), Personal Loans (conceptual).
-   **Tools:** Credit Score Check, Digital Pocket Money, Goal-Based Savings, Spending Analysis.
-   *Details: `FINANCIAL_SERVICES_FEATURE.md`*

### 2.5. Entertainment & Events
-   **Tickets:** Movies, Events (Concerts, Sports, Comedy).
-   **Vouchers:** Gaming Vouchers, Digital Vouchers, Gift Cards.
-   **Others:** Game Zones (conceptual), Subscription Manager (conceptual).
-   **Advanced:** AR/VR Events, Group Booking, Event Discovery, Watch Party (all conceptual).
-   *Details: `ENTERTAINMENT_EVENTS_FEATURE.md`*

### 2.6. Food & Hyperlocal Services
-   **Food:** Online Food Ordering (conceptual).
-   **Hyperlocal:** Electrician, Plumber, Cleaning, Laundry, Courier, Car Wash, Tailoring, Pet Care, Salon, AC Repair.
-   **Space Booking:** Coworking Spaces, Parking (conceptual).
-   *Details: `HYPERLOCAL_SERVICES_FEATURE.md`*

### 2.7. Temple & Spiritual Services
-   **Bookings:** Darshan Slots, Virtual Poojas, Events/Yatras.
-   **Orders:** Prasadam Delivery.
-   **Donations:** Secure temple donations.
-   **Information:** Live Darshan, Temple Info, Timings/Queue, Aarti/Mantras.
-   **Advanced:** Smart Access Pass, AI Queue Prediction (conceptual), Accommodation Info, Group Visits.
-   *Details: `TEMPLE_SPIRITUAL_SERVICES_FEATURE.md`*

### 2.8. Healthcare & Wellness
-   **Consultations:** Doctor Appointments (In-person/Video).
-   **Services:** Lab Tests, Order Medicines (with subscription), Hospital Bed/OPD Booking.
-   **Emergency:** Ambulance Booking.
-   **Tools:** Health Wallet (Document Storage), Fitness Trainers, Health Packages/Offers.
-   *Details: Placeholder pages created; full documentation TBD.*

### 2.9. AI & Smart Features
-   **Core:** Conversational AI ("Ask PayFriend"), Smart Payee Suggestions, Spending Analysis, AI Gifting, Recharge Plan Recommendations.
-   **Conceptual:** AI Travel Assistant, Smart Schedule Builder, AI Deal Finder, AI Queue Prediction.
-   *Details: `AI_SMART_FEATURES.md`*

### 2.10. Security & Convenience
-   **Core Security:** Firebase Auth, HTTPS, Firestore Rules, Backend Token Verification.
-   **Unique Features:** Secure Vault, Emergency Mode, Payment Freeze Mode, Smart Wallet Bridge, Auto-Credit for Failed Payments, QR Code Security, 24/7 Live Support Chat.
-   *Details: `SECURITY_CONVENIENCE_FEATURES.md`*

### 2.11. Profile & User Management
-   User Profile (View/Edit), Linked Accounts, Saved Cards, Notification Settings, Security Settings (PIN, App Lock, Biometric), KYC.
-   *Details: Implicit in various feature docs and app structure.*

## 3. Technology Stack Overview

-   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn/ui.
-   **Backend:** Node.js, Express.js, TypeScript.
-   **Database:** Firebase Firestore.
-   **Authentication:** Firebase Authentication.
-   **Caching:** Redis.
-   **Real-time Communication:** WebSockets.
-   **AI:** Google AI - Genkit (Gemini Models).
-   **Storage:** Firebase Storage (for user uploads).
-   **Simulated Components:** Blockchain Logging, Payment Gateway/PSP integrations.
-   *Details: `README.md`*

## 4. Project Structure Overview

-   Organized into `src/` (frontend), `backend/`, and root configuration files.
-   Frontend features are primarily under `src/app/(features)/`.
-   Backend logic is in `backend/controllers/`, `backend/services/`, and `backend/routes/`.
-   AI flows are in `src/ai/flows/`.
-   Shared types are in `src/services/types.ts` and `backend/services/types.ts`.
-   *Details: `PROJECT_STRUCTURE.md`*

This overview serves as a map to the Zet Pay Super App's capabilities. Each module represents a significant area of functionality designed to provide a comprehensive and integrated user experience.

