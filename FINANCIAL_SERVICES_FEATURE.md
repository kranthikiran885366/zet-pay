
# Zet Pay Super App: Financial Services Documentation

This document outlines the various financial services offered within the Zet Pay application, including investments, loans, and financial management tools.

## 1. Introduction

Zet Pay aims to empower users with a suite of financial tools integrated directly into the super app, making investments, savings, and access to credit more accessible and manageable.

## 2. Investment Services

### 2.1. Mutual Funds
-   **Functionality:** Users can browse, search, and invest in a variety of mutual funds (SIP or Lumpsum). They can also view their (mock) portfolio.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/mutual-funds/page.tsx` handles UI for searching funds, viewing details, and initiating investments. A portfolio summary is displayed.
    -   Backend:
        -   Routes: `/api/invest/mf/search`, `/api/invest/mf/:fundId`, `POST /api/invest/mf`.
        -   Controller: `investmentController.js`.
        -   Service: `investmentProviderService.js` simulates fetching fund data and placing investment orders with a platform (e.g., BSE StAR MF).
    -   Firestore: Mock fund data might be stored for simulation. User investments would be linked under `users/{userId}/userInvestments/mutualFundHoldings`.
    -   **Transaction Logging:** Investment transactions are logged.

### 2.2. Digital Gold
-   **Functionality (Conceptual):** Allow users to buy, sell, and hold 24K digital gold. View live gold prices and manage their gold portfolio.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/gold/page.tsx` (Placeholder page).
    -   Backend: Conceptual routes and services would be needed to integrate with a gold provider.
    -   Firestore: `users/{userId}/userInvestments/digitalGoldHoldings`.

### 2.3. Stock Market Investing (Conceptual)
-   **Functionality (Conceptual):** Integration with brokerage platforms to allow users to buy and sell stocks directly.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/stocks/page.tsx` (Placeholder page).
    -   Backend: Would require significant integration with stockbrokers' APIs.

### 2.4. Fixed & Recurring Deposits (Conceptual)
-   **Functionality (Conceptual):** Enable users to book Fixed Deposits (FDs) and Recurring Deposits (RDs) with partner banks.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/deposits/page.tsx` (Placeholder page).
    -   Backend: Would involve integration with banking APIs.

## 3. Loan Services

### 3.1. Micro-Loans & "Study Now, Pay Later" (SNPL)
-   **Functionality:** Eligible users (students, young professionals) can apply for small, short-term micro-loans. A special category for "Study Now, Pay Later" for educational expenses. Offers like 0% interest for short repayment periods.
-   **Implementation:**
    -   Frontend: Integrated within the "Digital Pocket Money" feature (`/src/app/(features)/pocket-money/page.tsx`) for students, or a general micro-loan section. UI for checking eligibility, applying, viewing status, and repaying.
    -   Backend:
        -   Routes: `/api/loans/micro/*` (eligibility, apply, status, repay).
        -   Controller: `loanController.js`.
        -   Service: `loans.js` (backend service) handles eligibility logic (simulated, based on user activity), loan creation in Firestore, status updates.
    -   Firestore: `microLoans` collection to store loan details (`userId`, `amountBorrowed`, `amountDue`, `purpose`, `status`, `issuedDate`, `dueDate`).
    -   **Transaction Logging:** Loan disbursal and repayments are logged.

### 3.2. Personal Loans (Conceptual)
-   **Functionality (Conceptual):** Users can view pre-approved personal loan offers from partner banks and NBFCs and apply through the app.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/loans/page.tsx` (Placeholder page).
    -   Backend: Would require API integrations with loan providers.

## 4. Financial Management Tools

### 4.1. Credit Score Check
-   **Functionality:** Users can check their credit score (e.g., CIBIL) through an integrated service.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/credit-score/page.tsx`.
    -   Backend:
        -   Route: `GET /api/users/credit-score`.
        -   Controller: `userController.js`.
        -   Service: `user.js` (backend service) simulates fetching credit score from a credit bureau.

### 4.2. Digital Pocket Money
-   **Functionality:** Parents can set up and manage digital pocket money for their children, including allowances, spending limits, and linking school fee payments.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/pocket-money/page.tsx`.
    -   Backend:
        -   Routes: `/api/pocket-money/*`.
        -   Controller: `pocketMoneyController.js`.
        -   Service: `pocket-money.js` (backend service) manages configuration and child-specific transactions.
    -   Firestore: `pocketMoneyConfigs/{parentUserId}` stores configuration, `pocketMoneyTransactions` stores child's spends/credits.

### 4.3. Savings Goals
-   **Functionality:** Users can create "Digital Piggy Banks" or savings goals, set targets, and track progress. AI can help in planning and suggesting auto-save rules.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/goals/page.tsx`. Allows creating goals, viewing progress, and (simulated) contributions.
    -   Data Storage: Uses browser `localStorage` for now. A backend implementation would store goals in Firestore under `users/{userId}/savingsGoals`.

### 4.4. Spending Analysis & Budgets
-   **Functionality:** Provides users with insights into their spending habits, categorized expenses, and allows them to set budgets.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/analysis/page.tsx`. Displays charts and budget tracking.
    -   Backend AI Flow: `src/ai/flows/spending-analysis.ts` (Genkit flow) to analyze transaction data (fetched from Firestore).
    -   Transaction Categorization: Simple client-side categorization for now, AI can enhance this.
    -   Budgets: Managed in `localStorage` client-side; backend storage could be added.

## 5. Security & Compliance
-   Investment and loan services would adhere to SEBI, RBI, and other relevant regulatory guidelines through partner integrations.
-   Data for financial services is handled securely, with sensitive information managed by regulated partners.

Zet Pay's financial services aim to provide users with a holistic platform for managing their money, from daily spending to long-term investments and credit needs.

