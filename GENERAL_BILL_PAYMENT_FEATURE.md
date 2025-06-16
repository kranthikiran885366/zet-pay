
# Zet Pay Super App: General Bill Payment Feature Documentation

This document outlines the functionalities for various bill payments (excluding Mobile Postpaid and Recharges which have separate detailed documentation) within the Zet Pay application.

## 1. Introduction

Zet Pay provides a unified platform for users to pay a wide array of bills, including utilities (Electricity, Water, Piped Gas, Broadband), DTH, FASTag, insurance premiums, loan EMIs, education fees, and more. The goal is to offer a convenient, secure, and efficient bill payment experience.

## 2. Core Functionalities

### 2.1. Biller Discovery & Selection
-   **Functionality:** Users can select the type of bill they want to pay and then choose their specific biller/provider from a categorized list.
-   **Implementation:**
    -   Frontend: Bill payment pages (e.g., `/src/app/(features)/bills/[type]/page.tsx`, `/src/app/(features)/recharge/dth/page.tsx`, `/src/app/(features)/recharge/fastag/page.tsx`) fetch and display billers based on the category.
    -   Backend:
        -   Route: `GET /api/bills/billers?type=...` (for most bills) or `GET /api/recharge/billers?type=...` (for DTH, FASTag).
        -   Controller: `billsController.js` or `rechargeController.js`.
        -   Service: `billProviderService.js` or `rechargeProviderService.js` fetches biller lists (from mock data or simulated external source).
    -   **Redis Caching:** Biller lists are cached on the backend (in `billProviderService.js` and `rechargeProviderService.js`) to improve performance.

### 2.2. Bill Fetching (where applicable)
-   **Functionality:** For many billers (e.g., electricity, postpaid mobile, some DTH accounts), users can enter their consumer/account identifier, and the app will attempt to fetch the outstanding bill amount and due date automatically.
-   **Implementation:**
    -   Frontend: After selecting a biller and entering the identifier, a "Fetch Bill" button or auto-fetch mechanism triggers an API call.
    -   Backend:
        -   Route: `GET /api/bills/details/:type/:identifier?billerId=...`.
        -   Controller: `billsController.js` (`fetchBillDetails`).
        -   Service: `billProviderService.js` (`fetchBill`) simulates querying the biller's system (e.g., BBPS) and returns mock bill details (amount, due date, consumer name).
    -   If bill fetch is successful, the amount is pre-filled. If not, or for billers not supporting auto-fetch, the user can enter the amount manually.

### 2.3. Manual Amount Entry
-   **Functionality:** Users can manually enter the payment amount if bill fetching is not supported, fails, or if they wish to make a partial/advance payment (where allowed by the biller).
-   **Implementation:** Standard input field on the frontend payment pages.

### 2.4. Payment Processing
-   **Functionality:** Users can pay their bills using various methods:
    -   Zet Pay Wallet
    -   UPI (from linked bank accounts)
    -   Credit/Debit Card (Conceptual - UI placeholder)
    -   Net Banking (Conceptual)
-   **Implementation:**
    -   Frontend: Collects payment details (amount, chosen method, UPI PIN for UPI, mock card details).
    -   Backend:
        -   Route: `POST /api/bills/pay/:type` or `POST /api/recharge` (for DTH/FASTag).
        -   Controller: `billsController.js` (`processBillPayment`) or `rechargeController.js` (`processRecharge`).
        -   Logic:
            *   Simulates payment deduction based on the chosen method (calls `payViaWalletInternal`, `processUpiPaymentInternal`, or `processCardPaymentInternal`).
            *   Calls the (mock) `billProviderService.payBill` or `rechargeProviderService.executeRecharge` to simulate payment to the biller.
            *   Handles success/pending/failure responses from the provider.
            *   Logs the transaction to Firestore via `transactionLogger.ts`.
            *   Sends real-time transaction status updates via WebSockets.

### 2.5. Transaction Logging & Status Updates
-   **Functionality:** All bill payment attempts are logged with their status. Users receive real-time updates.
-   **Implementation:**
    -   Backend: `transactionLogger.ts` saves details to Firestore (`transactions` collection). Simulated blockchain logging is also invoked.
    -   WebSockets: `sendToUser` function in `server.js` pushes updates to the client.
    -   Frontend: Subscribes to WebSocket messages to update UI.

### 2.6. Bill Payment History
-   **Functionality:** Users can view their past bill payments, filterable by type, status, date.
-   **Implementation:** Part of the main Transaction History feature (`/src/app/(features)/history/page.tsx`), which fetches data from the `transactions` collection in Firestore.

## 3. Supported Bill Categories (Examples)

*   **DTH Recharge:** `/src/app/(features)/recharge/dth/page.tsx`
*   **FASTag Recharge:** `/src/app/(features)/recharge/fastag/page.tsx`
*   **Electricity Bill:** `/src/app/(features)/bills/electricity/page.tsx` (and Prepaid via `/recharge/electricity`)
*   **Water Bill:** `/src/app/(features)/bills/water/page.tsx`
*   **Piped Gas Bill:** `/src/app/(features)/bills/gas/page.tsx`
*   **Broadband/Landline Bill:** `/src/app/(features)/bills/broadband/page.tsx`
*   **Loan EMI Repayment:** `/src/app/(features)/bills/loan/page.tsx`
*   **Insurance Premium Payment:** `/src/app/(features)/insurance/[type]/page.tsx`
*   **Education Fees:** `/src/app/(features)/bills/education/page.tsx`
*   **Credit Card Bill Payment:** `/src/app/(features)/bills/credit-card/page.tsx`
*   **Cable TV Bill:** `/src/app/(features)/cable-tv/page.tsx`
*   **Housing Society Dues:** `/src/app/(features)/housing-society/page.tsx`
*   **Club Fees:** `/src/app/(features)/club-fees/page.tsx`
*   **Municipal Taxes (Property Tax):** `/src/app/(features)/property-tax/page.tsx`
*   **Other Subscriptions:** `/src/app/(features)/bills/subscription/page.tsx`

## 4. Advanced Features (Conceptual / Partially Implemented)

### 4.1. Bill Reminders
-   **Functionality:** Users can set reminders for upcoming bill payments.
-   **Implementation:**
    -   Frontend: UI in `/src/app/(features)/reminders/page.tsx`.
    -   Backend: `POST /api/reminders` saves reminders to Firestore (`reminders` collection).
    -   *Note: Actual notification triggering would require a separate backend worker.*

### 4.2. Auto-Pay (UPI Mandates)
-   **Functionality:** Users can set up automatic payments for recurring bills using UPI Autopay.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/autopay/page.tsx` and `/src/app/(features)/autopay/setup/page.tsx`.
    -   Backend: Manages mandate setup and status via `autopayController.js`.

### 4.3. Coupon Code Application
-   **Functionality:** Users can apply coupon codes for discounts on bill payments.
-   **Implementation:**
    -   Frontend: Input field for coupon codes on payment pages.
    -   Backend: `processBillPayment` / `processRecharge` controllers receive the coupon code. Mock logic for validation; applied coupon is logged with the transaction.

## 5. Technical Implementation Summary

-   **Frontend:** React components using ShadCN UI, API calls via `src/services/bills.ts` and `src/services/recharge.ts`.
-   **Backend:** Express.js routes, controllers (`billsController.js`, `rechargeController.js`), services (`billProviderService.js`, `rechargeProviderService.js`, `transactionLogger.ts`).
-   **Data Storage:**
    -   Firestore: `transactions`, `reminders`, `scheduledRecharges` (for Autopay).
    -   Redis: Caching biller lists.
-   **Real-time:** WebSockets for transaction status updates.

This comprehensive bill payment system allows users to manage and pay a variety of recurring expenses efficiently within Zet Pay.

