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
│   │   └── walletController.ts
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
│   │   ├── transactionRoutes.ts
│   │   ├── travelRoutes.js
│   │   ├── upiRoutes.js
│   │   ├── userRoutes.js
│   │   ├── vaultRoutes.js
│   │   └── walletRoutes.ts
│   └── services/
│       ├── auth.js
│       ├── bankStatusService.js
│       ├── billProviderService.js
│       ├── blockchainLogger.ts
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
│       ├── recoveryService.ts
│       ├── reminderService.js
│       ├── scanService.js
│       ├── shoppingProviderService.js
│       ├── smsNotificationService.js
│       ├── temple.js
│       ├── templeService.js
│       ├── transactionLogger.ts
│       ├── travelProviderService.js
│       ├── upi.js
│       ├── upiLite.js
│       ├── upiProviderService.js
│       ├── user.js
│       ├── vaultService.js
│       └── wallet.ts
├── public/
│   ├── logos/ (Assumed, contains image assets for operators, banks etc.)
│   │    ├── airtel.png
│   │    ├── jio.png
│   │    ├── vi.png
│   │    ├── bsnl.png
│   │    ├── tataplay.png
│   │    ├── dishtv.png
│   │    ├── d2h.png
│   │    ├── paytm.png
│   │    ├── icici.png
│   │    ├── hdfc.png
│   │    ├── axis.png
│   │    ├── bescom.png
│   │    ├── mseb.png
│   │    ├── tneb.png
│   │    ├── lic.png
│   │    ├── hdfc_life.png
│   │    ├── star_health.png
│   │    ├── bajaj_allianz.png
│   │    ├── default-operator.png
│   │    ├── default-airline.png
│   │    ├── support_agent.png
│   │    ├── bmtc.png
│   │    ├── best.png
│   │    ├── namma_metro.png
│   │    ├── dmrc.png
│   │    ├── hathway.png
│   │    ├── den.png
│   │    ├── mygate.png
│   │    ├── nobroker.png
│   │    ├── sports_club.png
│   │    ├── golf_club.png
│   │    ├── akshayapatra.png
│   │    ├── cry.png
│   │    ├── indane.png
│   │    ├── hp_gas.png
│   │    ├── bharat_gas.png
│   │    ├── bbmp.png
│   │    ├── mcgm.png
│   │    ├── googleplay.png
│   │    ├── freefire.png
│   │    ├── pubg.png
│   │    ├── amazon.png
│   │    ├── flipkart.png
│   │    ├── myntra.png
│   │    ├── bms.png
│   │    ├── appstore.png
│   │    ├── uber.png
│   │    ├── default-gift.png
│   │    ├── abc_school.png
│   │    ├── xyz_college.png
│   │    ├── uni_example.png
│   │    ├── aplus_coaching.png
│   │    ├── upi-sm.png
│   │    ├── gpay-sm.png
│   │    ├── phonepe-sm.png
│   │    ├── paytm-sm.png
│   │    ├── indigo.png
│   │    ├── vistara.png
│   │    ├── airindia.png
│   │    ├── spicejet.png
│   │    └── akasa.png
│   ├── images/ (Assumed for other images)
│   │    ├── tickets/train_ticket_thumb.png
│   │    ├── tickets/movie_ticket_thumb.png
│   │    ├── bills/electricity_bill_thumb.png
│   │    ├── prasadam/tirupati_laddu.jpg
│   │    ├── prasadam/tirupati_vada.jpg
│   │    ├── prasadam/shirdi_packet.jpg
│   │    ├── prasadam/vaishno_devi_prasad.jpg
│   │    ├── prasadam/default.jpg
│   │    ├── events/vaishno_devi_yatra.jpg
│   │    ├── events/diwali_pooja.jpg
│   │    ├── events/default.jpg
│   │    ├── accom/tirupati_srinivasam.jpg
│   │    ├── accom/tirupati_madhavam.jpg
│   │    ├── accom/shirdi_sai_ashram.jpg
│   │    ├── accom/default.jpg
│   │    ├── audio/aarti.jpg
│   │    ├── audio/mantra.jpg
│   │    ├── venues/venue1.jpg
│   │    ├── venues/venue2.jpg
│   │    ├── venues/venue3.jpg
│   │    ├── venues/venue4.jpg
│   │    └── venues/default.jpg
│   └── audio/ (Assumed for mock audio files)
│       ├── om_jai_jagdish.mp3
│       └── gayatri_mantra.mp3
├── src/
│   ├── ai/
│   │   ├── genkit.ts
│   │   └── flows/
│   │       ├── conversational-action.ts
│   │       ├── gift-suggestion-flow.ts
│   │   ├── recharge-plan-recommendation.ts
│   │   ├── smart-payee-suggestion.ts
│   │   └── spending-analysis.ts
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── middleware.ts
│   │   ├── not-found.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
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
│   │       │   ├── mobile-postpaid/page.tsx
│   │       │   └── subscription/page.tsx
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
│   │       ├── food/
│   │       │   ├── page.tsx
│   │       │   └── [restaurantId]/page.tsx
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
│   │       ├── shopping/
│   │       │   ├── online/page.tsx
│   │       │   └── grocery/page.tsx (Placeholder, assuming it exists)
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
│   │   ├── booking.ts
│   │   ├── cards.ts
│   │   ├── cash-withdrawal.ts
│   │   ├── contacts.ts
│   │   ├── creditScore.ts
│   │   ├── entertainment.ts
│   │   ├── favorites.ts
│   │   ├── healthcare.ts
│   │   ├── hyperlocal.ts
│   │   ├── liveTracking.ts
│   │   ├── loans.ts
│   │   ├── offers.ts
│   │   ├── payments.ts
│   │   ├── pocket-money.ts
│   │   ├── recharge.ts
│   │   ├── recovery.ts
│   │   ├── reminders.ts
│   │   ├── scan.ts
│   │   ├── shopping.ts
│   │   ├── switch.ts
│   │   ├── temple.ts
│   │   ├── transactionLogger.ts
│   │   ├── transactions.ts
│   │   ├── travel.ts
│   │   ├── types.ts
│   │   ├── upi.ts
│   │   ├── upiLite.ts
│   │   ├── user.ts
│   │   ├── vouchers.ts
│   │   └── wallet.ts
├── .env
├── .vscode/
│   └── settings.json
├── README.md
├── AI_SMART_FEATURES.MD
├── CUSTOMER_SUPPORT_FEATURES.MD
├── ENTERTAINMENT_EVENTS_FEATURE.MD
├── FINANCIAL_SERVICES_FEATURE.MD
├── FOOD_ORDERING_FEATURES.MD
├── GENERAL_BILL_PAYMENT_FEATURE.MD
├── HEALTHCARE_WELLNESS_FEATURES.MD
├── HYPERLOCAL_SERVICES_FEATURE.MD
├── MOBILE_RECHARGE_FEATURE.MD
├── MUNICIPAL_SERVICES_FEATURE.MD
├── OFFERS_REWARDS_LOYALTY_FEATURES.MD
├── PROJECT_STRUCTURE.md
├── SECURITY_CONVENIENCE_FEATURES.md
├── SHOPPING_ECOMMERCE_FEATURES.MD
├── TEMPLE_SPIRITUAL_SERVICES_FEATURE.MD
├── TRAVEL_TRANSIT_FEATURES.MD
├── UPI_WALLET_FEATURES.MD
├── ZETPAY_SUPERAPP_OVERVIEW.MD
├── components.json
├── firestore.schemas.md
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

*Note: This structure is based on the files explicitly mentioned or inferred from previous interactions. Some typical frontend asset folders like `public/images` or `public/fonts` are assumed but not explicitly listed if not provided in context. File extensions (.js vs .ts) in the backend are based on your provided context, with a preference for .ts if both were mentioned for similar files.*
