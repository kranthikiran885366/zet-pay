
# Zet Pay Super App: Mobile Recharge Feature Documentation

This document provides a comprehensive overview of the Mobile Recharge feature within the Zet Pay application, detailing its functionalities, user interface flow, and technical implementation.

## 1. Introduction

The Mobile Recharge feature allows users to easily top-up their prepaid mobile connections or pay their postpaid mobile bills for various operators across India. It aims to provide a seamless and quick experience, incorporating smart features like operator auto-detection and plan recommendations.

## 2. Core Functionalities

### 2.1. Operator & Circle Auto-Detection (Simulated for Web)
-   **Functionality:** When a user enters a 10-digit mobile number, the system attempts to automatically detect the telecom operator (e.g., Airtel, Jio, Vi, BSNL) and the telecom circle (e.g., Karnataka, Maharashtra).
-   **Implementation (Web Simulation):**
    -   Frontend (`src/app/(features)/recharge/[type]/page.tsx` or `/src/app/(features)/bills/mobile-postpaid/page.tsx`) captures the mobile number.
    -   It calls a backend API endpoint (`POST /api/recharge/detect-operator`).
    -   The backend service (`rechargeProviderService.js`) simulates this detection (since direct SIM/network info access isn't possible in a web app) and returns a mock operator and circle.
-   **User Feedback:** Detected operator and circle are displayed to the user.

### 2.2. Manual Operator & Circle Selection
-   **Functionality:** If auto-detection fails or the user wishes to change the operator/circle, they can manually select from a list.
-   **Implementation:**
    -   The frontend fetches a list of available operators for "Mobile" or "Mobile Postpaid" type from the backend (`GET /api/recharge/billers?type=Mobile` or `/api/bills/billers?type=Mobile Postpaid`).
    -   The backend service (`rechargeProviderService.js` or `billProviderService.js`) provides this list, utilizing **Redis caching** to improve performance for frequently accessed operator data.
    -   The user selects the operator from a dropdown.

### 2.3. Recharge Plan Browsing & Selection (For Prepaid)
-   **Functionality:** Users can browse available recharge plans for the selected operator and circle. This includes:
    -   Categorized plans (e.g., Popular, Data, Unlimited, Top-up).
    -   Searching for specific plans.
    -   Viewing plan details (price, validity, data, talktime, SMS).
    -   Comparing up to 3 plans side-by-side.
    -   Viewing detailed tariff information for a plan.
-   **Implementation:**
    -   Frontend fetches plans from `GET /api/recharge/plans?billerId=...&type=mobile&identifier=...`.
    -   Backend service (`rechargeProviderService.js`) provides plan data, with **Redis caching**.
    -   UI elements like tabs, search input, modals for comparison and tariff details are used on the frontend.

### 2.4. Bill Fetching (For Postpaid)
-   **Functionality:** After entering mobile number and operator selection (auto or manual), the system automatically fetches outstanding bill amount, due date, and customer name.
-   **Implementation:**
    -   Frontend (`/src/app/(features)/bills/mobile-postpaid/page.tsx`) calls `GET /api/bills/details/mobile-postpaid/:identifier?billerId=...`.
    -   Backend controller (`billsController.js`) and service (`billProviderService.js`) simulate fetching bill details from a provider (e.g., BBPS).

### 2.5. Manual Amount Entry
-   **Functionality:** Users can directly enter a recharge/payment amount if they don't want to select a specific plan or if a bill is not fetched automatically.
-   **Implementation:** An input field is provided for manual amount entry.

### 2.6. Payment Processing
-   **Functionality:** Users can pay for the recharge/bill using various methods:
    -   Zet Pay Wallet
    -   UPI (from linked bank accounts)
    -   Credit/Debit Card (Conceptual - UI placeholder, backend not fully integrated for live card processing)
    -   Net Banking (Conceptual)
    -   BNPL (Conceptual)
-   **Implementation:**
    -   Frontend collects payment details and calls `POST /api/recharge` (for prepaid) or `POST /api/bills/pay/mobile-postpaid` (for postpaid).
    -   Backend controllers (`rechargeController.js`, `billsController.js`) simulate payment deduction based on the chosen method.
    -   Calls the (mock) `rechargeProviderService.executeRecharge` or `billProviderService.payBill` to simulate the transaction with the telecom operator.

### 2.7. Transaction Logging & Status Updates
-   **Functionality:** All recharge/payment attempts (successful, pending, failed) are logged. Users receive real-time status updates.
-   **Implementation:**
    -   Backend (`rechargeController.js`, `billsController.js`) uses `transactionLogger.ts` to save the transaction details to **Firestore**.
    -   The logger also invokes a simulated **blockchain logging** step.
    -   The backend sends real-time transaction status updates to the client via **WebSockets** using the `sendToUser` function in `server.js`.
    -   Frontend subscribes to these WebSocket messages to update the UI.

### 2.8. Recharge/Bill Payment History
-   **Functionality:** Users can view their past mobile recharges and postpaid bill payments.
-   **Implementation:** This is part of the main Transaction History feature (`/history`), which fetches data from the `transactions` collection in Firestore.

### 2.9. Reminder Notifications
-   **Functionality:** Notify users before their postpaid bill due date.
-   **Implementation:**
    -   Frontend: After a successful postpaid payment, a "Set Reminder" button can navigate to the reminders page or call a backend service.
    -   Backend: A conceptual `/api/reminders` endpoint (in `reminderController.js`) saves reminder details to Firestore. Actual notification dispatch requires a separate worker.

---

## 3. Advanced Features

### 3.1. Auto-Pay Setup (For Postpaid)
-   **Functionality:** Allow users to set up automatic debit for monthly postpaid bills.
-   **Implementation:**
    -   Frontend: A "Setup Autopay" button after successful payment navigates to `/autopay/setup` with pre-filled data.
    -   Backend: Manages UPI Autopay mandate creation via `autopayController.js`.

### 3.2. AI Plan Recommendations (For Prepaid - Conceptual)
-   **Functionality (Conceptual):** An AI model suggests the best recharge plans based on the user's past usage, current balance, and operator offers.
-   **Implementation (Placeholder):** A Genkit flow (`src/ai/flows/recharge-plan-recommendation.ts`) exists for this, but its integration into the recharge UI is primarily conceptual at this stage.

### 3.3. AI-Based Bill Forecasting (For Postpaid - Conceptual)
-   **Functionality (Conceptual):** AI analyzes past bill amounts and usage patterns to predict the next month's bill and alert for high usage.
-   **Implementation (Conceptual):** Would require a Genkit flow analyzing transaction history for postpaid bills.

### 3.4. Smart Bill Split (For Postpaid Family Plans - Conceptual)
-   **Functionality (Conceptual):** Allow splitting the bill for family plans and sending UPI requests for shared amounts.
-   **Implementation (Conceptual):** Would involve UI for splitting, contact selection, and UPI request initiation.

### 3.5. Cashback & Offers Engine
-   **Functionality:** Integrate dynamic offers based on operator, payment method, or amount.
-   **Implementation:**
    -   Frontend: Displays available offers. Coupon code input on payment screen.
    -   Backend: `offerService.js` would validate coupons (mocked for now). Recharge/Bill controllers log applied coupons. Cashback logic is conceptual, would credit the user's wallet.

### 3.6. Multiple Numbers Recharge/Management
-   **Functionality (Conceptual):** UI to save and manage multiple mobile numbers (e.g., family members) for quick recharges/bill payments.
-   **Implementation (Conceptual):** Would extend user profile or contacts to tag numbers for quick access.

### 3.7. Scheduled Recharges (For Prepaid)
-   **Functionality:** Users can schedule recharges to occur automatically at a future date and set frequency (monthly, weekly).
-   **Implementation:**
    -   Frontend UI allows setting up schedule parameters.
    -   Backend (`POST /api/recharge/schedule` and `DELETE /api/recharge/schedule/:scheduleId`) saves and manages these schedules in the `scheduledRecharges` Firestore collection.
    -   *Note: Actual execution of scheduled recharges would require a separate backend worker/cron job, which is not implemented.*

### 3.8. Recharge Activation Status Check
-   **Functionality:** For recharges that go into a "Processing Activation" state, users can check the latest status.
-   **Implementation (Simulated):**
    -   Frontend calls `GET /api/recharge/status/:transactionId`.
    -   Backend (`rechargeController.js`) calls the (mock) `rechargeProviderService.getActivationStatus`.

### 3.9. Recent Recharge Cancellation
-   **Functionality:** Users can attempt to cancel a recently made prepaid recharge within a short, simulated time window (e.g., 30 minutes).
-   **Implementation (Simulated):**
    -   Frontend calls `POST /api/recharge/cancel/:transactionId`.
    -   Backend (`rechargeController.js`) checks the transaction time, calls the (mock) `rechargeProviderService.cancelRecharge`, and updates the transaction status in Firestore.

### 3.10. Smartwatch Integration (Conceptual)
-   **Functionality (Conceptual):** Show upcoming bill alerts and one-tap pay options on wearables.
-   **Implementation (Conceptual):** Would require native companion apps and watchOS/Wear OS development.

---

## 4. User Interface Flow

### 4.1. Prepaid Mobile Recharge
1.  User navigates to "Mobile Recharge" (e.g., from Home or Services page).
2.  Enters their 10-digit mobile number.
3.  **Auto-Detection:** System attempts to detect operator and circle.
    *   **Success:** Operator/circle displayed. User can proceed or click "Edit" for manual selection.
    *   **Failure:** User is prompted to select operator manually.
4.  **Manual Selection (if needed):** User selects operator from a list.
5.  **Plan Display:** Recharge plans for the selected operator are displayed, categorized.
    *   User can browse plans, search, compare, or view tariff details.
    *   Alternatively, user can directly enter a recharge amount.
6.  User selects a plan (amount is auto-filled) or enters an amount manually.
7.  **Payment Section:**
    *   User can enter an optional coupon code.
    *   User selects a payment method (Wallet, UPI, Card - conceptual).
8.  User clicks "Proceed to Pay".
9.  **Payment Authorization:** (e.g., UPI PIN entry for UPI payments).
10. **Confirmation:** A success, pending, or failure message is displayed. Transaction details are shown.
11. Options to "Set Reminder" (conceptual for prepaid unless it's for next recharge of same plan), "Schedule Recharge", "Check Activation Status", or "Cancel Recharge" may be presented.

### 4.2. Postpaid Mobile Bill Payment
1.  User navigates to "Mobile Postpaid" (e.g., from Recharge & Bills).
2.  Enters their 10-digit mobile number.
3.  **Operator Auto-Detection:** System attempts to detect operator. Manual override available.
4.  **Bill Fetch:** System automatically attempts to fetch bill details (amount, due date, customer name).
    *   **Success:** Bill details displayed. Amount field pre-filled.
    *   **Failure:** User prompted to enter bill amount manually.
5.  User confirms/enters amount.
6.  **Payment Section:**
    *   User can enter an optional coupon code.
    *   User selects payment method.
7.  User clicks "Proceed to Pay".
8.  **Payment Authorization.**
9.  **Confirmation:** Success, pending, or failure message displayed.
10. Options to "Set Reminder" or "Setup Autopay" presented for successful payments.

---

## 5. Technical Implementation Details

### 5.1. Frontend Components
-   **Pages:**
    -   `src/app/(features)/recharge/[type]/page.tsx` (handles UI for `type=mobile` - prepaid)
    -   `src/app/(features)/bills/mobile-postpaid/page.tsx` (handles UI for mobile postpaid)
-   **Client-Side Services:**
    -   `src/services/recharge.ts` (functions to interact with backend recharge APIs)
    -   `src/services/bills.ts` (functions for postpaid bill fetch/pay)
-   **UI Components:** ShadCN UI components (`Card`, `Button`, `Input`, `Select`, `Dialog`, `Accordion`, `Tabs`, `Toast`, etc.)

### 5.2. Backend Components
-   **Routes:**
    -   `backend/routes/rechargeRoutes.js` (for prepaid)
    -   `backend/routes/billsRoutes.js` (for postpaid)
-   **Controllers:**
    -   `backend/controllers/rechargeController.js`
    -   `backend/controllers/billsController.js`
    -   These controllers handle requests, validate input, call appropriate services, manage transaction logging, and WebSocket updates.
-   **Services (Provider Simulation & Caching):**
    -   `backend/services/rechargeProviderService.js` (for prepaid specific operations like plans)
    -   `backend/services/billProviderService.js` (for postpaid bill fetching)
    -   Both services mock interactions with external aggregators/operators and implement **Redis caching** for operator lists, recharge plans, and biller lists. Uses `backend/config/redisClient.js`.
-   **Transaction Logging:** `backend/services/transactionLogger.ts`
    -   Centralized service for creating transaction records in Firestore.
    -   Includes a call to `backend/services/blockchainLogger.ts` for simulated blockchain logging.
-   **Real-time Updates:**
    -   `backend/server.js`: Manages WebSocket connections and includes the `sendToUser` function.
    -   `src/lib/websocket.ts`: Client-side WebSocket handling for receiving updates.

### 5.3. Data Storage
-   **Firestore (`firestore.schemas.md`):**
    -   `transactions` collection: Stores records of all recharge/bill payment attempts.
    -   `scheduledRecharges` collection: Stores details of user-scheduled prepaid recharges.
    -   `reminders` collection: Stores user-set bill payment reminders.
    -   `autopayMandates` collection (under `users/{userId}/`): Stores UPI Autopay mandates.
-   **Redis:**
    -   Used as a cache for operator lists, recharge plans, and biller lists.
    -   Client configuration in `backend/config/redisClient.js`.

### 5.4. Security & Authentication
-   **Authentication:** All relevant backend API endpoints are protected by `authMiddleware.js` which verifies Firebase ID tokens.
-   **HTTPS:** Assumed to be enforced by the hosting environment (Vercel, Google Cloud Run).
-   **Input Validation:** Implemented in route definitions (e.g., `rechargeRoutes.js`) using `express-validator`.
-   **Rate Limiting:** Basic rate limiting applied to API routes in `server.js`.
-   **Sensitive Data:**
    -   UPI PINs are not stored; they are (conceptually) passed directly to the UPI provider during payment authorization.
    -   Card details (if implemented for real) would be tokenized by a PCI-DSS compliant payment gateway.
-   **CSRF Protection:** Less critical for API-only backend if not serving web forms, but important for any admin UIs.

### 5.5. Error Handling and Monitoring
-   **Standardized Error Responses:** `errorMiddleware.js` in the backend ensures consistent JSON error responses with appropriate HTTP status codes.
-   **Logging:** Backend uses `morgan` for HTTP request logging. Detailed error logging happens within controllers and services.
-   **Provider Timeouts/Failures:** Mock provider services (`rechargeProviderService.js`, `billProviderService.js`) simulate different success/failure/pending scenarios. Real integrations would need robust error handling for API calls to telecom operators/aggregators, including retry mechanisms and clear user feedback.
-   **External Monitoring (Conceptual):** For a production system, integrate with services like Sentry, Datadog, or Firebase Crashlytics for error tracking and performance monitoring on both frontend and backend.

### 5.6. Scheduled Recharge Worker Architecture (Conceptual)
-   A separate backend worker process/service (not part of the Express API server) would be responsible for executing scheduled recharges.
-   **Trigger Mechanism:** Could use:
    -   **Node Cron** or similar library if the backend server is long-running.
    -   **Cloud Scheduler (GCP)** or AWS EventBridge (Lambda) for serverless environments. This is generally more robust.
-   **Process:**
    1.  Worker queries the `scheduledRecharges` Firestore collection for tasks where `nextRunDate` is due and `isActive` is true.
    2.  For each due task, it securely fetches necessary user payment credentials (e.g., a tokenized payment method or permission to use default UPI if mandate exists – complex for non-mandated UPI).
    3.  Calls the `processRecharge` logic (or a dedicated internal version of it) to execute the recharge.
    4.  Updates the `scheduledRecharges` document with the `lastRunStatus`, `lastRunTransactionId`, and calculates the next `nextRunDate` based on `frequency`.
    5.  Handles retries for transient failures (e.g., operator temporarily down).
    6.  Notifies the user of success or persistent failure.

### 5.7. Blockchain Logging Details
-   **Purpose:** The current simulated blockchain logging (`blockchainLogger.ts`) serves as a conceptual placeholder for creating an immutable audit trail of transactions. In a real system, it could enhance transparency and trust.
-   **Data Stored (Simulated):** A hash of key transaction details (e.g., transaction ID, user ID, amount, type, timestamp, recipient/biller identifier) is "logged".
-   **Platform (Conceptual):** Could be a private permissioned blockchain (like Hyperledger Fabric) for internal auditability or a public ledger (like Polygon, Ethereum L2s) for user-verifiable transparency, depending on the goals and cost considerations.
-   **Regulatory Compliance:** Real blockchain integration for financial transactions has significant regulatory implications that would need careful consideration.

### 5.8. Offline/Retry Handling (Client & Backend Conceptual)
-   **Client-Side (Frontend):**
    -   **Network Detection:** App should detect if the user's device is offline before attempting a payment.
    -   **Retry UI:** If an API call fails due to network issues, provide a "Retry" button.
    -   **Pending State Management:** If a payment goes into a "Pending" state, the UI should reflect this and periodically re-check status or rely on WebSocket updates.
-   **Backend-Side:**
    -   **Idempotency:** Critical payment-initiating APIs (`POST /api/recharge`, `POST /api/bills/pay/...`) should ideally be idempotent. If the client retries due to a network error after the backend has already started processing, the backend should recognize the duplicate request (e.g., via a unique client-generated request ID or by checking recent transactions for the same parameters) and return the status of the original request without reprocessing. This is not fully implemented in the current mock setup but is a key production consideration.
    -   **UPI Timeout/Retry:** UPI transactions can have complex timeout scenarios. The backend (via PSP integration) needs to handle these, potentially polling the PSP for final status if an initial response is not received.

---

## 6. Testing Strategy (Conceptual)

### 6.1. Backend
-   **Unit Tests (Jest):**
    -   Test individual functions in services (e.g., `rechargeProviderService.js` mock responses, `transactionLogger.ts` data formatting).
    -   Mock Firestore, Redis, and external provider calls.
-   **Integration Tests (Jest + Supertest):**
    -   Test controller logic by making HTTP requests to API endpoints.
    -   Verify interactions between controllers, services, and mocked data layers (Firestore, Redis).
    -   Test authentication middleware.
-   **Focus Areas:**
    -   Correctness of payment processing logic (deduction, provider call, logging).
    -   Caching logic in `rechargeProviderService.js` and `billProviderService.js`.
    -   Error handling and status code responses.
    -   Scheduled recharge creation/cancellation logic.

### 6.2. Frontend
-   **Unit Tests (Jest + React Testing Library):**
    -   Test individual React components (e.g., plan selection, amount input, modals).
    -   Mock service calls (`src/services/recharge.ts`, `src/services/bills.ts`).
-   **Integration Tests (React Testing Library):**
    -   Test user flows within the recharge/postpaid pages (e.g., entering number, selecting plan, submitting form).
-   **End-to-End Tests (Playwright/Cypress):**
    -   Simulate full user scenarios from page load to (mocked) payment confirmation.
    -   Verify UI updates based on WebSocket messages (requires test setup for WS).
-   **Focus Areas:**
    -   Correct rendering of operator and plan data.
    -   Form validation and submission logic.
    -   Handling of loading states and error messages.
    -   Responsiveness of the UI.

### 6.3. Edge Cases
-   Invalid mobile number/identifier formats.
-   Operator/provider API downtime (simulated).
-   Insufficient wallet/bank balance (simulated).
-   Duplicate recharge attempts within a short window.
-   Cancellation of already processed or failed recharges.

---

## 7. AI Plan Recommendation - Future Expansion (Conceptual)

-   **Data Source:** User's transaction history (specifically mobile recharges) stored in Firestore.
-   **Processing:**
    -   Fetch historical recharge data (plan ID, amount, validity, date) for the user.
    -   Analyze patterns: frequency of recharge, average data consumption (inferred from plan details), preferred validity, common recharge amounts.
    -   **Option 1 (Rule-Based/Statistical):** If current balance is low or validity is expiring soon, suggest similar past plans or plans with slightly better value.
    -   **Option 2 (LLM-Powered - Genkit/Gemini):**
        *   Pass summarized usage history and currently available plans to a Genkit flow (`src/ai/flows/recharge-plan-recommendation.ts`).
        *   Prompt the LLM to act as a "Telecom Advisor" and recommend the top 2-3 plans, explaining why.
        *   Example input to LLM: "User typically recharges with 2GB/day for 28 days. Current popular plans are X, Y, Z. Which is best?"
-   **Presentation:** Display recommended plans prominently in the UI, possibly with a "Recommended by AI" badge.
-   **Timeline:** This is a future roadmap item, requiring further data analysis capabilities and potentially LLM integration.

---

## 8. Additional Enhancements (Optional Features for Future)

| Feature                          | Description                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| **Multi-Language Support**       | Add i18n for Hindi, Telugu, etc., for UI and plan descriptions.                     |
| **Smartwatch Recharge Reminder** | Send recharge reminders and quick-pay options to paired smart devices.              |
| **Usage Analytics (Prepaid)**    | Show user graphs of their mobile data/talktime usage patterns based on recharge history. |
| **Group Recharge**               | Allow recharging for multiple saved numbers in a single transaction.                |
| **Referral Bonuses for Recharge**| If someone recharges using a shared link/code, both referrer and referee get rewards. |
| **Voice-Based Recharge (AI)**    | Integrate voice commands (e.g., "Recharge my mobile with ₹239 plan") using conversational AI. |

---

This detailed structure provides a robust, albeit simulated, Mobile Recharge and Postpaid Bill Payment feature set within the Zet Pay super app, emphasizing a good user experience and a backend-driven approach.
