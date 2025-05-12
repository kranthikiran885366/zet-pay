# Zet Pay - Your AI-Powered Everyday Super App 🚀

**Mission:** Become the “digital remote control” for every Indian’s daily life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance into one seamless, secure, and intuitive experience.

**Goal:** Evolve beyond a payments app into **India’s Everyday Operating System** – a lifestyle AI, financial brain, spiritual guide, hyperlocal commerce engine, and personal wellness tool.

## ✨ Core Features & How They Work

This section details the primary functionalities of the Zet Pay app, grouped by category.

### 💳 **I. Payments & Wallet**

*   **UPI Payments:**
    *   _Send to Contact:_ Select a saved contact and enter amount. Backend uses contact's primary UPI ID. Requires UPI PIN authorization. (`src/app/(features)/send/mobile/page.tsx`, `backend/controllers/upiController.js`)
    *   _Send to Bank/UPI ID:_ Manually enter recipient's UPI ID or Bank Account + IFSC. Backend verifies recipient name before proceeding. Requires UPI PIN. (`src/app/(features)/send/bank/page.tsx`, `backend/controllers/upiController.js`)
    *   _Scan & Pay:_ Uses device camera (`src/app/(features)/scan/page.tsx`) to scan UPI QR codes. Decodes QR, pre-fills payment confirmation (`src/app/(features)/pay/page.tsx`). Supports QR upload.
    *   _Receive Money (My QR):_ Displays user's static UPI QR code (`src/app/(features)/scan/page.tsx`).
    *   _Payment Confirmation:_ User reviews details and authorizes via UPI PIN (handled via backend PSP integration). (`src/app/(features)/pay/page.tsx`, `backend/services/upiProviderService.js`)
*   **Wallet:**
    *   _Top-up:_ Add funds using UPI, Net Banking, or Cards via integrated Payment Gateways (`backend/controllers/walletController.js`, `backend/services/paymentGatewayService.js`).
    *   _Management:_ View balance (updated in real-time via WebSocket `useRealtimeBalance`) and transaction history specific to the wallet. (`src/app/page.tsx`, `src/app/(features)/history/page.tsx`, `backend/controllers/walletController.js`)
    *   _Pay via Wallet:_ Use wallet balance for payments (`backend/controllers/walletController.js`).
*   **UPI Lite:** (Conceptual - Requires specific PSP support)
    *   _Enable/Disable:_ User enables via linked bank. Balance stored securely. (`backend/services/upiLite.js`, `src/app/(features)/upi-lite/page.tsx`)
    *   _Top-up:_ Add funds from linked bank.
    *   _Payment:_ Make small-value payments instantly without UPI PIN.
*   **UPI Autopay (Mandates):**
    *   _Setup:_ Authorize merchants for recurring debits via backend PSP integration and UPI PIN. (`backend/controllers/autopayController.js`, `src/app/(features)/autopay/page.tsx`)
    *   _Management:_ View, pause, resume, or cancel mandates. (`backend/controllers/autopayController.js`, `src/app/(features)/autopay/page.tsx`)
*   **Debit/Credit Card Payments:**
    *   _Save Cards:_ Securely save card details (tokenized via backend/PG). (`backend/controllers/cardsController.js`, `src/app/(features)/profile/cards/page.tsx`)
    *   _Pay Bills/Shop:_ Use saved cards (requires CVV + OTP via PG). (`backend/controllers/paymentController.js`, `backend/services/paymentGatewayService.js`)
    *   _Bill Payments:_ Pay credit card bills. (`src/app/(features)/bills/credit-card/page.tsx`)
*   **Pay Later (BNPL):** (Conceptual - Requires NBFC Partner)
    *   _Activation:_ Eligibility check and activation via backend. (`backend/controllers/bnplController.js`, `src/services/bnpl.ts`)
    *   _Usage:_ Use credit limit for transactions.
    *   _Billing & Repayment:_ View statements and repay dues. (`src/app/(features)/bnpl/page.tsx`)
*   **Unique Feature: Smart Wallet Bridge (UPI Limit Resolver):**
    *   _Backend Logic:_ If user enables (KYC verified), backend detects UPI limit failure, attempts payment via Zet Pay wallet balance (up to user-set limit, e.g., ₹5k). (`backend/controllers/upiController.js`, `backend/services/userService.js`)
    *   _Recovery:_ Backend schedules task to auto-debit the used amount from user's bank account after midnight (when UPI limit resets) and credit it back to the Zet Pay wallet. (`backend/services/recoveryService.js`)
    *   _User Experience:_ Payment succeeds seamlessly. User notified about fallback and recovery.
*   **Unique Feature: Cardless Cash Withdrawal:** (Conceptual - Requires Agent Network)
    *   _Process:_ User finds nearby "Zet Agents" on map, selects agent, enters amount. Backend generates secure OTP/QR. User shows OTP/QR to agent. Agent verifies, dispenses cash. Funds debited from user's wallet/account via backend. (`backend/controllers/cashWithdrawalController.js`, `src/app/(features)/cash-withdrawal/page.tsx`)

### 📱 **II. Recharge & Bill Payments**

*   **Mobile Recharge (Prepaid/Postpaid):**
    *   _Operator/Circle Detection:_ Backend detects operator based on number. (`backend/services/rechargeProviderService.js`, `src/app/(features)/recharge/mobile/page.tsx`).
    *   _Plan Browser:_ Backend fetches plans from aggregator. Frontend displays categorized plans. (`backend/services/rechargeProviderService.js`, `src/app/(features)/recharge/[type]/page.tsx`)
    *   _AI Recommendations:_ Backend AI flow suggests plans based on user history (fetched from transactions). (`backend/ai/flows/recharge-plan-recommendation.ts`, `src/app/(features)/recharge/[type]/page.tsx`)
    *   _Payment:_ Processed via backend using selected method (Wallet/UPI/Card). (`backend/controllers/rechargeController.js`)
*   **DTH Recharge:** Select operator, enter ID, browse/enter amount, pay via backend. (`src/app/(features)/recharge/dth/page.tsx`, `backend/controllers/rechargeController.js`)
*   **FASTag Recharge:** Select issuer, enter vehicle no., enter amount, pay via backend. (`src/app/(features)/recharge/fastag/page.tsx`, `backend/controllers/rechargeController.js`)
*   **Utility Bills (Electricity, Water, Gas, Broadband, etc.):**
    *   Select provider. Enter Consumer ID. Backend fetches bill (if supported) or user enters amount. Pay via backend. (`backend/controllers/billsController.js`, `backend/services/billProviderService.js`, `src/app/(features)/bills/[type]/page.tsx`)
*   **Other Payments:** Loan EMIs, Insurance Premiums, Education Fees, Subscriptions, Metro Card, etc. (Utilize Bill Payment Flow). (`backend/controllers/billsController.js`)
*   **Unique Feature: Recharge Undo:** (Conceptual - Requires Operator Support) Backend request to cancel recharge within a short window if operator API supports it. (`backend/controllers/rechargeController.js` - `cancelRecharge`).
*   **Unique Feature: Bill Reminders:** (Conceptual) Backend detects upcoming due dates from fetch history or user input. Sends notifications. (`src/app/(features)/reminders/page.tsx`).

### 🚌 **III. Travel & Transit**

*   **Bus/Train/Flight Booking:** (Conceptual - Requires Aggregator APIs)
    *   _Search:_ Backend fetches options from partners. (`backend/services/bookingProviderService.js`).
    *   _Selection:_ Frontend filters/sorts results. User selects seats/flights. (`src/app/(features)/travels/[type]/page.tsx`)
    *   _Payment & Confirmation:_ Backend processes payment and confirms booking with provider, saving ticket details. (`backend/controllers/bookingController.js`)
*   **Car/Bike Rentals:** (Conceptual - Requires Rental Partner APIs)
    *   _Search & Book:_ Backend finds vehicles based on location/time. User books and pays via backend. (`src/app/(features)/rent-vehicle/page.tsx`)
    *   _KYC/License:_ User uploads docs via frontend, backend verifies (manual/automated).
*   **Live Tracking:** (Conceptual - Requires Tracking APIs)
    *   _Bus/Train Status:_ Backend fetches real-time location/ETA from tracking provider. (`backend/services/liveTrackingProviderService.js`, `src/app/(features)/live/bus|train/page.tsx`).
*   **Transit & Toll Payments:**
    *   _Metro Recharge:_ Uses Recharge flow (`/recharge/metro`).
    *   _Bus Pass:_ Apply/manage via frontend (`/passes/*`), backend stores pass details.
    *   _Toll Payments:_ Linked with FASTag recharge flow.

### 💰 **IV. Financial Services**

*   **Investment (Mutual Funds, Digital Gold, Stocks):** (Conceptual - Requires SEBI Reg. Partner & APIs)
    *   _Browse & Select:_ Backend fetches fund/stock data or Gold price. (`backend/services/investmentProviderService.js`).
    *   _Invest/Buy/Sell:_ Backend initiates transaction with partner platform after payment/KYC verification. (`src/app/(features)/mutual-funds|gold|stocks/page.tsx`).
*   **Deposits (FD/RD):** (Conceptual - Requires Bank Partner APIs) Backend fetches schemes and books deposit with partner. (`src/app/(features)/deposits/page.tsx`).
*   **Loans (Micro & Personal):**
    *   _Micro-Loans:_ Backend checks eligibility based on internal data, processes application, disburses funds (e.g., to wallet). (`backend/controllers/loanController.js`, `backend/services/loans.js`). Includes Study Now, Pay Later. (`src/app/(features)/pocket-money/page.tsx`)
    *   _Personal Loans:_ Backend fetches pre-approved offers from partners. (Conceptual) (`src/app/(features)/loans/page.tsx`).
*   **Credit Score:** (Conceptual - Requires Credit Bureau Integration) Backend fetches score from bureau partner. (`src/app/(features)/credit-score/page.tsx`).
*   **Unique Feature: Digital Pocket Money:**
    *   _Setup:_ Parent configures child profiles, limits via frontend/backend. (`backend/controllers/pocketMoneyController.js`, `src/app/(features)/pocket-money/page.tsx`).
    *   _Usage:_ Backend manages child balance and enforces spending limits. Parent tops up via wallet transfer (backend).
*   **Unique Feature: Digital Piggy Banks / Goal-Based Savings:** (Conceptual) Backend manages goals and auto-save rules based on user configuration. (`src/app/(features)/goals/page.tsx`).

### 🎬 **V. Entertainment & Events**

*   **Movie/Event/Comedy/Sports Tickets:** (Conceptual - Requires Ticketing Partner APIs)
    *   _Browse:_ Backend fetches listings. (`backend/services/entertainmentProviderService.js`, `src/app/(features)/movies|entertainment/*`).
    *   _Book:_ Select showtime/seats. Backend processes payment and confirms ticket with provider. (`backend/controllers/entertainmentController.js`).
*   **Unique Feature: Subscription Manager:** (Conceptual) Backend detects recurring payments from transaction history (if possible) or user input. Manages reminders. (`src/app/(features)/subscription-manager/page.tsx`).

### 🛍️ **VI. Food & Hyperlocal Services**

*   **Online Food Ordering:** (Conceptual - Requires Aggregator/Restaurant APIs)
    *   _Browse:_ Backend fetches restaurants/menus. (`backend/services/foodProviderService.js` - To Be Created, `src/app/(features)/food/page.tsx`).
    *   _Order & Pay:_ Backend places order with restaurant/aggregator and processes payment.
*   **Hyperlocal Services:** (Conceptual - Requires Service Aggregator APIs)
    *   _Find & Book:_ Backend finds providers based on location/service type. User books slot. (`backend/controllers/hyperlocalController.js`, `src/app/(features)/hyperlocal/*` pages).
    *   _Payment:_ Processed via backend.

### 🛕 **VII. Temple & Spiritual Services**

*   **Darshan Slot Booking:** Backend fetches slots from temple API (if available) or manages internal slots. User books, backend confirms. (`backend/controllers/templeController.js`, `src/app/(features)/temple/darshan/page.tsx`).
*   **Live Darshan Videos:** Frontend embeds official live streams. (`src/app/(features)/temple/live/page.tsx`).
*   **Virtual Pooja Booking:** Backend records booking details, processes payment. (`backend/controllers/templeController.js`, `src/app/(features)/temple/pooja/page.tsx`).
*   **Prasadam Delivery:** Backend takes order, processes payment, forwards to delivery partner/temple. (`backend/controllers/templeController.js`, `src/app/(features)/temple/prasadam/page.tsx`).
*   **Temple Donations:** Backend processes payment and logs donation. (`backend/controllers/templeController.js`, `src/app/(features)/temple/donate/page.tsx`).
*   **Info & Audio:** Backend fetches timings/info (if available). Frontend plays static/streamed audio. (`src/app/(features)/temple/info|audio/page.tsx`).
*   **Unique Feature: Smart Access Pass:** Backend generates QR code data upon confirmed booking. (`backend/controllers/templeController.js`, `src/app/(features)/temple/access/page.tsx`).

### ⚕️ **VIII. Healthcare & Wellness**

*   **Doctor Appointments/Video Consultation:** (Conceptual - Requires Healthcare Platform API) Backend searches doctors, books slots, potentially handles video call setup. (`src/app/(features)/healthcare/*`).
*   **Lab Tests:** (Conceptual) Backend integrates with diagnostic labs for test booking and report delivery.
*   **Order Medicines/Subscription:** (Conceptual) Backend integrates with pharmacies for order placement and recurring deliveries.
*   **Emergency Ambulance:** (Conceptual) Backend integrates with ambulance providers to dispatch nearest vehicle based on user location.
*   **Health Wallet:** Backend securely stores user-uploaded documents (prescriptions, reports) in Firebase Storage. (`src/app/(features)/healthcare/wallet/page.tsx`).

### 🤖 **IX. AI & Smart Features**

*   **Conversational AI ("Ask PayFriend"):** Frontend captures query, sends to backend Genkit flow (`conversationalActionFlow`) which parses intent and parameters. Backend either returns info or initiates corresponding API call (e.g., calls `processRecharge` if recharge intent detected). (`src/app/(features)/conversation/page.tsx`, `backend/ai/flows/conversational-action.ts`)
*   **Smart Payee Suggestions:** Backend AI flow analyzes transaction history to suggest frequent payees. (`backend/ai/flows/smart-payee-suggestion.ts`, `src/app/(features)/send/[type]/page.tsx`)
*   **Spending Analysis:** Backend AI flow analyzes transaction history, returns summary/insights to frontend. (`backend/ai/flows/spending-analysis.ts`, `src/app/(features)/analysis/page.tsx`)
*   **AI Recharge Plan Recommendations:** Backend AI flow suggests mobile plans. (`backend/ai/flows/recharge-plan-recommendation.ts`, `src/app/(features)/recharge/[type]/page.tsx`)
*   **Unique Feature: AI Coupon Auto-Apply & Deal Hunter:** (Conceptual) Backend AI checks applicable coupons during checkout flows.
*   **Unique Feature: Auto Split Payments:** (Conceptual) Backend suggests splitting after specific transactions based on user groups/history. (`src/app/(features)/pay/split/page.tsx`).

### 🔒 **X. Security & Convenience**

*   **Bank-Level & App-Level Security:** Implemented across frontend and backend (See Tech Stack & Security section below).
*   **Unique Feature: Secure Vault:** Backend stores encrypted file references (e.g., in Firebase Storage) linked to user profile. (`src/app/(features)/vault/page.tsx`).
*   **Unique Feature: Emergency Mode:** Frontend triggers emergency flow. Backend potentially shares location (with consent) or flags account. (`src/app/emergency/page.tsx`).
*   **Unique Feature: Payment Freeze Mode:** Backend flag on user profile prevents payment processing APIs from executing. (`backend/controllers/userController.js`, `src/app/(features)/profile/security/page.tsx`).
*   **Unique Feature: Temporary Virtual UPI ID:** (Conceptual - Requires PSP support) Backend requests and manages temporary UPI ID from PSP.
*   **Unique Feature: Self-Imposed Spending Limits:** Backend checks limits before processing transactions. (`src/app/(features)/analysis/page.tsx` - Budget section).
*   **Unique Feature: Auto-Credit for Payment Failures:** Backend webhook listener detects failed-but-debited status from PSP, creates support ticket, triggers temporary wallet credit (via `payViaWalletInternal`) if refund delay detected. (`backend/controllers/paymentController.js`, `backend/services/webhookListener.js` - To be created).
*   **Unique Feature: Zet Fuel Card:** (Conceptual) Virtual wallet sub-account managed by backend, potentially with specific merchant category code (MCC) restrictions.
*   **Unique Feature: Zet One-Tap Auth:** (Conceptual - Requires PSP/Bank support) Backend triggers alternative auth flow if OTP fails.
*   **Unique Feature: Retry Payment with Another Method:** Frontend UI logic suggests alternatives on failure, calls relevant backend payment endpoint. (`src/app/(features)/pay/page.tsx`).
*   **Unique Feature: Real-time Bank Server Status:** Backend service periodically checks bank status (via PSP or status pages), updates status, frontend displays it. (`backend/services/bankStatusService.js`, `src/app/(features)/balance|pay/page.tsx`).
*   **Unique Feature: Multi-device Login Alerts & Remote Logout:** Firebase Auth triggers backend function on new login, backend sends notification (e.g., FCM) to other devices. Backend API endpoint allows user to invalidate sessions.

### ✨ **XI. Other Features**

*   **Offers, Rewards & Loyalty:** Backend manages offer eligibility, rewards crediting (e.g., cashback via wallet), points calculation. (`backend/controllers/offerController.js`, `src/app/(features)/offers|profile/rewards/page.tsx`).
*   **Referral Program:** Backend tracks referral codes, validates successful referrals, triggers rewards. (`backend/services/offers.js`).
*   **Profile & Settings:** Backend CRUD operations for user profile data. (`backend/controllers/userController.js`, `src/app/(features)/profile/*` pages).
*   **Unique Feature: 24/7 Live Human Support Chat:** Frontend chat UI connects via WebSocket to backend chat server, which routes to support agents (potentially using a third-party platform like Twilio Flex, Intercom). (`backend/server.js` - WebSocket handling, `src/app/(features)/support/page.tsx`).

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** Tailwind CSS, Shadcn/ui
*   **State Management:** React Context / Zustand (as needed)
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** Firebase Firestore (Primary Database), potentially Redis for caching session/rate-limit data.
*   **Authentication:** Firebase Authentication
*   **Real-time Communication:** WebSocket (`ws` library on backend, custom hook/lib on frontend)
*   **AI:** Google AI - Genkit (Gemini Models via Vertex AI, used via backend flows)
*   **Blockchain Logging:** (Simulated) Logging service interaction, potentially via REST API call from backend. (`backend/services/blockchainLogger.ts`)
*   **Payment Gateway Integration:** Secure server-to-server integration with RBI-approved PGs (e.g., Razorpay, Cashfree) via backend services. (`backend/services/paymentGatewayService.js`)
*   **UPI/Banking Integration:** Secure server-to-server integration via licensed PSP/Banking partners via backend services. (`backend/services/upiProviderService.js`)
*   **Hosting:** Vercel (Frontend), Google Cloud Run / Firebase Functions (Backend)
*   **Storage:** Firebase Storage (for user uploads like KYC docs, profile pics, vault items).

---

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Firebase Account & Project Setup (Firestore, Auth, Storage required)
*   Google Cloud Project with Vertex AI enabled (for Genkit/Gemini)
*   Service Account Keys for Firebase Admin (Backend) and Google Cloud (AI) - **Store Securely!**
*   Payment Gateway & PSP Partner Credentials (for actual payments) - **Store Securely!**
*   API Keys for any third-party services (Travel, Movies, Food Aggregators, etc.) - **Store Securely!**

### Environment Variables

Create `.env` files in **root** and **`backend/`** directories. **Never commit these files.**

**Root Directory (`.env`):**
```env
# Firebase Frontend Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional

# Google AI API Key (for Genkit client-side calls, if any)
NEXT_PUBLIC_GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Backend API URL (Ensure this points to your running backend)
NEXT_PUBLIC_API_BASE_URL=http://localhost:9003/api

# WebSocket URL (Ensure this points to your running backend)
NEXT_PUBLIC_WSS_URL=ws://localhost:9003

# Other Public Keys (e.g., Mapbox, Google Maps client-side keys)
# NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_PUBLIC_TOKEN
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_CLIENT_SIDE_KEY
```

**Backend Directory (`backend/.env`):**
```env
# Server Port
PORT=9003

# Firebase Admin SDK Configuration (Choose ONE method)
# Method 1: Service Account File Path (Recommended for local dev)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/firebaseServiceAccountKey.json

# Method 2: Service Account Environment Variables (Suitable for deployment)
# FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
# FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project-id.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_WITH_NEWLINES\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET_URL # e.g., your-project-id.appspot.com

# Google AI API Key (for Genkit backend flows)
GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Payment Service Provider (PSP) Credentials (Examples)
PSP_API_KEY=YOUR_PSP_API_KEY
PSP_SECRET_KEY=YOUR_PSP_SECRET_KEY
PSP_WEBHOOK_SECRET=YOUR_PSP_WEBHOOK_SECRET # For mandate callbacks etc.
PSP_WEBHOOK_URL=https://your-backend-url.com/api/webhooks/psp # Your webhook endpoint

# Payment Gateway Credentials (Examples)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET
# Add other gateways like Cashfree, Paytm PG as needed

# Blockchain API Endpoint (If using a separate logging service)
BLOCKCHAIN_API_ENDPOINT=http://localhost:5001/log # Example logging service URL

# JWT Secret (If using custom JWTs alongside Firebase Auth, for securing internal comms)
JWT_SECRET=YOUR_STRONG_JWT_SECRET

# Travel Aggregator APIs
AMADEUS_API_KEY=YOUR_AMADEUS_API_KEY
TRAVELPORT_API_ID=YOUR_TRAVELPORT_API_ID
SABRE_WSSE_TOKEN=YOUR_SABRE_WSSE_TOKEN
REDBUS_API_KEY=YOUR_REDBUS_API_KEY
ABHIBUS_ACCOUNT_ID=YOUR_ABHIBUS_ACCOUNT_ID
ABHIBUS_SECRET=YOUR_ABHIBUS_SECRET
TRAIN_PARTNER_API_KEY=YOUR_TRAIN_PARTNER_API_KEY # If available through a partner
AVIS_API_KEY=YOUR_AVIS_API_KEY # Example Car Rental
CAR_AGGREGATOR_SECRET=YOUR_CAR_AGGREGATOR_SECRET
APSRTC_API_KEY=YOUR_APSRTC_API_KEY # Bus Tracking
NTES_API_USERNAME=YOUR_NTES_USERNAME # Train Tracking
NTES_API_PASSWORD=YOUR_NTES_PASSWORD # Train Tracking

# Movie/Event APIs
BOOKMYSHOW_API_KEY=YOUR_BMS_API_KEY
TICKETNEW_AFFILIATE_ID=YOUR_TICKETNEW_AFFILIATE_ID
EVENTBRITE_API_KEY=YOUR_EVENTBRITE_API_KEY
CITY_EVENTS_API_URL=YOUR_CITY_EVENTS_API_URL # If exists

# Hyperlocal/Food APIs
ZOMATO_API_KEY=YOUR_ZOMATO_API_KEY
# SWIGGY_API_KEY=YOUR_SWIGGY_API_KEY # (Likely custom or scraped)

# KYC Provider API
KYC_PROVIDER_API_KEY=YOUR_KYC_PROVIDER_KEY
KYC_PROVIDER_SECRET=YOUR_KYC_PROVIDER_SECRET

# Credit Bureau API (for Credit Score)
CIBIL_API_KEY=YOUR_CIBIL_API_KEY # Or Equifax, Experian etc.
CIBIL_API_SECRET=YOUR_CIBIL_API_SECRET

# Cloud Messaging (e.g., FCM for push notifications)
# FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY (Often handled by Firebase Admin SDK setup)

# Twilio/Communication API (for SMS OTP, Support Chat if not using built-in)
# TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
# TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
# TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER

# Other Partner/Aggregator API Keys (Add as needed, prefixed appropriately)
# E.g., TEMPLE_API_KEY_TIRUPATI, HEALTHCARE_PLATFORM_API_KEY, etc.
```

### Installation & Running

1.  **Clone:** `git clone <repository-url> && cd <repo-name>`
2.  **Install Root Dependencies:** `npm install` (or `yarn`)
3.  **Install Backend Dependencies:** `cd backend && npm install` (or `yarn`) && `cd ..`
4.  **Setup `.env` files:** Create and populate `.env` in root and `backend/` as per above. Ensure Firebase credentials and necessary API keys are correct.
5.  **Run Backend Server:** (Terminal 1) `cd backend && npm run dev`
6.  **Run Genkit Dev Server (Optional, if using AI flows):** (Terminal 2, from root) `npm run genkit:dev`
7.  **Run Frontend Dev Server:** (Terminal 3, from root) `npm run dev`

Open [http://localhost:9002](http://localhost:9002) (or your frontend port). The backend runs on port 9003 by default.

---

## 📁 Folder Structure (High-Level)

```
.
├── src/                 # Frontend (Next.js)
│   ├── app/             # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── (auth)/      # Auth routes (login, signup - potentially using client-side Firebase)
│   │   ├── (features)/  # Core feature routes/pages (e.g., recharge, pay, history, profile)
│   │   ├── api/         # Frontend API routes (e.g., for Genkit HTTP endpoints if not using actions)
│   │   ├── globals.css
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Homepage / Dashboard
│   ├── components/      # Reusable UI components (including Shadcn/ui)
│   ├── services/        # Frontend service functions (calling backend APIs)
│   ├── ai/              # AI-related code (Genkit flows, instance)
│   ├── hooks/           # Custom React hooks (e.g., useVoiceCommands, useRealtimeBalance)
│   ├── lib/             # Utils, Firebase client config, API client, WebSocket client
│   └── styles/          # Additional global styles
├── backend/             # Backend (Node.js/Express)
│   ├── config/          # Firebase Admin config, DB connections, Partner SDK configs
│   ├── controllers/     # Route handlers (API logic for specific features)
│   ├── middleware/      # Auth, error handling, validation, rate limiting
│   ├── models/          # Data models/schemas (if using ORM/ODM - less likely with Firestore)
│   ├── routes/          # API route definitions (grouping endpoints by feature)
│   ├── services/        # Backend business logic, external API calls, DB interactions
│   ├── utils/           # Backend utility functions
│   └── server.js        # Main server entry point (includes WebSocket server setup)
├── public/              # Static assets (images, logos)
├── .env                 # Frontend env vars (DO NOT COMMIT)
├── backend/.env         # Backend env vars (DO NOT COMMIT)
├── next.config.js       # Next.js configuration
├── package.json         # Frontend dependencies & scripts
├── backend/package.json # Backend dependencies & scripts
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration (Frontend)
```

---

## 🤝 Contributing

(Add contribution guidelines here - e.g., branching strategy (Gitflow), PR process, code style (Prettier/ESLint), testing approach).

---

## 📜 License

(Specify your chosen license - e.g., MIT License).

---

*This README provides a comprehensive overview. Refer to specific files and comments for detailed implementation notes.*

# Full Stack Application Features

Here's a more detailed breakdown of the features implemented in this full stack application:

*   **Darshan Slot Booking:**
    *   The backend fetches available Darshan slots from a temple API (if available) or manages an internal slot booking system.
    *   The frontend allows users to view available slots and select their desired time.
    *   Upon booking, the backend processes the request and confirms the slot reservation.
*   **Live Darshan Videos:**
    *   The frontend embeds official live streaming videos of temple Darshans directly within the application, providing real-time access.
*   **Virtual Pooja Booking:**
    *   The backend records the details of virtual Pooja bookings made by users.
    *   It processes the payment for the virtual Pooja.
*   **Prasadam Delivery:**
    *   The backend handles Prasadam delivery orders, including taking the order details and processing the payment.
    *   It then forwards the order information to a designated delivery partner or directly to the temple for fulfillment.
*   **Temple Donations:**
    *   The backend securely processes donations made to the temple through the application.
    *   It logs the donation details for record-keeping.
*   **Digital Vouchers:** Users can purchase digital vouchers within the app. The backend manages the processing states of these voucher purchases, ensuring successful transactions and delivery of voucher information.
*   **Stock Market Investments:** (Conceptual) Users can browse stocks, view details, and simulate buy/sell orders. Backend integration with a brokerage API (e.g., Zerodha Kite, Groww) would be needed for real trading.
*   **Mobile Postpaid Bill Payments:** Users can select their mobile operator, enter their postpaid number, fetch the bill amount (if supported by the operator via backend integration), and make payments.
*   **Traffic Challan Payments:** Users can select their state/city, enter their vehicle number or challan number to fetch pending traffic violation fines, and pay them through the app.

---

## 🔐 Security Features Implemented

**Bank-Level Security (Interfaced via Backend):**

*   **PCI DSS Compliance:** Assumed through Payment Gateway partners. Zet Pay backend does not store full card numbers.
*   **RBI/NPCI Guidelines:** Followed for UPI payments (PSP integration), wallet operations (KYC).
*   **End-to-End Encryption (E2EE):** For sensitive data like UPI PIN (handled by PSP SDK/NPCI library) and OTPs. Data in transit uses HTTPS.
*   **Tokenization:**
    *   Card details are tokenized by the Payment Gateway (e.g., `backend/services/paymentGatewayService.js` for tokenization calls, `backend/services/cards.js` for storing tokens).
    *   UPI IDs are used directly but managed securely.
*   **Secure Payment Gateway Integration:** Backend services (`paymentGatewayService.js`) integrate with RBI-approved PGs.
*   **Banking-Grade KYC Verification:** (Conceptual) User profile includes `kycStatus`. Backend (`userService.js`) would integrate with KYC provider APIs.
*   **Fraud Detection Systems:** (Conceptual) Backend can integrate with fraud APIs. Logging of suspicious activities (`backend/services/scanService.js`).
*   **Regular Security Audits:** (Procedural) VAPT by certified auditors would be required.

**App-Level Security (Frontend & Backend):**

*   **Biometric/PIN Authentication:**
    *   Frontend: `src/app/(auth)/login/page.tsx` handles OTP/password. Biometric login would use device capabilities.
    *   Backend: `authMiddleware.js` verifies Firebase Auth tokens. UPI PIN is handled by PSP.
*   **App Device Binding:** (Conceptual) Firebase Auth inherently links to device on first sign-in; stronger binding would require backend logic.
*   **Session Management:** Firebase Auth handles client-side sessions. Backend uses token verification for stateless sessions.
*   **App Integrity Check:** (Conceptual) Requires native capabilities or libraries like SafetyNet/App Attest.
*   **SSL Pinning:** (Conceptual) Requires native configuration or specific libraries.
*   **Runtime Application Self-Protection (RASP):** (Conceptual) Requires specialized third-party RASP SDKs.
*   **Data Encryption at Rest and In Transit:**
    *   At Rest (Firestore): Firebase encrypts data by default. Sensitive user uploads to Firebase Storage are secured by rules. (`src/app/(features)/vault/page.tsx`, `backend/services/vaultService.js`)
    *   In Transit: All API calls use HTTPS (`src/lib/apiClient.ts`, backend Express server).
*   **Two-Factor Authentication (2FA):**
    *   Login: Firebase Phone Auth (OTP) provides 2FA. Email/Password could be augmented with OTP.
    *   Critical Actions: Backend to enforce additional OTP/PIN for actions like changing bank accounts.
*   **Secure Local Storage:** Sensitive data (like tokens) is generally not stored long-term client-side by Firebase SDK directly; it manages its own secure storage. If custom tokens are used, they should be stored in HttpOnly cookies or secure storage.
*   **Real-Time Notification Alerts:** (Conceptual) Backend would use FCM via `firebase-admin` to send alerts for logins, transactions.
*   **Input Sanitization & Validation:** Backend uses `express-validator` in route files (e.g., `backend/routes/upiRoutes.js`) to validate API inputs.
*   **Rate Limiting:** Implemented in `backend/server.js` using `express-rate-limit`.
*   **Helmet:** Used in `backend/server.js` for basic security headers.

**Advanced Security Options (Conceptual/Partially Implemented):**

*   **AI/ML-based Fraud Scoring:** (Conceptual) Backend AI flows can be developed.
*   **Geo-Fencing:** (Conceptual) Can be implemented on backend by checking IP/location.
*   **Remote Lock/Logout:** (Partially) Firebase Auth allows revoking refresh tokens. A dedicated UI in profile would call a backend endpoint.
*   **Custom Risk Engine:** (Conceptual) Backend logic can be built to assess risk.

*This documentation provides a high-level overview. Specific security measures and their depth of implementation can be found within individual code files.*
