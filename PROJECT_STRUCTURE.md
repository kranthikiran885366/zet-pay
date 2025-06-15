
# PayFriend Project Structure

This document outlines the folder and file structure of the PayFriend super app project.

```
.
├── backend/
│   ├── .env
│   ├── package.json
│   ├── server.js
│   ├── config/
│   │   ├── firebaseAdmin.js
│   │   └── redisClient.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── autopayController.js
│   │   ├── billsController.js
│   │   ├── blockchainController.js
│   │   ├── bnplController.js
│   │   ├── bookingController.js
│   │   ├── cardsController.js
│   │   ├── cashWithdrawalController.js
│   │   ├── chatController.js
│   │   ├── contactsController.js
│   │   ├── entertainmentController.js
│   │   ├── favoritesController.js
│   │   ├── healthcareController.js
│   │   ├── hyperlocalController.js
│   │   ├── investmentController.js
│   │   ├── liveTrackingController.js
│   │   ├── loanController.js
│   │   ├── offerController.js
│   │   ├── passesController.js
│   │   ├── paymentController.js
│   │   ├── pocketMoneyController.js
│   │   ├── rechargeController.js
│   │   ├── reminderController.js
│   │   ├── scanController.js
│   │   ├── shoppingController.js
│   │   ├── templeController.js
│   │   ├── transactionController.js
│   │   ├── transactionController.ts
│   │   ├── upiController.js
│   │   ├── userController.js
│   │   ├── vaultController.js
│   │   └── walletController.ts  // Assuming .ts is preferred if both exist
│   ├── middleware/
│   │   ├── asyncHandler.js
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── autopayRoutes.js
│   │   ├── bankStatusRoutes.js
│   │   ├── billsRoutes.js
│   │   ├── blockchainRoutes.js
│   │   ├── bnplRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── cardsRoutes.js
│   │   ├── cashWithdrawalRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── contactsRoutes.js
│   │   ├── entertainmentRoutes.js
│   │   ├── favoritesRoutes.js
│   │   ├── healthcareRoutes.js
│   │   ├── hyperlocalRoutes.js
│   │   ├── investmentRoutes.js
│   │   ├── liveTrackingRoutes.js
│   │   ├── loanRoutes.js
│   │   ├── offerRoutes.js
│   │   ├── passesRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── pocketMoneyRoutes.js
│   │   ├── rechargeRoutes.js
│   │   ├── reminderRoutes.js
│   │   ├── scanRoutes.js
│   │   ├── serviceRoutes.js
│   │   ├── shoppingRoutes.js
│   │   ├── supportRoutes.js
│   │   ├── templeRoutes.js
│   │   ├── transactionRoutes.ts // Assuming .ts is preferred
│   │   ├── travelRoutes.js
│   │   ├── upiRoutes.js
│   │   ├── userRoutes.js
│   │   ├── vaultRoutes.js
│   │   └── walletRoutes.ts      // Assuming .ts is preferred
│   └── services/
│       ├── auth.js
│       ├── bankStatusService.js
│       ├── billProviderService.js
│       ├── blockchainLogger.ts    // Assuming .ts is preferred
│       ├── bnpl.js
│       ├── bookingProviderService.js
│       ├── cards.js
│       ├── cash-withdrawal.js
│       ├── chatService.js
│       ├── contacts.js
│       ├── entertainmentProviderService.js
│       ├── healthcareProviderService.js
│       ├── hyperlocalProviderService.js
│       ├── investmentProviderService.js
│       ├── liveTrackingProviderService.js
│       ├── loans.js
│       ├── offers.js
│       ├── paymentGatewayService.js
│       ├── pocket-money.js
│       ├── rechargeProviderService.js
│       ├── recoveryService.ts     // Assuming .ts is preferred
│       ├── reminderService.js
│       ├── scanService.js
│       ├── shoppingProviderService.js
│       ├── temple.js
│       ├── templeService.js        // Mock data for temple
│       ├── transactionLogger.ts   // Assuming .ts is preferred
│       ├── travelProviderService.js
│       ├── upi.js
│       ├── upiLite.js
│       ├── upiProviderService.js
│       ├── user.js
│       ├── vaultService.js
│       └── wallet.ts              // Assuming .ts is preferred
├── public/
│   └── (Static assets like images, fonts, if any - not listed in context but typical)
├── src/
│   ├── ai/
│   │   ├── genkit.ts
│   │   └── flows/
│   │       ├── conversational-action.ts
│   │       ├── gift-suggestion-flow.ts
│   │       ├── recharge-plan-recommendation.ts
│   │       ├── smart-payee-suggestion.ts
│   │       └── spending-analysis.ts
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── middleware.ts  // As per specified path
│   │   ├── not-found.tsx
│   │   ├── page.tsx         // Home page
│   │   ├── error.tsx        // Root error boundary
│   │   ├── documentation/page.tsx
│   │   ├── emergency/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── splash/page.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   └── (features)/
│   │       ├── layout.tsx
│   │       ├── error.tsx
│   │       ├── ai-gifting/page.tsx
│   │       ├── analysis/page.tsx
│   │       ├── autopay/page.tsx
│   │       ├── autopay/setup/page.tsx
│   │       ├── balance/page.tsx
│   │       ├── bills/
│   │       │   ├── [type]/page.tsx
│   │       │   ├── education/page.tsx
│   │       │   └── mobile-postpaid/page.tsx
│   │       ├── bnpl/page.tsx
│   │       ├── cab/page.tsx
│   │       ├── cable-tv/page.tsx
│   │       ├── cash-withdrawal/page.tsx
│   │       ├── challan/page.tsx
│   │       ├── club-fees/page.tsx
│   │       ├── conversation/page.tsx
│   │       ├── credit-score/page.tsx
│   │       ├── deposits/page.tsx
│   │       ├── donations/general/page.tsx
│   │       ├── entertainment/
│   │       │   ├── page.tsx
│   │       │   ├── arvr/page.tsx
│   │       │   ├── comedy/page.tsx
│   │       │   ├── discover/page.tsx
│   │       │   ├── events/page.tsx
│   │       │   ├── gamezone/page.tsx
│   │       │   ├── group/page.tsx
│   │       │   ├── sports/page.tsx
│   │       │   └── watchparty/page.tsx
│   │       ├── fuel/page.tsx
│   │       ├── goals/page.tsx
│   │       ├── gold/page.tsx
│   │       ├── healthcare/
│   │       │   ├── page.tsx
│   │       │   ├── ambulance/page.tsx
│   │       │   ├── doctor/page.tsx
│   │       │   ├── fitness/page.tsx
│   │       │   ├── hospital/page.tsx
│   │       │   ├── lab/page.tsx
│   │       │   ├── med-subscription/page.tsx
│   │       │   ├── offers/page.tsx
│   │       │   ├── pharmacy/page.tsx
│   │       │   ├── video-consult/page.tsx
│   │       │   └── wallet/page.tsx
│   │       ├── history/page.tsx
│   │       ├── hostels/page.tsx
│   │       ├── housing-society/page.tsx
│   │       ├── hyperlocal/
│   │       │   ├── ac-repair/page.tsx
│   │       │   ├── carwash/page.tsx
│   │       │   ├── cleaning/page.tsx
│   │       │   ├── courier/page.tsx
│   │       │   ├── coworking/page.tsx
│   │       │   ├── laundry/page.tsx
│   │       │   ├── petcare/page.tsx
│   │       │   ├── repair/page.tsx
│   │       │   ├── salon/page.tsx
│   │       │   └── tailor/page.tsx
│   │       ├── insurance/[type]/page.tsx
│   │       ├── live/
│   │       │   ├── bus/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── about/page.tsx
│   │       │   │   ├── emergency/page.tsx
│   │       │   │   ├── favorites/page.tsx
│   │       │   │   ├── feedback/page.tsx
│   │       │   │   ├── nearby-stops/page.tsx
│   │       │   │   ├── search/page.tsx
│   │       │   │   ├── track-reservation/page.tsx
│   │       │   │   └── track-vehicle/page.tsx
│   │       │   └── train/page.tsx
│   │       ├── loans/page.tsx
│   │       ├── lpg-booking/page.tsx
│   │       ├── marriage-booking/page.tsx
│   │       ├── movies/page.tsx
│   │       ├── municipal-services/page.tsx
│   │       ├── mutual-funds/page.tsx
│   │       ├── offers/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── parking/page.tsx
│   │       ├── passes/
│   │       │   ├── bus/page.tsx
│   │       │   └── my-passes/page.tsx
│   │       ├── pay/
│   │       │   ├── page.tsx
│   │       │   └── split/page.tsx
│   │       ├── pocket-money/page.tsx
│   │       ├── profile/
│   │       │   ├── page.tsx
│   │       │   ├── cards/page.tsx
│   │       │   ├── edit/page.tsx
│   │       │   ├── rewards/page.tsx
│   │       │   ├── security/page.tsx
│   │       │   ├── security/smart-wallet-limit/page.tsx
│   │       │   └── upi/page.tsx
│   │       ├── property-tax/page.tsx
│   │       ├── recharge/
│   │       │   ├── [type]/page.tsx
│   │       │   ├── datacard/page.tsx
│   │       │   ├── electricity/page.tsx
│   │       │   ├── isd/page.tsx
│   │       │   └── metro/page.tsx
│   │       ├── reminders/page.tsx
│   │       ├── rent-payment/page.tsx
│   │       ├── rent-vehicle/page.tsx
│   │       ├── scan/page.tsx
│   │       ├── services/page.tsx
│   │       ├── sip-reminders/page.tsx
│   │       ├── smart-schedule/page.tsx
│   │       ├── stocks/page.tsx
│   │       ├── subscription-manager/page.tsx
│   │       ├── support/page.tsx
│   │       ├── temple/
│   │       │   ├── page.tsx
│   │       │   ├── access/page.tsx
│   │       │   ├── accommodation/page.tsx
│   │       │   ├── audio/page.tsx
│   │       │   ├── darshan/page.tsx
│   │       │   ├── donate/page.tsx
│   │       │   ├── events/page.tsx
│   │       │   ├── group/page.tsx
│   │       │   ├── info/page.tsx
│   │       │   ├── live/page.tsx
│   │       │   ├── pooja/page.tsx
│   │       │   └── prasadam/page.tsx
│   │       ├── travels/
│   │       │   ├── page.tsx
│   │       │   ├── assistance/page.tsx
│   │       │   ├── assistant/page.tsx
│   │       │   ├── bike/page.tsx
│   │       │   ├── bus/page.tsx
│   │       │   ├── car/page.tsx
│   │       │   ├── ev-charging/page.tsx
│   │       │   ├── flight/page.tsx
│   │       │   ├── rest-stop/page.tsx
│   │       │   └── train/page.tsx
│   │       ├── upi-lite/page.tsx
│   │       ├── vault/page.tsx
│   │       ├── vouchers/
│   │       │   ├── digital/page.tsx
│   │       │   ├── gaming/page.tsx
│   │       │   └── giftcards/page.tsx
│   │       └── zet-bank/page.tsx
│   ├── components/
│   │   ├── SplashScreenDisplay.tsx
│   │   ├── conversational-ui.tsx
│   │   ├── zet-chat.tsx
│   │   └── ui/
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── alert.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── chart.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── icons.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── menubar.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── radio-group.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toast.tsx
│   │       └── toaster.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useRealtimeBalance.ts
│   │   ├── useRealtimeTransactions.ts
│   │   └── useVoiceCommands.ts
│   ├── lib/
│   │   ├── apiClient.ts
│   │   ├── utils.ts
│   │   ├── websocket.ts
│   │   └── firebase/
│   │       ├── firebase.ts
│   │       └── firebaseAdmin.ts
│   ├── mock-data/
│   │   ├── entertainment.ts
│   │   ├── food.ts
│   │   ├── general-bills.ts
│   │   ├── index.ts
│   │   ├── insurance.ts
│   │   ├── investment.ts
│   │   ├── liveTracking.ts
│   │   ├── movies.ts
│   │   ├── offers.ts
│   │   ├── passes.ts
│   │   ├── recharge.ts
│   │   ├── reminders.ts
│   │   ├── temple.ts
│   │   ├── travel.ts
│   │   └── vouchers.ts
│   └── services/
│       ├── auth.ts
│       ├── autopay.ts
│       ├── bills.ts
│       ├── blockchainLogger.ts
│       ├── bnpl.ts
│       ├── booking.ts
│       ├── cards.ts
│       ├── cash-withdrawal.ts
│       ├── contacts.ts
│       ├── creditScore.ts
│       ├── entertainment.ts
│       ├── favorites.ts
│       ├── healthcare.ts
│       ├── hyperlocal.ts
│       ├── liveTracking.ts
│       ├── loans.ts
│       ├── offers.ts
│       ├── payments.ts
│       ├── pocket-money.ts
│       ├── recharge.ts
│       ├── recovery.ts
│       ├── reminders.ts
│       ├── scan.ts
│       ├── shopping.ts
│       ├── switch.ts
│       ├── temple.ts
│       ├── transactionLogger.ts
│       ├── transactions.ts
│       ├── travel.ts
│       ├── types.ts
│       ├── upi.ts
│       ├── upiLite.ts
│       ├── user.ts
│       ├── vouchers.ts
│       └── wallet.ts
├── .env
├── .vscode/
│   └── settings.json
├── README.md
├── components.json
├── firestore.schemas.md
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

*Note: This structure is based on the files explicitly mentioned or inferred from previous interactions. Some typical frontend asset folders like `public/images` or `public/fonts` are assumed but not explicitly listed if not provided in context.*
