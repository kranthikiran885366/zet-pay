
# Zet Pay Super App: Municipal Services Feature Documentation

This document outlines the functionalities for paying various municipal taxes and fees through the Zet Pay application.

## 1. Introduction

Zet Pay aims to simplify the payment of various local government and municipal dues by providing a consolidated platform. This includes services like property tax, water tax (if distinct from general water bill), and potentially others like trade licenses or specific municipal fees.

## 2. Core Municipal Services

### 2.1. Property Tax Payment
-   **Functionality:** Users can pay property tax for various municipalities across different states. They typically need to provide their Property ID, SAS Application Number, or another unique identifier.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/property-tax/page.tsx` handles UI for selecting municipality, entering property identifier, assessment year, and tax amount.
    -   Backend: This feature leverages the **General Bill Payment** infrastructure.
        -   The `processBillPayment` method in `billsController.js` is used with `billerType: 'Property Tax'`.
        -   `billProviderService.js` would have mock data or (in a real scenario) integrate with BBPS or specific municipal corporation APIs to list municipalities as "billers" under the "Property Tax" category.
        -   Bill fetching for property tax is often complex and might not be universally available; manual amount entry is common.
    -   Firestore: Transactions are logged in the main `transactions` collection with `type: 'Bill Payment'` and `billerName` reflecting the municipality and "Property Tax".
    -   **Redis Caching:** The list of municipalities (as billers) would be cached via the `billProviderService.js`.

### 2.2. Housing Society Dues Payment
-   **Functionality:** Users can pay maintenance charges and other dues for their housing societies or apartment complexes.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/housing-society/page.tsx` handles UI for selecting the housing society (from a list or by searching), entering flat/house number, and payment amount.
    -   Backend: Also leverages the **General Bill Payment** infrastructure.
        -   `processBillPayment` in `billsController.js` with `billerType: 'Housing Society'`.
        -   `billProviderService.js` would list housing societies as "billers". Integration could be direct with society management platforms or via aggregators.
    -   Firestore: Transactions logged in `transactions` with `type: 'Bill Payment'`.
    -   **Redis Caching:** List of societies (as billers) cached.

### 2.3. Other Municipal Fees (Conceptual)
-   **Functionality:** Potential for paying other local fees such as:
    -   Trade license fees
    -   Shop establishment fees
    -   Specific municipal service charges (e.g., parking permits if not covered elsewhere, birth/death certificate application fees).
-   **Implementation (Conceptual):**
    -   Would likely follow the General Bill Payment model. Each fee type or department could be a "biller" category or a specific biller under a "Municipal Fees" category.
    -   Requires identifying and integrating with relevant municipal APIs.

## 3. UI/UX Considerations
-   **Municipality/Biller Selection:** Clear search and selection for the correct municipal body or housing society.
-   **Identifier Input:** Accurate labels for required identifiers (Property ID, Flat No., etc.).
-   **Payment Confirmation:** Clear receipts and transaction history.

## 4. Technical Implementation Summary

-   **Frontend:** Specific pages like `/property-tax/page.tsx`, `/housing-society/page.tsx`. These pages utilize the common `processBillPayment` service from `src/services/bills.ts`.
-   **Backend:** Primarily uses existing infrastructure:
    -   `billsController.js` (`processBillPayment` method).
    -   `billProviderService.js` (for listing municipalities/societies as billers and simulating payment processing).
-   **Data Storage:**
    -   Firestore: Transactions are stored in the `transactions` collection. No separate collection for municipal payments unless specific metadata beyond the transaction log is needed.
    -   Redis: Caching lists of municipalities/societies (as billers).
-   **Transaction Logging:** All payments are logged via `transactionLogger.ts`.

The Municipal Services feature in Zet Pay focuses on streamlining payments for local government dues by integrating them into the app's existing robust bill payment system.

    