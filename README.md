# Zet Pay - Your AI-Powered Everyday Super App 🚀

**Mission:** Become the “digital remote control” for every Indian’s daily life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance into one seamless, secure, and intuitive experience.

**Goal:** Evolve beyond a payments app into **India’s Everyday Operating System** – a lifestyle AI, financial brain, spiritual guide, hyperlocal commerce engine, and personal wellness tool.

## ✨ Core Features & How They Work

This section details the primary functionalities of the Zet Pay app, grouped by category.

### 💳 **I. Payments & Wallet**

*   **UPI Payments:**
    *   _Send to Contact:_ Select a saved contact and enter amount. Backend uses contact's primary UPI ID. Requires UPI PIN authorization. (`src/app/(features)/send/mobile/page.tsx`, `backend/controllers/upiController.js`)
    *   _Send to Bank/UPI ID:_ Manually enter recipient's UPI ID or Bank Account + IFSC. Backend verifies recipient name before proceeding. Requires UPI PIN. (`src/app/(features)/send/bank/page.tsx`, `backend/controllers/upiController.js`)
    *   _Scan & Pay:_ Uses device camera (`src/app/(features)/scan/page.tsx`) to scan UPI QR codes. Decodes QR, pre-fills payment confirmation (`src/app/(features)/pay/page.tsx`). Supports QR upload. Includes auto torch, fraud detection.
    *   _Receive Money (My QR):_ Displays user's static UPI QR code (`src/app/(features)/scan/page.tsx`).
    *   _Payment Confirmation:_ User reviews details (including balance preview) and authorizes via UPI PIN (handled via backend PSP integration). (`src/app/(features)/pay/page.tsx`, `backend/services/upiProviderService.js`)
*   **Wallet:**
    *   _Top-up:_ Add funds using UPI, Net Banking, or Cards via integrated Payment Gateways (`backend/controllers/walletController.js`, `backend/services/paymentGatewayService.js`).
    *   _Management:_ View balance (updated in real-time via WebSocket `useRealtimeBalance`) and transaction history specific to the wallet. (`src/app/page.tsx`, `src/app/(features)/history/page.tsx`, `backend/controllers/walletController.js`)
    *   _Pay via Wallet:_ Use wallet balance for payments (`backend/controllers/walletController.js`).
*   **UPI Lite:**
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
*   **Pay Later (BNPL):**
    *   _Activation:_ Eligibility check and activation via backend. (`backend/controllers/bnplController.js`, `src/services/bnpl.ts`)
    *   _Usage:_ Use credit limit for transactions.
    *   _Billing & Repayment:_ View statements and repay dues. (`src/app/(features)/bnpl/page.tsx`)
*   **Unique Feature: Smart Wallet Bridge (UPI Limit Resolver):**
    *   _Backend Logic:_ If user enables (KYC verified), backend detects UPI limit failure, attempts payment via Zet Pay wallet balance (up to user-set limit, e.g., ₹5k). (`backend/controllers/upiController.js`, `backend/services/user.js`)
    *   _Recovery:_ Backend schedules task to auto-debit the used amount from user's bank account after midnight (when UPI limit resets) and credit it back to the Zet Pay wallet. (`backend/services/recoveryService.js`)
    *   _User Experience:_ Payment succeeds seamlessly. User notified about fallback and recovery.
*   **Unique Feature: Cardless Cash Withdrawal:**
    *   _Process:_ User finds nearby "Zet Agents" on map, selects agent, enters amount. Backend generates secure OTP/QR. User shows OTP/QR to agent. Agent verifies, dispenses cash. Funds debited from user's wallet/account via backend. (`backend/controllers/cashWithdrawalController.js`, `src/app/(features)/cash-withdrawal/page.tsx`)

### 📱 **II. Recharge & Bill Payments**

*   **Mobile Recharge (Prepaid/Postpaid):**
    *   _Operator/Circle Detection:_ Backend detects operator based on number. Manual override available. (`backend/services/rechargeProviderService.js`, `src/app/(features)/recharge/mobile/page.tsx`).
    *   _Plan Browser:_ Backend fetches plans from aggregator. Frontend displays categorized plans with tariff details. (`backend/services/rechargeProviderService.js`, `src/app/(features)/recharge/[type]/page.tsx`)
    *   _Plan Comparison:_ Users can select multiple plans to compare features side-by-side.
    *   _AI Recommendations:_ Backend AI flow suggests plans based on user history (fetched from transactions) and current usage. (`backend/ai/flows/recharge-plan-recommendation.ts`, `src/app/(features)/recharge/[type]/page.tsx`)
    *   _Validity Tracking & Balance Check:_ Display current plan validity and balance (if supported by operator).
    *   _Quick Recharge & Family Recharges:_ One-tap recharges for saved/frequent numbers. Manage multiple family numbers.
    *   _Payment:_ Processed via backend using selected method (Wallet/UPI/Card). (`backend/controllers/rechargeController.js`)
*   **DTH Recharge:** Select operator, enter ID, browse/enter amount, pay via backend. (`src/app/(features)/recharge/dth/page.tsx`, `backend/controllers/rechargeController.js`)
*   **FASTag Recharge:** Select issuer, enter vehicle no., enter amount, pay via backend. (`src/app/(features)/recharge/fastag/page.tsx`, `backend/controllers/rechargeController.js`)
*   **Utility Bills (Electricity, Water, Gas, Broadband, etc.):**
    *   Select provider. Enter Consumer ID. Backend fetches bill (if supported) or user enters amount. Pay via backend. (`backend/controllers/billsController.js`, `backend/services/billProviderService.js`, `src/app/(features)/bills/[type]/page.tsx`)
*   **Other Payments:** Loan EMIs, Insurance Premiums, Education Fees, Subscriptions, Metro Card, Traffic Challans, etc. (Utilize Bill Payment Flow). (`backend/controllers/billsController.js`)
*   **Unique Feature: Recharge Undo:** Backend request to cancel recharge within a short window (e.g., 30 mins) if operator API supports it. User notified of status. (`backend/controllers/rechargeController.js` - `cancelRecharge`).
*   **Unique Feature: Bill Reminders & Scheduled Payments:** Backend detects upcoming due dates. Users can set reminders or schedule automatic payments. (`src/app/(features)/reminders/page.tsx`, `backend/controllers/rechargeController.js` for scheduling).
*   **Plan Activation Status Tracking:** Real-time updates on plan activation after recharge.
*   **Special Offers:** Display carrier-specific promotional offers.
*   **Roaming Packs & Top-up Vouchers:** Purchase international roaming plans and various top-up vouchers. (`src/app/(features)/recharge/isd/page.tsx`, `src/app/(features)/vouchers/*`)

### 🚌 **III. Travel & Transit**

*   **Bus/Train/Flight Booking:**
    *   _Search:_ Backend fetches options from partners. (`backend/services/bookingProviderService.js`).
    *   _Selection:_ Frontend filters/sorts results. User selects seats/flights. (`src/app/(features)/travels/[type]/page.tsx`)
    *   _Payment & Confirmation:_ Backend processes payment and confirms booking with provider, saving ticket details. (`backend/controllers/bookingController.js`)
*   **Car/Bike Rentals:**
    *   _Search & Book:_ Backend finds vehicles based on location/time. User books and pays via backend. (`src/app/(features)/rent-vehicle/page.tsx`)
    *   _KYC/License:_ User uploads docs via frontend, backend verifies (manual/automated). Smart keyless unlock, condition photos.
*   **Live Tracking:**
    *   _Bus/Train Status:_ Backend fetches real-time location/ETA from tracking provider. (`backend/services/liveTrackingProviderService.js`, `src/app/(features)/live/bus|train/page.tsx`).
*   **Transit & Toll Payments:**
    *   _Metro Recharge:_ Uses Recharge flow (`/recharge/metro`).
    *   _Bus Pass:_ Apply/manage via frontend (`/passes/*`), backend stores pass details.
    *   _Toll Payments:_ Linked with FASTag recharge flow.
    *   _Fuel Payments:_ QR-based payments at petrol bunks.
    *   _Parking Payments:_ Smart parking integration.
    *   _Cab/Taxi Bill Payments:_ Pay for rides.
*   **Unique Feature: AI Travel Assistant:** AI plans trips, suggests itineraries (PDF/Google Calendar sync), and handles bookings based on calendar/weather. (`src/app/(features)/travels/assistant/page.tsx`)
*   **Unique Feature: Family Travel Mode:** Centralized payments and itinerary sharing for family trips. (Conceptual)
*   **Unique Feature: Full Trip Refund Protection:** Optional travel insurance add-on. (Conceptual)
*   **Unique Feature: Sleep Cycle Alarms:** Alarms integrated with bus/train ETAs. (Conceptual)
*   **Unique Feature: Emergency Travel Assistance:** Roadside and medical help. (`src/app/(features)/travels/assistance/page.tsx`)
*   **Unique Feature: Highway Rest Stop Info & Pre-booking:** Find amenities and book facilities. (`src/app/(features)/travels/rest-stop/page.tsx`)

### 💰 **IV. Financial Services**

*   **Investment (Mutual Funds, Digital Gold, Stocks):**
    *   _Browse & Select:_ Backend fetches fund/stock data or Gold price. (`backend/services/investmentProviderService.js`).
    *   _Invest/Buy/Sell:_ Backend initiates transaction with partner platform after payment/KYC verification. (`src/app/(features)/mutual-funds|gold|stocks/page.tsx`).
    *   _Portfolio Summary:_ View total investment, current value, and P&L.
*   **Deposits (FD/RD):** Backend fetches schemes and books deposit with partner. (`src/app/(features)/deposits/page.tsx`).
*   **Loans (Micro & Personal):**
    *   _Micro-Loans & "Study Now, Pay Later":_ Backend checks eligibility (based on UPI/wallet behavior, not CIBIL), processes application, disburses funds. 0% interest if repaid in 7 days. Auto-deduct from future income. (`backend/controllers/loanController.js`, `src/app/(features)/pocket-money/page.tsx`)
    *   _Personal Loans:_ Backend fetches pre-approved offers from partners. (Conceptual) (`src/app/(features)/loans/page.tsx`).
*   **Credit Score:** Backend fetches score from credit bureau partner. (`src/app/(features)/credit-score/page.tsx`).
*   **Unique Feature: Digital Pocket Money:**
    *   _Setup:_ Parent configures child profiles, limits, auto-allowance. (`backend/controllers/pocketMoneyController.js`, `src/app/(features)/pocket-money/page.tsx`).
    *   _Usage:_ Backend manages child balance, enforces limits, links school fee payments.
*   **Unique Feature: Digital Piggy Banks / Goal-Based Savings:** Backend manages goals and auto-save rules based on user configuration. AI helps in planning. (`src/app/(features)/goals/page.tsx`).

### 🎬 **V. Entertainment & Events**

*   **Movie/Event/Comedy/Sports Tickets:**
    *   _Browse:_ Backend fetches listings. (`backend/services/entertainmentProviderService.js`, `src/app/(features)/movies|entertainment/*`).
    *   _Book:_ Select showtime/seats. Backend processes payment and confirms ticket. (`backend/controllers/entertainmentController.js`).
    *   _AR/VR Event Viewing:_ Integration for immersive experiences. (`src/app/(features)/entertainment/arvr/page.tsx`)
    *   _Group Movie Booking:_ Split cost and invite friends. (`src/app/(features)/entertainment/group/page.tsx`)
    *   _Live Show Reminders & Ticket Sync:_ Calendar integration for reminders.
    *   _Regional Event Discovery:_ Location-based event suggestions. (`src/app/(features)/entertainment/discover/page.tsx`)
    *   _Watch Party Creation:_ Schedule and invite for online watch parties. (`src/app/(features)/entertainment/watchparty/page.tsx`)
*   **Unique Feature: Subscription Manager:** Backend detects recurring payments, manages reminders, offers pause/resume (if supported). (`src/app/(features)/subscription-manager/page.tsx`).
*   **Gaming Vouchers & Play Store Recharge:** Purchase digital codes. (`src/app/(features)/vouchers/gaming/page.tsx`, `src/app/(features)/vouchers/digital/page.tsx`)
*   **Game Zones/Amusement Parks:** Ticket booking. (`src/app/(features)/entertainment/gamezone/page.tsx`)

### 🛍️ **VI. Food & Hyperlocal Services**

*   **Online Food Ordering:**
    *   _Browse:_ Backend fetches restaurants/menus (Zomato/Swiggy style). (`backend/services/foodProviderService.js`, `src/app/(features)/food/page.tsx`).
    *   _Order & Pay:_ Backend places order and processes payment.
    *   _AR Dish Preview:_ View food dishes in AR before ordering. (Conceptual)
*   **Hyperlocal Services:**
    *   _Find & Book:_ Electrician, plumber, cleaning, laundry, courier, car wash, tailoring, pet care, salon/barber, AC repair, etc. (`backend/controllers/hyperlocalController.js`, `src/app/(features)/hyperlocal/*` pages).
    *   _Payment:_ Processed via backend.
*   **Coworking Space/Parking Booking:** Find and book slots. (`src/app/(features)/hyperlocal/coworking/page.tsx`, `src/app/(features)/parking/page.tsx`)

### 🛕 **VII. Temple & Spiritual Services**

*   **Darshan Slot Booking:** Backend fetches slots or manages internal slots. User books, backend confirms. (`backend/controllers/templeController.js`, `src/app/(features)/temple/darshan/page.tsx`).
*   **Live Darshan Videos:** Frontend embeds official live streams. (`src/app/(features)/temple/live/page.tsx`).
*   **Virtual Pooja Booking:** Backend records booking, processes payment. (`backend/controllers/templeController.js`, `src/app/(features)/temple/pooja/page.tsx`).
*   **Prasadam Delivery:** Backend takes order, processes payment, forwards to delivery partner/temple. (`backend/controllers/templeController.js`, `src/app/(features)/temple/prasadam/page.tsx`).
*   **Temple Donations:** Backend processes payment and logs donation. (`backend/controllers/templeController.js`, `src/app/(features)/temple/donate/page.tsx`).
*   **Info & Audio:** Backend fetches timings/info. Frontend plays static/streamed audio (Aarti/Mantras). (`src/app/(features)/temple/info|audio/page.tsx`).
*   **Unique Feature: Smart Access Pass:** Backend generates QR code for entry based on confirmed bookings. (`backend/controllers/templeController.js`, `src/app/(features)/temple/access/page.tsx`).
*   **Unique Feature: AI Queue Prediction:** Estimates wait times for darshan. (Conceptual)
*   **Accommodation & Group Visits:** Find nearby stays and book group visits. (`src/app/(features)/temple/accommodation|group/page.tsx`)

### ⚕️ **VIII. Healthcare & Wellness**

*   **Doctor Appointments/Video Consultation:** Backend searches doctors, books slots, handles video calls. (`src/app/(features)/healthcare/*`).
*   **Lab Tests:** Backend integrates with labs for test booking and report delivery. (`src/app/(features)/healthcare/lab/page.tsx`).
*   **Order Medicines/Subscription:** Backend integrates with pharmacies for orders and recurring deliveries. (`src/app/(features)/healthcare/pharmacy|med-subscription/page.tsx`).
*   **Emergency Ambulance:** Backend integrates with providers to dispatch nearest vehicle. (`src/app/(features)/healthcare/ambulance/page.tsx`).
*   **Health Wallet:** Backend securely stores user-uploaded documents in Firebase Storage. (`src/app/(features)/healthcare/wallet/page.tsx`).
*   **Fitness Trainers & Health Packages:** Book sessions and explore discounted health checkups. (`src/app/(features)/healthcare/fitness|offers/page.tsx`).

### 🤖 **IX. AI & Smart Features (General)**

*   **Conversational AI ("Ask PayFriend"):** Frontend captures query, sends to backend Genkit flow (`conversationalActionFlow`) for intent parsing and action execution. (`src/app/(features)/conversation/page.tsx`, `backend/ai/flows/conversational-action.ts`)
*   **Smart Payee Suggestions:** Backend AI analyzes transaction history to suggest frequent payees. (`backend/ai/flows/smart-payee-suggestion.ts`, `src/app/(features)/send/[type]/page.tsx`)
*   **Spending Analysis:** Backend AI flow analyzes transaction history, returns summary/insights. (`backend/ai/flows/spending-analysis.ts`, `src/app/(features)/analysis/page.tsx`)
*   **AI Gifting Assistant:** Helps choose gifts based on criteria. (`src/app/(features)/ai-gifting/page.tsx`)
*   **AI Agent for Auto-Booking:** (Conceptual) Based on user routine.
*   **Smart Schedule Builder:** AI plans travel, food, and work schedules. (`src/app/(features)/smart-schedule/page.tsx`)
*   **Emotional Spending Detection & Karma Banking:** (Conceptual) AI-driven wellness and charity features.
*   **Personalized Festival Offers:** Based on religion/region. (Conceptual)

### 🔒 **X. Security & Convenience (General)**

*   **Bank-Level & App-Level Security:** Implemented across frontend and backend (See Tech Stack & Security section).
*   **Unique Feature: Secure Vault:** Backend stores encrypted file references. (`src/app/(features)/vault/page.tsx`).
*   **Unique Feature: Emergency Mode:** Frontend triggers emergency flow. Backend shares location (with consent), calls help, prepares wallet. (`src/app/emergency/page.tsx`).
*   **Unique Feature: Payment Freeze Mode:** Backend flag prevents payment processing. (`backend/controllers/userController.js`, `src/app/(features)/profile/security/page.tsx`).
*   **Unique Feature: Temporary Virtual UPI ID:** (Conceptual - Requires PSP support)
*   **Unique Feature: Self-Imposed Spending Limits:** Backend checks limits before transactions. (`src/app/(features)/analysis/page.tsx` - Budget section).
*   **Unique Feature: Auto-Credit for Payment Failures:** Backend webhook listener detects failed-but-debited status, creates support ticket, triggers temporary wallet credit if refund delayed. (`backend/controllers/paymentController.js`).
*   **Unique Feature: Zet Fuel Card:** (Conceptual) Virtual wallet sub-account for fuel.
*   **Unique Feature: Zet One-Tap Auth:** (Conceptual) Alternative auth if OTP fails.
*   **Unique Feature: Retry Payment with Another Method:** Frontend UI suggests alternatives on failure. (`src/app/(features)/pay/page.tsx`).
*   **Unique Feature: Real-time Bank Server Status:** Backend service checks bank status, frontend displays it. (`backend/services/bankStatusService.js`).
*   **Unique Feature: Multi-device Login Alerts & Remote Logout:** Firebase Auth triggers backend, sends notifications.
*   **Unique Feature: Battery-Based Lite Mode:** Auto-switches to essential features on low battery. (Conceptual)
*   **Unique Feature: Transaction Lock Timer:** Temporarily lock account to prevent over-spending. (Conceptual)

### ✨ **XI. Other Features (General)**

*   **Offers, Rewards & Loyalty:** Backend manages offers, rewards, points. (`backend/controllers/offerController.js`, `src/app/(features)/offers|profile/rewards/page.tsx`).
*   **Referral Program:** Backend tracks codes, validates referrals, triggers rewards. (`backend/services/offers.js`).
*   **Profile & Settings:** Backend CRUD for user profile. (`backend/controllers/userController.js`, `src/app/(features)/profile/*` pages).
*   **Unique Feature: 24/7 Live Human Support Chat:** Frontend chat UI connects via WebSocket to backend chat server, routes to support agents. (`backend/server.js`, `src/app/(features)/support/page.tsx`).
*   **Municipal Services:** Pay property tax, housing society dues. (`src/app/(features)/property-tax|housing-society/page.tsx`)
*   **Gift Cards:** Purchase digital gift cards. (`src/app/(features)/vouchers/giftcards/page.tsx`)
*   **Zet Chat:** In-app chat with payment receiver. (`src/components/zet-chat.tsx`)
*   **Stealth Scan Mode:** Discreet QR scanning. (`src/app/(features)/scan/page.tsx`)
*   **Smart QR Memory:** Remembers scanned QRs, offers suggestions. (`src/app/(features)/scan/page.tsx`)

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** Tailwind CSS, Shadcn/ui
*   **State Management:** React Context / Zustand (as needed)
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** Firebase Firestore (Primary Database)
*   **Caching:** Redis (for frequently accessed data, biller lists, plans, active offers, user sessions if custom)
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
*   Firebase Account & Project Setup (Firestore, Auth, Storage required). **Ensure Phone Number sign-in method is enabled in Firebase Authentication.**
*   Google Cloud Project with Vertex AI enabled (for Genkit/Gemini)
*   Redis Instance (Self-hosted, Docker, or Cloud Provider like Memorystore/ElastiCache) - Connection URL needed.
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
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/firebaseServiceAccountKey.json

# Method 2: Service Account Environment Variables (Suitable for deployment)
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_WITH_NEWLINES\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET_URL # e.g., your-project-id.appspot.com

# Google AI API Key (for Genkit backend flows)
GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Redis Configuration
REDIS_URL=redis://localhost:6379 # Example: redis://username:password@host:port
# REDIS_PASSWORD=YOUR_REDIS_PASSWORD (if applicable)

# Payment Service Provider (PSP) Credentials (Examples)
PSP_API_KEY=YOUR_PSP_API_KEY
PSP_SECRET_KEY=YOUR_PSP_SECRET_KEY
PSP_WEBHOOK_SECRET=YOUR_PSP_WEBHOOK_SECRET
PSP_WEBHOOK_URL=https://your-backend-url.com/api/webhooks/psp

# Payment Gateway Credentials (Examples)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET

# Blockchain API Endpoint (If using a separate logging service)
BLOCKCHAIN_API_ENDPOINT=http://localhost:5001/log

# JWT Secret (If implementing custom JWT-based auth for specific backend services)
JWT_SECRET=YOUR_STRONG_JWT_SECRET

# Travel Aggregator APIs
AMADEUS_API_KEY=YOUR_AMADEUS_API_KEY
TRAVELPORT_API_ID=YOUR_TRAVELPORT_API_ID
SABRE_WSSE_TOKEN=YOUR_SABRE_WSSE_TOKEN
REDBUS_API_KEY=YOUR_REDBUS_API_KEY
ABHIBUS_ACCOUNT_ID=YOUR_ABHIBUS_ACCOUNT_ID
ABHIBUS_SECRET=YOUR_ABHIBUS_SECRET
TRAIN_PARTNER_API_KEY=YOUR_TRAIN_PARTNER_API_KEY
AVIS_API_KEY=YOUR_AVIS_API_KEY
CAR_AGGREGATOR_SECRET=YOUR_CAR_AGGREGATOR_SECRET
APSRTC_API_KEY=YOUR_APSRTC_API_KEY
NTES_API_USERNAME=YOUR_NTES_USERNAME
NTES_API_PASSWORD=YOUR_NTES_PASSWORD

# Movie/Event APIs
BOOKMYSHOW_API_KEY=YOUR_BMS_API_KEY
TICKETNEW_AFFILIATE_ID=YOUR_TICKETNEW_AFFILIATE_ID
EVENTBRITE_API_KEY=YOUR_EVENTBRITE_API_KEY
CITY_EVENTS_API_URL=YOUR_CITY_EVENTS_API_URL

# Hyperlocal/Food APIs
ZOMATO_API_KEY=YOUR_ZOMATO_API_KEY
SWIGGY_API_KEY=YOUR_SWIGGY_API_KEY

# KYC Provider API
KYC_PROVIDER_API_KEY=YOUR_KYC_PROVIDER_KEY
KYC_PROVIDER_SECRET=YOUR_KYC_PROVIDER_SECRET

# Credit Bureau API
CIBIL_API_KEY=YOUR_CIBIL_API_KEY
CIBIL_API_SECRET=YOUR_CIBIL_API_SECRET

# Cloud Messaging (FCM)
# FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY (Often handled by Firebase Admin SDK)

# Twilio/Communication API
# TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
# TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
# TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER

# Other Partner/Aggregator API Keys
# E.g., TEMPLE_API_KEY_TIRUPATI, HEALTHCARE_PLATFORM_API_KEY, etc.
```

### Installation & Running

1.  **Clone:** `git clone <repository-url> && cd <repo-name>`
2.  **Install Root Dependencies:** `npm install` (or `yarn`)
3.  **Install Backend Dependencies:** `cd backend && npm install` (or `yarn`) && `cd ..`
4.  **Setup `.env` files:** Create and populate `.env` in root and `backend/` as per above. Ensure Firebase credentials, Redis URL, and necessary API keys are correct.
5.  **Run Redis Server:** (If self-hosting) Start your Redis instance.
6.  **Run Backend Server:** (Terminal 1) `cd backend && npm run dev`
7.  **Run Genkit Dev Server (Optional, if using AI flows):** (Terminal 2, from root) `npm run genkit:dev`
8.  **Run Frontend Dev Server:** (Terminal 3, from root) `npm run dev`

Open [http://localhost:9002](http://localhost:9002) (or your frontend port). The backend runs on port 9003 by default.

---

## 📁 Folder Structure (High-Level)

```
.
├── src/                 # Frontend (Next.js)
│   ├── app/             # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── (auth)/      # Auth routes (login, signup - using Firebase Phone Auth)
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
│   ├── styles/          # Additional global styles
│   └── mock-data/       # Mock data for various services (client-side fallback)
├── backend/             # Backend (Node.js/Express)
│   ├── config/          # Firebase Admin config, DB connections, Partner SDK configs, Redis client
│   ├── controllers/     # Route handlers (API logic for specific features)
│   ├── middleware/      # Auth, error handling, validation, rate limiting
│   ├── models/          # Data models/schemas (if using ORM/ODM - less likely with Firestore)
│   ├── routes/          # API route definitions (grouping endpoints by feature)
│   ├── services/        # Backend business logic, external API calls, DB interactions, caching logic
│   ├── utils/           # Backend utility functions
│   └── server.js        # Main server entry point (includes WebSocket server setup & Redis connection)
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

---

## 🔐 Security Features Implemented

This section outlines the security measures considered and (conceptually or partially) implemented in Zet Pay. Full implementation of all features requires ongoing effort, infrastructure, and potentially native mobile code.

**1. Core Security Standards (Implemented or Assumed via Partners):**

| Feature                    | Status / Implementation Notes                                                                                                                                                                                                                            |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AES-256 Encryption**     | **Backend:** Data at rest in Firestore is encrypted by Google. Sensitive configuration (API keys) via `.env`. For data in transit, see SSL/TLS. **Conceptual:** Application-level encryption for specific sensitive fields if stored outside Firestore. |
| **SSL/TLS for All Traffic**| **Frontend/Backend:** All API calls use HTTPS via `apiClient.ts`. Vercel/Cloud Run enforce HTTPS.                                                                                                                                                           |
| **HSM (Hardware Security Module)** | **Conceptual:** For a production system managing real financial keys (e.g., master keys for payment processing), HSMs would be used by the payment gateway or banking partner. Zet Pay's backend would not directly manage these.                     |
| **PCI-DSS Compliance**     | **Assumed via Partner:** Payment Gateway (e.g., Razorpay, Stripe) is PCI-DSS compliant. Zet Pay backend does **not** store full card numbers; only tokens. (`backend/services/cards.js` & `paymentGatewayService.js` handle tokenization).                |
| **Tokenization**           | **Implemented (via PG):** Card details tokenized by Payment Gateway. UPI IDs used directly but securely managed by backend and PSP. (`backend/services/cards.js`, `paymentGatewayService.js`)                                                          |
| **Fraud Detection System** | **Conceptual/Simulated:** Backend services include placeholders for calling fraud detection APIs (e.g., during QR scan validation in `scanService.js`, or transaction processing). Real implementation requires a dedicated fraud engine or third-party service. |
| **VAPT (Vulnerability Assessment & Penetration Testing)** | **Process:** Requires regular external audits. Not implementable in code directly.                                                                                                                                                           |
| **Audit Trails**           | **Backend:** Firestore logs all data changes. `transactionLogger.ts` creates detailed transaction records. Morgan for HTTP request logging. **Conceptual:** More extensive, dedicated audit logging service for critical actions.                 |
| **Zero Trust Architecture**| **Principle:** Applied by requiring authentication (Firebase Auth + JWT for backend APIs) for all internal services. Network policies (via Cloud provider) would further enforce this.                                                                 |

**2. Advanced Security Mechanisms:**

| Feature                        | Status / Implementation Notes                                                                                                                                                                                                                                                                                                                         |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Biometric Authentication**   | **Frontend (Conceptual):** Login page (`login/page.tsx`) notes biometric usage. Actual implementation requires native mobile capabilities to access device biometrics. Backend verifies standard auth token. UPI PIN is handled by PSP.                                                                                                                        |
| **Multi-Factor Authentication (MFA)** | **Partially (OTP):** Firebase Phone Auth provides OTP-based MFA for login. **Conceptual:** Additional factors (e.g., authenticator app, security key) could be added via custom backend logic.                                                                                                                                                              |
| **Jailbreak/Root Detection**   | **Native Mobile:** Requires native code (e.g., SafetyNet/App Attest on Android, DeviceCheck on iOS) and server-side validation. Not directly implementable in Next.js/Node.js.                                                                                                                                                                         |
| **Secure Enclave/Keystore Use**| **Native Mobile:** Sensitive client-side data (like locally stored app PIN hash, or if biometrics unlock a local key) would use device's Secure Enclave/Keystore.                                                                                                                                                                                       |
| **Device Binding**             | **Partially (Firebase Auth):** Firebase Auth provides some level of device awareness. **Conceptual:** Stronger device binding (e.g., checking unique device identifiers on backend during critical operations) would require backend logic and client-side data collection.                                                                            |
| **Session Timeout & Auto Logout** | **Frontend (Firebase Auth):** Firebase SDK manages client-side session persistence and refresh. **Backend:** Tokens have expiry. `authMiddleware.js` validates token on each request. Auto-logout on client can be implemented with inactivity timers.                                                                                                           |
| **Geofencing**                 | **Conceptual:** Backend could check IP geolocation or request client location for high-risk transactions and apply rules. Requires integration with a Geo-IP service.                                                                                                                                                                                 |
| **Dynamic Transaction Limits** | **Conceptual:** Backend logic in payment controllers (`upiController.js`, `walletController.js`) could query a risk engine or user profile settings to apply dynamic limits.                                                                                                                                                                            |
| **OTP over Secure Channels**   | **Implemented (Firebase Phone Auth):** Uses Firebase for SMS OTP. **Conceptual:** For other OTPs (e.g., transaction confirmation), ensure delivery via secure, rate-limited channels.                                                                                                                                                                          |

**3. App-Level Security Features (Primarily for Native Mobile Apps):**

| Feature                             | Status / Implementation Notes (Considering Web App Context)                                                                                                                                                                                                                                            |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code Obfuscation**                | **Build Step (Next.js):** Minification is standard. True obfuscation is less common for web apps but can be applied via build tools.                                                                                                                                                                        |
| **Secure Local Storage**            | **Frontend (Firebase Auth):** Firebase SDK manages its own token storage securely. For other app data, `localStorage` is used with caution, avoiding highly sensitive data. Sensitive user settings managed server-side.                                                                              |
| **Root/Jailbreak Detection**        | **Native Mobile:** (As above)                                                                                                                                                                                                                                                                             |
| **App Integrity Checks**            | **Native Mobile/Web (Firebase App Check):** Firebase App Check can be integrated with Play Integrity (Android) / DeviceCheck (iOS) / reCAPTCHA Enterprise (Web) to protect backend resources from abuse. (`firebaseAdmin.js` ready for App Check token verification if client sends it).               |
| **Certificate Pinning**             | **Native Mobile/Advanced Web:** For web, can be implemented via Service Workers or specific browser features, but complex. Primarily a native app concern. `apiClient.ts` uses HTTPS.                                                                                                                    |
| **In-App Secure Keyboard**          | **Native Mobile:** Relevant for PIN/password entry to prevent keylogging. For web, careful input field design and HTTPS are key.                                                                                                                                                                          |
| **Tamper Detection**                | **Native Mobile/Web (App Check):** As above with App Integrity. Backend validation of all inputs is crucial.                                                                                                                                                                                             |
| **Prevent Screen Capture**          | **Native Mobile:** OS-level feature. **Web:** Limited browser capabilities (CSS `user-select: none` helps minimally). Sensitive data display should be carefully managed.                                                                                                                                |
| **Realtime Crash & Threat Reporting** | **Frontend (Firebase):** Next.js can be integrated with Sentry or Firebase Crashlytics (if using Firebase Performance). **Backend:** Robust logging (Morgan, custom logs) and monitoring tools (Google Cloud Monitoring/Logging).                                                                   |

**Zet Pay Security Architecture Diagram (Conceptual):**

```
+------------------------------------------------------------------------------------------------------+
|                                       Zet Pay Application Ecosystem                                    |
+------------------------------------------------------------------------------------------------------+
| [ User Device (Mobile/Web - Next.js Frontend) ]                                                      |
|   - Biometric/PIN App Unlock (Native/Conceptual)                                                     |
|   - Firebase Auth SDK (OTP, Session Management)                                                      |
|   - Secure Local Storage (Framework Managed for Tokens)                                              |
|   - HTTPS (apiClient.ts)                                                                             |
|   - Input Validation (Client-side checks)                                                            |
|   - (Conceptual: SSL Pinning, Root Detection, App Integrity - Native)                                |
|             |                                                                                        |
|             |<--(HTTPS, Firebase Auth Tokens, WebSocket Secure)-->                                   |
|             |                                                                                        |
| [ Zet Pay Backend (Node.js/Express on Cloud Run/Firebase Functions) ]                                |
|   - Firebase Admin SDK (Token Verification - authMiddleware.js)                                      |
|   - API Gateway (e.g., Google Cloud API Gateway - Conceptual for Nginx-like features)                |
|   - Rate Limiting, Helmet (server.js)                                                                |
|   - Input Validation (express-validator in routes)                                                   |
|   - AES-256 Encryption (for specific sensitive data beyond Firestore's default) - Conceptual         |
|   - JWT/OAuth2 for internal service auth (Conceptual if scaling to microservices)                    |
|   - Secure API Design (RESTful, clear contracts)                                                     |
|   - Redis (Caching, Temp Data - backend/config/redisClient.js)                                       |
|             |                                                                                        |
|   ----------|------------------ Firebase Services -------------------|---------------------------- |
|   |         |                    - Firestore (Data at Rest Encryption) |                            | |
|   |         |                    - Firebase Auth (User Management)     |                            | |
|   |         |                    - Storage (Secure File Uploads)       |                            | |
|   |         |                    - App Check (Protect Backend)         |                            | |
|   ----------|----------------------------------------------------------|---------------------------- |
|             |                                                          |                             |
|             |<--(Secure API Calls, Mutual TLS if applicable)-->        |<--(Secure SDK/API Calls)--> |
|             |                                                          |                             |
| [ Payment Gateways / PSPs ]       [ KYC Providers / Credit Bureaus ]   [ Simulated Blockchain Logger ] |
|   - PCI-DSS Compliant             - Secure Data Exchange               - Logging Service             |
|   - Tokenization                  - Data Privacy Adherence             - (Internal/Mock)             |
|   - HSMs for Keys (Partner Side)                                                                     |
+------------------------------------------------------------------------------------------------------+
| Monitoring & Compliance Layer:                                                                       |
|   - Centralized Logging (Cloud Logging, Sentry)                                                      |
|   - Security Alerts & Monitoring                                                                     |
|   - VAPT, Code Audits (Process)                                                                      |
|   - Incident Response Plan (Process)                                                                 |
+------------------------------------------------------------------------------------------------------+
```

**Recommendations for Implementation (Focus Areas):**

*   **Firebase App Check:** Strongly recommend integrating Firebase App Check with reCAPTCHA Enterprise (for web) to protect your backend APIs from abuse. This involves client-side setup and backend token verification.
*   **Input Validation:** Rigorously validate all inputs on the backend (`express-validator` is a good start).
*   **Secure Error Handling:** Ensure `errorMiddleware.js` does not leak sensitive information in production.
*   **Dependency Security:** Regularly update dependencies and scan for vulnerabilities.
*   **Principle of Least Privilege:** Ensure Firebase security rules for Firestore and Storage are as restrictive as possible.
*   **Session Management (Server-Side if needed):** If custom server-side sessions are implemented beyond Firebase Auth tokens (e.g., for longer-lived admin sessions or specific flows), store session IDs in Redis and ensure they are secure, short-lived, and invalidated on logout/timeout.
*   **Rate Limiting:** Fine-tune rate limits based on expected usage to prevent abuse.
*   **Data Minimization:** Only collect and store data that is absolutely necessary for the service.
*   **User Education:** Inform users about security best practices (strong PINs, not sharing OTPs, etc.).

*This documentation provides a high-level overview. Specific security measures and their depth of implementation can be found within individual code files and require continuous review and improvement.*
