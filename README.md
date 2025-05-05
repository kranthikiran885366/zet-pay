
# Zet Pay - Your AI-Powered Everyday Super App 🚀

**Mission:** Become the “digital remote control” for every Indian’s daily life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance into one seamless, secure, and intuitive experience, enhanced with emotion understanding and real-world integration.

**Goal:** Evolve beyond a payments app into **India’s Everyday Operating System** – a lifestyle AI, financial brain, spiritual guide, hyperlocal commerce engine, and personal wellness & emotion-aware tool.

## ✨ Core Features & How They Work

This section details the primary functionalities of the Zet Pay app.

### 💳 **I. Payments & Wallet**

*   **UPI Payments:**
    *   _Send to Contact:_ Select a saved contact (synced with phone/app contacts) and enter the amount. App uses the contact's primary UPI ID or prompts selection if multiple exist.
    *   _Send to Bank/UPI ID:_ Manually enter the recipient's UPI ID or Bank Account + IFSC code. App verifies the UPI ID/Account Holder name before proceeding.
    *   _Scan & Pay:_ Uses the device camera (`src/app/(features)/scan/page.tsx`) to scan any UPI QR code. Decodes the QR data (payee UPI ID, name, amount if present) and pre-fills the payment confirmation screen (`src/app/(features)/pay/page.tsx`).
    *   _Payment Confirmation:_ User reviews details (Payee Name, UPI ID, Amount) and authorizes payment via UPI PIN (handled securely via PSP SDK/backend integration).
*   **Wallet:**
    *   _Top-up:_ Add funds to the Zet Pay wallet using UPI, Net Banking, or Debit/Credit Card via integrated Payment Gateways (`src/services/wallet.ts` interacts with backend `/wallet/topup`).
    *   _Management:_ View current balance (updated in real-time via WebSocket `useRealtimeBalance` hook) and transaction history specific to the wallet.
    *   _Pay via Wallet:_ Use wallet balance as a payment source for recharges, bills, bookings, or P2P transfers (`src/services/wallet.ts` interacts with backend `/wallet/pay`).
*   **UPI Lite:**
    *   _Enable/Disable:_ Users can enable UPI Lite via their linked bank account (if supported) (`src/services/upiLite.ts` interacts with backend `/upi/lite/enable`). Balance is stored on-device/SIM.
    *   _Top-up:_ Add funds (up to ₹2000) from the linked bank account to the UPI Lite balance (`src/services/upiLite.ts` interacts with backend `/upi/lite/topup`).
    *   _Payment:_ Make small-value payments (up to ₹500) instantly without UPI PIN (`src/services/upiLite.ts`).
*   **UPI Autopay (Mandates):**
    *   _Setup:_ Users can authorize merchants (e.g., Netflix, SIPs) for recurring debits up to a certain limit and frequency (`src/services/autopay.ts` interacts with backend `/autopay/mandates`). Requires UPI PIN authorization.
    *   _Management:_ View active/paused/cancelled mandates. Pause, resume, or cancel mandates (`src/app/(features)/autopay/page.tsx`, `src/services/autopay.ts`).
*   **Debit/Credit Card Payments:**
    *   _Save Cards:_ Securely save card details (tokenized via backend/PG) for faster checkouts (`src/services/cards.ts` interacts with backend `/cards`).
    *   _Pay Bills/Shop:_ Use saved cards (requires CVV and potentially OTP/3D Secure via PG) for various payments (`src/services/paymentGatewayService.ts` interacts with backend `/payments/card`).
    *   _Bill Payments:_ Pay credit card bills for any bank by entering card number and amount (`src/app/(features)/bills/credit-card/page.tsx`).
*   **Pay Later (BNPL):**
    *   _Activation:_ Eligible users activate Pay Later facility provided by partner NBFC/Bank (`src/services/bnpl.ts` interacts with backend `/bnpl/activate`).
    *   _Usage:_ Use BNPL credit limit for eligible transactions (UPI, bills, etc.).
    *   _Billing & Repayment:_ Receive monthly statements and repay the due amount via UPI, Wallet, or Bank transfer (`src/app/(features)/bnpl/page.tsx`).
*   **⭐ Unique Feature: Smart Wallet Bridge (UPI Limit Resolver):**
    *   _Problem:_ User hits UPI daily limit (₹1 Lakh).
    *   _Zet Fix:_ If enabled by user (KYC verified, toggle ON in Settings) and payment amount is within fallback limit (e.g., ₹5k), the app automatically uses the Zet Pay wallet balance to complete the transaction instantly.
    *   _Recovery:_ The backend schedules a recovery task. After midnight (when UPI limit resets), it attempts to auto-debit the used amount from the user's primary linked bank account and credit it back to their Zet Pay wallet (`src/services/recoveryService.ts`, `backend/services/recoveryService.ts`).
    *   _User Experience:_ Payment succeeds seamlessly. User gets notified about the fallback and recovery.
*   **⭐ Unique Feature: Cardless Cash Withdrawal:**
    *   _Process:_ User finds nearby "Zet Agents" (partner shops) on a map (`src/app/(features)/cash-withdrawal/page.tsx`). User selects agent, enters amount. App generates a secure OTP and a QR code (`src/services/cash-withdrawal.ts` interacts with backend `/cash-withdrawal/initiate`). User shows OTP/QR to agent. Agent verifies via their app, dispenses cash. Funds deducted from user's wallet/linked account.
    *   _Security:_ Time-bound OTP/QR, agent verification needed.

### 📱 **II. Recharge & Bill Payments**

*   **Mobile Recharge (Prepaid/Postpaid):**
    *   _Operator/Circle Detection:_ Auto-detects operator (Jio, Airtel, etc.) and circle based on entered mobile number (`src/app/(features)/recharge/[type]/page.tsx` interacts with backend detection). User can manually override.
    *   _Plan Browser:_ Fetches and displays available plans categorized (Recommended, Data, Unlimited, etc.) from backend/aggregator (`src/services/recharge.ts`). Includes plan details (price, validity, data, SMS, talktime).
    *   _AI Recommendations:_ Suggests plans based on user's past recharge history and inferred usage patterns (using Genkit Flow `recommendRechargePlans`).
    *   _Validity Tracking:_ (Future) Store last recharge details to show remaining validity.
    *   _Payment:_ Processed via selected method (Wallet, UPI, Card).
*   **DTH Recharge:** Similar flow to mobile - select operator, enter Customer ID, browse/select plan or enter amount, pay.
*   **FASTag Recharge:** Select issuer bank, enter vehicle number, enter amount, pay.
*   **Utility Bills (Electricity, Water, Gas, Broadband, etc.):**
    *   Select provider/biller.
    *   Enter Consumer ID/Account Number.
    *   App fetches bill amount (if supported by biller via BBPS/API integration) or user enters manually (`src/services/bills.ts`).
    *   Pay the bill.
*   **Other Payments:** Loan EMIs, Insurance Premiums, Education Fees, Subscriptions (OTT), Metro Card Recharge, Data Card, Intl. Calling Cards. Flow involves selecting biller, entering identifier (policy no, loan no, student ID, etc.), fetching/entering amount, and paying.
*   **⭐ Unique Feature: Recharge Undo:** Within a short window (e.g., 5-10 minutes, configurable), user can request cancellation of a potentially wrong mobile/DTH recharge if the recharge hasn't already been consumed/processed fully by the operator (`src/services/recharge.ts` interacts with backend `/recharge/cancel/:transactionId`).
*   **⭐ Unique Feature: Bill Reminders:** Users can manually add reminders for recurring bills (rent, fees) or the app can potentially auto-detect upcoming due dates from bill fetch history (`src/app/(features)/reminders/page.tsx`). Sends push notifications.

### 🚌 **III. Travel & Transit**

*   **Bus/Train/Flight Booking:**
    *   _Search:_ Enter origin, destination, date. App fetches available options from aggregators/partners (`src/services/bookingProviderService.ts` interacts with backend `/bookings/:type/search`).
    *   _Selection:_ Filter/sort results. Select seats/berths/flights. View details.
    *   _Payment:_ Pay total fare via Wallet/UPI/Card/BNPL.
    *   _Booking Confirmation:_ App confirms booking with provider and generates Ticket/PNR (`src/services/bookingProviderService.ts` interacts with backend `/bookings/:type`). Tickets saved in Secure Vault.
*   **Car/Bike Rentals:**
    *   _Search:_ Select location, date/time, duration, vehicle type (self-drive/chauffeur for cars).
    *   _Availability & Booking:_ View available vehicles, pricing. Book and pay (`src/app/(features)/travels/car|bike/page.tsx` - currently placeholders).
    *   _KYC/License:_ (Future) In-app upload and verification.
*   **Live Tracking:**
    *   _Bus/Train Status:_ Enter service/train number. App fetches real-time location, ETA, delays from partner APIs/data sources (`src/services/liveTracking.ts` interacts with backend `/live/bus|train/:identifier`). Displays status similar to APSRTC/WhereIsMyTrain (`src/app/(features)/live/bus|train/page.tsx`).
*   **EV Charging & Highway Rest Stops:**
    *   _Finder:_ Map-based search for nearby EV stations or highway rest stops (`src/app/(features)/travels/ev-charging|rest-stop/page.tsx`).
    *   _Info & Booking:_ View details (connector type, price, amenities) and potentially book slots/services (Future).
*   **⭐ Unique Feature: Family Travel Mode:** (Future) A designated family head can manage and pay for travel bookings (bus, train, flight) for linked family members from a central wallet or account. Requires setting up family groups.
*   **⭐ Unique Feature: Smart Itinerary Auto-Creation:** (Future) Based on booked tickets (bus/train/flight + potentially hotels), the app can automatically generate a basic travel itinerary PDF and offer syncing to Google Calendar.

### 💰 **IV. Financial Services**

*   **Investment (Mutual Funds, Digital Gold):**
    *   _Browse & Select:_ Explore available MFs (by category, risk) or check live Gold price (`src/services/investmentProviderService.ts` interacts with backend `/invest/*`).
    *   _Invest/Buy/Sell:_ Initiate SIP/Lumpsum MF investments or Buy/Sell Digital Gold. Requires linked bank account and potentially KYC with investment partner (`src/app/(features)/mutual-funds|gold/page.tsx`).
*   **Deposits (FD/RD):** (Future) Browse schemes and book Fixed or Recurring Deposits with partner banks.
*   **Loans (Personal & Micro):**
    *   _Micro-Loans:_ Eligibility check based on app usage history. Apply for small, short-term loans (0% interest if repaid quickly) (`src/services/loans.ts`).
    *   _Study Now, Pay Later (SNPL):_ Specific micro-loan purpose for education fees, potentially with different terms (`src/app/(features)/pocket-money/page.tsx`).
    *   _Personal Loans:_ (Future) View pre-approved offers from partners and apply.
*   **Credit Score:** (Future) Integrate with credit bureaus (e.g., CIBIL, Experian) to allow users to check their credit score and report periodically.
*   **⭐ Unique Feature: Digital Pocket Money:**
    *   _Setup:_ Parent links child's profile (non-transactional user). Sets allowance amount/frequency, spending limits per transaction, optional link to school biller (`src/services/pocket-money.ts`).
    *   _Usage:_ Child gets a virtual balance. Parent can top-up manually. Child can potentially use balance for specific allowed payments (requires careful implementation).
    *   _School Fees:_ Parent can directly pay linked school fees, potentially using SNPL.

### 🎬 **V. Entertainment & Events**

*   **Movie/Event/Comedy/Sports Tickets:**
    *   _Browse:_ View listings by city, date, genre (`src/app/(features)/movies|entertainment/*`).
    *   _Book:_ Select showtime/event, choose seats (interactive seat map for movies), pay (`src/app/(features)/movies/page.tsx`). Tickets saved in Vault.
*   **OTT Subscriptions:** Managed via Bill Payments (`src/app/(features)/bills/subscription/page.tsx`). (Future: Bundling offers).
*   **Game Zones / Amusement Parks:** (Future) Browse nearby venues and book tickets/slots.
*   **⭐ Unique Feature: AR/VR Event Viewing:** (Future) Integrate with specific AR/VR platforms for select events. Users with compatible headsets could view concerts or virtual tours.
*   **⭐ Unique Feature: Group Booking:** (Future) Initiate a group booking for movies/events, invite friends via link/contacts, automatically split the cost among attendees who accept.
*   **⭐ Unique Feature: Regional Event Discovery:** (Future) Uses location and user preferences to highlight local fairs, festivals, workshops, etc.

### 🛍️ **VI. Food & Hyperlocal Services**

*   **Online Food Ordering:**
    *   _Browse:_ View restaurants nearby, filter by cuisine, rating, price (`src/app/(features)/food/page.tsx`).
    *   _Menu & Cart:_ Select items from restaurant menu, add to cart (`src/app/(features)/food/[restaurantId]/page.tsx`).
    *   _Order & Pay:_ Confirm order, apply coupons, pay via Wallet/UPI/Card/BNPL. Track order status (requires partner integration).
*   **Hyperlocal Services (Electrician, Plumber, Cleaning, Laundry, Courier, Car Wash, Tailoring, Pet Care, Salon/Barber):**
    *   _Find & Book:_ Search for service type by location. View provider profiles/ratings. Book available slots (`src/app/(features)/hyperlocal/*` pages).
    *   _Payment:_ Pay estimated cost upfront or after service completion.
*   **Coworking Space Booking:** (Future) Find and book desks/meeting rooms.
*   **Parking Payments & Slot Booking:** (Future) Find nearby parking, view availability/pricing, pay digitally, potentially pre-book slots.

### 🛕 **VII. Temple & Spiritual Services**

*   **Darshan Slot Booking:** Search available slots (Free, Special Entry, VIP) by temple and date. Book slots and pay associated fees (`src/app/(features)/temple/darshan/page.tsx`).
*   **Live Darshan Videos:** Embed live feeds from official temple channels (e.g., SVBC for TTD) (`src/app/(features)/temple/live/page.tsx`).
*   **Virtual Pooja Booking:** Select temple and pooja type. Provide devotee details (name, gotra). Book and pay for remote participation (`src/app/(features)/temple/pooja/page.tsx`).
*   **Prasadam Delivery:** Browse available prasadam items for selected temples. Add to cart, provide delivery address, and pay (`src/app/(features)/temple/prasadam/page.tsx`).
*   **Temple Donations:** Select temple/trust and donation scheme. Enter amount, donor details (optional PAN), or choose anonymous donation. Pay securely (`src/app/(features)/temple/donate/page.tsx`).
*   **Info & Audio:** Access temple timings, live queue estimates (if available), Aarti/Mantra audio streams (`src/app/(features)/temple/info|audio/page.tsx`).
*   **Events & Accommodation:** Browse temple festivals/yatras. Find info on nearby accommodation (`src/app/(features)/temple/events|accommodation/page.tsx`).
*   **⭐ Unique Feature: Smart Access Pass:** Generated QR code for confirmed Darshan/Pooja bookings, scannable at entry points (`src/app/(features)/temple/access/page.tsx`).

### 🤖 **VIII. AI & Smart Features**

*   **Conversational AI ("Ask PayFriend"):**
    *   _Interface:_ Dedicated chat interface (`src/app/(features)/conversation/page.tsx`, `src/components/conversational-ui.tsx`). Can also be triggered via voice command button on home screen.
    *   _Functionality:_ Understands natural language requests for actions like "Recharge my mobile 299", "Book bus Hyd to Vizag tomorrow", "Show last 5 transactions". Parses intent and extracts entities using Genkit Flow (`conversationalActionFlow`). Asks for clarification if needed. Can potentially initiate the relevant app flow pre-filled with details.
*   **Smart Payee Suggestions:** Suggests frequent contacts when user initiates a payment (using Genkit Flow `smartPayeeSuggestionFlow`).
*   **Spending Analysis:** AI-powered analysis of transaction history to provide summaries, category breakdowns, insights, and recommendations (`src/app/(features)/analysis/page.tsx` using Genkit Flow `analyzeSpendingFlow`).
*   **AI Recharge Plan Recommendations:** Suggests best mobile plans based on past usage and available operator plans (`src/app/(features)/recharge/[type]/page.tsx` using Genkit Flow `recommendRechargePlansFlow`).
*   **AI Coupon Auto-Apply & Deal Hunter:** (Future) Automatically finds and suggests applicable coupons/offers during checkout flows.
*   **Predictive Travel Booking:** (Future) Suggests booking flights/trains based on upcoming calendar events or holidays, considering weather forecasts.
*   **Auto Split Payments:** After a group expense (paid via Zet Pay), automatically suggests splitting the bill among frequent group contacts or roommates (`src/app/(features)/pay/split/page.tsx`).
*   **Personalized Festival Offers:** (Future) Uses user's declared region/religion (optional profile settings) to highlight relevant festival offers and temple events.
*   **Smart Schedule Builder:** (Future) AI assistant helps plan trips by combining travel bookings, suggesting meal times/restaurants, and integrating work blocks from calendar.
*   **Goal-Based Financial Planning AI:** (Future) Helps users set financial goals (e.g., "Save for bike") and creates automated savings plans (linked to Digital Piggy Banks).

### 🔒 **IX. Security & Convenience**

*   **Bank-Level Security:** PCI DSS, RBI/NPCI Compliance, E2EE, Tokenization, Secure PG Integration, KYC, Fraud Detection, Audits (Implemented via backend and partner choices).
*   **App-Level Security:** Biometric/PIN App Lock, Device Binding, Session Management, App Integrity Checks, SSL Pinning, RASP (Future), Local Data Encryption, 2FA, Secure Local Storage (Keystore/Secure Enclave), Real-time Transaction Alerts.
*   **⭐ Unique Feature: Secure Vault:** Automatically saves tickets (bus, train, movie, flight), bill receipts, recharge plan details after successful transactions. User can manually upload other documents (ID proofs, insurance). All encrypted and cloud-synced (`src/app/(features)/vault/page.tsx`).
*   **⭐ Unique Feature: Emergency Mode:** One-tap activation shares current location (if permission granted), dials pre-set emergency contact (e.g., 108/102), and potentially prepares wallet for quick payment (`src/app/emergency/page.tsx`).
*   **⭐ Unique Feature: Payment Freeze Mode:** Temporarily disable UPI/Wallet payments for a set duration (e.g., 1 hour, 1 day) to prevent accidental spending (`src/app/(features)/profile/security/page.tsx` - toggle).
*   **⭐ Unique Feature: Battery-Based Lite Mode:** (Future) Detects low battery (<10%) and switches to a simplified UI focusing only on essential payments (Scan & Pay, UPI Lite) to conserve power.
*   **⭐ Unique Feature: Temporary Virtual UPI ID:** (Future) Generate a disposable UPI ID valid for 24/48 hours to receive payments without exposing the primary linked ID.
*   **⭐ Unique Feature: Self-Imposed Spending Limits:** Users can set daily/weekly/monthly spending limits for UPI or specific categories (`src/app/(features)/analysis/page.tsx` - Budget section).
*   **⭐ Unique Feature: Auto-Credit for Payment Failures:** If a payment fails but money is debited (detected via backend reconciliation/user report), app generates a support ticket automatically, shows refund ETA, and potentially offers an instant temporary credit from Zet Wallet if refund is delayed beyond SLA (e.g., T+1 days) (`src/app/(features)/pay/page.tsx` handles result display).
*   **⭐ Unique Feature: Zet Fuel Card:** (Future) A virtual prepaid card/wallet specifically for fuel payments at partner pumps. Parent can load funds for drivers/kids.
*   **⭐ Unique Feature: Zet One-Tap Auth:** (Future) If OTP is delayed during a critical transaction (e.g., booking), allow authorization via app PIN/biometric as a fallback (requires specific bank/PSP support).
*   **⭐ Unique Feature: Retry Payment with Another Method:** If a payment fails (e.g., card declined, UPI bank down), the UI seamlessly prompts the user to select an alternative method (another card, wallet, another bank account) within the same checkout flow (`src/app/(features)/pay/page.tsx` handles retry options).
*   **⭐ Unique Feature: Real-time Bank Server Status:** Displays indicators (Active/Slow/Down) next to linked bank accounts based on backend monitoring, helping users choose a reliable source for UPI payments (`src/app/(features)/balance|pay/page.tsx`).
*   **⭐ Unique Feature: Multi-device Login Alerts & Remote Logout:** (Future) Notify user on primary device if login occurs on a new device. Provide option in settings to view active sessions and log out other devices remotely.
*   **⭐ Unique Feature: Auto-Debit Manager:** Centralized place to view all active UPI Autopay mandates and potentially card-based subscriptions. Allows pausing, resuming, cancelling, and setting pre-debit notification alerts (`src/app/(features)/autopay/page.tsx`).

### ✨ **X. Other Features**

*   **Offers, Rewards & Loyalty:** Cashback, coupons, partner discounts, gamified scratch cards, tiered loyalty program (`src/app/(features)/offers|profile/rewards/page.tsx`).
*   **Referral Program:** Invite friends and earn rewards (`src/app/(features)/profile/rewards/page.tsx`).
*   **Profile & Settings:** Manage personal info, linked accounts, security settings, notification preferences, app lock, KYC status (`src/app/(features)/profile/*` pages).
*   **⭐ Unique Feature: Senior Citizen Mode:** Optional UI theme with larger fonts, simplified navigation, and prominent emergency contact options (`src/app/(features)/profile/page.tsx` - toggle).
*   **⭐ Unique Feature: Multilingual Voice Commands:** Supports voice input for key actions (recharge, pay, book bus) in multiple Indian languages (requires advanced Speech Recognition and NLU) (Integrated via Mic button).
*   **⭐ Unique Feature: 24/7 Live Human Support Chat:** Access real human support agents anytime via the in-app chat for complex issues (`src/app/(features)/support/page.tsx`).

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** Tailwind CSS, Shadcn/ui
*   **State Management:** React Context / Zustand (as needed)
*   **Backend:** Node.js, Express.js
*   **Database:** Firebase Firestore (Primary), potentially Redis for caching.
*   **Authentication:** Firebase Authentication
*   **Real-time:** Firebase Realtime Updates via WebSockets (using `ws` library on backend, custom hook on frontend)
*   **AI:** Google AI - Genkit (Gemini Models via Vertex AI)
*   **Blockchain:** (Integration Planned - specific library/platform TBD, likely Hyperledger Fabric or partner API) - Primarily for logging/audit trail.
*   **Payment Gateway:** Integration with RBI-approved PGs (e.g., Razorpay, Cashfree - requires partner setup)
*   **UPI/Banking Integration:** Via licensed PSP/Banking partners (requires partner setup)
*   **Hosting:** Vercel (Frontend), Google Cloud Run / Firebase Functions (Backend)
*   **Storage:** Firebase Storage (for user uploads like KYC docs, profile pics)

---

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Firebase Account & Project Setup (Firestore, Auth, Storage required)
*   Google Cloud Project with Vertex AI enabled (for Genkit/Gemini)
*   Service Account Keys for Firebase Admin (Backend) and Google Cloud (AI)
*   Payment Gateway & PSP Partner Credentials (for actual payments)

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

# Google AI API Key (Genkit - Ensure appropriate permissions)
# This key might be exposed client-side if calling flows directly,
# but it's safer to proxy through backend/Next.js API routes/Server Actions.
# NEXT_PUBLIC_GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY # Use with caution

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:9003/api # Default backend URL

# WebSocket URL (Ensure correct protocol ws:// or wss://)
NEXT_PUBLIC_WSS_URL=ws://localhost:9003 # Default WebSocket URL for backend server
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
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n" # Ensure newlines are correct

# Google AI API Key (for Genkit backend flows)
GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Payment Service Provider (PSP) Credentials (Examples)
PSP_API_KEY=YOUR_PSP_API_KEY
PSP_SECRET_KEY=YOUR_PSP_SECRET_KEY
PSP_WEBHOOK_SECRET=YOUR_PSP_WEBHOOK_SECRET

# Payment Gateway Credentials (Examples)
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET

# Blockchain API Endpoint (If using a separate service)
BLOCKCHAIN_API_ENDPOINT=http://localhost:5001/log # Example logging service

# JWT Secret (If using JWTs for any custom sessions)
JWT_SECRET=YOUR_STRONG_JWT_SECRET

# Other Partner API Keys (Add as needed)
# ZOMATO_API_KEY=...
# REDBUS_API_KEY=...
# BOOKMYSHOW_API_KEY=...
# CIBIL_API_KEY=...
```

### Installation & Running

1.  **Clone:** `git clone <repository-url> && cd <repo-name>`
2.  **Install Root Dependencies:** `npm install` (or `yarn`)
3.  **Install Backend Dependencies:** `cd backend && npm install` (or `yarn`) && `cd ..`
4.  **Setup `.env` files:** Create and populate `.env` in root and `backend/` as per above.
5.  **Run Backend Server:** (Terminal 1) `cd backend && npm run dev`
6.  **Run Genkit Dev Server:** (Terminal 2, from root) `npm run genkit:dev` (or `genkit:watch`)
7.  **Run Frontend Dev Server:** (Terminal 3, from root) `npm run dev`

Open [http://localhost:9002](http://localhost:9002) (or your frontend port). The backend runs on port 9003 by default.

---

## 📁 Folder Structure (Conceptual)

```
.
├── src/                 # Frontend (Next.js)
│   ├── app/             # Next.js App Router
│   │   ├── (auth)/      # Auth routes (login, signup)
│   │   ├── (features)/  # Core feature routes/pages (e.g., recharge, pay, profile, temple)
│   │   │   ├── analysis/
│   │   │   ├── autopay/
│   │   │   ├── balance/
│   │   │   ├── bills/[type]/
│   │   │   ├── bnpl/
│   │   │   ├── bookings/      # Combined or split by type (bus, train, etc.)
│   │   │   ├── cash-withdrawal/
│   │   │   ├── conversation/  # AI Chat UI
│   │   │   ├── food/          # Food ordering list
│   │   │   ├── food/[restaurantId]/ # Restaurant details
│   │   │   ├── goals/         # Savings Goals
│   │   │   ├── history/
│   │   │   ├── hyperlocal/[service]/
│   │   │   ├── live/          # Live Tracking (bus, train)
│   │   │   ├── movies/
│   │   │   ├── offers/
│   │   │   ├── offers/[id]/   # Offer Details
│   │   │   ├── passes/        # Transport passes
│   │   │   ├── pay/           # Payment confirmation screen
│   │   │   ├── pay/split/     # Bill splitting UI
│   │   │   ├── pocket-money/
│   │   │   ├── profile/       # Main profile & sub-pages (upi, cards, security, rewards)
│   │   │   ├── recharge/[type]/ # Recharge pages
│   │   │   ├── reminders/
│   │   │   ├── scan/
│   │   │   ├── send/[type]/   # Send money pages (mobile, bank)
│   │   │   ├── services/      # All Services Grid
│   │   │   ├── support/       # Live Chat
│   │   │   ├── temple/        # Temple services main page & sub-pages
│   │   │   ├── travels/       # Travel services main page & sub-pages
│   │   │   ├── upi-lite/
│   │   │   ├── vault/         # Secure Vault
│   │   │   └── vouchers/      # Gift cards, gaming vouchers
│   │   ├── api/         # Next.js API routes (minimal use preferred)
│   │   ├── emergency/   # Emergency Mode page
│   │   ├── globals.css
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Homepage / Dashboard
│   ├── components/      # Reusable UI components
│   │   ├── conversational-ui.tsx # Specific component for AI chat
│   │   └── ui/          # Shadcn/ui components
│   ├── services/        # Frontend service functions (calling backend APIs)
│   ├── ai/              # AI-related code
│   │   ├── flows/       # Genkit flows (e.g., recommend plans, analyze spending)
│   │   ├── ai-instance.ts # Genkit initialization
│   │   └── dev.ts       # Genkit development server entry
│   ├── hooks/           # Custom React hooks (useVoiceCommands, useRealtimeBalance, etc.)
│   ├── lib/             # Utils, Firebase client config, API client, WebSocket client
│   └── styles/          # Potentially other global styles
├── backend/             # Backend (Node.js/Express)
│   ├── config/          # Firebase Admin config, DB connections, Partner SDK configs
│   ├── controllers/     # Route handlers (business logic)
│   ├── middleware/      # Auth, error handling, validation, rate limiting
│   ├── models/          # Data models/schemas (if using ORM/ODM)
│   ├── routes/          # API route definitions
│   ├── services/        # Backend business logic, external API calls (PSP, Aggregators), DB interactions
│   ├── utils/           # Backend utility functions
│   └── server.js        # Main server entry point (includes WebSocket server)
├── public/              # Static assets (images, logos)
├── .env                 # Frontend env vars (DO NOT COMMIT)
├── backend/.env         # Backend env vars (DO NOT COMMIT)
├── next.config.ts       # Next.js configuration
├── package.json         # Frontend dependencies & scripts
├── backend/package.json # Backend dependencies & scripts
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration (Frontend)
```

---

## 🤝 Contributing

(Add contribution guidelines here if applicable - branching strategy, PR process, code style).

---

## 📜 License

(Specify your chosen license - e.g., MIT License).

---

*This README provides a comprehensive overview. Refer to specific files and comments for detailed implementation notes.*

