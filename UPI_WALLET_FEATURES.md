
# Zet Pay Super App: UPI & Wallet Features Documentation

This document details the Unified Payments Interface (UPI) and Digital Wallet functionalities within the Zet Pay application.

## 1. Introduction

Zet Pay offers a comprehensive suite of UPI and Wallet services, enabling users to make seamless digital payments, manage bank accounts, and utilize their Zet Pay wallet for various transactions. Security, speed, and user convenience are paramount.

## 2. Core UPI Functionalities

### 2.1. UPI Account Linking & Management
-   **Functionality:** Users can link their existing bank accounts to Zet Pay to create UPI Virtual Payment Addresses (VPAs or UPI IDs) and perform UPI transactions.
    -   **SIM Selection (Simulated for Web):** User confirms the mobile number linked to their bank account. (Native apps would detect SIMs and send verification SMS).
    -   **Bank Selection:** User selects their bank from a list of UPI-enabled banks.
    -   **Account Discovery (Simulated):** App simulates fetching accounts linked to the mobile number at the selected bank.
    -   **UPI ID Creation/Selection:** User can choose a suggested UPI ID or create a new one (e.g., `yourname@zetpay`).
    -   **UPI PIN Setup (Mock UI):** For new UPI registrations on Zet Pay, a UI flow guides the user through mock debit card verification and OTP to set a UPI PIN. The PIN is managed by the UPI network, not stored in Zet Pay.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/profile/upi/page.tsx` handles the UI for linking and managing accounts.
    -   Backend:
        -   Routes: `/api/upi/accounts`, `/api/upi/verify`, `/api/upi/initiate-mobile-verification` (mock), `/api/upi/discover-accounts` (mock), `/api/upi/set-pin` (mock).
        -   Controller: `backend/controllers/upiController.js`.
        -   Services: `backend/services/upiProviderService.js` (simulates PSP interactions), `backend/services/upi.js` (manages account data in Firestore).
    -   Firestore: User's linked bank accounts and UPI IDs are stored under `users/{userId}/linkedAccounts`. Includes fields like `bankName`, `accountNumber` (masked), `upiId`, `isDefault`, `isUpiPinSet`, `pinLength`.
    -   **Redis Caching:** The list of UPI-enabled banks can be cached on the backend to improve performance.

### 2.2. Send Money
-   **Functionality:**
    -   **To Mobile Contact:** Select a contact from the phonebook or Zet Pay contacts. If the contact has a UPI ID linked to their number on Zet Pay or another app, payment is initiated.
    -   **To Bank Account/UPI ID:** Manually enter recipient's bank account + IFSC or their UPI ID.
    -   **To Self:** Transfer funds between user's own linked accounts.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/send/mobile/page.tsx` and `/src/app/(features)/send/bank/page.tsx`. UI to enter details and confirm payment.
    -   Backend:
        -   Route: `/api/upi/pay`.
        -   Controller: `backend/controllers/upiController.js` (`processUpiPayment`).
        -   Service: `backend/services/upiProviderService.js` (simulates PSP payment initiation).
        -   Payment requires UPI PIN authorization (simulated via input on web, securely handled by PSP SDK on native).
    -   Transaction logged in Firestore (`transactions` collection).

### 2.3. Scan & Pay
-   **Functionality:** Scan any UPI QR code to make payments. Supports uploading QR code images. Includes features like auto torch activation (simulated), fraud warnings for suspicious QRs.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/scan/page.tsx` for scanning UI. `/src/app/(features)/pay/page.tsx` for payment confirmation after scan.
    -   Backend:
        -   Route: `/api/scan/validate` for QR validation, `/api/upi/pay` for payment.
        -   Controller: `backend/controllers/scanController.js`, `backend/controllers/upiController.js`.
        -   Service: `backend/services/scanService.js` (parses QR, checks against verified/blacklisted QRs), `backend/services/upiProviderService.js`.
    -   Firestore: `scan_logs`, `verified_merchants`, `blacklisted_qrs`, `reported_qrs`.

### 2.4. Receive Money (My QR Code)
-   **Functionality:** Users can display their static UPI QR code associated with their default linked bank account to receive payments.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/scan/page.tsx` (Tab "My QR Code"). QR code is generated dynamically using the user's default UPI ID.
    -   Backend: User's UPI ID fetched from `users/{userId}/linkedAccounts` where `isDefault: true`.

### 2.5. Check Bank Balance
-   **Functionality:** Users can check the balance of their linked bank accounts after UPI PIN verification.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/balance/page.tsx`.
    -   Backend: Route `/api/upi/balance`. Controller `upiController.js`. Service `upiProviderService.js` (simulates balance check with PSP).

### 2.6. UPI Lite
-   **Functionality:** Enable on-device wallet for small value transactions without UPI PIN. Top-up Lite balance from linked bank.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/upi-lite/page.tsx`.
    -   Backend: Routes for enable/disable/top-up under `/api/upi/lite/*`. Controller `upiController.js`. Service `upiLiteService.js`.
    -   Firestore: `upiLiteStatus/{userId}` to store Lite balance and status.

### 2.7. UPI Autopay (Mandates)
-   **Functionality:** Setup, view, pause, resume, and cancel recurring payment mandates.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/autopay/page.tsx`, `/src/app/(features)/autopay/setup/page.tsx`.
    -   Backend: Routes under `/api/autopay/*`. Controller `autopayController.js`. Service `upiProviderService.js` (simulates PSP mandate operations).
    -   Firestore: `users/{userId}/autopayMandates` to store mandate details.

## 3. Digital Wallet Functionalities

### 3.1. Zet Pay Wallet
-   **Functionality:** A closed-loop wallet for storing funds and making payments within Zet Pay or to merchants accepting Zet Wallet.
    -   **Top-up Wallet:** Add funds using UPI, Net Banking, or Cards (via Payment Gateway).
    -   **Pay via Wallet:** Use wallet balance for recharges, bill payments, merchant payments, etc.
    -   **View Balance & History:** Real-time balance display and transaction history specific to wallet.
-   **Implementation:**
    -   Frontend: Wallet balance display on Home (`/src/app/page.tsx`), top-up options potentially in profile or a dedicated wallet section. Payment pages include "Wallet" as a payment method.
    -   Backend:
        -   Routes: `/api/wallet/*` (e.g., `/balance`, `/topup`, `/pay`).
        -   Controller: `backend/controllers/walletController.ts`.
        -   Services: `backend/services/wallet.ts` (handles balance updates, transaction logic), `backend/services/paymentGatewayService.js` (for top-up via external sources).
    -   Firestore: `wallets/{userId}` stores current balance. Wallet transactions logged in the main `transactions` collection with `paymentMethodUsed: 'Wallet'`.
    -   **Real-time Updates:** Wallet balance updates are pushed to the client via WebSockets.

## 4. Advanced & Unique Features

### 4.1. Smart Wallet Bridge
-   **Functionality:** If a UPI payment fails due to bank limits, and the user has enabled this feature (and KYC is verified), Zet Pay attempts the payment using the user's Zet Pay Wallet balance (up to a user-set limit). The amount is then auto-recovered from the user's bank account later (e.g., after midnight UPI limit reset).
-   **Implementation:**
    -   Frontend: User setting in `/src/app/(features)/profile/security/smart-wallet-limit/page.tsx`.
    -   Backend:
        -   `upiController.js` (`processUpiPayment`): Checks for specific UPI failure codes. If eligible, calls `payViaWalletInternal`.
        -   `recoveryService.ts`: Schedules a recovery task in Firestore (`recoveryTasks` collection).
        -   A separate backend worker (conceptual, not implemented in this project) would process these recovery tasks.
    -   Firestore: `users/{userId}` stores `isSmartWalletBridgeEnabled` and `smartWalletBridgeLimit`. `recoveryTasks` collection stores scheduled recoveries.

### 4.2. Cardless Cash Withdrawal (Conceptual - Uses Wallet)
-   **Functionality:** Users can find "Zet Agents" to withdraw cash. The amount is debited from their Zet Pay Wallet.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/cash-withdrawal/page.tsx`.
    -   Backend: Manages agent interactions, OTP/QR generation, and debits the user's Zet Pay wallet via `payViaWalletInternal`.

## 5. Security & Compliance

-   **UPI PIN:** Handled by the UPI ecosystem via PSP integration (simulated in UI). Zet Pay never stores or transmits the UPI PIN.
-   **Data Encryption:** Sensitive data (though PINs/full card numbers are not stored by Zet Pay itself) would be encrypted at rest and in transit.
-   **Transaction Logging:** All financial transactions are logged in Firestore with immutable details. A simulated blockchain log is also created.
-   **NPCI Guidelines:** The UPI linking and transaction flows aim to simulate adherence to NPCI guidelines as much as possible within a web app context.

This documentation provides an overview of Zet Pay's UPI and Wallet features, highlighting their implementation within the application's architecture.

