
# Zet Pay Super App: Offers, Rewards & Loyalty Documentation

This document outlines the features related to offers, cashback, coupons, scratch cards, loyalty programs, and referrals within the Zet Pay application.

## 1. Introduction

Zet Pay's Offers & Rewards system is designed to enhance user engagement and provide value back to users for their transactions and activities within the app. It includes various promotional mechanics, a loyalty program, and a referral system.

## 2. Core Offer & Reward Features

### 2.1. Offer Discovery & Listing
-   **Functionality:** Users can browse active offers, discounts, and cashback deals applicable across various services (recharges, bill payments, bookings, shopping, etc.). Offers can be filtered by category, payment method, or service.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/offers/page.tsx` displays a list/grid of available offers. `/src/app/(features)/offers/[id]/page.tsx` shows details of a specific offer.
    -   Backend:
        -   Route: `GET /api/offers` (fetches all active offers), `GET /api/offers/:offerId` (fetches specific offer details).
        -   Controller: `offerController.js`.
        -   Service: `offers.js` (backend service) fetches offer data from the `offers` collection in Firestore.
    -   Firestore: `offers` collection stores details of each offer (title, description, terms, validity, coupon code, discount type/amount, etc.).
    -   **Redis Caching:** Active offer lists can be cached to improve load times.

### 2.2. Coupon Code Application
-   **Functionality:** Users can apply coupon codes during checkout for various services (recharges, bill payments, bookings) to avail discounts.
-   **Implementation:**
    -   Frontend: Input field for coupon codes on payment/checkout pages.
    -   Backend: Respective service controllers (e.g., `rechargeController.js`, `billsController.js`, `bookingController.js`) receive the coupon code.
        -   `offers.js` (backend service) would have a function `validateAndApplyCoupon(couponCode, transactionDetails)` that checks validity, applicability, and calculates discount. (Currently mocked logic for validation).
        -   The applied coupon and discount amount are logged with the transaction.

### 2.3. Cashback Processing
-   **Functionality:** Users receive cashback into their Zet Pay Wallet based on specific offers or transaction criteria.
-   **Implementation:**
    -   Backend: After a qualifying transaction is completed, the relevant service controller (e.g., `rechargeController.js`) or a dedicated `rewardsService.js` (conceptual) would:
        -   Check if any cashback offer is applicable.
        -   If yes, calculate cashback amount.
        -   Credit cashback to the user's wallet using `payViaWalletInternal` (from `wallet.ts` service) with a negative amount and appropriate description (e.g., "Cashback for Mobile Recharge").
        -   Log the cashback as a separate 'Cashback' type transaction.
    -   Frontend: Cashback received is reflected in wallet balance and transaction history.

### 2.4. Scratch Cards
-   **Functionality:** Users can earn digital scratch cards for completing certain actions or transactions (e.g., first bill payment, referring a friend, high-value transaction). Scratching a card reveals a random reward (cashback, coupon, loyalty points, "better luck next time").
-   **Implementation:**
    -   Frontend: `/src/app/(features)/profile/rewards/page.tsx` (or a dedicated "My Rewards" section) displays available scratch cards. UI for "scratching" the card.
    -   Backend:
        -   Route: `GET /api/offers/rewards/scratch-cards` (fetches user's cards), `POST /api/offers/rewards/scratch-cards/:cardId/scratch` (scratches a card).
        -   Controller: `offerController.js`.
        -   Service: `offers.js` (backend service):
            *   Manages user's scratch cards in `users/{userId}/scratchCards` subcollection.
            *   `generateScratchCard(userId, sourceEvent)`: Creates a new scratch card.
            *   `scratchCard(userId, cardId)`: Marks card as scratched, determines random reward, updates user's wallet/points/coupons, and returns reward details.
    -   Firestore: `users/{userId}/scratchCards` stores card details (isScratched, rewardType, rewardAmount, expiry).

## 3. Loyalty Program
-   **Functionality:** Users earn loyalty points for transactions and engagement. Points contribute to loyalty tiers (e.g., Bronze, Silver, Gold) which unlock exclusive benefits (higher cashback, better offers, priority support).
-   **Implementation:**
    -   Frontend: `/src/app/(features)/profile/rewards/page.tsx` displays loyalty tier, points balance, and benefits.
    -   Backend:
        -   Route: `GET /api/offers/rewards/loyalty`.
        -   Controller: `offerController.js`.
        -   Service: `offers.js` (backend service):
            *   Manages user's loyalty status in `loyaltyStatus/{userId}` document.
            *   `addLoyaltyPoints(userId, points, transactionType)`: Adds points and potentially updates tier based on rules.
    -   Firestore: `loyaltyStatus/{userId}` stores points, tier, lastUpdated. `loyaltyTiers` collection (conceptual) could define tier thresholds and benefits.

## 4. Referral Program
-   **Functionality:** Users can refer friends to Zet Pay using a unique referral code. Both referrer and referee receive rewards (e.g., cashback, scratch card) upon successful referral (e.g., referee completes first transaction).
-   **Implementation:**
    -   Frontend: Section in `/src/app/(features)/profile/rewards/page.tsx` or a dedicated referral page displays user's referral code and tracks referral status.
    -   Backend:
        -   Route: `GET /api/offers/rewards/referral`.
        -   Controller: `offerController.js`.
        -   Service: `offers.js` (backend service):
            *   Manages user referral data in `referralStatus/{userId}`.
            *   `generateReferralCode(userId)`: Creates a unique code.
            *   `trackReferral(refereeUserId, referralCode)`: Links referee to referrer.
            *   `processReferralReward(refereeUserId)`: Checks conditions and triggers rewards for referrer and referee.
    -   Firestore: `referralStatus/{userId}` stores referralCode, successfulReferrals, pendingReferrals, totalEarnings. `referrals` collection could log individual referral links.

## 5. Technical Implementation Summary

-   **Frontend:** React components for displaying offers, scratch cards, loyalty status, referral info. API calls via `src/services/offers.ts`.
-   **Backend:** Express.js routes (`offerRoutes.js`), `offerController.js`, `offers.js` (backend service). Logic for applying coupons is distributed in respective payment controllers.
-   **Data Storage:**
    -   Firestore: `offers`, `users/{userId}/claimedOffers`, `users/{userId}/scratchCards`, `loyaltyStatus/{userId}`, `referralStatus/{userId}`.
    -   Redis: Caching active offer lists.
-   **Transaction Logging:** Cashback rewards are logged as transactions. Discounts from coupons are noted in the original transaction.

Zet Pay's Offers & Rewards system aims to provide a dynamic and engaging experience, encouraging user activity and loyalty through various promotional mechanics.

    