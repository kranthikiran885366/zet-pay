
# Zet Pay Super App: Mobile Recharge Feature Documentation

This document provides a comprehensive overview of the Mobile Recharge feature within the Zet Pay application, detailing its functionalities, user interface flow, and technical implementation, **transitioning from a simulated environment to outlining a real-world application**.

## 1. Introduction

The Mobile Recharge feature allows users to easily top-up their prepaid mobile connections for various operators across India. It aims to provide a seamless and quick experience, incorporating smart features like operator auto-detection, AI-powered plan recommendations, scheduling, and robust status tracking.

**This document now reflects a system designed for real-world integration. Code snippets and service descriptions will point towards integration with actual third-party APIs and best practices for a production environment.**

---

## 2. Core Functionalities (Real-World Implementation Path)

### 2.1. Operator & Circle Auto-Detection
-   **Functionality:** When a user enters a 10-digit mobile number, the system attempts to automatically detect the telecom operator (e.g., Airtel, Jio, Vi, BSNL) and the telecom circle (e.g., Karnataka, Maharashtra).
-   **Real-World Implementation:**
    -   Frontend (`src/app/(features)/recharge/[type]/page.tsx`) captures the mobile number.
    -   Calls a backend API endpoint (`POST /api/recharge/detect-operator`).
    -   Backend service (`rechargeProviderService.js`) would ideally query a **Real Telecom API Provider** (e.g., an MNP lookup service or an API provided by a recharge aggregator, using `process.env.TELECOM_API_URL` and `process.env.TELECOM_API_KEY`) to get accurate operator and circle information.
    -   The list of known operators (Billers) themselves would be fetched from the primary Recharge API Provider and cached.
-   **User Feedback:** Detected operator (with logo) and circle are displayed. An "Edit" button allows manual change if detection fails or is incorrect.

### 2.2. Manual Operator & Circle Selection
-   **Functionality:** If auto-detection fails, is incorrect, or for user preference, manual selection of operator (and sometimes circle, if relevant for plans) from a list.
-   **Implementation:**
    -   Frontend fetches available operators for "Mobile" (prepaid) from backend (`GET /api/recharge/billers?type=Mobile`).
    -   Backend service (`rechargeProviderService.js`'s `fetchBillers` function) provides this list. In a real system, this list is sourced from the **Recharge API Provider** (e.g., BBPS, PaySprint) and cached in **Redis** (using `process.env.REDIS_URL`).

### 2.3. Recharge Plan Browsing & Selection
-   **Functionality:** Users can browse available recharge plans for the selected operator and circle. Includes categorized plans (e.g., Popular, Data, Unlimited, Top-up), a search filter, detailed plan information (tariff details in a modal), and a plan comparison feature (select up to 3 plans to compare side-by-side).
-   **Implementation:**
    -   Frontend (`src/app/(features)/recharge/[type]/page.tsx`) uses UI elements like tabs, search input, and modals. Fetches plans from `GET /api/recharge/plans?billerId=...&type=mobile&identifier=[circle_if_any]`.
    -   Backend service (`rechargeProviderService.js`'s `fetchPlans` function) fetches real-time plans from the **Recharge API Provider**. This data is crucial to be fresh, so it's cached in **Redis** with a short Time-To-Live (TTL, e.g., 10-30 minutes) to balance performance and plan accuracy.

### 2.4. Manual Amount Entry
-   **Functionality:** Users can directly enter a recharge amount if no specific plan is selected, or for "top-up" type recharges where a plan isn't necessary.
-   **Implementation:** Standard input field on the frontend.

### 2.5. Payment Processing (Core Logic in `rechargeController.js`)
-   **Functionality:** Users can pay using Zet Pay Wallet, UPI (from linked accounts), and conceptually Credit/Debit Card or Net Banking.
-   **Real-World Implementation Steps:**
    1.  **Frontend:** Collects payment details (amount, chosen method, any coupon code).
    2.  **Backend Receives Request:** API call to `POST /api/recharge`.
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
    10. **SMS Notification:** On successful recharge, send an SMS to the user via `smsNotificationService.js` (which would use Twilio).

### 2.6. Transaction Logging & Status Updates
-   **Functionality:** All recharge attempts (success, pending, failed) are logged with comprehensive details. Users receive real-time status updates.
-   **Implementation:**
    *   **Firestore:** `transactionLogger.ts` saves detailed records to the `transactions` collection in Firestore. This includes `userId`, `type` ('Recharge'), `identifier` (mobile number), `amount`, `status`, `billerId`, `planId` (if any), `paymentMethodUsed`, `pspTransactionId` (from PG), `operatorReferenceId` (from recharge provider), `failureReason`, `couponCodeApplied`, etc.
    *   **Blockchain Logging (Conceptual -> Real):** `blockchainLogger.ts` (called by `transactionLogger.ts`) would, in a real setup, take key immutable details from the Firestore transaction (e.g., a hash of `transactionId`, `timestamp`, `status`, `anonymizedUserId`, `amountCategory`), connect to a blockchain node (e.g., Polygon testnet, private Ethereum network via `process.env.BLOCKCHAIN_NODE_URL`), and log this hash to a smart contract (at `process.env.BLOCKCHAIN_CONTRACT_ADDRESS`) using a funded account (from `process.env.BLOCKCHAIN_PRIVATE_KEY`). This serves as an auditable, tamper-proof record.
    *   **Real-time Updates:** The backend uses `sendToUser` (from `server.js` which uses the `ws` library) to push `transaction_update` messages to the client. For production, this would scale using systems like Socket.IO, Pusher, or Firebase Cloud Messaging (FCM).

### 2.7. Recharge/Bill Payment History
-   **Functionality:** Users can view their past mobile recharges and postpaid bill payments, filterable by number, operator, status, or date range.
-   **Implementation:** This is part of the global Transaction History feature (`/src/app/(features)/history/page.tsx`), which queries the `transactions` collection in Firestore.

### 2.8. Reminder Notifications
-   **Functionality:** Notify users before prepaid plan expiry.
-   **Real-World Implementation:**
    *   After a successful prepaid recharge with a known validity, a reminder can be scheduled.
    *   Frontend UI allows users to "Set Reminder" which calls a backend API (`POST /api/reminders`).
    *   Backend (`reminderController.js` and `reminderService.js`) saves reminder details (userId, type, identifier, dueDate, message) to a `reminders` collection in Firestore.
    *   A **Scheduled Worker/Cron Job** (see Section 6.3) periodically queries the `reminders` collection for due reminders and sends notifications via **Firebase Cloud Messaging (FCM)** (using `process.env.FCM_SERVER_KEY` via Firebase Admin SDK), or potentially SMS/Email gateways.

---

## 3. Advanced Features (Real-World Implementation Path)

### 3.1. AI Plan Recommendations (Using Genkit with Tools)
-   **Functionality:** AI suggests the best 2-3 recharge plans tailored to the user's typical usage patterns, current balance, plan expiry, and available operator offers.
-   **Real-World Implementation (`src/ai/flows/recharge-plan-recommendation.ts`):**
    *   **Data Sources via Genkit Tools:**
        1.  `getUserRechargeHistoryTool`: Calls a secure backend API endpoint (`GET /api/users/:userId/recharge-history-summary`). This API queries the `transactions` collection in Firestore for the specific `userId`, filters for 'Recharge' type, and returns a summary of recent recharges (amount, guessed data/validity).
        2.  `getOperatorPlansTool`: Calls a backend API endpoint (`GET /api/recharge/live-plans?billerId=X&circle=Y`). This API uses `rechargeProviderService.fetchPlans` (which calls the live Recharge API Provider and utilizes Redis caching) to get current plans.
    *   **Processing with LLM (e.g., Gemini via Genkit):**
        *   The main Genkit flow (`recommendRechargePlansFlow`) passes the data from these tools to a Gemini model.
        *   **Prompt Engineering:** The prompt instructs Gemini to analyze history and live plans, consider context (balance, expiry), and recommend up to 3 diverse plans with `planId`, `name`, personalized `description`, and plan details.
    *   **Presentation:** Frontend displays these recommendations, possibly with an "AI Recommended" badge and explanations.

### 3.2. Cashback & Offers Engine
-   **Functionality:** Apply dynamic cashback offers or promotional discounts.
-   **Implementation:**
    *   An `offers` collection in Firestore stores offer rules.
    *   `rechargeController.js` calls an `offerService.js` during `processRecharge`.
    *   `offerService.js` checks against active offers (cached in Redis).
    *   Cashback credited to Zet Pay Wallet; details logged with the transaction.

### 3.3. Multiple Numbers Recharge/Management
-   **Functionality:** Save and manage multiple mobile numbers for quick recharges.
-   **Implementation:**
    *   Frontend UI to add/manage numbers.
    *   Backend stores in `users/{userId}/managedRechargeNumbers` (Firestore).
    *   Recharge page lists saved numbers.

### 3.4. Scheduled Recharges (For Prepaid)
-   **Functionality:** Allow users to schedule future prepaid recharges.
-   **Implementation:**
    *   Frontend UI for schedule setup.
    *   Backend (`rechargeController.js` via `POST /api/recharge/schedule`) saves details to `scheduledRecharges` (Firestore), including a secure payment method reference (e.g., UPI Autopay mandate ID for wallet, or tokenized card).
    *   **Scheduled Worker** (see Section 6.3) executes these tasks.

### 3.5. Recharge Activation Status Check
-   **Functionality:** Manually check the latest status of a "Pending" or "Processing Activation" recharge.
-   **Implementation:**
    *   Frontend UI button.
    *   Backend API (`GET /api/recharge/status/:transactionId`) calls the **Recharge API Provider's status check API** using the stored `operatorReferenceId`.
    *   Updates Firestore transaction and sends WebSocket update.

### 3.6. Recent Recharge Cancellation ("Recharge Undo")
-   **Functionality:** Attempt to cancel a recent prepaid recharge within a short window (operator/provider dependent).
-   **Implementation:**
    *   Frontend UI option for eligible transactions.
    *   Backend API (`POST /api/recharge/cancel/:transactionId`) calls the **Recharge API Provider's cancellation API**.
    *   If successful, updates transaction to "Cancelled", initiates refund, sends WebSocket update.

---

## 4. User Interface Flow (Real-World Examples)

### 4.1. Prepaid Mobile Recharge
1.  **Navigation:** User navigates to "Mobile Recharge" (`/recharge/mobile`).
2.  **Enter Mobile Number:** User types the 10-digit number.
3.  **Operator & Circle Auto-Detection:** As user types, debounced API call to `/api/recharge/detect-operator`. Backend uses **Telecom API**. Frontend displays result with "Edit" option.
4.  **Manual Operator/Circle Selection (If needed):** Dropdown shows operators from `/api/recharge/billers?type=Mobile` (from Recharge API Provider, cached in Redis).
5.  **Plan Browsing & Selection:**
    *   Frontend calls `/api/recharge/plans?billerId=[ID]&type=mobile...`.
    *   Backend's `rechargeProviderService.fetchPlans` gets plans from **Recharge API Provider** (cached briefly in Redis).
    *   Frontend displays categorized plans, search, details modal, comparison modal.
    *   **AI Recommendations** (from `recommendRechargePlansFlow`) are highlighted.
    *   Selecting a plan auto-fills "Amount".
6.  **Enter Amount (If no plan selected):** User inputs amount.
7.  **Payment Section:** Display "Amount Payable", payment method selection (Wallet, UPI, Card), coupon input.
8.  **Payment Authorization & Processing:** User clicks "Proceed to Pay".
    *   **Wallet:** Backend's `payViaWalletInternal`.
    *   **UPI/Card/NetBanking:** Backend initiates with **Payment Gateway**, client handles PG SDK/redirect, PG webhook confirms payment to backend.
9.  **Confirmation & Status Update:**
    *   Backend calls **Recharge API Provider** to execute recharge.
    *   Backend updates Firestore transaction, sends WebSocket `transaction_update`.
    *   Frontend displays success/pending/failure screen with details and options ("Recharge Another", "View History", "Check Status", "Attempt Cancel").

---

## 5. Key Real-World Technical Implementation Aspects

### 5.1. Security & Authentication
*   **Authentication:** All backend APIs (`/api/recharge/*`, `/api/payments/*`) protected by `authMiddleware.js` (Firebase Auth ID token verification).
*   **HTTPS:** Enforced for all client-server and server-PG/Recharge Provider communications.
*   **Input Validation:** Server-side using `express-validator`.
*   **Rate Limiting:** `express-rate-limit` in `server.js`.
*   **Sensitive Data Handling:**
    *   Never store raw UPI PINs or full card numbers/CVVs. Use Payment Gateway tokenization.
    *   API keys/secrets in environment variables (`process.env.*_KEY`), managed via secrets manager in production.
*   **Secure Webhooks:** Verify webhooks from Payment Gateways (e.g., using `process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET`).

### 5.2. Error Handling and Monitoring
*   **Standardized Error Responses:** `errorMiddleware.js` for consistent JSON errors.
*   **Provider API Error Handling (Backend):** Catch network errors, timeouts. Parse provider error codes to user-friendly messages. Log detailed provider errors. Implement retries with exponential backoff for transient errors. Consider circuit breakers.
*   **Logging (Backend):** `morgan` for HTTP logs. Detailed application-level logging to services like Google Cloud Logging or Sentry.
*   **External Monitoring & Alerting (Production):** Integrate with APM tools (Sentry, Datadog, Firebase Performance Monitoring). Set up alerts for critical errors.

### 5.3. Scheduled Recharge Worker Architecture
*   **Worker Process:** Separate backend worker or scheduled function (e.g., Node Cron on a VM, BullMQ with Redis, or Cloud Scheduler + Firebase/Cloud Function).
*   **Logic:**
    1.  Worker queries `scheduledRecharges` in Firestore for due tasks (`isActive: true`, `nextRunDate <= now()`).
    2.  For each task, securely retrieve payment method reference (e.g., UPI Autopay mandate URN, tokenized card ID).
    3.  Use Payment Gateway API to execute debit against mandate/token (NO user interaction needed).
    4.  Call internal `processRecharge` logic (or directly call Recharge Provider API).
    5.  Update `scheduledRecharges` document (status, `lastRunTransactionId`, new `nextRunDate`).
    6.  Notify user via WebSocket/FCM.

### 5.4. Blockchain Logging Details
*   **Purpose:** Immutable, auditable trail of key transaction events for transparency and dispute resolution.
*   **Data to Hash/Log:** Cryptographic hash (e.g., SHA-256) of non-PII details like Zet Pay internal `transactionId`, `timestamp`, `status`, `amountCategory` (not exact amount if sensitive), `anonymizedUserId`, `transactionType`, `billerId`. The hash is stored on-chain.
*   **Blockchain Platform:** Polygon testnet (e.g., Mumbai) or a private Ethereum network for cost-effectiveness and control.
*   **Implementation (`blockchainLogger.ts`):** Use Web3.js/Ethers.js, connect to node via `process.env.BLOCKCHAIN_NODE_URL`, interact with a smart contract at `process.env.BLOCKCHAIN_CONTRACT_ADDRESS` using a funded account (`process.env.BLOCKCHAIN_PRIVATE_KEY`). Store blockchain transaction hash back in Firestore.

### 5.5. Unit/Integration Testing Strategy
*   **Backend (Jest + Supertest):**
    *   **Unit Tests:** Test individual service functions, mocking external dependencies (Firestore, Redis, API calls).
    *   **Integration Tests:** Test controller endpoints, mock service layer. Verify interactions with Firestore, Redis, and conceptual WebSocket messages.
*   **Frontend (React Testing Library + Jest for components, Playwright/Cypress for E2E):**
    *   **Component Tests:** UI rendering, state, event handling.
    *   **Integration/E2E Tests:** Full user flows, mock `apiClient.ts` for backend responses, verify UI updates from mock WebSocket messages.
*   **Key Focus Areas:** Success/failure scenarios for payment and recharge, plan selection, operator detection, coupon application, scheduled recharges, status checks, cancellations, idempotency, WebSocket updates.

### 5.6. AI Plan Recommendation - Real Data Pipeline
*   **Backend APIs for Genkit Tools:**
    *   `GET /api/users/:userId/recharge-history-summary`: Returns summarized past recharge data from Firestore `transactions`.
    *   `GET /api/recharge/live-plans?billerId=X&circle=Y`: Returns current plans from the real Recharge API Provider (via `rechargeProviderService.fetchPlans` with Redis caching).
*   Genkit flow uses these tools to provide context to the LLM.

### 5.7. Offline/Retry Handling for Payments
*   **Client-Side (Frontend):** Use `navigator.onLine`. Disable payment buttons if offline. Provide "Retry" for network-related API call failures. Gracefully handle "Pending" state if connection lost post-initiation.
*   **Backend-Side (Idempotency):** Payment initiation APIs (`POST /api/recharge`) MUST be idempotent. Client generates unique request ID (`X-Request-ID`). Backend checks Redis/Firestore for this ID to prevent duplicate processing on retries. Use idempotency keys with Recharge Provider APIs if available. Webhook handlers also need to be idempotent (check `payment_id`/`order_id`).

---

## 6. Transitioning from Simulation to Real Application (Key Steps Summary)

1.  **Integrate Real Recharge API Providers:**
    *   Replace mock `rechargeProviderService.js` logic with SDK/API calls to providers like **PaySprint**, **RazorpayX (Recharge APIs)**, or directly with **BBPS** via an aggregator (Euronet, Setu).
    *   Securely manage API keys (`process.env.RECHARGE_API_PROVIDER_KEY`, etc.).
    *   Handle real provider API responses, error codes, and callback/webhook mechanisms for status updates.
2.  **Integrate Real Payment Gateway:**
    *   Replace mock payment logic (`payViaWalletInternal`, `processUpiPaymentInternal`, `processCardPaymentInternal`) in `rechargeController.js` with actual integrations.
    *   Use SDKs from providers like **Razorpay**, **Cashfree**, or **Stripe India**.
    *   Implement client-side PG Checkout/SDK flows for user authentication (UPI PIN, Card OTP, NetBanking login).
    *   Implement secure backend webhook handlers to receive final payment status from the PG.
3.  **Add Real User Authentication & Secure Sessions:**
    *   Ensure `authMiddleware.js` (using Firebase Admin SDK for token verification) protects all sensitive API routes.
    *   Enforce HTTPS across all communications.
    *   Fine-tune rate limiting (`express-rate-limit`).
    *   Implement CSRF protection if any form submissions directly hit backend payment endpoints without PG SDKs.
4.  **Enable Real AI Plan Recommendations:**
    *   Develop backend APIs for Genkit tools to fetch real user recharge history (from Firestore `transactions`) and live operator plans (from the real Recharge API provider).
    *   Refine Genkit flow prompt for Gemini, potentially using vector embeddings (e.g., via Vertex AI Embeddings API) of plan descriptions and user history for better similarity matching with a Vector DB (Pinecone, Vertex AI Matching Engine).
5.  **Implement Scheduled Recharges with Backend Worker:**
    *   Set up a cron job using **Node Cron** (if self-hosted Node.js), **BullMQ** (for distributed queues with Redis), or a serverless solution like **Firebase Scheduled Functions / Google Cloud Scheduler**.
    *   The worker queries `scheduledRecharges` in Firestore.
    *   For due tasks, it securely uses the stored `paymentMethodReference` (e.g., UPI Autopay mandate ID via Payment Gateway API) to execute payment.
    *   Triggers the `processRecharge` logic (or a dedicated internal version for workers).
    *   Updates schedule status, logs transaction, and notifies user (FCM/WebSocket).
6.  **Replace Mock WebSocket with Live Notification System:**
    *   For production, scale the real-time updates from `server.js` using **Socket.IO** (if Node.js backend is scaled horizontally) or integrate with **Pusher**.
    *   For mobile app push notifications, use **Firebase Cloud Messaging (FCM)** triggered by backend events.
7.  **Upgrade Transaction Logging & Blockchain:**
    *   **Firestore:** Continue using for detailed, primary transaction logs.
    *   **Blockchain (Optional but recommended for audit):**
        *   Choose a platform: Polygon (Mumbai testnet for dev, Mainnet for prod PoS L2 for lower fees), or a private Ethereum network.
        *   Smart Contract: Deploy a simple contract with a function like `logTransactionHash(string memory appTransactionId, bytes32 transactionDataHash, uint256 timestamp)`.
        *   Backend (`blockchainLogger.ts`): Use **Web3.js** or **Ethers.js**. Connect to node via `process.env.BLOCKCHAIN_NODE_URL`. Sign transactions with `process.env.BLOCKCHAIN_PRIVATE_KEY`. Call the smart contract. Store the returned blockchain transaction hash in the Firestore `transactions` document.
8.  **Add Admin Dashboard (Optional):**
    *   Develop a separate Next.js/React admin panel or use tools like Retool/Appsmith.
    *   APIs for viewing users, transactions (especially failed/pending recharges), managing offers, triggering manual refunds, and monitoring scheduled jobs.

This detailed guide within the documentation and the refactored code structure should provide a clear path for developing the mobile recharge feature into a production-grade system.
```