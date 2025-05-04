
# PayFriend - Your Everyday Super App 🚀

**PayFriend** aims to be the "digital remote control" for every Indian’s daily life, integrating payments, bookings, hyperlocal services, financial tools, spiritual guidance, and AI-powered assistance into one seamless experience.

## ✨ Core Features

**Payments & Wallet:**
*   UPI Payments (Send to Contact, Bank/UPI ID, Scan & Pay)
*   Wallet Top-up & Management
*   UPI Lite (PIN-less small payments)
*   UPI Autopay (Mandates)
*   Debit/Credit Card Payments & Management
*   Pay Later (BNPL)

**Recharge & Bill Payments:**
*   Mobile (Prepaid/Postpaid) with Plan Browsing & Recommendations
*   DTH, Broadband, Electricity, Water, Gas, FASTag
*   Credit Card Bills, Loan EMIs, Insurance Premiums
*   Education Fees, Subscription Services
*   Public Transit Cards (Metro)
*   Bill Reminders & Auto-pay

**Travel & Transit:**
*   Bus, Train, Flight Booking
*   Car & Bike Rentals
*   Live Tracking (Bus, Train)
*   Highway Rest Stop Info
*   EV Charging Station Finder
*   Emergency Travel Assistance

**Financial Services:**
*   Mutual Funds, Digital Gold Investment
*   FD/RD Booking (Planned)
*   Personal Loan Offers (Planned)
*   Credit Score Check (Planned)
*   Digital Pocket Money for Kids
*   SIP Reminders

**Entertainment & Events:**
*   Movie, Event, Comedy Show, Sports Ticket Booking
*   OTT Subscription Management
*   AR/VR Event Viewing (Planned)
*   Group Booking & Watch Party Tools (Planned)

**Food & Hyperlocal:**
*   Online Food Ordering (Zomato/Swiggy style)
*   Hyperlocal Services (Electrician, Plumber, Cleaning, Laundry, Courier, etc.)
*   Parking Payments

**Temple & Spiritual Services:**
*   Darshan Slot Booking
*   Live Darshan Videos
*   Virtual Pooja Booking
*   Prasadam Delivery
*   Donations

**AI & Smart Features:**
*   Conversational AI for Bookings & Recharges
*   Smart Payee Suggestions
*   Spending Analysis & Recommendations
*   AI Plan Recommendations (Recharge)
*   AI Queue Prediction (Temple - Planned)
*   Auto-Booking/Recharge (Planned)

**Other:**
*   Offers, Rewards & Loyalty Program (Scratch Cards)
*   Secure Vault for Documents & Tickets
*   Emergency Mode
*   Profile & Settings Management

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** Tailwind CSS, Shadcn/ui
*   **State Management:** React Context / Zustand (implied, not explicitly shown)
*   **Backend/DB:** Firebase (Authentication, Firestore, potentially Functions)
*   **AI:** Google AI - Genkit (Gemini Models)
*   **Real-time:** Firebase Firestore Realtime Updates

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Firebase Account & Project Setup
*   Google AI API Key (for Genkit features)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd payfriend-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
# Firebase Configuration (replace with your actual Firebase project config)
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional

# Google AI API Key (for Genkit)
GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY
```

**Important:** Obtain these keys from your Firebase project settings and Google AI Studio. **Never commit your `.env` file to version control.**

### Running the Development Server

1.  **Run the Genkit development server (in a separate terminal):**
    ```bash
    npm run genkit:dev
    # or for auto-reloading on AI flow changes:
    # npm run genkit:watch
    ```

2.  **Run the Next.js development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

Open [http://localhost:9002](http://localhost:9002) (or the specified port) in your browser to see the application.

### Building for Production

```bash
npm run build
npm start
```

## 📁 Folder Structure (Simplified)

```
.
├── src/
│   ├── app/                 # Next.js App Router (pages, layouts)
│   │   ├── (auth)/          # Authentication routes (login, signup)
│   │   ├── (features)/      # Core feature routes/pages
│   │   ├── api/             # API routes (if needed)
│   │   ├── globals.css
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Homepage
│   ├── components/          # Reusable UI components
│   │   └── ui/              # Shadcn/ui components
│   ├── services/            # Backend/API interaction logic (Firebase, etc.)
│   ├── ai/                  # AI-related code (Genkit flows)
│   │   ├── flows/
│   │   ├── ai-instance.ts
│   │   └── dev.ts
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions, Firebase config
│   ├── context/             # React context providers (if any)
│   └── styles/              # Global styles (besides globals.css)
├── public/                # Static assets (images, logos)
├── .env                   # Environment variables (DO NOT COMMIT)
├── next.config.ts         # Next.js configuration
├── package.json
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## 🤝 Contributing

Contributions are welcome! Please follow standard Git workflow (fork, branch, commit, pull request). Ensure code follows project guidelines and includes necessary tests.

## 📜 License

This project is likely under the MIT License (or specify your chosen license).

---

*This README provides a high-level overview. Refer to specific files and comments for detailed implementation notes.*
