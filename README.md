# Zet Pay - Your AI-Powered Everyday Super App 🚀

**Mission:** Become the “digital remote control” for every Indian’s daily life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance into one seamless, secure, and intuitive experience, enhanced with emotion understanding and real-world integration.

**Goal:** Evolve beyond a payments app into **India’s Everyday Operating System** – a lifestyle AI, financial brain, spiritual guide, hyperlocal commerce engine, and personal wellness & emotion-aware tool.

## ✨ Core Features & How They Work

This section details the primary functionalities of the Zet Pay app, grouped by category.

### 💳 **I. Payments & Wallet**

*   **UPI Payments:**
    *   _Send to Contact:_ Select a saved contact (synced with phone/app contacts) and enter the amount. App uses the contact's primary UPI ID or prompts selection if multiple exist. Verification before sending. (`src/app/(features)/send/mobile/page.tsx`)
    *   _Send to Bank/UPI ID:_ Manually enter the recipient's UPI ID or Bank Account + IFSC code. App verifies the UPI ID/Account Holder name before proceeding. (`src/app/(features)/send/bank/page.tsx`)
    *   _Scan & Pay:_ Uses the device camera (`src/app/(features)/scan/page.tsx`) to scan any UPI QR code. Decodes the QR data (payee UPI ID, name, amount if present) and pre-fills the payment confirmation screen (`src/app/(features)/pay/page.tsx`). Supports QR code upload from gallery.
    *   _Receive Money (My QR):_ Displays user's static UPI QR code for others to scan and pay (`src/app/(features)/scan/page.tsx` - My QR Tab).
    *   _Payment Confirmation:_ User reviews details (Payee Name, UPI ID, Amount) and authorizes payment via UPI PIN (handled securely via PSP SDK/backend integration). (`src/app/(features)/pay/page.tsx`)
*   **Wallet:**
    *   _Top-up:_ Add funds to the Zet Pay wallet using UPI, Net Banking, or Debit/Credit Card via integrated Payment Gateways (`src/services/wallet.ts` interacts with backend `/wallet/topup`).
    *   _Management:_ View current balance (updated in real-time via WebSocket `useRealtimeBalance` hook) and transaction history specific to the wallet. (`src/app/page.tsx`, `src/app/(features)/history/page.tsx`)
    *   _Pay via Wallet:_ Use wallet balance as a payment source for recharges, bills, bookings, or P2P transfers (`src/services/wallet.ts` interacts with backend `/wallet/pay`).
*   **UPI Lite:**
    *   _Enable/Disable:_ Users can enable UPI Lite via their linked bank account (if supported) (`src/services/upiLite.ts`, `src/app/(features)/upi-lite/page.tsx`). Balance is stored on-device/SIM.
    *   _Top-up:_ Add funds (up to ₹2000) from the linked bank account to the UPI Lite balance (`src/services/upiLite.ts`, `src/app/(features)/upi-lite/page.tsx`).
    *   _Payment:_ Make small-value payments (up to ₹500) instantly without UPI PIN (`src/services/upiLite.ts`).
*   **UPI Autopay (Mandates):**
    *   _Setup:_ Users authorize merchants (e.g., Netflix, SIPs) for recurring debits up to a certain limit and frequency (`src/services/autopay.ts`, `src/app/(features)/autopay/page.tsx`). Requires UPI PIN authorization.
    *   _Management:_ View active/paused/cancelled mandates. Pause, resume, or cancel mandates (`src/app/(features)/autopay/page.tsx`, `src/services/autopay.ts`).
*   **Debit/Credit Card Payments:**
    *   _Save Cards:_ Securely save card details (tokenized via backend/PG) for faster checkouts (`src/services/cards.ts`, `src/app/(features)/profile/cards/page.tsx`).
    *   _Pay Bills/Shop:_ Use saved cards (requires CVV and potentially OTP/3D Secure via PG) for various payments (`src/services/paymentGatewayService.ts`).
    *   _Bill Payments:_ Pay credit card bills for any bank by entering card number and amount (`src/app/(features)/bills/credit-card/page.tsx`).
*   **Pay Later (BNPL):**
    *   _Activation:_ Eligible users activate Pay Later facility provided by partner NBFC/Bank (`src/services/bnpl.ts`).
    *   _Usage:_ Use BNPL credit limit for eligible transactions (UPI, bills, etc.).
    *   _Billing & Repayment:_ Receive monthly statements and repay the due amount via UPI, Wallet, or Bank transfer (`src/app/(features)/bnpl/page.tsx`).
*   **⭐ Unique Feature: Smart Wallet Bridge (UPI Limit Resolver):**
    *   _Problem:_ User hits UPI daily limit (₹1 Lakh).
    *   _Zet Fix:_ If enabled by user (KYC verified, toggle ON in Profile Settings) and payment amount is within fallback limit (e.g., ₹5k), the app automatically uses the Zet Pay wallet balance to complete the transaction instantly. (`src/app/(features)/profile/security/page.tsx`, `backend/controllers/upiController.js`)
    *   _Recovery:_ The backend schedules a recovery task. After midnight (when UPI limit resets), it attempts to auto-debit the used amount from the user's primary linked bank account and credit it back to their Zet Pay wallet (`src/services/recoveryService.ts`, `backend/services/recoveryService.ts`).
    *   _User Experience:_ Payment succeeds seamlessly. User gets notified about the fallback and recovery.
*   **⭐ Unique Feature: Cardless Cash Withdrawal:**
    *   _Process:_ User finds nearby "Zet Agents" (partner shops) on a map (`src/app/(features)/cash-withdrawal/page.tsx`). User selects agent, enters amount. App generates a secure OTP and a QR code (`src/services/cash-withdrawal.ts`). User shows OTP/QR to agent. Agent verifies via their app, dispenses cash. Funds deducted from user's wallet/linked account.
    *   _Security:_ Time-bound OTP/QR, agent verification needed.

### 📱 **II. Recharge & Bill Payments**

*   **Mobile Recharge (Prepaid/Postpaid):**
    *   _Operator/Circle Detection:_ Auto-detects operator (Jio, Airtel, etc.) and region based on entered mobile number (`src/app/(features)/recharge/mobile/page.tsx`). User can manually override.
    *   _Plan Browser:_ Fetches and displays available plans categorized (Recommended, Data, Unlimited, etc.) from backend/aggregator (`src/services/recharge.ts`). Includes plan details (price, validity, data, SMS, talktime). (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _AI Recommendations:_ Suggests plans based on user's past recharge history and inferred usage patterns (using Genkit Flow `recommendRechargePlans`). (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Plan Comparison:_ Allows selecting multiple plans to view side-by-side details. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Tariff Details Modal:_ Shows detailed breakdown of plan benefits. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Validity Tracking:_ Shows current plan expiry date (mocked). (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Balance Check:_ Verify current balance before recharge (requires operator integration). (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Quick Recharge:_ Option to quickly recharge recent numbers or saved contacts. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Family Recharges:_ Manage and recharge multiple family numbers easily (UI integration). (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Scheduled Recharges:_ Set up automatic recharges for specific dates/frequencies. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Recharge Reminders:_ Get notifications before plan expiry. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Recharge History:_ Integrated with main transaction history (`src/app/(features)/history/page.tsx`).
    *   _Activation Status Check:_ Button to check status of processing recharges (mocked). (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Special Offers Section:_ Displays operator-specific offers. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Roaming Packs Tab:_ Category for international roaming plans. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Top-up Vouchers Section:_ Browse and select talktime/other top-up vouchers. (`src/app/(features)/recharge/[type]/page.tsx`)
    *   _Postpaid Bill Payment:_ Pay postpaid mobile bills via the same interface (`src/app/(features)/bills/mobile-postpaid/page.tsx`).
*   **DTH Recharge:** Select operator, enter Customer ID, browse/select plan or enter amount, pay. (`src/app/(features)/recharge/dth/page.tsx`)
*   **FASTag Recharge:** Select issuer bank, enter vehicle number, enter amount, pay. (`src/app/(features)/recharge/fastag/page.tsx`)
*   **Utility Bills (Electricity, Water, Gas, Broadband, etc.):**
    *   Select provider/biller.
    *   Enter Consumer ID/Account Number.
    *   App fetches bill amount (if supported) or user enters manually (`src/services/bills.ts`, `src/app/(features)/bills/[type]/page.tsx`).
    *   Pay the bill. Includes Prepaid Electricity recharge (`src/app/(features)/recharge/electricity/page.tsx`).
*   **Other Payments:** Loan EMIs (`/bills/loan`), Insurance Premiums (`/insurance/[type]`), Education Fees (`/bills/education`), Subscriptions (OTT) (`/bills/subscription`), Metro Card Recharge (`/recharge/metro`), Data Card (`/recharge/datacard`), Intl. Calling Cards (`/recharge/isd`), Cable TV (`/cable-tv`), Housing Society (`/housing-society`), Club Fees (`/club-fees`), Traffic Challan (`/challan`), Property Tax (`/property-tax`).
*   **⭐ Unique Feature: Recharge Undo:** Within a short window (e.g., 30 minutes), user can request cancellation of a potentially wrong mobile/DTH recharge if the recharge hasn't already been consumed/processed fully by the operator (`src/services/recharge.ts` - `cancelRechargeService`). (`src/app/(features)/recharge/[type]/page.tsx`)
*   **⭐ Unique Feature: Bill Reminders:** Manually add reminders or let the app auto-detect upcoming due dates from bill fetch history (`src/app/(features)/reminders/page.tsx`). Sends push notifications.

### 🚌 **III. Travel & Transit**

*   **Bus/Train/Flight Booking:**
    *   _Search:_ Enter origin, destination, date. App fetches options from partners (`src/services/booking.ts`).
    *   _Selection:_ Filter/sort results. Select seats/berths/flights. View details. (`src/app/(features)/travels/[type]/page.tsx`)
    *   _Payment:_ Pay via Wallet/UPI/Card/BNPL.
    *   _Booking Confirmation:_ App confirms with provider, generates Ticket/PNR. Tickets saved in Secure Vault.
*   **Car/Bike Rentals:**
    *   _Search & Book:_ Select location, date/time, duration, vehicle type (self-drive/chauffeur). View vehicles, pricing, book and pay. (`src/app/(features)/rent-vehicle/page.tsx`)
    *   _KYC/License:_ In-app upload and verification.
*   **Live Tracking:**
    *   _Bus/Train Status:_ Enter service/train number. App fetches real-time location, ETA, delays (`src/services/liveTracking.ts`). Displays status like APSRTC/WhereIsMyTrain (`src/app/(features)/live/bus|train/page.tsx`).
*   **EV Charging & Highway Rest Stops:**
    *   _Finder:_ Map-based search for nearby EV stations or highway rest stops (`src/app/(features)/travels/ev-charging|rest-stop/page.tsx`).
    *   _Info & Booking:_ View details (connector type, price, amenities) and potentially pre-book slots/services.
*   **Transit & Toll Payments:**
    *   _Metro Recharge:_ Top-up metro cards for various cities (`src/app/(features)/recharge/metro/page.tsx`).
    *   _Bus Pass:_ Apply for and manage bus passes (`src/app/(features)/passes/bus/page.tsx`, `src/app/(features)/passes/my-passes/page.tsx`).
    *   _Toll Payments:_ Linked with FASTag recharge.
*   **⭐ Unique Feature: Family Travel Mode:** (Planned) Centralized booking and payment for family members.
*   **⭐ Unique Feature: Smart Itinerary Auto-Creation:** (Planned) Generates itinerary PDF from bookings, syncs to Google Calendar.
*   **⭐ Unique Feature: AI Travel Assistant:** Conversational AI to plan trips, find options, initiate bookings (`src/app/(features)/travels/assistant/page.tsx`).
*   **⭐ Unique Feature: Full Trip Refund Protection:** (Planned) Optional travel insurance add-on.
*   **⭐ Unique Feature: Sleep Cycle Alarms:** (Planned) Integrates travel ETAs with user's sleep cycle for smarter wake-up alarms.
*   **⭐ Unique Feature: Emergency Travel Assistance:** (Planned) Roadside assistance, medical help integration (`src/app/(features)/travels/assistance/page.tsx`).

### 💰 **IV. Financial Services**

*   **Investment (Mutual Funds, Digital Gold, Stocks):**
    *   _Browse & Select:_ Explore MFs/Stocks or check Gold price (`src/services/investmentProviderService.ts`).
    *   _Invest/Buy/Sell:_ Initiate SIP/Lumpsum MF investments, Buy/Sell Digital Gold, or trade stocks. Requires linked bank account and KYC (`src/app/(features)/mutual-funds|gold|stocks/page.tsx`).
*   **Deposits (FD/RD):** Browse schemes and book Fixed or Recurring Deposits with partner banks (`src/app/(features)/deposits/page.tsx`).
*   **Loans (Personal & Micro):**
    *   _Micro-Loans:_ Eligibility check based on app usage. Apply for small loans (0% interest if repaid quickly) (`src/services/loans.ts`). (`src/app/(features)/pocket-money/page.tsx`)
    *   _Study Now, Pay Later (SNPL):_ Specific micro-loan for education fees. (`src/app/(features)/pocket-money/page.tsx`)
    *   _Personal Loans:_ View pre-approved offers from partners and apply (`src/app/(features)/loans/page.tsx`).
*   **Credit Score:** Check credit score and report via integration with credit bureaus (`src/app/(features)/credit-score/page.tsx`).
*   **⭐ Unique Feature: Digital Pocket Money:**
    *   _Setup:_ Parent links child's profile. Sets allowance, spending limits, optional link to school biller (`src/services/pocket-money.ts`, `src/app/(features)/pocket-money/page.tsx`).
    *   _Usage:_ Child gets a virtual balance. Parent can top-up. Child uses balance for allowed payments. Micro-loan/SNPL integration.
    *   _School Fees Link:_ Parent can directly pay linked school fees, potentially using SNPL. (`src/app/(features)/pocket-money/page.tsx`)
*   **⭐ Unique Feature: Digital Piggy Banks / Goal-Based Savings:**
    *   Set savings goals (e.g., "Trip to Goa - ₹20k").
    *   Set up rules for auto-saving (round-up, daily transfer). AI helps create/track plans (`src/app/(features)/goals/page.tsx`).

### 🎬 **V. Entertainment & Events**

*   **Movie/Event/Comedy/Sports Tickets:**
    *   _Browse:_ View listings by city, date, genre (`src/app/(features)/movies|entertainment/*`).
    *   _Book:_ Select showtime/event, choose seats (interactive map), pay (`src/app/(features)/movies/page.tsx`, `/entertainment/events|sports|comedy/page.tsx`). Tickets saved in Vault.
*   **OTT Subscriptions:** Managed via Bill Payments (`src/app/(features)/bills/subscription/page.tsx`).
    *   _⭐ Unique Feature: Subscription Manager:_ View/manage all detected subscriptions, set reminders, pause/resume (if supported). (`src/app/(features)/subscription-manager/page.tsx`).
*   **Game Zones / Amusement Parks:** Browse nearby venues and book tickets/slots (`src/app/(features)/entertainment/gamezone/page.tsx`).
*   **⭐ Unique Feature: AR/VR Event Viewing:** (Planned) Integration with AR/VR platforms for select events (`src/app/(features)/entertainment/arvr/page.tsx`).
*   **⭐ Unique Feature: Group Booking & Split:** Initiate group movie/event bookings, invite friends, auto-split cost (`src/app/(features)/entertainment/group/page.tsx`).
*   **⭐ Unique Feature: Regional Event Discovery:** Uses location/preferences to highlight local fairs, festivals, workshops (`src/app/(features)/entertainment/discover/page.tsx`).
*   **⭐ Unique Feature: Watch Party:** (Planned) Schedule virtual watch parties (`src/app/(features)/entertainment/watchparty/page.tsx`).

### 🛍️ **VI. Food & Hyperlocal Services**

*   **Online Food Ordering (Zomato/Swiggy Style):**
    *   _Browse:_ View restaurants nearby, filter by cuisine, rating, price, offers (`src/app/(features)/food/page.tsx`).
    *   _Menu & Cart:_ Select items from interactive menu, customize, add to cart (`src/app/(features)/food/[restaurantId]/page.tsx`).
    *   _Order & Pay:_ Confirm order, apply coupons, pay. Track live order status.
*   **Hyperlocal Services (Electrician, Plumber, Cleaning, Laundry, Courier, Car Wash, Tailoring, Pet Care, Salon/Barber, AC Repair):**
    *   _Find & Book:_ Search for service type by location. View providers. Book slots (`src/app/(features)/hyperlocal/*` pages).
    *   _Payment:_ Pay estimated cost upfront or after service.
*   **Coworking Space Booking:** Find and book desks/meeting rooms (`src/app/(features)/hyperlocal/coworking/page.tsx`).
*   **Parking Payments & Slot Booking:** Find nearby parking, view availability/pricing, pay digitally, potentially pre-book slots (`src/app/(features)/parking/page.tsx`).

### 🛕 **VII. Temple & Spiritual Services**

*   **Darshan Slot Booking:** Search slots, book, pay fees (`src/app/(features)/temple/darshan/page.tsx`).
*   **Live Darshan Videos:** Embed live feeds from official channels (`src/app/(features)/temple/live/page.tsx`).
*   **Virtual Pooja Booking:** Select temple/pooja, provide details, book remote participation (`src/app/(features)/temple/pooja/page.tsx`).
*   **Prasadam Delivery:** Browse, add to cart, provide address, pay (`src/app/(features)/temple/prasadam/page.tsx`).
*   **Temple Donations:** Select temple/scheme, enter details, pay securely (`src/app/(features)/temple/donate/page.tsx`).
*   **Info & Audio:** Access timings, queue estimates, Aarti/Mantra audio (`src/app/(features)/temple/info|audio/page.tsx`).
*   **Events & Accommodation:** Browse festivals/yatras. Find info on nearby stays (`src/app/(features)/temple/events|accommodation/page.tsx`).
*   **⭐ Unique Feature: Smart Access Pass:** Generated QR code for confirmed Darshan/Pooja bookings (`src/app/(features)/temple/access/page.tsx`).
*   **⭐ Unique Feature: Group Visit Requests:** Submit requests for large group visits (`src/app/(features)/temple/group/page.tsx`).
*   **⭐ Unique Feature: AI Queue Prediction:** (Planned) Predict wait times using AI (`src/app/(features)/temple/info/page.tsx`).
*   **⭐ Unique Feature: AR Temple View:** (Planned) View temple structure/queue in AR.

### ⚕️ **VIII. Healthcare & Wellness**

*   **Doctor Appointments:** Find doctors, book appointments (`src/app/(features)/healthcare/doctor/page.tsx`).
*   **Video Consultation:** Consult doctors remotely via video call (`src/app/(features)/healthcare/video-consult/page.tsx`).
*   **Lab Tests:** Book diagnostic tests, schedule home sample collection (`src/app/(features)/healthcare/lab/page.tsx`).
*   **Order Medicines:** Upload prescription or search for medicines for delivery (`src/app/(features)/healthcare/pharmacy/page.tsx`).
*   **Medicine Subscription:** Set up recurring orders for regular medicines (`src/app/(features)/healthcare/med-subscription/page.tsx`).
*   **Hospital Beds/OPD:** Check availability and book slots (`src/app/(features)/healthcare/hospital/page.tsx`).
*   **Emergency Ambulance:** Book emergency medical transport (`src/app/(features)/healthcare/ambulance/page.tsx`).
*   **Fitness Trainers:** Find and book sessions (`src/app/(features)/healthcare/fitness/page.tsx`).
*   **Health Wallet:** Securely store prescriptions, reports, etc. (`src/app/(features)/healthcare/wallet/page.tsx`).
*   **Health Packages & Offers:** Browse preventive checkup packages (`src/app/(features)/healthcare/offers/page.tsx`).

### 🤖 **IX. AI & Smart Features**

*   **Conversational AI ("Ask PayFriend"):**
    *   _Interface:_ Dedicated chat interface (`src/app/(features)/conversation/page.tsx`). Voice command capable.
    *   _Functionality:_ Understands natural language requests (recharge, book bus/movie, check balance/history). Parses intent using Genkit Flow (`conversationalActionFlow`). Initiates relevant app flow or provides info.
*   **Smart Payee Suggestions:** Suggests frequent contacts for payments (Genkit Flow `smartPayeeSuggestionFlow`).
*   **Spending Analysis:** AI-powered analysis of transaction history (`src/app/(features)/analysis/page.tsx` using Genkit Flow `analyzeSpendingFlow`). Provides summary, insights, recommendations.
*   **AI Recharge Plan Recommendations:** Suggests best mobile plans (Genkit Flow `recommendRechargePlansFlow`). (`src/app/(features)/recharge/[type]/page.tsx`)
*   **⭐ Unique Feature: AI Coupon Auto-Apply & Deal Hunter:** (Planned) Automatically finds and suggests coupons/offers during checkout.
*   **⭐ Unique Feature: Predictive Travel Booking:** (Planned) Suggests booking flights/trains based on calendar/holidays/weather.
*   **⭐ Unique Feature: Auto Split Payments:** (Planned) Suggests splitting bills among frequent group contacts after an expense (`src/app/(features)/pay/split/page.tsx`).
*   **⭐ Unique Feature: Smart Schedule Builder:** (Planned) AI assistant helps plan trips combining bookings, meals, work blocks.
*   **⭐ Unique Feature: Goal-Based Financial Planning AI:** (Planned) Helps set goals and creates automated savings plans (linked to Digital Piggy Banks). (`src/app/(features)/goals/page.tsx`)
*   **⭐ Unique Feature: AI Queue Prediction (Temple):** (Planned) Predict wait times based on historical data and real-time inputs (`src/app/(features)/temple/info/page.tsx`).
*   **⭐ Unique Feature: AI Gifting Assistant:** (Planned) Helps choose gifts based on occasion, recipient, budget (`src/app/(features)/ai-gifting/page.tsx`).

### 🔒 **X. Security & Convenience**

*   **Bank-Level Security:** PCI DSS, RBI/NPCI Compliance, E2EE, Tokenization, Secure PG Integration, KYC, Fraud Detection, Audits.
*   **App-Level Security:** Biometric/PIN App Lock, Device Binding, Session Management, App Integrity Checks (Root/Jailbreak/Emulator detection), SSL Pinning, RASP (Future), Local Data Encryption, 2FA, Secure Local Storage (Keystore/Secure Enclave), Real-time Transaction Alerts.
*   **⭐ Unique Feature: Secure Vault:** Auto-saves tickets, receipts, plans. Allows manual upload. Encrypted & cloud-synced (`src/app/(features)/vault/page.tsx`).
*   **⭐ Unique Feature: Emergency Mode:** One-tap activation shares location, dials emergency contact, prepares wallet (`src/app/emergency/page.tsx`).
*   **⭐ Unique Feature: Payment Freeze Mode:** Temporarily disable UPI/Wallet payments via toggle in security settings (`src/app/(features)/profile/security/page.tsx`).
*   **⭐ Unique Feature: Battery-Based Lite Mode:** (Planned) Detects low battery (&lt;10%) and switches to simplified essential payments UI.
*   **⭐ Unique Feature: Temporary Virtual UPI ID:** (Planned) Generate a disposable UPI ID valid for 24/48 hours for privacy.
*   **⭐ Unique Feature: Self-Imposed Spending Limits:** Users set daily/weekly/monthly spending limits on UPI/Wallet (`src/app/(features)/analysis/page.tsx` - Budget section).
*   **⭐ Unique Feature: Auto-Credit for Payment Failures:** Auto-generates support ticket for failed but debited payments, shows ETA, offers temporary wallet credit if refund delayed (`src/app/(features)/pay/page.tsx`).
*   **⭐ Unique Feature: Zet Fuel Card:** (Planned) Virtual prepaid card/wallet specifically for fuel payments.
*   **⭐ Unique Feature: Zet One-Tap Auth:** (Planned) Use app PIN/biometric as fallback if OTP is delayed during critical transactions.
*   **⭐ Unique Feature: Retry Payment with Another Method:** Seamlessly prompts alternative payment methods on failure (`src/app/(features)/pay/page.tsx`).
*   **⭐ Unique Feature: Real-time Bank Server Status:** Displays indicators (Active/Slow/Down) for linked accounts (`src/app/(features)/balance|pay/page.tsx`).
*   **⭐ Unique Feature: Multi-device Login Alerts & Remote Logout:** (Planned) Notifies primary device of new logins, allows remote logout.
*   **⭐ Unique Feature: Auto-Debit Manager:** Centralized view of mandates and subscriptions (`src/app/(features)/autopay/page.tsx`). Get alerts before deduction.

### ✨ **XI. Other Features**

*   **Offers, Rewards & Loyalty:** Cashback, coupons, partner discounts, scratch cards, loyalty program (`src/app/(features)/offers|profile/rewards/page.tsx`).
*   **Referral Program:** Invite friends, earn rewards (`src/app/(features)/profile/rewards/page.tsx`).
*   **Profile & Settings:** Manage info, accounts, security, notifications, app lock, KYC status (`src/app/(features)/profile/*` pages).
*   **⭐ Unique Feature: Senior Citizen Mode:** Optional UI theme with larger fonts, simplified navigation (`src/app/(features)/profile/page.tsx` - toggle).
*   **⭐ Unique Feature: Multilingual Voice Commands:** Supports voice input in multiple Indian languages (Integrated via Mic button). (`src/app/page.tsx`, `src/hooks/useVoiceCommands.ts`)
*   **⭐ Unique Feature: 24/7 Live Human Support Chat:** Access real human support agents anytime via in-app chat (`src/app/(features)/support/page.tsx`).

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** Tailwind CSS, Shadcn/ui
*   **State Management:** React Context / Zustand (as needed)
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** Firebase Firestore (Primary), potentially Redis for caching.
*   **Authentication:** Firebase Authentication
*   **Real-time:** WebSocket (using `ws` library on backend, custom hook/lib on frontend)
*   **AI:** Google AI - Genkit (Gemini Models via Vertex AI)
*   **Blockchain:** (Placeholder) Integration with Hyperledger Fabric or similar for logging/audit trail (via `backend/services/blockchainLogger.ts`).
*   **Payment Gateway:** Integration with RBI-approved PGs (e.g., Razorpay, Cashfree) (via `backend/services/paymentGatewayService.js`).
*   **UPI/Banking Integration:** Via licensed PSP/Banking partners (via `backend/services/upiProviderService.js`).
*   **Hosting:** Vercel (Frontend), Google Cloud Run / Firebase Functions (Backend)
*   **Storage:** Firebase Storage (for user uploads like KYC docs, profile pics, vault items)

---

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Firebase Account & Project Setup (Firestore, Auth, Storage required)
*   Google Cloud Project with Vertex AI enabled (for Genkit/Gemini)
*   Service Account Keys for Firebase Admin (Backend) and Google Cloud (AI)
*   Payment Gateway & PSP Partner Credentials (for actual payments)
*   API Keys for any third-party services (Travel, Movies, Food Aggregators, etc.)

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

# Google AI API Key (Genkit - Ensure appropriate permissions if needed client-side)
# Use backend proxy or Server Actions for secure calls unless specifically for client use
# NEXT_PUBLIC_GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Backend API URL (Change if backend runs on a different port/host)
NEXT_PUBLIC_API_BASE_URL=http://localhost:9003/api # Default backend URL

# WebSocket URL (Ensure correct protocol ws:// or wss://)
NEXT_PUBLIC_WSS_URL=ws://localhost:9003 # Default WebSocket URL for backend server

# Other Public Keys (e.g., Mapbox, Google Maps client-side keys)
# NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_PUBLIC_TOKEN
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_CLIENT_SIDE_KEY
```

**Backend Directory (`backend/.env`):**
```env
# Server Port
PORT=9003

# Firebase Admin SDK Configuration (Choose ONE method)
# Method 1: Service Account File Path (Recommended for local dev)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/firebaseServiceAccountKey.json

# Method 2: Service Account Environment Variables (Suitable for deployment)
# Ensure private key format is correct (replace \\n with actual newlines if pasting directly)
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_WITH_NEWLINES\n-----END PRIVATE KEY-----\n"

# Google AI API Key (for Genkit backend flows)
GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Payment Service Provider (PSP) Credentials (Examples)
PSP_API_KEY=YOUR_PSP_API_KEY
PSP_SECRET_KEY=YOUR_PSP_SECRET_KEY
PSP_WEBHOOK_SECRET=YOUR_PSP_WEBHOOK_SECRET

# Payment Gateway Credentials (Examples)
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY

# Blockchain API Endpoint (If using a separate service)
BLOCKCHAIN_API_ENDPOINT=http://localhost:5001/log # Example logging service

# JWT Secret (If using JWTs for custom sessions)
JWT_SECRET=YOUR_STRONG_JWT_SECRET

# Travel Aggregator API Keys (Examples)
REDBUS_API_KEY=YOUR_REDBUS_API_KEY
AMADEUS_API_KEY=YOUR_AMADEUS_API_KEY
IRCTC_PARTNER_KEY=YOUR_IRCTC_PARTNER_KEY # (If applicable)
FLIGHT_AGGREGATOR_SECRET=YOUR_FLIGHT_AGGREGATOR_SECRET

# Movie/Event API Keys (Examples)
BOOKMYSHOW_API_KEY=YOUR_BMS_API_KEY
EVENTBRITE_API_KEY=YOUR_EVENTBRITE_API_KEY

# Food Aggregator API Keys (Examples)
ZOMATO_API_KEY=YOUR_ZOMATO_API_KEY
# SWIGGY_API_KEY=... (Often not publicly available)

# Credit Score Bureau API Keys (Examples)
CIBIL_API_KEY=YOUR_CIBIL_API_KEY

# Other Partner API Keys (Add as needed)
# E.g., KYC Provider, Loan Partner, Insurance Aggregator
# KYC_PROVIDER_KEY=...
# LOAN_PARTNER_SECRET=...
# INSURANCE_AGGREGATOR_ID=...
```

### Installation & Running

1.  **Clone:** `git clone <repository-url> && cd <repo-name>`
2.  **Install Root Dependencies:** `npm install` (or `yarn`)
3.  **Install Backend Dependencies:** `cd backend && npm install` (or `yarn`) && `cd ..`
4.  **Setup `.env` files:** Create and populate `.env` in root and `backend/` as per above. Ensure Firebase credentials are correct.
5.  **Run Backend Server:** (Terminal 1) `cd backend && npm run dev`
6.  **Run Genkit Dev Server:** (Terminal 2, from root) `npm run genkit:dev` (or `genkit:watch`)
7.  **Run Frontend Dev Server:** (Terminal 3, from root) `npm run dev`

Open [http://localhost:9002](http://localhost:9002) (or your frontend port). The backend runs on port 9003 by default.

---

## 📁 Folder Structure (High-Level)

```
.
├── src/                 # Frontend (Next.js)
│   ├── app/             # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── (auth)/      # Auth routes
│   │   ├── (features)/  # Core feature routes/pages (e.g., recharge, pay, history)
│   │   ├── api/         # Frontend API routes (minimal use preferred)
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
│   ├── controllers/     # Route handlers (API logic)
│   ├── middleware/      # Auth, error handling, validation, rate limiting
│   ├── models/          # Data models/schemas (if using ORM/ODM)
│   ├── routes/          # API route definitions
│   ├── services/        # Backend business logic, external API calls, DB interactions
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

(Add contribution guidelines here - e.g., branching strategy (Gitflow), PR process, code style (Prettier/ESLint), testing approach).

---

## 📜 License

(Specify your chosen license - e.g., MIT License).

---

*This README provides a comprehensive overview. Refer to specific files and comments for detailed implementation notes.*
```