# PayFriend Firestore Database Schema

This document outlines the collections, subcollections, and document structures for the PayFriend application's Firestore database.

## General Notes:
- **Timestamps**: Fields like `createdAt` and `updatedAt` should ideally be Firestore `Timestamp` objects, set using `FieldValue.serverTimestamp()`.
- **User IDs**: `userId` fields will store the Firebase Authentication UID of the user.
- **References**: Some fields might store references to documents in other collections (e.g., `paymentTransactionId` linking to a `transactions` document).

---

## Top-Level Collections

### 1. `users`
   - **Document ID**: `userId` (Firebase Auth UID)
   - **Fields**:
     - `name`: string (User's full name)
     - `email`: string (User's email, unique)
     - `phone`: string (User's phone number, unique, E.164 format)
     - `avatarUrl`: string (URL to profile picture)
     - `kycStatus`: string (`Not Verified`, `Pending`, `Verified`, `Rejected`)
     - `defaultPaymentMethod`: string (`wallet`, `upi:<upiId>`, `card:<cardTokenLast4>`) - Optional
     - `notificationsEnabled`: boolean (default: `true`)
     - `biometricEnabled`: boolean (default: `false`) - App-level biometric for login/payments
     - `appLockEnabled`: boolean (default: `false`) - PIN/Pattern lock for app access
     - `isSmartWalletBridgeEnabled`: boolean (default: `false`)
     - `smartWalletBridgeLimit`: number (e.g., 5000)
     - `isSeniorCitizenMode`: boolean (default: `false`)
     - `appPreferences`: map (e.g., language, theme)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp
     - `roles`: array of strings (e.g., `['user', 'agent']`) - For future role-based access
     - `upiId`: string (User's primary self-generated UPI ID for receiving payments, e.g., `phonenumber@payfriend`)
     - `isZetChatUser`: boolean (Indicates if the user is active on ZetChat)

   - **Subcollections**:
     - `linkedAccounts`: (See below)
     - `savedCards`: (See below)
     - `contacts`: (See below)
     - `autopayMandates`: (See below)
     - `claimedOffers`: (See below)
     - `scratchCards`: (See below)
     - `templeBookings`: (See below)
     - `prasadamOrders`: (See below)
     - `travelBookings`: (e.g., flights, buses, trains - documents with type field)
     - `genericBookings`: (General bookings, e.g., movies, events)
     - `savingsGoals`: (See below)
     - `userInvestments`: (See below)

### 2. `transactions`
   - **Document ID**: Auto-generated
   - **Fields**:
     - `userId`: string (Firebase Auth UID of the user initiating/receiving)
     - `type`: string (e.g., `Sent`, `Received`, `Recharge`, `Bill Payment`, `Wallet Top-up`, `Investment`, `Loan Disbursement`, `Loan Repayment`, `Cashback`, `Refund`, `Hold`, `Shopping`, `Booking Fee`, `Donation`, `BNPL Usage`, `BNPL Repayment`)
     - `name`: string (Payee name, Biller name, Merchant name, Fund name, etc.)
     - `description`: string (Note, purpose, plan details)
     - `amount`: number (Negative for debits, positive for credits)
     - `date`: Timestamp (When the transaction was processed/initiated)
     - `status`: string (`Completed`, `Pending`, `Failed`, `Processing Activation`, `Cancelled`, `Refunded`, `Refunded_To_Wallet`, `FallbackSuccess`)
     - `paymentMethodUsed`: string (`UPI`, `Wallet`, `Card`, `NetBanking`, `BNPL`)
     - `sourceDetails`: string (e.g., Masked card number, UPI ID used, Wallet) - Optional
     - `upiId`: string (Payee UPI ID if applicable)
     - `pspTransactionId`: string (Transaction ID from UPI provider/gateway) - Optional
     - `billerId`: string (Biller ID if applicable)
     - `billerName`: string (Biller Name if applicable)
     - `identifier`: string (Consumer number, policy number, mobile for recharge, etc.)
     - `planId`: string (Recharge plan ID if applicable)
     - `loanId`: string (Reference to `microLoans` or `bnplStatements` document if applicable)
     - `bookingId`: string (Reference to a booking document if applicable)
     - `ticketId`: string (For support tickets related to this transaction)
     - `withdrawalRequestId`: string (Link to `cashWithdrawals` if applicable)
     - `originalTransactionId`: string (For refunds/reversals, linking to original failed TXN)
     - `refundTransactionId`: string (ID of the refund transaction, if this TXN is a refund)
     - `failureReason`: string (If status is `Failed`)
     - `refundEta`: string (If failed but debited, expected refund time)
     - `stealthScan`: boolean (default: `false`, if initiated via stealth scan)
     - `scanLogId`: string (Reference to `scan_logs` document, if initiated via QR scan)
     - `blockchainHash`: string (Hash from blockchain logger if applicable)
     - `avatarSeed`: string (For UI display consistency)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 3. `wallets`
   - **Document ID**: `userId`
   - **Fields**:
     - `userId`: string (Firebase Auth UID)
     - `balance`: number (Current wallet balance)
     - `lastUpdated`: Timestamp
     - `autoTopUpEnabled`: boolean (default: `false`)
     - `autoTopUpAmount`: number (If enabled)
     - `autoTopUpThreshold`: number (If enabled, balance below which top-up triggers)
     - `autoTopUpSourceUpiId`: string (Linked bank account for auto top-up)

### 4. `upiLiteStatus`
   - **Document ID**: `userId`
   - **Fields**:
     - `userId`: string
     - `isEnabled`: boolean
     - `balance`: number
     - `maxBalance`: number (e.g., 2000)
     - `maxTxnAmount`: number (e.g., 500)
     - `linkedAccountUpiId`: string (Primary bank account UPI for Lite top-ups/refunds)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 5. `scheduledRecharges`
   - **Document ID**: Auto-generated
   - **Fields**:
     - `userId`: string
     - `type`: string (e.g., `mobile`, `dth`)
     - `identifier`: string
     - `amount`: number
     - `frequency`: string (`monthly`, `weekly`, `daily`)
     - `nextRunDate`: Timestamp (When the next recharge should occur)
     - `billerId`: string (Optional)
     - `planId`: string (Optional)
     - `paymentSourceUpiId`: string (User's UPI ID for payment)
     - `isActive`: boolean (User can pause/resume)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp
     - `lastRunStatus`: string (`Success`, `Failed: Low Balance`, `Failed: Operator Error`) - Optional
     - `lastRunDate`: Timestamp - Optional

### 6. `offers`
   - **Document ID**: Auto-generated (or a custom `offerId`)
   - **Fields**:
     - `offerId`: string (Unique custom ID for the offer)
     - `title`: string (Short title)
     - `description`: string (Detailed description)
     - `imageUrl`: string (URL for offer banner/image)
     - `offerType`: string (`Cashback`, `Coupon`, `Discount`, `Partner`)
     - `terms`: string (Terms and conditions)
     - `validFrom`: Timestamp
     - `validUntil`: Timestamp
     - `category`: string (e.g., `Recharge`, `Shopping`, `Travel`, `Food`)
     - `applicableTo`: array of strings (User segments or `all`)
     - `minTransactionAmount`: number (Optional)
     - `maxDiscount`: number (Optional)
     - `couponCode`: string (If applicable)
     - `redemptionLimitPerUser`: number (Optional)
     - `totalRedemptions`: number (Optional, for campaign tracking)
     - `isActive`: boolean
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 7. `loyaltyStatus`
   - **Document ID**: `userId`
   - **Fields**:
     - `userId`: string
     - `points`: number
     - `tier`: string (`Bronze`, `Silver`, `Gold`, `Platinum`)
     - `benefits`: array of strings (Description of benefits for current tier)
     - `pointsToNextTier`: number
     - `lastTransactionDate`: Timestamp (When points were last updated)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 8. `referralStatus`
   - **Document ID**: `userId` (The referrer's ID)
   - **Fields**:
     - `userId`: string
     - `referralCode`: string (Unique code for this user)
     - `successfulReferrals`: number (Count of users who signed up and completed action)
     - `pendingReferrals`: number (Count of users who signed up but haven't completed action)
     - `totalEarnings`: number (Total rewards earned from referrals)
     - `referredBy`: string (Referral code of the user who referred this user) - Optional
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 9. `bnplStatus`
    - **Document ID**: `userId`
    - **Fields**:
        - `userId`: string
        - `isActive`: boolean
        - `creditLimit`: number
        - `usedLimit`: number (Amount currently utilized)
        - `availableLimit`: number (Calculated: creditLimit - usedLimit)
        - `providerName`: string (e.g., "ZetPay BNPL Partner")
        - `partnerBank`: string (Optional, if applicable)
        - `billingCycleDay`: number (e.g., 1 for 1st of month)
        - `paymentDueDateOffsetDays`: number (e.g., 15 days after bill generation)
        - `activationDate`: Timestamp
        - `lastTransactionDate`: Timestamp
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 10. `bnplStatements`
    - **Document ID**: Auto-generated (or `userId_YYYYMM`)
    - **Fields**:
        - `userId`: string
        - `statementId`: string (Custom ID, e.g., `BNPL-USERID-YYYYMMDD`)
        - `statementPeriodStart`: Timestamp
        - `statementPeriodEnd`: Timestamp
        - `dueDate`: Timestamp
        - `dueAmount`: number
        - `minAmountDue`: number
        - `isPaid`: boolean (default: `false`)
        - `paidDate`: Timestamp (Optional, if fully paid)
        - `lastPaymentAmount`: number (Optional, amount of last partial/full payment)
        - `lastPaymentDate`: Timestamp (Optional)
        - `lastPaymentMethod`: string (Optional, e.g., 'Wallet', 'UPI')
        - `lateFeesApplied`: number (Optional)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp
    - **Subcollections**:
        - `statementTransactions`:
            - **Document ID**: Auto-generated (or linked `transactionId` from main `transactions` collection)
            - **Fields**:
                - `originalTransactionId`: string (ID of the transaction in `transactions` that used BNPL)
                - `date`: Timestamp
                - `merchantName`: string
                - `amount`: number (Amount of the individual BNPL spend)

### 11. `microLoans`
    - **Document ID**: Auto-generated
    - **Fields**:
        - `userId`: string
        - `amountBorrowed`: number
        - `amountDue`: number (Decreases on repayment)
        - `interestRate`: number (e.g., 0 for first 7 days, then X%)
        - `purpose`: string (`General`, `Education`, `Medical`)
        - `status`: string (`Active`, `Repaid`, `Overdue`, `Defaulted`)
        - `issuedDate`: Timestamp
        - `dueDate`: Timestamp
        - `repaymentDate`: Timestamp (Optional, when fully repaid)
        - `linkedTransactionIds`: array of strings (Disbursement, Repayments)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 12. `pocketMoneyConfigs`
    - **Document ID**: `parentUserId`
    - **Fields**:
        - `userId`: string (Parent's UID)
        - `children`: array of maps (ChildAccountConfig structure)
            - `id`: string (Unique ID for the child)
            - `name`: string
            - `avatarSeed`: string
            - `balance`: number
            - `allowanceAmount`: number (Optional)
            - `allowanceFrequency`: string (`Daily`, `Weekly`, `Monthly`, `None`) (Optional)
            - `lastAllowanceDate`: Timestamp (Optional)
            - `spendingLimitPerTxn`: number (Optional, 0 for no limit)
            - `linkedSchoolBillerId`: string (Optional)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 13. `pocketMoneyTransactions`
    - **Document ID**: Auto-generated
    - **Fields**:
        - `userId`: string (Parent's UID)
        - `childId`: string (Child's ID from `pocketMoneyConfigs`)
        - `description`: string (e.g., "Allowance", "Spent at Tuck Shop", "School Fees")
        - `amount`: number (Positive for additions, negative for spending)
        - `date`: Timestamp
        - `category`: string (Optional, e.g., `Food`, `Stationery`, `Fees`)
        - `status`: string (`Completed`, `Pending`, `Failed`) - If spending requires approval
        - `originalTransactionId`: string (If this PM transaction is linked to a main transaction)
        - `createdAt`: Timestamp

### 14. `zetAgents`
    - **Document ID**: Auto-generated (or custom `agentId`)
    - **Fields**:
        - `agentId`: string (Unique ID)
        - `name`: string (Shop/Agent Name)
        - `address`: string
        - `location`: GeoPoint (For nearby queries)
        - `operatingHours`: string (e.g., "9 AM - 8 PM")
        - `contactPhone`: string
        - `servicesOffered`: array of strings (e.g., `CashWithdrawal`, `BillPayment`)
        - `maxWithdrawalLimit`: number
        - `currentCashBalance`: number (Optional, for agent's internal tracking if app manages this)
        - `isVerified`: boolean
        - `rating`: number (Average user rating)
        - `createdAt`: Timestamp

### 15. `cashWithdrawals`
    - **Document ID**: Auto-generated
    - **Fields**:
        - `userId`: string (User initiating withdrawal)
        - `agentId`: string (Selected Zet Agent)
        - `agentName`: string (Denormalized for display)
        - `amount`: number
        - `otp`: string (Encrypted or one-time use, short expiry)
        - `qrData`: string (Data for agent to scan, includes OTP or request ID)
        - `status`: string (`Pending Confirmation`, `Completed`, `Expired`, `Cancelled`, `Failed`)
        - `failureReason`: string (If failed or cancelled)
        - `holdTransactionId`: string (Reference to a 'Hold' type transaction in `transactions` collection)
        - `finalTransactionId`: string (Reference to 'Sent' type transaction after completion)
        - `createdAt`: Timestamp
        - `expiresAt`: Timestamp
        - `completedAt`: Timestamp (Optional)
        - `updatedAt`: Timestamp

### 16. `supportTickets`
    - **Document ID**: Auto-generated (or custom `ticketId`)
    - **Fields**:
        - `userId`: string
        - `ticketId`: string (Custom friendly ID, e.g., `SPT-TIMESTAMP-USERID`)
        - `transactionId`: string (Optional, if related to a transaction)
        - `pspTransactionId`: string (Optional)
        - `issueType`: string (e.g., `Payment Failed Debited`, `Refund Not Received`, `KYC Issue`)
        - `description`: string (User's problem description)
        - `status`: string (`Open`, `Pending Agent`, `Pending User`, `Resolved`, `Closed`)
        - `priority`: string (`Low`, `Medium`, `High`, `Urgent`)
        - `attachments`: array of strings (URLs to uploaded files in Firebase Storage)
        - `agentId`: string (Optional, ID of support agent assigned)
        - `resolutionDetails`: string (Optional)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp
        - `lastReplyAt`: Timestamp
        - `lastReplyBy`: string (`user` or `agent`)

   - **Subcollections**:
     - `ticketMessages`:
       - **Document ID**: Auto-generated
       - **Fields**:
         - `senderId`: string (`userId` or `agentId`)
         - `senderType`: string (`user` or `agent`)
         - `messageText`: string
         - `timestamp`: Timestamp
         - `attachmentUrl`: string (Optional)

### 17. `scan_logs`
   - **Document ID**: Auto-generated (`scanLogId`)
   - **Fields**:
     - `userId`: string
     - `qrData`: string (Raw QR string)
     - `qrDataHash`: string (Hash of qrData for quick checks)
     - `parsedPayeeUpi`: string (Optional)
     - `parsedPayeeName`: string (Optional)
     - `parsedAmount`: number (Optional)
     - `timestamp`: Timestamp (When scan occurred)
     - `isVerifiedMerchant`: boolean
     - `isFlaggedBlacklisted`: boolean
     - `hasValidSignature`: boolean (If signature validation is implemented)
     - `isReportedPreviously`: boolean
     - `stealthMode`: boolean (If scan was in stealth mode)
     - `paymentMade`: boolean (default: `false`) - Updated to `true` if this scan leads to a payment
     - `paymentTransactionId`: string (Reference to `transactions` document) - Optional, if paymentMade is true
     - `validationMessage`: string (Message from backend validation)
     - `location`: GeoPoint (Optional, if geo-tagging scans)
     - `deviceInfo`: map (Optional, basic device info for fraud analysis)

### 18. `verified_merchants`
   - **Document ID**: `upiId` (e.g., `merchant@okaxis`)
   - **Fields**:
     - `upiId`: string
     - `merchantName`: string (Official registered name)
     - `category`: string (e.g., `Grocery`, `Restaurant`, `Electronics`)
     - `logoUrl`: string (Optional)
     - `isVerified`: boolean (Should always be `true` for this collection)
     - `addedAt`: Timestamp
     - `address`: string (Optional)
     - `contact`: string (Optional)

### 19. `blacklisted_qrs`
   - **Document ID**: `upiId` or `qrDataHash` (Choose one as primary key or have both indexed)
   - **Fields**:
     - `identifier`: string (The UPI ID or QR Hash that is blacklisted)
     - `identifierType`: string (`upiId` or `qrHash`)
     - `reason`: string (Why it was blacklisted, e.g., "Known Phishing UPI", "Reported for Fraud")
     - `blacklistedAt`: Timestamp
     - `source`: string (e.g., "Admin", "AI Flag", "User Report Threshold")

### 20. `reported_qrs`
   - **Document ID**: Auto-generated
   - **Fields**:
     - `reporterUserId`: string
     - `qrData`: string
     - `qrDataHash`: string
     - `parsedPayeeUpi`: string (Optional)
     - `parsedPayeeName`: string (Optional)
     - `reason`: string (User's reason for reporting)
     - `status`: string (`pending_review`, `resolved_blacklisted`, `resolved_safe`, `resolved_duplicate`)
     - `reportedAt`: Timestamp
     - `resolvedAt`: Timestamp (Optional)
     - `adminNotes`: string (Optional)

### 21. `vaultItems`
    - **Document ID**: Auto-generated (`itemId`)
    - **Fields**:
        - `userId`: string
        - `name`: string (User-defined name for the item, e.g., "Flight Ticket BLR-DEL June 20")
        - `type`: string (`Ticket`, `Bill`, `Document`, `Plan`, `Image`, `Other`)
        - `source`: string (Where the item came from, e.g., "Train Booking", "Electricity Bill", "Manual Upload")
        - `notes`: string (Optional user notes)
        - `fileUrl`: string (URL if external, or path in Firebase Storage if uploaded directly)
        - `filePath`: string (Path in Firebase Storage if uploaded, e.g., `user_vault_files/userId/timestamp_filename.pdf`)
        - `fileName`: string (Original file name)
        - `fileType`: string (MIME type, e.g., `application/pdf`, `image/jpeg`)
        - `fileSize`: number (In bytes)
        - `isEncrypted`: boolean (If client-side encryption was applied before upload)
        - `tags`: array of strings (User-defined tags for organization)
        - `dateAdded`: Timestamp
        - `updatedAt`: Timestamp
        - `originalTransactionId`: string (Optional, if item linked to a transaction, e.g. a bill)
        - `expiryDate`: Timestamp (Optional, e.g. for tickets)

### 22. `chats`
    - **Document ID**: Composite ID (e.g., `userId1_userId2` where userId1 < userId2)
    - **Fields**:
        - `participants`: array of strings (UserIDs of chat participants)
        - `participantNames`: map (e.g., `{ userId1: "Alice", userId2: "Bob" }`) - Denormalized for display
        - `participantAvatars`: map (e.g., `{ userId1: "url1", userId2: "url2" }`) - Optional
        - `lastMessage`: map
            - `id`: string (ID of the last message document)
            - `text`: string (Snippet of the last message text)
            - `senderId`: string
            - `timestamp`: Timestamp
        - `updatedAt`: Timestamp (Timestamp of the last message or last activity)
        - `createdAt`: Timestamp
        - `unreadCounts`: map (e.g., `{ userId1: 0, userId2: 3 }`) - Unread messages for each participant
        - `isZetChatVerified`: boolean (True if both are "verified" Zet Pay users, or if it's with a merchant)
        - `associatedTransactionId`: string (Optional, if chat initiated from a transaction context)

    - **Subcollections**:
        - `messages`:
            - **Document ID**: Auto-generated
            - **Fields**:
                - `chatId`: string (Parent chat ID for easier querying if needed)
                - `senderId`: string
                - `senderName`: string (Denormalized)
                - `receiverId`: string
                - `text`: string (Optional, for text messages)
                - `imageUrl`: string (Optional, for image messages - URL to Firebase Storage)
                - `voiceUrl`: string (Optional, for voice messages - URL to Firebase Storage)
                - `type`: string (`text`, `image`, `voice`, `payment_request`, `payment_receipt`, `system_notification`)
                - `paymentDetails`: map (Optional, if type is `payment_request` or `payment_receipt`)
                    - `amount`: number
                    - `status`: string (`requested`, `paid`, `declined`)
                    - `transactionId`: string (Link to `transactions` collection)
                - `timestamp`: Timestamp
                - `isRead`: boolean (default: `false`)
                - `readBy`: array of strings (UserIDs who have read the message) - For group chats later

### 23. `recoveryTasks` (For Smart Wallet Bridge recovery)
    - **Document ID**: Auto-generated
    - **Fields**:
        - `userId`: string
        - `amount`: number (Amount to recover)
        - `originalRecipientUpiId`: string (For reference)
        - `recoveryStatus`: string (`Scheduled`, `Processing`, `Completed`, `Failed`)
        - `scheduledTime`: Timestamp (When the recovery debit should be attempted)
        - `bankUpiId`: string (The user's bank UPI ID from which recovery will be attempted)
        - `failureReason`: string (If status is `Failed`)
        - `recoveryTransactionId`: string (ID of the debit transaction from user's bank) - Optional
        - `walletCreditTransactionId`: string (ID of the credit transaction to user's wallet) - Optional
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 24. `user_favorite_qrs`
    - **Document ID**: Auto-generated (or composite like `userId_qrDataHash`)
    - **Fields**:
        - `userId`: string
        - `qrDataHash`: string (Hash of the full QR data string)
        - `qrData`: string (The full QR data string)
        - `payeeUpi`: string
        - `payeeName`: string
        - `customTagName`: string (User-defined tag, e.g., "Home Rent", "Milk Vendor") - Optional
        - `defaultAmount`: number (Optional, pre-fills amount on selection)
        - `frequencyCount`: number (How many times this has been paid, for "frequent" logic) - Optional
        - `lastPaidDate`: Timestamp (Optional)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 25. `flightListings` (Mock backend data source for flight search)
    - **Document ID**: Auto-generated (or custom like `AIRLINECODE_FLIGHTNUMBER_DATE`)
    - **Fields**:
        - `airline`: string
        - `flightNumber`: string
        - `departureAirport`: string (IATA code)
        - `arrivalAirport`: string (IATA code)
        - `departureDateTime`: Timestamp
        - `arrivalDateTime`: Timestamp
        - `durationMinutes`: number
        - `stops`: number
        - `price`: number
        - `currency`: string (e.g., "INR")
        - `cabinClass`: string (`Economy`, `Premium Economy`, `Business`)
        - `seatsAvailable`: number
        - `refundable`: boolean
        - `baggageAllowance`: map (`cabin`: string, `checkin`: string)
        - `aircraftType`: string (Optional)
        - `source`: string (e.g., "Amadeus", "Sabre", "MockData")
        - `lastUpdated`: Timestamp

### 26. `temples` (Basic temple information for selection)
    - **Document ID**: `templeId` (e.g., "tirupati", "shirdi")
    - **Fields**:
        - `name`: string
        - `locationCity`: string
        - `state`: string
        - `imageUrl`: string (Optional)
        - `description`: string (Optional)
        - `allowsDarshanBooking`: boolean
        - `allowsPoojaBooking`: boolean
        - `allowsPrasadamOrder`: boolean
        - `hasLiveFeed`: boolean
        - `bookingFee`: number (Optional base fee for marriage hall booking)
        - `requiresApproval`: boolean (Optional for marriage hall approval)

### 27. `darshanSlots` (Availability for a specific temple and date)
    - **Document ID**: `templeId_YYYY-MM-DD` (e.g., "tirupati_2024-08-15")
    - **Fields**:
        - `templeId`: string
        - `date`: string (YYYY-MM-DD)
        - `slots`: array of maps
            - `time`: string (e.g., "09:00 - 10:00")
            - `quota`: string (e.g., "Special Entry (₹300)")
            - `availability`: string (`Available`, `Filling Fast`, `Full`)
            - `ticketsLeft`: number (Optional, for direct booking)
            - `totalTickets`: number (Optional)

### 28. `hyperlocalProviders` (List of service providers)
    - **Document ID**: Auto-generated
    - **Fields**:
        - `providerName`: string
        - `serviceType`: string (`Electrician`, `Plumber`, `Cleaning`, `AC Repair`)
        - `city`: string
        - `area`: string (Optional, e.g., "Koramangala")
        - `contactNumber`: string (Optional)
        - `rating`: number (Optional)
        - `basePrice`: number (Optional, e.g., "Starts from ₹X")
        - `availableSlots`: map (e.g., `{"YYYY-MM-DD": ["09:00", "11:00"]}`) - Simplified
        - `isActive`: boolean
        - `logoUrl`: string (Optional)

---
## Subcollections (under `users/{userId}`)

### 1. `users/{userId}/linkedAccounts`
   - **Document ID**: Auto-generated (or custom if based on `upiId`)
   - **Fields**:
     - `bankName`: string
     - `accountNumber`: string (Masked, e.g., `xxxx1234`)
     - `accountName`: string (e.g., "Savings Account")
     - `accountType`: string (`SAVINGS`, `CURRENT`)
     - `ifsc`: string
     - `upiId`: string (Linked UPI ID, e.g., `user@okaxis`)
     - `isDefault`: boolean (Primary account for payments)
     - `isUpiPinSet`: boolean (default: `false`)
     - `pinLength`: number (4 or 6, for UI hints)
     - `isVerified`: boolean (If bank account successfully linked and verified by PSP)
     - `linkedAt`: Timestamp (or `createdAt`)
     - `updatedAt`: Timestamp

### 2. `users/{userId}/savedCards`
   - **Document ID**: Auto-generated (or gateway token ID if unique and safe)
   - **Fields**:
     - `gatewayToken`: string (Token from payment gateway, NOT actual card number)
     - `cardIssuer`: string (e.g., "Visa", "Mastercard")
     - `bankName`: string (Issuing bank, e.g., "HDFC Bank")
     - `last4`: string (Last four digits of the card)
     - `expiryMonth`: string (MM)
     - `expiryYear`: string (YYYY)
     - `cardHolderName`: string (Optional)
     - `cardType`: string (`Credit`, `Debit`)
     - `isPrimary`: boolean
     - `addedAt`: Timestamp (or `createdAt`)
     - `updatedAt`: Timestamp

### 3. `users/{userId}/contacts`
   - **Document ID**: Auto-generated (or custom if using a unique identifier)
   - **Fields**:
     - `name`: string
     - `identifier`: string (Phone number or UPI ID/Account Number)
     - `type`: string (`mobile`, `bank`, `dth`, `fastag`, `upi`)
     - `avatarSeed`: string (For generating consistent placeholder avatars)
     - `upiId`: string (If type is `bank` or `upi`, stores the verified UPI ID)
     - `accountNumber`: string (If type is `bank`)
     - `ifsc`: string (If type is `bank`)
     - `isFavorite`: boolean (default: `false`)
     - `isVerified`: boolean (If UPI/Bank details have been verified by backend)
     - `isZetChatUser`: boolean (If this contact is also a ZetPay user for chat)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 4. `users/{userId}/autopayMandates`
   - **Document ID**: Auto-generated (or `mandateUrn` if unique)
   - **Fields**:
     - `mandateUrn`: string (Unique Reference Number from NPCI/PSP)
     - `pspReferenceId`: string (PSP's internal reference for this mandate)
     - `merchantName`: string
     - `merchantLogoUrl`: string (Optional)
     - `userUpiId`: string (User's UPI ID used for the mandate)
     - `maxAmount`: number
     - `frequency`: string (`Monthly`, `Quarterly`, `Half Yearly`, `Yearly`, `As Presented`)
     - `startDate`: Timestamp
     - `validUntil`: Timestamp
     - `status`: string (`Active`, `Paused`, `Cancelled`, `Failed`, `Pending Approval`)
     - `lastDebitDate`: Timestamp (Optional)
     - `lastDebitAmount`: number (Optional)
     - `lastDebitStatus`: string (Optional)
     - `createdAt`: Timestamp
     - `updatedAt`: Timestamp

### 5. `users/{userId}/claimedOffers`
   - **Document ID**: `offerId` (ID of the offer from the `offers` collection)
   - **Fields**:
     - `offerId`: string
     - `offerTitle`: string (Denormalized for quick display)
     - `claimedAt`: Timestamp
     - `usedAt`: Timestamp (Optional, if offer is used later)
     - `status`: string (`Claimed`, `Used`, `Expired`)

### 6. `users/{userId}/scratchCards`
   - **Document ID**: Auto-generated
   - **Fields**:
     - `sourceOfferId`: string (Optional, if earned from a specific offer/event)
     - `sourceTransactionId`: string (Optional, if earned from a transaction)
     - `isScratched`: boolean (default: `false`)
     - `rewardAmount`: number (0 if "Better luck next time")
     - `rewardType`: string (`Cashback`, `CouponCode`, `Points`)
     - `couponCodeValue`: string (If `rewardType` is `CouponCode`)
     - `message`: string (e.g., "You won ₹X Cashback!", "Better Luck Next Time")
     - `expiryDate`: Timestamp
     - `createdAt`: Timestamp
     - `scratchedAt`: Timestamp (Optional)

### 7. `users/{userId}/templeBookings`
    - **Document ID**: Auto-generated (`bookingId`)
    - **Fields**:
        - `templeId`: string
        - `templeName`: string (Denormalized)
        - `bookingType`: string (`Darshan`, `Virtual Pooja`)
        - `bookingDate`: Timestamp (When booking was made)
        - `visitDate`: Timestamp (For Darshan)
        - `slotTime`: string (For Darshan, e.g., "09:00 AM - 10:00 AM")
        - `quota`: string (For Darshan, e.g., "Special Entry ₹300")
        - `poojaDate`: Timestamp (For Virtual Pooja)
        - `poojaId`: string (From `templeVirtualPoojas` - hypothetical collection)
        - `poojaName`: string (Denormalized)
        - `numberOfPersons`: number (For Darshan)
        - `devoteeName`: string (For Pooja Sankalpam)
        - `gotra`: string (Optional, for Pooja)
        - `totalAmount`: number (Amount paid)
        - `paymentTransactionId`: string (Reference to `transactions` document)
        - `status`: string (`Confirmed`, `Cancelled`, `Pending Payment`)
        - `accessPassData`: string (QR code data for Darshan entry)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 8. `users/{userId}/prasadamOrders`
    - **Document ID**: Auto-generated (`orderId`)
    - **Fields**:
        - `templeId`: string
        - `templeName`: string (Denormalized)
        - `orderDate`: Timestamp
        - `items`: array of maps
            - `itemId`: string (From `templePrasadamItems` - hypothetical)
            - `itemName`: string (Denormalized)
            - `quantity`: number
            - `pricePerItem`: number
        - `totalAmount`: number
        - `deliveryAddress`: map (Structured address)
            - `line1`, `city`, `pincode`, `state`, `contactNumber`
        - `paymentTransactionId`: string (Reference to `transactions`)
        - `status`: string (`Processing`, `Shipped`, `Delivered`, `Cancelled`)
        - `trackingId`: string (Optional, from delivery partner)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 9. `users/{userId}/travelBookings` (Example for Flights, Buses, Trains)
    - **Document ID**: Auto-generated (`bookingId`)
    - **Fields**:
        - `bookingType`: string (`Flight`, `Bus`, `Train`, `Hotel`, `Car Rental`, `Bike Rental`)
        - `provider`: string (e.g., "IndiGo", "RedBus", "IRCTC Partner")
        - `pnrOrBookingRef`: string
        - `journeyDetails`: map
            - `from`: string (City or Airport Code)
            - `to`: string
            - `departureDateTime`: Timestamp
            - `arrivalDateTime`: Timestamp (Optional)
            - `flightNumber`: string (If flight)
            - `busServiceNumber`: string (If bus)
            - `trainNumber`: string (If train)
        - `passengers`: array of maps
            - `name`: string
            - `age`: number
            - `gender`: string
            - `seatNumber`: string (Optional)
            - `berthPreference`: string (Optional, for trains)
        - `totalFare`: number
        - `paymentTransactionId`: string
        - `bookingStatus`: string (`Confirmed`, `Cancelled`, `Pending`)
        - `eTicketUrl`: string (Optional, URL to PDF ticket)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 10. `users/{userId}/genericBookings` (For Movies, Events, Hyperlocal, etc.)
    - **Document ID**: Auto-generated
    - **Fields**:
        - `bookingType`: string (e.g., `Movie`, `Event`, `ComedyShow`, `Hyperlocal_Electrician`)
        - `itemName`: string (e.g., "KGF Chapter 3 Movie Ticket", "AC Repair Service")
        - `providerName`: string (e.g., "PVR Cinemas", "Urban Company")
        - `venue`: string (Optional)
        - `eventDateTime`: Timestamp (Or service slot time)
        - `quantity`: number (e.g., number of tickets, or 1 for service)
        - `seatNumbers`: string (Optional, e.g., "A1, A2")
        - `totalAmount`: number
        - `paymentTransactionId`: string
        - `bookingReference`: string (Provider's booking ID)
        - `status`: string (`Confirmed`, `Cancelled`, `Pending Confirmation`)
        - `ticketUrl`: string (Optional)
        - `address`: map (For hyperlocal services - `line1`, `city`, `pincode`)
        - `serviceDescription`: string (For hyperlocal - user's problem description)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp

### 11. `users/{userId}/savingsGoals`
    - **Document ID**: Auto-generated (`goalId`)
    - **Fields**:
        - `goalName`: string
        - `targetAmount`: number
        - `currentAmount`: number (default: 0)
        - `targetDate`: Timestamp (Optional)
        - `autoSaveEnabled`: boolean (default: `false`)
        - `autoSaveAmount`: number (Optional)
        - `autoSaveFrequency`: string (`Daily`, `Weekly`, `Monthly`) (Optional)
        - `autoSaveSource`: string (`Wallet`, `LinkedAccountUpiId`) (Optional)
        - `status`: string (`Active`, `Completed`, `Paused`)
        - `createdAt`: Timestamp
        - `updatedAt`: Timestamp
        - `completedAt`: Timestamp (Optional)

### 12. `users/{userId}/userInvestments` (High-level summary; detailed holdings might be separate or subcollections)
    - **Document ID**: `assetType` (e.g., `MutualFunds`, `DigitalGold`, `Stocks`)
    - **Fields**:
        - `assetType`: string
        - `totalInvestedValue`: number
        - `currentMarketValue`: number
        - `totalProfitLoss`: number
        - `lastUpdated`: Timestamp
    - **Subcollections (Example for Mutual Funds)**:
        - `mutualFundHoldings`:
            - **Document ID**: `fundSchemeCode` (or auto-generated)
            - **Fields**:
                - `fundName`: string
                - `schemeCode`: string
                - `unitsHeld`: number
                - `averageBuyNav`: number
                - `currentNav`: number
                - `investedAmount`: number
                - `currentValue`: number
                - `lastInvestmentDate`: Timestamp
                - `folioNumber`: string
                - `sipDetails`: map (if active SIP)
                    - `sipAmount`: number
                    - `sipDate`: number (day of month)
                    - `sipFrequency`: string

---

This schema provides a solid foundation. Remember that as the app evolves, you might need to add more fields, collections, or adjust relationships. Indexing will also be critical for query performance as your data grows.