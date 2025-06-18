
# Zet Pay Super App: Pay to Mobile Contact Feature Documentation

This document outlines the "Pay to Mobile Contact" feature within the Zet Pay application, allowing users to send money to their contacts using their mobile numbers.

## 1. Introduction

The "Pay to Mobile Contact" feature simplifies UPI payments by allowing users to select a recipient from their phone's contact list or saved PayFriend contacts. The system then attempts to facilitate the payment to the UPI ID associated with that contact.

## 2. Core Functionalities

### 2.1. Contact Selection
-   **Functionality:** Users can search and select a recipient from:
    -   Their device's native contact list (requires permission).
    -   Their saved PayFriend contacts (stored in Firestore under `users/{userId}/contacts`).
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/send/mobile/page.tsx` provides the UI for searching contacts and displaying a list.
    -   **Backend/Service:** `contactsService.js` (backend) and `contacts.ts` (frontend service) handle fetching and searching saved PayFriend contacts. Native contact access is a client-side OS feature.

### 2.2. Mobile Number to UPI ID Resolution (Conceptual / Platform-Dependent)
-   **Functionality:** Once a contact with a mobile number is selected, the system needs to determine the recipient's UPI ID.
    -   **If Payee is a Zet Pay User:** The backend can look up the mobile number in its `users` collection to find the user's primary/default UPI ID registered with Zet Pay.
    -   **If Payee is on Another UPI App (Public Directory - Limited):** True public mobile-to-UPI ID resolution across all apps is not a universally available, direct API for third-party apps due to privacy and security. Payment Service Providers (PSPs) often handle this resolution during the payment initiation if the payer's bank supports "Pay to Mobile Number" UPI transactions.
    -   **Saved UPI ID:** If the contact was previously saved in Zet Pay with a specific UPI ID, that UPI ID is used.
-   **Implementation:**
    -   **Frontend:** Passes the selected contact's mobile number and any known UPI ID to the payment confirmation screen (`/pay`).
    -   **Backend (`upiController.js`, `upiProviderService.js`):**
        -   If only a mobile number is provided (and no UPI ID), the `processUpiPayment` function in `upiController.js` would rely on the `upiProviderService.js` (simulating the PSP) to handle the "Pay to Mobile Number" transaction type. The PSP would attempt to resolve the mobile number to a UPI ID within the UPI network.
        -   If a UPI ID is already associated with the contact (from Zet Pay's DB or user input), that is used directly.

### 2.3. Amount & Note Entry
-   **Functionality:** Users enter the amount to send and an optional transaction note.
-   **Implementation:**
    -   **Frontend:** Input fields on `src/app/(features)/send/mobile/page.tsx` or a subsequent payment confirmation screen.

### 2.4. Payment Confirmation & Authorization
-   **Functionality:** User reviews the payee details (name, UPI ID if resolved, or mobile number), amount, and confirms the payment. UPI PIN authorization is required.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/pay/page.tsx` (or a similar confirmation UI).
    -   **Backend (`upiController.js`):** `processUpiPayment` securely handles the payment initiation via the `upiProviderService.js` (which simulates PSP interaction, including UPI PIN verification concept).

### 2.5. Transaction Logging
-   **Functionality:** All payment attempts are logged with their status.
-   **Implementation:**
    -   **Backend:** `transactionLogger.ts` saves details to Firestore (`transactions` collection).
    -   Real-time status updates are sent via WebSockets.

## 3. Advanced Features & Considerations

### 3.1. Smart Payee Suggestions
-   **Functionality:** AI can suggest frequent or recent contacts when the user navigates to the "Send Money" section.
-   **Implementation:**
    -   **Backend AI Flow:** `src/ai/flows/smart-payee-suggestion.ts` (Genkit flow) analyzes transaction history.
    -   *Reference: `AI_SMART_FEATURES.MD`*

### 3.2. Request Money (Conceptual)
-   **Functionality:** Users could request money from a contact using their mobile number.
-   **Implementation:** Would involve UPI Collect Request functionality, managed via `upiController.js` and `upiProviderService.js`.

### 3.3. In-App Chat with Payee
-   **Functionality:** If the recipient is also a Zet Pay user, an option to chat with them can be provided after a successful transaction.
-   **Implementation:**
    -   Leverages the `ZetChat` component and backend chat infrastructure.
    -   Backend logic in `upiController.js` or `userService.js` would check if the recipient's mobile number is registered with Zet Pay.
    -   *Reference: `CUSTOMER_SUPPORT_FEATURES.MD` (for chat infrastructure)*

## 4. User Interface Flow

1.  User navigates to "Send Money" > "To Mobile Contact".
2.  UI displays a search bar and a list of recent/frequent/all contacts.
3.  User searches for or selects a contact.
4.  If the contact has multiple numbers or UPI IDs, the user might be prompted to choose one.
5.  User is taken to a screen to enter the amount and an optional note.
    -   Payee's name is displayed. If UPI ID is resolved or known, it might also be shown (or masked).
6.  User clicks "Pay".
7.  The system navigates to the payment confirmation screen (`/pay` or similar).
    -   Payee details (Name, UPI ID/Mobile Number), Amount, and Note are displayed.
    -   User selects their source bank account.
    -   User authorizes with UPI PIN (handled by PSP integration).
8.  Payment is processed, and a success/failure/pending status is shown.

## 5. Technical Implementation Summary

-   **Frontend:**
    -   `src/app/(features)/send/mobile/page.tsx`: Contact search/selection, amount/note input.
    -   `src/app/(features)/pay/page.tsx`: Payment confirmation and authorization UI.
    -   `src/services/contacts.ts`: For fetching saved PayFriend contacts.
    -   `src/services/upi.ts`: `processUpiPayment` for initiating the payment.
-   **Backend:**
    -   `backend/controllers/upiController.js`: Handles the `processUpiPayment` logic.
    -   `backend/services/upiProviderService.js`: Simulates interaction with the UPI PSP for payment initiation and mobile number resolution (if supported by PSP for "Pay to Mobile").
    -   `backend/services/contacts.js`: For backend access to user contacts if needed.
    -   `backend/services/transactionLogger.ts`: Logs all transactions.
    -   `backend/server.js`: WebSocket for real-time updates.
-   **Data Storage (Firestore):**
    -   `users/{userId}/contacts`: Stores user's saved contacts with names, mobile numbers, and potentially UPI IDs.
    -   `transactions`: Stores all payment transaction records.
    -   `users`: (For looking up if a mobile number belongs to a Zet Pay user and fetching their UPI ID).

## 6. Security & Privacy

-   **Contact Permissions:** App requests permission to access device contacts only when the user intends to use this feature.
-   **UPI PIN Security:** UPI PIN is never stored by Zet Pay; it's entered via the PSP's secure input mechanism during authorization.
-   **Secure API Calls:** All backend interactions are authenticated and use HTTPS.
-   **Data Minimization:** Only necessary contact information is used for the transaction.

This feature leverages the core UPI payment infrastructure while providing a user-friendly way to pay contacts without always needing to know their UPI ID explicitly, relying on platform features or PSP capabilities for resolution.
      