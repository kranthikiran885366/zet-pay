
# Zet Pay Super App: Mobile Recharge Feature Documentation

This document provides a comprehensive overview of the Mobile Recharge feature within the Zet Pay application, detailing its functionalities, user interface flow, and technical implementation, outlining a transition from simulation to a **real-world application**.

## 1. Introduction

The Mobile Recharge feature allows users to easily top-up their prepaid mobile connections or pay their postpaid mobile bills for various operators across India. It aims to provide a seamless and quick experience, incorporating smart features like operator auto-detection and AI-powered plan recommendations.

**This document now reflects a system designed for real-world integration. While the current codebase contains placeholders for actual external API calls, the architecture and logic are structured to support them.**

---

## 2. Core Functionalities (Real-World Implementation Path)

### 2.1. Operator & Circle Auto-Detection
-   **Functionality:** When a user enters a 10-digit mobile number, the system attempts to automatically detect the telecom operator (e.g., Airtel, Jio, Vi, BSNL) and the telecom circle (e.g., Karnataka, Maharashtra).
-   **Real-World Implementation:**
    -   Frontend (`src/app/(features)/recharge/[type]/page.tsx`) captures the mobile number.
    -   Calls a backend API endpoint (`POST /api/recharge/detect-operator`).
    -   Backend service (`rechargeProviderService.js`) would ideally query a **Real Telecom API Provider** (e.g., an MNP lookup service or an API provided by a recharge aggregator, using `process.env.TELECOM_API_URL` and `process.env.TELECOM_API_KEY`) to get accurate operator and circle information.
    -   The list of known operators (Billers) themselves would be fetched from the primary Recharge API Provider and cached.
-   **User Feedback:** Detected operator (with logo) and circle are displayed. An option to manually select/change is provided if detection fails or is incorrect.

### 2.2. Manual Operator & Circle Selection
-   **Functionality:** If auto-detection fails, is incorrect, or for user preference, manual selection of operator (and sometimes circle, if relevant for plans) from a list.
-   **Implementation:**
    -   Frontend fetches available operators for "Mobile" (prepaid) or "Mobile Postpaid" from backend (`GET /api/recharge/billers?type=Mobile`).
    *   Backend service (`rechargeProviderService.js`'s `fetchBillers` function) provides this list. In a real system, this list is sourced from the **Recharge API Provider** (e.g., BBPS, PaySprint) and cached in **Redis** (using `process.env.REDIS_URL`).

### 2.3. Recharge Plan Browsing & Selection (For Prepaid)
-   **Functionality:** Users can browse available recharge plans for the selected operator and circle. Includes categorized plans (e.g., Popular, Data, Unlimited, Top-up), a search filter, detailed plan information (tariff details in a modal), and a plan comparison feature (select up to 3 plans to compare side-by-side).
-   **Implementation:**
    -   Frontend (`src/app/(features)/recharge/[type]/page.tsx`) uses UI elements like tabs, search input, and modals. Fetches plans from `GET /api/recharge/plans?billerId=...&type=mobile&identifier=[circle_if_any]`.
    *   Backend service (`rechargeProviderService.js`'s `fetchPlans` function) fetches real-time plans from the **Recharge API Provider**. This data is crucial to be fresh, so it's cached in **Redis** with a short Time-To-Live (TTL, e.g., 10-30 minutes) to balance performance and plan accuracy.

### 2.4. Bill Fetching (For Postpaid - Handled in `bills/mobile-postpaid/page.tsx`)
-   **Functionality:** For postpaid numbers, automatically fetches outstanding bill amount, due date, bill period, and customer name.
-   **Implementation:**
    *   Frontend (`/src/app/(features)/bills/mobile-postpaid/page.tsx`) calls backend (`GET /api/bills/details/mobile-postpaid/:identifier?billerId=...`).
    *   Backend controller (`billsController.js`) and service (`billProviderService.js`'s `fetchBill` function) query the **Bill Fetch API (typically BBPS - Bharat BillPay System, accessed via an aggregator like Euronet, Setu, or directly from the primary Recharge API Provider)** for real-time bill details.

### 2.5. Manual Amount Entry
-   **Functionality:** Users can directly enter a recharge amount if no specific plan is selected, or for "top-up" type recharges where a plan isn't necessary.
-   **Implementation:** Standard input field on the frontend.

### 2.6. Payment Processing (Core Logic in `rechargeController.js` / `billsController.js`)
-   **Functionality:** Users can pay using Zet Pay Wallet, UPI (from linked accounts), and conceptually Credit/Debit Card or Net Banking.
-   **Real-World Implementation Steps:**
    1.  **Frontend:** Collects payment details (amount, chosen method, any coupon code).
    2.  **Backend Receives Request:** API call to `POST /api/recharge` (for prepaid) or `POST /api/bills/pay/mobile-postpaid`.
    3.  **Log Initial Transaction:** `transactionLogger.ts` logs a 'Pending' transaction to Firestore.
    4.  **Payment Method Handling:**
        *   **Wallet:** If "Zet Pay Wallet" is chosen, `payViaWalletInternal` (in `wallet.ts`) deducts the amount atomically from the user's Firestore wallet document.
        *   **UPI/Card/NetBanking:**
            *   The backend would initiate a payment with a **Real Payment Gateway** (e.g., Razorpay, Cashfree, Stripe, using credentials from `process.env.PAYMENT_GATEWAY_KEY_ID` and `_SECRET_KEY`).
            *   This typically involves returning parameters to the client to invoke the PG's SDK/checkout page for user authentication (PIN, OTP, 3D Secure).
            *   The PG sends a webhook to a dedicated backend endpoint (e.g., `/api/webhooks/payment-gateway`) upon payment completion/failure. This webhook must be secured (e.g., signature verification using `process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET`).
    5.  **Execute Recharge with Provider:**
        *   Once payment is confirmed (either directly from wallet or via PG webhook), the backend calls `rechargeProviderService.executeRecharge`. This function, in a real system, makes an API call to the **Recharge API Provider** (e.g., PaySprint, BBPS aggregator using `process.env.RECHARGE_API_PROVIDER_URL`, `_KEY`, `_SECRET`).
    6.  **Handle Provider Response:** The recharge provider will return a status (e.g., Success, Pending, Failed) and often an `operatorReferenceId`.
    7.  **Update Transaction Log:** The Firestore transaction (from step 3) is updated with the final status, operator reference ID, and any provider messages.
    8.  **WebSocket Update:** The backend sends a real-time `transaction_update` message to the client via WebSockets (`sendToUser` from `server.js`).
    9.  **Refund Logic (if needed):** If payment was successful but the recharge execution failed at the provider level, the backend must initiate a refund through the Payment Gateway or credit back to the Zet Pay Wallet. A corresponding 'Refund' transaction is logged.

### 2.7. Transaction Logging & Status Updates
-   **Functionality:** All recharge attempts (success, pending, failed) are logged with comprehensive details. Users receive real-time status updates.
-   **Implementation:**
    *   **Firestore:** `transactionLogger.ts` saves detailed records to the `transactions` collection in Firestore. This includes `userId`, `type` ('Recharge' or 'Mobile Postpaid'), `identifier`, `amount`, `status`, `billerId`, `planId` (if any), `paymentMethodUsed`, `pspTransactionId` (from PG), `operatorReferenceId` (from recharge provider), `failureReason`, `couponCodeApplied`, etc.
    *   **Blockchain Logging (Conceptual -> Real):** `blockchainLogger.ts` (called by `transactionLogger.ts`) would, in a real setup, take key immutable details from the Firestore transaction (e.g., a hash of `transactionId`, `timestamp`, `status`, `anonymizedUserId`, `amountCategory`), connect to a blockchain node (e.g., Polygon testnet, private Ethereum network via `process.env.BLOCKCHAIN_NODE_URL`), and log this hash to a smart contract (at `process.env.BLOCKCHAIN_CONTRACT_ADDRESS`) using a funded account (from `process.env.BLOCKCHAIN_PRIVATE_KEY`). This serves as an auditable, tamper-proof record.
    *   **Real-time Updates:** The backend uses `sendToUser` (from `server.js` which uses the `ws` library) to push `transaction_update` messages to the client. For production, this would scale using systems like Socket.IO, Pusher, or Firebase Cloud Messaging (FCM).

### 2.8. Recharge/Bill Payment History
-   **Functionality:** Users can view their past mobile recharges and postpaid bill payments, filterable by number, operator, status, or date range.
-   **Implementation:** This is part of the global Transaction History feature (`/src/app/(features)/history/page.tsx`), which queries the `transactions` collection in Firestore.

### 2.9. Reminder Notifications
-   **Functionality:** Notify users before postpaid bill due dates or for prepaid plan expiry.
-   **Real-World Implementation:**
    *   **Postpaid:** When a postpaid bill is fetched or paid, if a due date is present, a reminder can be scheduled.
    *   **Prepaid:** After a successful prepaid recharge with a known validity, a reminder can be scheduled a few days before the plan's expiry.
    *   Frontend UI allows users to "Set Reminder" which calls a backend API (`POST /api/reminders`).
    *   Backend (`reminderController.js` and `reminderService.js`) saves reminder details (userId, type, identifier, dueDate, message) to a `reminders` collection in Firestore.
    *   A **Scheduled Worker/Cron Job** (see Section 6.3) periodically queries the `reminders` collection for due reminders and sends notifications via **Firebase Cloud Messaging (FCM)** (using `process.env.FCM_SERVER_KEY` via Firebase Admin SDK), or potentially SMS/Email gateways.

---

## 3. Advanced Features (Real-World Implementation Path)

### 3.1. Auto-Pay Setup (For Postpaid)
-   **Functionality:** Allow users to set up automatic debit for monthly postpaid bills using UPI Autopay or card-based recurring payments. Options for full bill amount, fixed cap, or manual approval before debit.
-   **Implementation:**
    *   Frontend UI for setup and management (`/src/app/(features)/autopay/setup/page.tsx` and `/autopay/page.tsx`).
    *   Backend (`autopayController.js`) integrates with the chosen **Payment Gateway/PSP** (e.g., Razorpay Subscriptions, Cashfree Subscriptions) to:
        *   Create UPI Autopay mandates (requires user authentication via UPI app).
        *   Set up card-based recurring payments (tokenizing the card and setting up a mandate).
    *   Securely store mandate references (e.g., `mandate_urn` for UPI, subscription ID from PG) in the `autopayMandates` Firestore collection associated with the user and biller.
    *   The **Scheduled Worker** (see Section 6.3) would also handle initiating debits for active Autopay mandates on their due dates.

### 3.2. AI Plan Recommendations (For Prepaid)
-   **Functionality:** AI suggests the best 2-3 recharge plans tailored to the user's typical usage patterns, current balance, plan expiry, and available operator offers.
-   **Real-World Implementation (`src/ai/flows/recharge-plan-recommendation.ts` using Genkit):**
    *   **Data Sources:**
        1.  **User's Recharge History:** A Genkit tool (`getUserRechargeHistoryTool`) calls a secure backend API endpoint. This backend API queries the `transactions` collection in Firestore for the specific `userId`, filters for 'Recharge' type (and optionally specific operator), and returns a summary of the last 3-5 recharges (e.g., amount, guessed data amount like "1.5GB/Day", guessed validity like "28 Days").
        2.  **Current Operator Plans:** Another Genkit tool (`getOperatorPlansTool`) calls a backend API endpoint. This backend API uses `rechargeProviderService.fetchPlans` (which, in a real setup, calls the live Recharge API Provider and utilizes Redis caching) to get the current list of plans for the user's `operatorBillerId` and `circle`.
    *   **Processing with LLM (e.g., Gemini via Genkit):**
        *   The main Genkit flow (`recommendRechargePlansFlow`) passes the data retrieved by these tools (history summary, live plans) along with `currentBalance` and `currentPlanExpiryDays` to a Gemini model via `ai.generate`.
        *   **Prompt Engineering:** The prompt is carefully crafted to instruct Gemini to:
            *   Act as a "Telecom Advisor".
            *   Analyze the user's historical usage (data consumption preference, validity preference, common price points).
            *   Compare this with the currently available plans.
            *   Consider urgency (low balance, near expiry).
            *   Recommend up to 3 diverse plans, providing a `planId` (matching an actual available plan), a catchy `name`, a personalized `description` explaining *why* it's a good fit, and the plan's `price`, `validity`, `data`, and `talktime`.
            *   Optionally provide a `confidenceScore`.
    *   **Vectorization & Similarity Search (Optional Advanced Step):** For a very large number of available plans or more nuanced matching:
        *   User's past recharges and all current operator plans can be converted into vector embeddings (e.g., using a sentence transformer model or an embedding API like Vertex AI Embeddings).
        *   Store plan embeddings in a Vector Database (e.g., Pinecone, Vertex AI Matching Engine, or even a local FAISS index if dataset is manageable).
        *   The Genkit flow could first query the vector DB to find the top N most similar current plans to the user's past usage profile. These candidates are then passed to the LLM for final ranking, filtering, and explanation generation.
    *   **Presentation:** Frontend displays these recommendations prominently, possibly with an "AI Recommended" badge and the generated explanations.

### 3.3. AI-Based Bill Forecasting (For Postpaid)
-   **Functionality:** AI predicts the user's next month's postpaid bill amount based on their past billing history and potentially recent usage trends (if available from telecom provider APIs, which is rare). Alerts for unusually high projected usage.
-   **Implementation:** A Genkit flow analyzing past postpaid bill amounts and dates from the `transactions` collection in Firestore. This would use an LLM's time-series analysis or pattern recognition capabilities.

### 3.4. Smart Bill Split (For Postpaid Family Plans)
-   **Functionality:** For users on postpaid family plans, allow them to easily split the total bill amount among family members (other Zet Pay users), send UPI collect requests, and track who has paid.
-   **Implementation:**
    *   Frontend UI to select family members (from contacts tagged as 'family' or a specific group).
    *   Ability to assign amounts or split equally.
    *   Backend integration with `upiController.js` to initiate UPI collect requests to the selected members.
    *   Track payment status of these split requests in Firestore.

### 3.5. Cashback & Offers Engine
-   **Functionality:** Apply dynamic cashback offers or promotional discounts based on operator, payment method, recharge amount, or active coupon codes.
-   **Implementation:**
    *   An `offers` collection in Firestore stores offer rules (e.g., "RECHARGE20" gives ₹20 cashback on Airtel recharges > ₹299 via UPI).
    *   When processing a recharge, `rechargeController.js` calls an `offerService.js`.
    *   `offerService.js` checks the transaction against active offers from Firestore (cached in Redis for performance).
    *   If an offer is applicable and a valid `couponCode` is provided, the discount/cashback is calculated.
    *   Cashback is credited to the user's Zet Pay Wallet (using `payViaWalletInternal` with a negative amount and appropriate description like "Cashback for Mobile Recharge").
    *   The original transaction log in Firestore includes details of the `couponCodeApplied` and any `cashbackAmountCredited`.

### 3.6. Multiple Numbers Recharge/Management
-   **Functionality:** Allow users to save and manage multiple mobile numbers (e.g., family members, other devices) for quick recharges. Users can add custom tags/names to these numbers.
-   **Implementation:**
    *   Frontend UI in profile settings or during recharge flow to add/manage numbers.
    *   Backend stores these in a `users/{userId}/managedRechargeNumbers` subcollection in Firestore or by adding a specific tag/category to the main `contacts` collection.
    *   The recharge page can then list these saved numbers for quick selection.

### 3.7. Scheduled Recharges (For Prepaid)
-   **Functionality:** Allow users to schedule future prepaid recharges (e.g., "Recharge ₹239 on the 1st of every month").
-   **Implementation:**
    *   Frontend UI to specify the number, operator, plan/amount, start date, and frequency (e.g., monthly, specific date).
    *   Backend (`rechargeController.js` via `POST /api/recharge/schedule`) saves these schedule details to a `scheduledRecharges` Firestore collection. This record includes `userId`, `identifier`, `amount`, `billerId`, `planId`, `frequency`, `nextRunDate`, `isActive`, and crucially, a **secure reference to the payment method** (e.g., a UPI Autopay mandate ID if set up for the wallet, or a tokenized card ID with user consent for recurring debits).
    *   The **Scheduled Worker (Cron Job)** (see Section 6.3) executes these tasks.

### 3.8. Recharge Activation Status Check
-   **Functionality:** For recharges that are "Pending" or "Processing Activation", allow the user to manually check for the latest status from the provider.
-   **Implementation:**
    *   Frontend UI (e.g., a "Check Status" button on the transaction details page in history).
    *   Calls a backend API endpoint (`GET /api/recharge/status/:transactionId`).
    *   Backend (`rechargeController.js`) retrieves the `operatorReferenceId` from the stored transaction in Firestore.
    *   It then calls the **Recharge API Provider's status check API** using this `operatorReferenceId`.
    *   The backend updates the transaction status in Firestore if it has changed and sends a WebSocket update to the client.

### 3.9. Recent Recharge Cancellation ("Recharge Undo")
-   **Functionality:** Allow users to attempt to cancel a recently made prepaid recharge, typically within a very short window (e.g., 5-30 minutes, highly dependent on operator and provider policy).
-   **Implementation:**
    *   Frontend UI shows a "Cancel Recharge" option for eligible recent transactions (e.g., status "Pending", "Processing Activation", or even "Completed" if within the time window).
    *   Calls a backend API endpoint (`POST /api/recharge/cancel/:transactionId`).
    *   Backend (`rechargeController.js`):
        1.  Checks the transaction's timestamp and current status from Firestore.
        2.  If eligible for cancellation attempt (within time window, not already failed/cancelled), it calls the **Recharge API Provider's cancellation API** using the `operatorReferenceId`. Not all providers/operators support this.
        3.  If the provider confirms cancellation:
            *   Update the transaction status in Firestore to "Cancelled".
            *   Initiate a refund process for the original payment (via Payment Gateway or wallet reversal).
            *   Send WebSocket update.
        4.  If provider rejects cancellation, inform the user.

### 3.10. Smartwatch Integration (Conceptual Future Feature)
-   **Functionality:**
    *   Show upcoming postpaid bill due date alerts on a paired smartwatch.
    *   Offer a "One-Tap Pay" option from the watch for saved billers/numbers, using a pre-authorized payment method from the phone app (e.g., default UPI account or wallet balance, possibly with phone confirmation for security).
-   **Implementation:**
    *   Requires native companion apps for watchOS (Apple Watch) and Wear OS.
    *   Backend support for sending rich push notifications via **Firebase Cloud Messaging (FCM)** or a similar service to the phone app, which then relays to the watch.
    *   A simplified, secure API endpoint on the backend that the phone app can call upon receiving a "pay" command from the watch, using stored payment tokens/mandates.

---

## 4. User Interface Flow (Real-World Examples)

### 4.1. Prepaid Mobile Recharge
1.  **Navigation:** User navigates to "Mobile Recharge" (e.g., from Home screen quick links or Services page). Path: `/recharge/mobile`.
2.  **Enter Mobile Number:** User types the 10-digit mobile number.
3.  **Operator & Circle Auto-Detection (Real-time):**
    *   As the user types, a debounced API call to `/api/recharge/detect-operator` is made.
    *   Backend uses a **Telecom API** to find the operator and circle.
    *   Frontend displays detected operator logo, name, and circle (e.g., "Airtel - Karnataka"). An "Edit" button allows manual change.
4.  **Manual Operator/Circle Selection (If needed):**
    *   If detection fails or user clicks "Edit", a dropdown/modal shows operators fetched from `/api/recharge/billers?type=Mobile` (data cached in Redis by backend).
5.  **Plan Browsing & Selection:**
    *   Once operator (and circle, if relevant) is confirmed, frontend calls `/api/recharge/plans?billerId=[ID]&type=mobile...` to fetch plans.
    *   Backend's `rechargeProviderService.fetchPlans` gets plans from the **Recharge API Provider** (cached briefly in Redis).
    *   Frontend displays plans, categorized by tabs (e.g., "Popular", "Data", "Unlimited", "AI Recommended").
    *   **AI Recommendations:** If AI recommendations are available (from `recommendRechargePlansFlow`), they are shown in a dedicated section or highlighted.
    *   User can search plans, view details in a modal (including tariff info), and select up to 3 plans for a side-by-side comparison modal.
    *   Selecting a plan auto-fills the "Amount" field.
6.  **Enter Amount (If no plan selected):** User can directly input a recharge amount.
7.  **Payment Section:**
    *   Display "Amount Payable".
    *   User selects payment method (Zet Pay Wallet, UPI from linked accounts, or conceptually Card/NetBanking). Available balance for wallet is shown. Bank server status for UPI accounts is shown.
    *   Input field for "Coupon Code". "Apply" button validates it (mock validation for now).
8.  **Payment Authorization & Processing:**
    *   User clicks "Proceed to Pay".
    *   **If Wallet:** Backend's `payViaWalletInternal` is used.
    *   **If UPI:** User is prompted for UPI PIN (securely handled by client-side SDK of Payment Gateway or directly if using PSP library that handles PIN entry on client). Backend receives payment confirmation.
    *   **If Card/NetBanking:** User is redirected to Payment Gateway page or PG's SDK UI is invoked for card details/OTP/NetBanking login.
9.  **Confirmation & Status Update:**
    *   Backend (after PG confirmation if applicable) calls the **Recharge API Provider** to execute the recharge.
    *   Backend updates the transaction status in Firestore (`Pending` -> `Processing Activation` / `Completed` / `Failed`).
    *   Backend sends a WebSocket message (`transaction_update`) to the client.
    *   Frontend displays a success, pending, or failure screen with transaction ID, operator reference, and options like "Recharge Another Number", "View History", "Check Activation Status", or "Attempt Cancel" (if applicable).

### 4.2. Postpaid Mobile Bill Payment
(Handled in `src/app/(features)/bills/mobile-postpaid/page.tsx`)
1.  **Navigation:** User goes to "Mobile Postpaid".
2.  **Enter Mobile Number & Operator Selection:** Similar to prepaid (auto-detect or manual).
3.  **Fetch Bill Details:**
    *   Frontend calls `/api/bills/details/mobile-postpaid/:identifier?billerId=...`.
    *   Backend's `billProviderService.fetchBill` queries **BBPS/Telecom API** for outstanding amount, due date, customer name, bill period.
    *   Frontend displays fetched details. Amount field is pre-filled (can be overridden for partial payment if allowed by biller).
4.  **Payment Section:** Similar to prepaid (select payment method, apply coupon).
5.  **Payment Authorization & Processing:** Similar to prepaid.
6.  **Confirmation & Status Update:** Similar to prepaid. Frontend might show "Set Reminder" or "Setup Autopay" options.

---

## 5. Key Real-World Technical Implementation Aspects

### 5.1. Security & Authentication (Critical for Real Money)
*   **Authentication:** All backend API endpoints involved in recharge or payment (`/api/recharge/*`, `/api/bills/*`, `/api/payments/*`) **must** be protected by `authMiddleware.js`. This middleware verifies the Firebase Auth ID token sent in the `Authorization: Bearer <token>` header for every request.
*   **HTTPS:** All client-server and server-server (to PG, Recharge Provider) communications **must** use HTTPS. This is typically handled by the hosting environment (Vercel, Cloud Run).
*   **Input Validation & Sanitization:** Server-side validation using `express-validator` (as currently implemented in routes) is crucial to prevent injection attacks and ensure data integrity for all inputs (mobile numbers, amounts, IDs, coupon codes).
*   **Rate Limiting:** `express-rate-limit` (configured in `server.js`) must be fine-tuned for production to prevent abuse of API endpoints (e.g., too many OTP requests, plan lookups, payment attempts).
*   **Sensitive Data Handling:**
    *   **Never store raw UPI PINs or full card numbers/CVVs** in your database.
    *   Card details should be tokenized by the Payment Gateway. Store only the token, last 4 digits, expiry, and card type.
    *   API keys and secrets for Payment Gateways, Recharge Providers, etc. (`process.env.*_KEY`, `*_SECRET`) **must** be stored securely as environment variables and managed via a secrets manager in production (e.g., Google Secret Manager, Doppler, HashiCorp Vault).
*   **CSRF Protection:** For any parts of the payment flow that involve web forms directly submitted from your frontend (less common if using PG SDKs which handle their own forms), implement CSRF tokens.
*   **Secure Webhooks:** Webhooks from Payment Gateways (confirming payment status) **must** be verified using a shared secret or signature mechanism (e.g., `process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET`) to ensure they are legitimate.

### 5.2. Error Handling and Monitoring (Essential for Reliability)
*   **Standardized Error Responses:** The backend's `errorMiddleware.js` should provide consistent JSON error responses with appropriate HTTP status codes (e.g., `400` for bad input, `401` for auth failure, `402` for payment required/failed, `403` for forbidden, `500` for server errors, `503` for provider service unavailable).
*   **Provider API Error Handling (Backend):**
    *   Implement robust error handling for API calls to Payment Gateways and Recharge Providers. This includes:
        *   Properly catching network errors, timeouts.
        *   Parsing error responses from providers and mapping their specific error codes to user-friendly messages or internal Zet Pay error codes.
        *   Logging detailed provider errors for debugging.
    *   **Retry Mechanisms:** For transient errors from providers (e.g., temporary network glitches, timeouts), implement a retry strategy with exponential backoff and jitter for server-to-server calls.
    *   **Circuit Breaker Pattern:** Consider a circuit breaker (e.g., using a library like `opossum`) for calls to external providers to prevent cascading failures if a provider is down.
*   **Logging (Backend):**
    *   Use `morgan` for HTTP request logging (already in place).
    *   Implement detailed application-level logging within services and controllers for key events, errors, and decision points. Log to a structured logging service (e.g., Google Cloud Logging, Sentry's backend logging).
*   **External Monitoring & Alerting (Production):**
    *   Integrate with application performance monitoring (APM) and error tracking tools like **Sentry**, **Datadog**, or **Firebase Crashlytics/Performance Monitoring**.
    *   Set up alerts for critical errors (e.g., high rate of payment failures, recharge provider API down, webhook processing failures).

### 5.3. Scheduled Recharge Worker Architecture (For Automated Recharges)
*   **Worker Process:** A separate, long-running backend worker process or a scheduled function is required. This process is *not* an HTTP request handler.
*   **Trigger Mechanism:**
    *   **Node Cron / `node-schedule` (Self-hosted Node.js):** Suitable for simpler, single-instance backend deployments. The worker script runs continuously and uses the library to schedule jobs internally.
    *   **BullMQ / Bee-Queue (Self-hosted Node.js with Redis):** For robust, distributed job queues. Useful if your backend scales to multiple instances. Tasks are added to a queue (backed by Redis) and processed by one or more worker instances. Supports retries, delayed jobs, etc.
    *   **Cloud Scheduler (GCP) + Cloud Function / Firebase Scheduled Function (Serverless):** A highly scalable and managed approach. Cloud Scheduler triggers an HTTP endpoint of a Cloud Function (or a specific internal endpoint of your main backend if designed for it) at configured intervals. The function then performs the work.
*   **Worker Logic (Conceptual `backend/workers/scheduledRechargeWorker.js`):**
    1.  **Query Due Tasks:** The worker (triggered by its schedule, e.g., every 5 minutes) queries the `scheduledRecharges` collection in Firestore for documents where `isActive: true` AND `nextRunDate <= now()`. Order by `nextRunDate` to process older ones first. Process in batches (e.g., 10-20 at a time) to avoid overloading.
    2.  **Secure Payment Authorization:** For each due task, retrieve the `paymentMethodReference`.
        *   If it's a **UPI Mandate URN:** Use the Payment Gateway/PSP's API to execute a debit against that mandate.
        *   If it's a **Tokenized Card ID:** Use the Payment Gateway's API to charge the tokenized card (requires user consent for recurring debits obtained during schedule setup).
        *   **Wallet payments** are simpler if the worker has permissions to act on behalf of the user or if a specific "scheduled payment wallet" mechanism is used.
    3.  **Execute Recharge:** Call an internal, trusted version of the `processRecharge` logic (or directly call the Payment Gateway and Recharge Provider services), passing the retrieved payment authorization. This function should **not** require user interaction like PIN entry.
    4.  **Update Schedule & Log:**
        *   Update the `scheduledRecharges` document in Firestore with `lastRunStatus` (Success/Failed), `lastRunTransactionId` (link to the new transaction in `transactions` collection), `lastRunDate`.
        *   Calculate and update the `nextRunDate` based on the `frequency`.
        *   If the recharge fails repeatedly or the schedule is one-time, set `isActive: false`.
    5.  **Notify User:** Send a WebSocket message (`sendToUser`) or a push notification (via FCM) to the user about the success or failure of their scheduled recharge.

### 6.4. Blockchain Logging Details (For Auditability & Transparency)
*   **Purpose:** To create an immutable, auditable, and potentially user-verifiable trail of key transaction events, **not** for processing the payments themselves. This enhances transparency and can be useful for dispute resolution or internal audits.
*   **Data to Log/Hash:** To maintain privacy and reduce costs, do not log all PII on the blockchain. Instead, log a **cryptographic hash** (e.g., SHA-256) of a selection of key, non-reversible transaction details.
    *   **Example data to include in the hash:** Zet Pay internal `transactionId` (from Firestore), `timestamp` of the transaction, `status` (e.g., "Completed", "Failed"), `amountCategory` (e.g., "100-500 INR", not exact amount if sensitive), `anonymizedUserId` (e.g., first/last few chars), `transactionType` ("Recharge"), `billerId`.
    *   The actual hash is then what's stored on the blockchain. The original detailed data remains in Firestore.
*   **Blockchain Platform Choice:**
    *   **Public Testnet (e.g., Polygon Mumbai, Ethereum Sepolia):** Good for development, PoC, and demonstrating public verifiability at low cost.
    *   **Public Mainnet (e.g., Polygon PoS, other L2s):** For real-world public logging, choose a Layer 2 for lower gas fees.
    *   **Private Permissioned Blockchain (e.g., Hyperledger Fabric, Quorum):** If control, privacy, and permissioning are paramount, and public verifiability is not the primary goal. Suitable for internal enterprise audit trails.
*   **Implementation (`blockchainLogger.ts`):**
    *   The backend service would use **Web3.js** (for Ethereum-compatible chains) or **Ethers.js**.
    *   Connect to a blockchain node using an RPC URL from `process.env.BLOCKCHAIN_NODE_URL` (e.g., Infura, Alchemy, or your own node).
    *   Interact with a simple **smart contract** deployed at `process.env.BLOCKCHAIN_CONTRACT_ADDRESS`. This contract would have a function like `logTransactionHash(string memory _appTransactionId, bytes32 _transactionDataHash, uint256 _timestamp)`.
    *   Use a funded account (private key from `process.env.BLOCKCHAIN_PRIVATE_KEY`) to pay for the gas fees to call this smart contract function. This account needs to be kept secure.
    *   The blockchain transaction hash returned by the smart contract call is then stored back in the corresponding Firestore `transactions` document (`blockchainHash` field).

### 6.5. Unit/Integration Testing Strategy (Ensuring Quality)
*   **Backend (e.g., Jest + Supertest):**
    *   **Unit Tests:**
        *   Test individual service functions (`rechargeProviderService.js`, `paymentGatewayService.js` mocks, `transactionLogger.ts`, `offerService.js`, `reminderService.js`). Mock external dependencies (like Firestore, Redis, conceptual API calls).
        *   Test utility functions, data transformation logic.
    *   **Integration Tests:**
        *   Test controller endpoints (`rechargeController.js`, `billsController.js`) by making HTTP requests (using `supertest`).
        *   Mock the service layer to control test scenarios (e.g., successful payment + successful recharge, payment success + recharge fail, payment fail).
        *   Verify correct interaction with Firestore (e.g., transaction logged correctly, schedule updated) and Redis (cache set/get).
        *   Verify WebSocket messages are conceptually sent (can mock `sendToUser`).
*   **Frontend (e.g., React Testing Library + Jest for components, Playwright/Cypress for E2E):**
    *   **Component Tests:** Test individual React components for UI rendering, state changes, and event handling.
    *   **Integration/E2E Tests:**
        *   Test full user flows for mobile recharge (e.g., entering number, selecting plan, initiating payment, seeing confirmation).
        *   Mock `apiClient.ts` to simulate backend API responses for different scenarios.
        *   Verify UI updates based on mock WebSocket messages.
*   **Key Focus Areas & Edge Cases for Recharge Feature:**
    *   Successful recharge flow (various operators, plans, payment methods).
    *   Payment failure scenarios (insufficient balance, incorrect PIN, gateway error) and UI feedback.
    *   Recharge provider failure scenarios (operator down, invalid number at operator) after successful payment, including refund simulation.
    *   Plan selection logic, plan search, plan comparison UI.
    *   Operator auto-detection success and failure (manual override).
    *   Application of coupon codes and cashback (mock validation).
    *   Scheduled recharge creation, viewing, and cancellation.
    *   Activation status check flow.
    *   Recent recharge cancellation flow (time window, provider response).
    *   Idempotency of payment/recharge initiation APIs (preventing duplicate charges/recharges on network retries).
    *   Correct handling of different real-time WebSocket updates.

### 6.6. AI Plan Recommendation - Real Data Pipeline
(As detailed in 3.2) The key is to build backend APIs that the Genkit tools can call:
*   `GET /api/users/:userId/recharge-history-summary`: Returns summarized past recharge data for the AI.
*   `GET /api/recharge/live-plans?billerId=X&circle=Y`: Returns current plans from the real provider.

### 6.7. Offline/Retry Handling for Payments (Enhancing User Experience)
*   **Client-Side (Frontend):**
    *   Use `navigator.onLine` to detect if the client is offline. Disable payment buttons and show an "You are offline" message.
    *   For API calls (e.g., fetching plans, initiating payment) that fail due to client network issues (distinguishable from server errors if possible), provide a "Retry" button.
    *   If a payment is initiated but the app loses connection before receiving a final confirmation, the UI should gracefully handle this "Pending" state. It should inform the user to check their transaction history later or rely on WebSocket updates/Push Notifications for the final status. Avoid allowing re-initiation of the same payment without proper checks.
*   **Backend-Side (Idempotency - Crucial):**
    *   **Payment Initiation APIs** (e.g., `POST /api/recharge`, `POST /api/bills/pay/...`): These endpoints **must be idempotent**.
        *   The client should generate a unique request ID (e.g., a UUID v4) for each payment attempt and send it in the request (e.g., in a header like `X-Request-ID` or in the request body).
        *   The backend, before processing the payment, checks if a request with this ID has already been processed (or is currently in progress). This can be done by temporarily storing request IDs in Redis with a short TTL or in a temporary Firestore collection.
        *   If the ID is found and the previous attempt was successful, return the previous success response. If it failed, return the previous failure. If in progress, return a "still processing" status. This prevents duplicate charges if the client retries due to network issues after sending the request.
    *   **Recharge Provider API Calls:** Many recharge providers also support idempotency keys in their APIs. Ensure your backend uses these if available to prevent duplicate recharges at the provider level.
    *   **Payment Gateway Webhook Handlers:** Webhook handlers **must** be idempotent. Check if the `payment_id` or `order_id` from the webhook has already been processed and its status finalized in your `transactions` collection. If so, acknowledge the webhook but don't re-process the event.

This level of detail in the documentation and conceptual structuring in the code will provide a very solid foundation for a development team to build out the real integrations.
