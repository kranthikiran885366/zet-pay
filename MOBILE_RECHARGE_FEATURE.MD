
# Zet Pay Super App: Mobile Recharge Feature Documentation

This document provides a comprehensive overview of the Mobile Recharge feature within the Zet Pay application, detailing its functionalities, user interface flow, and technical implementation, considering a transition from simulation to a real-world application.

## 1. Introduction

The Mobile Recharge feature allows users to easily top-up their prepaid mobile connections or pay their postpaid mobile bills for various operators across India. It aims to provide a seamless and quick experience, incorporating smart features like operator auto-detection and plan recommendations.

## 2. Core Functionalities

### 2.1. Operator & Circle Auto-Detection
-   **Functionality:** When a user enters a 10-digit mobile number, the system attempts to automatically detect the telecom operator and the telecom circle.
-   **Implementation (Real World):**
    -   Frontend (`src/app/(features)/recharge/[type]/page.tsx`) captures the mobile number.
    -   Calls a backend API endpoint (`POST /api/recharge/detect-operator`).
    -   Backend service (`rechargeProviderService.js`) would query a **Telecom API Provider** (e.g., via a partner like PaySprint, or a specialized MNP lookup service using `process.env.TELECOM_API_URL` and `process.env.TELECOM_API_KEY`) to get accurate operator and circle information. This data is often cached (e.g., using Redis) to reduce API calls for common prefixes.
-   **User Feedback:** Detected operator and circle are displayed. Manual override is available.

### 2.2. Manual Operator & Circle Selection
-   **Functionality:** If auto-detection fails or for user preference, manual selection from a list.
-   **Implementation:**
    -   Frontend fetches available operators for "Mobile" or "Mobile Postpaid" from backend (`GET /api/recharge/billers?type=Mobile`).
    -   Backend service (`rechargeProviderService.js`) provides this list, sourced from the **Recharge API Provider** (e.g., using `process.env.RECHARGE_API_PROVIDER_URL`) and cached in **Redis**.

### 2.3. Recharge Plan Browsing & Selection (For Prepaid)
-   **Functionality:** Users browse plans for the selected operator/circle. Includes categories, search, plan details, comparison.
-   **Implementation:**
    -   Frontend fetches plans from `GET /api/recharge/plans?billerId=...`.
    *   Backend service (`rechargeProviderService.js`) fetches real-time plans from the **Recharge API Provider** (e.g., BBPS, PaySprint, using `process.env.RECHARGE_API_PROVIDER_URL`). This data is cached in **Redis** with a short TTL (e.g., 10-30 minutes) due to plan volatility.
    *   UI elements (tabs, search, modals) for plan interaction.

### 2.4. Bill Fetching (For Postpaid)
-   **Functionality:** Auto-fetches outstanding bill amount, due date, customer name for postpaid numbers.
-   **Implementation:**
    *   Frontend (`/src/app/(features)/bills/mobile-postpaid/page.tsx`) calls `GET /api/bills/details/mobile-postpaid/:identifier?billerId=...`.
    *   Backend controller (`billsController.js`) and service (`billProviderService.js`) query the **Bill Fetch API (e.g., BBPS via an aggregator like Euronet or directly via Recharge API Provider)** for real-time bill details.

### 2.5. Manual Amount Entry
-   **Functionality:** Users can directly enter an amount.
-   **Implementation:** Standard input field.

### 2.6. Payment Processing
-   **Functionality:** Users pay using Zet Pay Wallet, UPI, Credit/Debit Card, Net Banking, or BNPL.
-   **Implementation:**
    *   Frontend collects payment details and calls `POST /api/recharge` or `POST /api/bills/pay/mobile-postpaid`.
    *   Backend controllers (`rechargeController.js`, `billsController.js`) integrate with a **Real Payment Gateway** (e.g., Razorpay, Cashfree, using keys like `process.env.PAYMENT_GATEWAY_KEY_ID`).
        *   If Wallet: Deduct from user's Firestore wallet balance (atomic operation).
        *   If UPI/Card/NetBanking: Initiate payment flow via Payment Gateway SDK/API. Handle success/failure webhooks from the gateway.
    *   Upon successful payment deduction, call the **Recharge API Provider** (e.g., PaySprint, BBPS) to execute the actual recharge using their API.

### 2.7. Transaction Logging & Status Updates
-   **Functionality:** All attempts logged. Real-time status updates.
-   **Implementation:**
    *   Backend uses `transactionLogger.ts` to save details to **Firestore**.
    *   **Blockchain Logging** (`blockchainLogger.ts`) logs a hash of key transaction details to a chosen blockchain (see Section 6.4).
    *   Backend sends real-time status updates via **WebSockets** (or a production-grade system like Socket.IO/Pusher/FCM for larger scale).

### 2.8. Recharge/Bill Payment History
-   **Functionality:** View past payments.
-   **Implementation:** Part of `/history` feature, fetching from `transactions` collection in Firestore.

### 2.9. Reminder Notifications
-   **Functionality:** Notify for postpaid bill due dates.
-   **Implementation:**
    *   Backend saves reminders to Firestore (`POST /api/reminders`).
    *   A **Scheduled Worker/Cron Job** (see Section 6.3) checks `reminders` collection and sends notifications via **Firebase Cloud Messaging (FCM)** using `process.env.FCM_SERVER_KEY`, or SMS/Email gateways.

---

## 3. Advanced Features

### 3.1. Auto-Pay Setup (For Postpaid)
-   **Functionality:** Set up automatic debit for monthly postpaid bills.
-   **Implementation:**
    *   Frontend UI for setup.
    *   Backend integrates with **Payment Gateway/PSP** to create UPI Autopay mandates or card-based recurring payments. Securely store mandate/token references.

### 3.2. AI Plan Recommendations (For Prepaid)
-   **Functionality:** AI suggests best recharge plans.
-   **Implementation (Real-World):**
    *   **Data Source:** User's transaction history (mobile recharges) from Firestore. Current operator plans fetched live from Recharge API Provider.
    *   **Processing (Genkit + Gemini + Vector DB):**
        *   A Genkit flow (`src/ai/flows/recharge-plan-recommendation.ts`) takes `userId` and `currentOperator` as input.
        *   **Tool 1 (Genkit Tool):** Fetches user's last 3-5 recharge details (amount, data, validity) from the `transactions` collection in Firestore.
        *   **Tool 2 (Genkit Tool):** Fetches current popular/all plans for the `currentOperator` from the `rechargeProviderService.js` (which uses Redis cache and the real Recharge API Provider).
        *   The Genkit flow passes this consolidated data (user history + current plans) to a Gemini model via `ai.generate`.
        *   **Prompt Engineering:** The prompt instructs Gemini to act as a "Telecom Advisor", analyze usage patterns (e.g., data consumption, validity preference, price sensitivity from history) and compare against current available plans to recommend the top 2-3 matches with clear reasoning.
        *   **Optional Vectorization:** For very large plan sets or more nuanced similarity, user's past plan choices (vectorized embeddings) could be compared against embeddings of current plans using a Vector Database (e.g., Pinecone, Vertex AI Matching Engine) to find initial candidates before LLM ranking.
    *   **Presentation:** Display prominently in UI with "AI Recommended" badge and explanations.

### 3.3. AI-Based Bill Forecasting (For Postpaid)
-   **Functionality:** AI predicts next month's bill and alerts for high usage.
-   **Implementation:** Genkit flow analyzing past postpaid bill amounts and dates from `transactions` collection.

### 3.4. Smart Bill Split (For Postpaid Family Plans)
-   **Functionality:** Split bill for family plans, send UPI requests.
-   **Implementation:** UI for splitting, contact selection, backend integration with UPI payment service to initiate collect requests.

### 3.5. Cashback & Offers Engine
-   **Functionality:** Dynamic offers.
-   **Implementation:**
    *   Backend `offerService.js` validates coupons and determines offer applicability based on rules (operator, payment method, amount) stored in `offers` collection (Firestore).
    *   Cashback credits user's Zet Pay Wallet.

### 3.6. Multiple Numbers Recharge/Management
-   **Functionality:** Save and manage multiple numbers for quick recharges.
-   **Implementation:** Extend user profile (`users/{userId}/managedNumbers` subcollection in Firestore) or contacts to tag numbers.

### 3.7. Scheduled Recharges (For Prepaid)
-   **Functionality:** Schedule future recharges.
-   **Implementation:**
    *   Backend (`POST /api/recharge/schedule`) saves schedules to `scheduledRecharges` Firestore collection.
    *   **Scheduled Worker (Cron Job)** (see Section 6.3) executes these.

### 3.8. Recharge Activation Status Check
-   **Functionality:** Check latest status for "Processing Activation" recharges.
-   **Implementation:**
    *   Frontend calls `GET /api/recharge/status/:transactionId`.
    *   Backend (`rechargeController.js`) queries the **Recharge API Provider** for the latest status of the operator reference ID.

### 3.9. Recent Recharge Cancellation
-   **Functionality:** Attempt to cancel a recent prepaid recharge within a short window (e.g., 5-30 minutes).
-   **Implementation:**
    *   Frontend calls `POST /api/recharge/cancel/:transactionId`.
    *   Backend (`rechargeController.js`) checks transaction time, calls **Recharge API Provider's cancellation API** (if available and supported by operator), and updates transaction status in Firestore.

### 3.10. Smartwatch Integration
-   **Functionality:** Show bill alerts and one-tap pay on wearables.
-   **Implementation:** Requires native companion apps (watchOS/Wear OS) and backend support for push notifications and simplified payment flows via **FCM** or similar.

---

## 4. User Interface Flow (Conceptual - actual UI files are in `src/app`)

### 4.1. Prepaid Mobile Recharge
1.  Navigate to "Mobile Recharge".
2.  Enter 10-digit mobile number.
3.  **Auto-Detection:** System calls backend, which calls Telecom API for operator/circle.
4.  **Manual Selection (if needed).**
5.  **Plan Display:** Backend fetches plans from Recharge API Provider (cached in Redis). AI recommendations displayed.
6.  User selects plan or enters amount.
7.  **Payment Section:** Select payment method, apply coupon.
8.  **Payment Authorization:** Redirect to Payment Gateway or use PG SDK for UPI PIN/Card OTP.
9.  **Confirmation:** Backend receives webhook from PG, calls Recharge API Provider, updates Firestore & WebSocket. Frontend shows status.

### 4.2. Postpaid Mobile Bill Payment
(Similar flow, but step 5 involves fetching bill details from BBPS/Telecom API via backend.)

---

## 5. Technical Implementation Details (Summary)

### 5.1. Frontend Components
-   Pages: `src/app/(features)/recharge/[type]/page.tsx`, `src/app/(features)/bills/mobile-postpaid/page.tsx`
-   Client-Services: `src/services/recharge.ts`, `src/services/bills.ts`

### 5.2. Backend Components
-   **Routes:** `rechargeRoutes.js`, `billsRoutes.js` (with `authMiddleware`).
-   **Controllers:** `rechargeController.js`, `billsController.js`.
-   **Services:**
    *   `rechargeProviderService.js`: Integrates with **Recharge API Provider** (e.g., PaySprint, Euronet BBPS) using keys from `.env`. Implements Redis caching.
    *   `billProviderService.js`: Integrates with **Bill Fetch Provider (BBPS)**. Implements Redis caching.
    *   `paymentGatewayService.js`: Integrates with **Payment Gateway (e.g., Razorpay)**.
    *   `transactionLogger.ts`: Logs to Firestore, calls `blockchainLogger.ts`.
    *   `blockchainLogger.ts`: Interacts with chosen **Blockchain** via Web3.js/Ethers.js using node URL and private key from `.env`.
-   **Real-time Updates:** `server.js` uses `ws` (or Socket.IO/Pusher for production).

### 5.3. Data Storage
-   **Firestore:** `transactions`, `scheduledRecharges`, `reminders`, `users`, `offers`.
-   **Redis:** Cache operator lists, recharge plans, biller lists, active offers. Connection URL from `.env`.

---
## 6. Key Real-World Implementation Aspects

### 6.1. Security & Authentication
*   **Authentication:** All relevant backend API endpoints are protected by `authMiddleware.js` which verifies Firebase ID tokens (or JWTs if using a different system).
*   **HTTPS:** Enforced for all client-server and server-server communications.
*   **Input Validation & Sanitization:** Rigorous server-side validation (`express-validator`) and sanitization of all inputs.
*   **Rate Limiting:** `express-rate-limit` applied to API routes to prevent abuse.
*   **Sensitive Data Handling:** API keys, secrets (`process.env.RECHARGE_API_PROVIDER_KEY`, `process.env.PAYMENT_GATEWAY_SECRET_KEY`, etc.) managed via environment variables and secure secret management in production. No direct storage of PINs/CVVs.
*   **Secure Webhooks:** Validate signatures for webhooks from Payment Gateways and Recharge Providers.

### 6.2. Error Handling and Monitoring
*   **Standardized Error Responses:** `errorMiddleware.js` for consistent JSON error responses.
*   **Logging:** `morgan` for HTTP requests. Detailed error/event logging within services.
*   **External Monitoring:** Integration with Sentry, Datadog, or Firebase Crashlytics/Performance Monitoring.
*   **Provider API Error Handling:** Implement robust retry mechanisms (with exponential backoff), circuit breakers, and clear user feedback for failures from external Recharge/Payment APIs.

### 6.3. Scheduled Recharge Worker Architecture
*   **Worker Process:** A separate backend worker process (e.g., Node.js script) using a scheduler.
*   **Trigger Mechanism:**
    *   **Node Cron / `node-schedule`:** For simpler, single-instance deployments.
    *   **BullMQ / Bee-Queue:** For robust, distributed job queues with retries if scaling.
    *   **Cloud Scheduler (GCP) + Cloud Function / Firebase Scheduled Function:** Serverless, scalable approach.
*   **Process:**
    1.  Worker queries `scheduledRecharges` in Firestore for due tasks.
    2.  For each task, securely retrieves payment authorization (e.g., using a pre-authorized UPI mandate ID or a tokenized card reference stored with user consent).
    3.  Calls the `processRecharge` logic (or a dedicated internal version) to execute the recharge.
    4.  Updates `scheduledRecharges` document status, logs transaction.
    5.  Notifies user via WebSocket/Push Notification.

### 6.4. Blockchain Logging Details
*   **Purpose:** To create an immutable, auditable trail of transactions for transparency or internal audit, not for processing payments.
*   **Data Stored:** A cryptographic hash of key, non-sensitive transaction details (e.g., `transactionId` (Firestore), `timestamp`, `status`, anonymized `userId`, `type`, `amountCategory` rather than exact amount if sensitive).
*   **Platform:** Options include:
    *   **Public Testnet (e.g., Polygon Mumbai, Ethereum Sepolia):** For development and demonstrating public verifiability.
    *   **Private Permissioned Blockchain (e.g., Hyperledger Fabric, Quorum):** For internal control and audit.
    *   **Layer 2 Solutions (e.g., Polygon PoS):** For lower gas fees if public.
*   **Implementation:** `blockchainLogger.ts` uses **Web3.js or Ethers.js** to connect to a node (URL from `process.env.BLOCKCHAIN_NODE_URL`) and interact with a simple smart contract (address from `process.env.BLOCKCHAIN_CONTRACT_ADDRESS`) using a funded account (private key from `process.env.BLOCKCHAIN_PRIVATE_KEY`).

### 6.5. Unit/Integration Testing Strategy
*   **Backend (Jest + Supertest):**
    *   Unit test services, mocking external API calls (Recharge Provider, PG, Blockchain) and Firestore/Redis interactions.
    *   Integration test controllers and API endpoints.
*   **Frontend (React Testing Library, Playwright/Cypress):**
    *   Unit test components.
    *   Integration/E2E test user flows.
*   **Focus Areas:** Payment success/failure paths, plan selection logic, status updates via WebSockets, error handling, scheduled recharge creation, cancellation logic, idempotency of payment APIs.

### 6.7. Offline/Retry Handling for Payments
*   **Client-Side (Frontend):**
    *   Use `navigator.onLine` to detect offline status and disable payment buttons.
    *   Provide "Retry" options for API calls failing due to client network issues.
    *   Handle "Pending" transaction states gracefully, relying on WebSocket updates or offering manual status checks.
*   **Backend-Side (Idempotency):**
    *   Payment initiation APIs (`POST /api/recharge`) should be idempotent using a client-generated unique request ID (e.g., passed in header/body, checked against Redis/temp Firestore store).
    *   Recharge Provider APIs often support idempotency keys; ensure these are used.
    *   Webhook handlers from PGs must be idempotent (check if `transactionId` already processed).

This detailed structure provides a robust, real-world-ready Mobile Recharge and Postpaid Bill Payment feature set within the Zet Pay super app.
