
# Zet Pay Super App: Mobile Recharge Feature Documentation

This document provides a comprehensive overview of the Mobile Recharge feature within the Zet Pay application, detailing its functionalities, user interface flow, and technical implementation.

## 1. Introduction

The Mobile Recharge feature allows users to easily top-up their prepaid mobile connections or pay their postpaid mobile bills for various operators across India. It aims to provide a seamless and quick experience, incorporating smart features like operator auto-detection and plan recommendations.

## 2. Core Functionalities

### 2.1. Operator & Circle Auto-Detection (Simulated for Web)
-   **Functionality:** When a user enters a 10-digit mobile number, the system attempts to automatically detect the telecom operator (e.g., Airtel, Jio, Vi, BSNL) and the telecom circle (e.g., Karnataka, Maharashtra).
-   **Implementation (Web Simulation):**
    -   The frontend (`src/app/(features)/recharge/[type]/page.tsx`) captures the mobile number.
    -   It calls a backend API endpoint (`POST /api/recharge/detect-operator`).
    -   The backend service (`rechargeProviderService.js`) simulates this detection (since direct SIM/network info access isn't possible in a web app) and returns a mock operator and circle.
-   **User Feedback:** Detected operator and circle are displayed to the user.

### 2.2. Manual Operator & Circle Selection
-   **Functionality:** If auto-detection fails or the user wishes to change the operator/circle, they can manually select from a list.
-   **Implementation:**
    -   The frontend fetches a list of available operators for "Mobile" type from the backend (`GET /api/recharge/billers?type=Mobile`).
    -   The backend service (`rechargeProviderService.js`) provides this list, utilizing **Redis caching** to improve performance for frequently accessed operator data.
    -   The user selects the operator from a dropdown. Circle selection can be a subsequent step or part of the operator data if needed.

### 2.3. Recharge Plan Browsing & Selection
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

### 2.4. Manual Amount Entry
-   **Functionality:** Users can directly enter a recharge amount if they don't want to select a specific plan or if a plan is not listed.
-   **Implementation:** An input field is provided for manual amount entry.

### 2.5. Payment Processing
-   **Functionality:** Users can pay for the recharge using various methods:
    -   Zet Pay Wallet
    -   UPI (from linked bank accounts)
    -   Credit/Debit Card (Conceptual - UI placeholder, backend not fully integrated for live card processing)
    -   Net Banking (Conceptual)
-   **Implementation:**
    -   Frontend collects payment details and calls `POST /api/recharge`.
    -   Backend controller (`rechargeController.js`) simulates payment deduction based on the chosen method.
    *   For Wallet: Calls internal wallet service.
    *   For UPI: Simulates UPI PIN verification and calls mock UPI provider.
    *   For Card/Net Banking: Placeholder logic.
    -   Calls the (mock) `rechargeProviderService.executeRecharge` to simulate the recharge with the telecom operator.

### 2.6. Transaction Logging & Status Updates
-   **Functionality:** All recharge attempts (successful, pending, failed) are logged. Users receive real-time status updates.
-   **Implementation:**
    -   Backend (`rechargeController.js`) uses `transactionLogger.ts` to save the transaction details to **Firestore**.
    -   The logger also invokes a simulated **blockchain logging** step.
    -   The backend sends real-time transaction status updates to the client via **WebSockets** using the `sendToUser` function in `server.js`.
    -   Frontend subscribes to these WebSocket messages to update the UI.

### 2.7. Recharge History
-   **Functionality:** Users can view their past mobile recharges.
-   **Implementation:** This is part of the main Transaction History feature (`/history`), which fetches data from the `transactions` collection in Firestore.

## 3. Advanced Features

### 3.1. AI Plan Recommendations
-   **Functionality (Conceptual):** An AI model suggests the best recharge plans based on the user's past usage, current balance, and operator offers.
-   **Implementation (Placeholder):** A Genkit flow (`src/ai/flows/recharge-plan-recommendation.ts`) exists for this, but its integration into the recharge UI is primarily conceptual at this stage.

### 3.2. Scheduled Recharges
-   **Functionality:** Users can schedule recharges to occur automatically at a future date and set frequency (monthly, weekly).
-   **Implementation:**
    -   Frontend UI allows setting up schedule parameters.
    -   Backend (`POST /api/recharge/schedule` and `DELETE /api/recharge/schedule/:scheduleId`) saves and manages these schedules in the `scheduledRecharges` Firestore collection.
    -   *Note: Actual execution of scheduled recharges would require a separate backend worker/cron job, which is not implemented.*

### 3.3. Recharge Activation Status Check
-   **Functionality:** For recharges that go into a "Processing Activation" state, users can check the latest status.
-   **Implementation (Simulated):**
    -   Frontend calls `GET /api/recharge/status/:transactionId`.
    -   Backend (`rechargeController.js`) calls the (mock) `rechargeProviderService.getActivationStatus`.

### 3.4. Recent Recharge Cancellation
-   **Functionality:** Users can attempt to cancel a recently made recharge within a short, simulated time window (e.g., 30 minutes).
-   **Implementation (Simulated):**
    -   Frontend calls `POST /api/recharge/cancel/:transactionId`.
    -   Backend (`rechargeController.js`) checks the transaction time, calls the (mock) `rechargeProviderService.cancelRecharge`, and updates the transaction status in Firestore.

### 3.5. Coupon Code Application
-   **Functionality:** Users can enter a coupon code to get discounts on their recharge.
-   **Implementation (Conceptual Backend):**
    -   Frontend provides an input for coupon codes.
    -   The backend (`processRecharge` in `rechargeController.js`) receives the coupon code. The actual validation and discount application logic by a coupon engine is currently mocked. The applied coupon is logged with the transaction.

## 4. User Interface Flow

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
9.  **Payment Authorization:**
    *   If UPI, user is prompted for UPI PIN (simulated on web).
    *   Wallet payment is processed if balance is sufficient.
10. **Confirmation:** A success, pending, or failure message is displayed. Transaction details are shown.
11. Options to "Set Reminder" or "Setup Autopay" may be presented for successful recharges.
12. User can check "Activation Status" or "Cancel Recharge" for recent transactions via the history page or specific UI elements.

## 5. Technical Implementation Details

### 5.1. Frontend Components
-   **Page:** `src/app/(features)/recharge/[type]/page.tsx` (handles UI for `type=mobile`)
-   **Client-Side Service:** `src/services/recharge.ts` (functions to interact with backend APIs)
-   **UI Components:** ShadCN UI components (`Card`, `Button`, `Input`, `Select`, `Dialog`, `Accordion`, `Tabs`, `Toast`, etc.)

### 5.2. Backend Components
-   **Routes:** `backend/routes/rechargeRoutes.js`
    -   `GET /billers`: Fetches list of operators.
    -   `GET /plans`: Fetches recharge plans.
    -   `POST /`: Processes the recharge.
    -   `POST /detect-operator`: Simulates operator detection.
    -   `POST /schedule`: Creates a scheduled recharge.
    -   `DELETE /schedule/:scheduleId`: Cancels a scheduled recharge.
    -   `GET /status/:transactionId`: Checks activation status.
    -   `POST /cancel/:transactionId`: Attempts to cancel a recharge.
-   **Controller:** `backend/controllers/rechargeController.js`
    -   Contains methods to handle requests for the above routes, validate input, and call appropriate services.
    -   Manages the core recharge processing flow, including payment simulation, provider interaction, transaction logging, and WebSocket updates.
-   **Service (Provider Simulation & Caching):** `backend/services/rechargeProviderService.js`
    -   Mocks interactions with external recharge aggregators/operators.
    -   Implements **Redis caching** for operator lists and recharge plans to reduce latency and load on (mocked) external systems. Uses `backend/config/redisClient.js`.
-   **Transaction Logging:** `backend/services/transactionLogger.ts`
    -   Centralized service for creating transaction records in Firestore.
    -   Includes a call to `backend/services/blockchainLogger.ts` for simulated blockchain logging.
-   **Real-time Updates:**
    -   `backend/server.js`: Manages WebSocket connections and includes the `sendToUser` function.
    -   `src/lib/websocket.ts`: Client-side WebSocket handling for receiving updates.

### 5.3. Data Storage
-   **Firestore (`firestore.schemas.md`):**
    -   `transactions` collection: Stores records of all recharge attempts and their final status. Includes fields like `type` ('Recharge'), `identifier` (mobile number), `amount`, `status`, `operatorReferenceId`, `couponCodeApplied`, `paymentMethodUsed`, etc.
    -   `scheduledRecharges` collection: Stores details of user-scheduled recharges (`userId`, `identifier`, `amount`, `frequency`, `nextRunDate`, `billerId`, `planId`, `isActive`).
-   **Redis:**
    -   Used as a cache for operator lists (`billers_v3:Mobile`) and recharge plans (`plans_v3:<billerId>:mobile:<identifier>`).
    -   Client configuration in `backend/config/redisClient.js`.

### 5.4. Security Considerations (Conceptual for Web Simulation)
-   While true SIM-based verification isn't possible on the web, the backend would typically expect authenticated requests for all payment-related actions.
-   Input validation is performed on both frontend and backend.
-   Secure handling of payment information (like UPI PINs, card details) is critical and would be managed by secure elements/SDKs in a native app, and by the PSP/bank environment in a real UPI flow. In this web simulation, these are mocked for UI flow only.

This detailed structure provides a robust, albeit simulated, Mobile Recharge feature within the Zet Pay super app, emphasizing a good user experience and a backend-driven approach.

