
# Zet Pay - Your AI-Powered Everyday Super App 🚀

**Mission:** To be the "digital remote control" for every Indian’s daily life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance into one seamless, secure, and intuitive experience.

**Goal:** Evolve beyond a payments app into India's Everyday Operating System – a lifestyle AI, financial brain, spiritual guide, hyperlocal commerce engine, and wellness tool.

## ✨ Core Features

**Payments & Wallet:**
*   UPI Payments (Send to Contact, Bank/UPI ID, Scan & Pay)
*   Wallet Top-up & Management
*   UPI Lite (PIN-less small payments)
*   UPI Autopay (Mandates)
*   Debit/Credit Card Payments & Management (Tokenized)
*   Pay Later (BNPL) Activation & Management
*   **Unique:** Smart Wallet Bridge (UPI Limit Exceed Resolver)
*   **Unique:** Cardless Cash Withdrawal (via Zet Agents)

**Recharge & Bill Payments:**
*   Mobile (Prepaid/Postpaid) with Operator Detection, Plan Browser, Recommendations, Validity Tracking, Reminders, History, Activation Status
*   DTH Recharge with Operator Detection & Plan Browser
*   Electricity Bills (Prepaid & Postpaid)
*   Water Bills
*   Broadband & Landline Bills
*   FASTag Recharge
*   Credit Card Bills (All Banks)
*   Loan EMIs
*   Insurance Premiums
*   Education Fees
*   Subscription Services (OTT, etc.)
*   Metro Card Recharge
*   Data Card Recharge
*   Intl. Calling Cards
*   Gas Bills
*   Bill Reminders & Auto-pay Options
*   **Unique:** Recharge Undo (within time window)

**Travel & Transit:**
*   Bus Ticket Booking (Search, Select Seats, Book)
*   Train Ticket Booking (Search, Check Availability, Book)
*   Flight Ticket Booking (Search, Book)
*   Car Rentals (Self-drive/Chauffeur)
*   Bike Rentals (Hourly/Daily/Subscription)
*   Live Bus Tracking (APSRTC Style)
*   Live Train Tracking (Where Is My Train Style)
*   EV Charging Station Finder & Booking
*   Highway Rest Stop Info & Pre-Booking
*   Emergency Travel Assistance (Roadside/Medical)
*   **Unique:** Family Travel Mode (Centralized Payments)
*   **Unique:** Smart Itinerary Auto-Creation

**Financial Services:**
*   Mutual Funds Investment (SIP/Lumpsum)
*   Digital Gold Investment & Redemption
*   FD/RD Booking (Coming Soon)
*   Personal Loan Offers & Application (Coming Soon)
*   Credit Score Check (Coming Soon)
*   Digital Pocket Money for Kids (with Controls & School Fee Payment)
*   SIP Reminders
*   **Unique:** Micro-Loans for Students (0% Interest Option)
*   **Unique:** Study Now, Pay Later (SNPL) for Fees

**Entertainment & Events:**
*   Movie Ticket Booking (Showtimes, Seat Selection)
*   Event, Concert, Comedy Show, Sports Ticket Booking
*   OTT Subscription Management & Bundling
*   Game Zone & Amusement Park Booking
*   **Unique:** AR/VR Event Viewing & Booking Interface
*   **Unique:** Group Movie Booking (Split & Invite)
*   **Unique:** Watch Party Creation & Scheduling
*   Live Show Reminders & Ticket Sync
*   Regional Event Discovery

**Food & Hyperlocal:**
*   Online Food Ordering (Zomato/Swiggy Style)
*   Hyperlocal Services (Electrician, Plumber, Cleaning, Laundry, Courier, Car Wash, Tailoring, Pet Care, Salon/Barber)
*   Coworking Space Booking
*   Parking Payments & Slot Booking

**Temple & Spiritual Services:**
*   Darshan Slot Booking (Special Entry, Free, VIP)
*   Live Darshan Videos
*   Virtual Pooja Booking
*   Prasadam Delivery Booking
*   Temple Donations (with Schemes)
*   Temple Timings & Live Queue Info
*   Aarti & Mantras Audio Section
*   Temple Events & Yatra Booking
*   Accommodation Near Temples Info
*   Group Visit Booking Requests
*   **Unique:** Smart Access Pass (QR-based Entry)
*   **Unique:** AI Queue Prediction (Planned)

**AI & Smart Features:**
*   Conversational AI for Bookings & Recharges ("Ask PayFriend")
*   Smart Payee Suggestions
*   Spending Analysis & Recommendations
*   AI Recharge Plan Recommendations
*   AI Coupon Auto-Apply & Deal Hunter
*   **Unique:** Predictive Travel Booking (Calendar/Weather based)
*   **Unique:** Auto Split Payments (Roommates/Friends)
*   **Unique:** Personalized Festival Offers
*   **Unique:** Smart Schedule Builder (Travel + Food + Work)
*   **Unique:** Goal-Based Financial Planning AI

**Security & Convenience:**
*   Secure Vault for Documents & Tickets (Auto-upload)
*   Emergency Mode (Share Location, Call Services, Prepare Wallet)
*   **Unique:** Payment Freeze Mode (Temporary Lock)
*   **Unique:** Battery-Based Lite Mode (<10% Battery)
*   **Unique:** Temporary Virtual UPI ID
*   **Unique:** Self-Imposed Daily UPI Spending Limits
*   **Unique:** Auto-Credit for Payment Failures (with Ticket ID)
*   **Unique:** Zet Fuel Card (Prepaid Fuel Wallet)
*   **Unique:** Zet One-Tap Auth (OTP Fallback)
*   **Unique:** Retry Payment with Another Method (Seamless Flow)
*   **Unique:** Real-time Bank Server Status Display
*   **Unique:** Multi-device Login Alerts & Remote Logout
*   **Unique:** Auto-Debit Manager (Pause/Reschedule/Alerts)
*   Biometric Authentication & App Lock
*   Device Binding
*   PCI DSS Compliance, RBI/NPCI Adherence, E2EE, Tokenization
*   KYC Verification

**Other:**
*   Offers, Rewards & Loyalty Program (Scratch Cards, Tiers, Points)
*   Referral Program
*   Profile & Settings Management
*   **Unique:** Senior Citizen Mode (UI Enhancements)
*   **Unique:** Multilingual Voice Commands (15+ Languages)
*   24/7 Live Human Support Chat

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** Tailwind CSS, Shadcn/ui
*   **State Management:** React Context / Zustand (implied)
*   **Backend:** Node.js, Express.js
*   **Database:** Firebase Firestore
*   **Authentication:** Firebase Authentication
*   **Real-time:** Firebase Firestore Realtime Updates / WebSockets
*   **AI:** Google AI - Genkit (Gemini Models)
*   **Blockchain:** (Integration Planned - specific library/platform TBD, likely Hyperledger Fabric or Ethereum via partner)
*   **Payment Gateway:** Integration with RBI-approved PGs (e.g., Razorpay, Cashfree - requires partner setup)
*   **UPI/Banking Integration:** Via licensed PSP/Banking partners (requires partner setup)

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Firebase Account & Project Setup (Firestore, Auth required)
*   Google AI API Key (for Genkit features)
*   Backend Server Running (Node.js/Express - see `backend/` directory)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd payfriend-app
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```
    Return to the root directory: `cd ..`

### Environment Variables

Create a `.env` file in the **root** directory and add frontend variables:

```env
# Firebase Frontend Configuration (replace with your actual Firebase project config)
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional

# Google AI API Key (for Genkit client-side calls, if any)
NEXT_PUBLIC_GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY # If needed client-side

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:9003/api # Default backend URL
```

Create a `.env` file in the **`backend/`** directory and add backend variables:

```env
# Firebase Admin SDK Configuration (Choose ONE method)
# Method 1: Service Account File Path (Recommended for local dev)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/serviceAccountKey.json

# Method 2: Service Account Environment Variables (Suitable for deployment)
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n" # Ensure newlines are correct

# Google AI API Key (for Genkit backend flows)
GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Other Backend Configs (Add as needed)
# PORT=9003
# BLOCKCHAIN_API_ENDPOINT=...
# JWT_SECRET=...
```

**Important:** Obtain these keys from your Firebase project settings and Google AI Studio. **Never commit your `.env` files to version control.**

### Running the Development Servers

1.  **Run the Backend Server (in a separate terminal):**
    ```bash
    cd backend
    npm run dev
    ```

2.  **Run the Genkit development server (in a separate terminal, from the root directory):**
    ```bash
    npm run genkit:dev
    # or for auto-reloading on AI flow changes:
    # npm run genkit:watch
    ```

3.  **Run the Next.js Frontend Development Server (from the root directory):**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

Open [http://localhost:9002](http://localhost:9002) (or the specified port for the frontend) in your browser.

### Building for Production

1.  **Build Frontend:**
    ```bash
    npm run build
    ```
2.  **Start Frontend:**
    ```bash
    npm start
    ```
3.  **Build & Start Backend:** (Ensure backend has appropriate build steps if needed)
    ```bash
    cd backend
    # npm run build (if applicable)
    npm start
    ```

## 📁 Folder Structure (Simplified)

```
.
├── src/                 # Frontend (Next.js)
│   ├── app/             # Next.js App Router (pages, layouts)
│   │   ├── (auth)/      # Auth routes
│   │   ├── (features)/  # Core feature routes/pages
│   │   ├── api/         # Next.js API routes (minimal, prefer backend)
│   │   ├── globals.css
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Homepage
│   ├── components/      # Reusable UI components
│   │   └── ui/          # Shadcn/ui components
│   ├── services/        # Frontend service functions (API calls)
│   ├── ai/              # AI-related code (Genkit flows)
│   │   ├── flows/
│   │   ├── ai-instance.ts
│   │   └── dev.ts
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utils, Firebase config (client)
│   └── styles/          # Global styles (if any)
├── backend/             # Backend (Node.js/Express)
│   ├── config/          # Firebase Admin config, etc.
│   ├── controllers/     # Route handlers (logic)
│   ├── middleware/      # Auth, error handling middleware
│   ├── models/          # Data models/schemas (if needed)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic, external API calls
│   └── server.js        # Main server entry point
├── public/              # Static assets (images, logos)
├── .env                 # Frontend env vars (DO NOT COMMIT)
├── backend/.env         # Backend env vars (DO NOT COMMIT)
├── next.config.ts       # Next.js configuration
├── package.json         # Frontend dependencies & scripts
├── backend/package.json # Backend dependencies & scripts
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration (Frontend)
```

## 🤝 Contributing

Contributions are welcome! Please follow standard Git workflow (fork, branch, commit, pull request). Ensure code follows project guidelines and includes necessary tests.

## 📜 License

This project is likely under the MIT License (or specify your chosen license).

---

*This README provides a high-level overview. Refer to specific files and comments for detailed implementation notes.*
