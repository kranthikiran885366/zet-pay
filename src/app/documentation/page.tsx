'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-secondary p-4">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md mb-6 rounded-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">PayFriend App Documentation</h1>
      </header>

      <div className="space-y-6">

        {/* Core Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>Core Features</CardTitle>
            <CardDescription>Overview of the main functionalities of the PayFriend app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <h3 className="font-semibold text-lg mb-2">1. Home Dashboard</h3>
              <p className="text-sm text-muted-foreground">The main screen providing quick access to essential functions:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Recharge & Pay Bills:</strong> Access various bill payment categories (Mobile, DTH, Electricity, etc.).</li>
                <li><strong>Send Money:</strong> Options to transfer funds via Mobile Contact, Bank Account, or UPI ID.</li>
                <li><strong>Scan & Pay:</strong> Use the camera to scan UPI QR codes for quick payments.</li>
                <li><strong>Wallet Balance:</strong> Displays the current balance in the PayFriend wallet.</li>
                <li><strong>Recent Transactions:</strong> Shows a summary of the latest transactions.</li>
                <li><strong>Quick Links:</strong> Shortcuts to frequently used services.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">2. UPI & Bank Integration</h3>
              <p className="text-sm text-muted-foreground">Seamlessly manage bank accounts and UPI:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Link Accounts:</strong> Add multiple bank accounts securely.</li>
                <li><strong>Check Balance:</strong> Verify account balance using UPI PIN.</li>
                <li><strong>UPI Payments:</strong> Send and receive money using UPI IDs or QR codes. Requires UPI PIN authorization for sending.</li>
                <li><strong>UPI Lite:</strong> Make small-value payments instantly without a PIN (if enabled).</li>
                 <li><strong>UPI Autopay:</strong> Set up recurring payments (mandates) for subscriptions, EMIs, etc.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">3. Recharge & Bill Payments</h3>
              <p className="text-sm text-muted-foreground">Comprehensive bill payment solution:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Mobile Recharge (Prepaid/Postpaid):</strong> Recharge any mobile number, browse plans, view operator details.</li>
                <li><strong>Utility Bills:</strong> Pay for Electricity, Water, Piped Gas, Broadband, etc.</li>
                <li><strong>DTH Recharge:</strong> Recharge satellite TV services.</li>
                <li><strong>FASTag Recharge:</strong> Top-up your FASTag for toll payments.</li>
                <li><strong>Credit Card Bills:</strong> Pay bills for any bank's credit card.</li>
                <li><strong>Loan EMIs, Insurance Premiums, Education Fees, etc.</strong></li>
                <li><strong>Saved Billers & Reminders:</strong> Save frequent billers and set payment reminders.</li>
                 <li><strong>Recharge Undo:</strong> Option to cancel a wrong mobile/DTH recharge within a short window (operator-dependent).</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">4. Offers & Rewards</h3>
              <p className="text-sm text-muted-foreground">Get rewarded for using PayFriend:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Cashback History:</strong> Track cashback earned.</li>
                <li><strong>Coupons:</strong> Discover and apply discount coupons for various services.</li>
                <li><strong>Scratch Cards:</strong> Earn scratch cards for payments and win rewards.</li>
                 <li><strong>Loyalty Program:</strong> Earn points and move up tiers for exclusive benefits.</li>
                 <li><strong>Referral Program:</strong> Invite friends and earn rewards.</li>
              </ul>
            </section>

             <section>
               <h3 className="font-semibold text-lg mb-2">5. PayFriend Switch</h3>
               <p className="text-sm text-muted-foreground">Access mini-apps within PayFriend:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li>Integrations with partner apps for Travel, Shopping, Food, etc.</li>
                 <li>Book services or shop without leaving the PayFriend app.</li>
               </ul>
             </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">6. Transaction History</h3>
              <p className="text-sm text-muted-foreground">View and manage past transactions:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li>Filter transactions by Status (Completed, Pending, Failed), Date Range, or Type (Recharge, Sent, Received).</li>
                <li>Search specific transactions.</li>
                <li>View detailed transaction information.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">7. Profile & Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your account and preferences:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li>Manage Profile Information (Name, Email, Phone).</li>
                <li>Manage Linked Bank Accounts & UPI IDs (Set default, remove).</li>
                <li>Security Settings (App Lock, Biometric, Change PIN).</li>
                <li>Notification Preferences.</li>
                <li>KYC Verification Status.</li>
                 <li>Help & Support (24/7 Live Chat).</li>
                 <li>Manage Saved Cards.</li>
                 <li>View Rewards & Loyalty Status.</li>
              </ul>
            </section>

            <section>
               <h3 className="font-semibold text-lg mb-2">8. Travel Bookings</h3>
               <p className="text-sm text-muted-foreground">Book various travel services:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li><strong>Bus/Train/Flights:</strong> Search routes, check availability, select seats/berths, and book tickets.</li>
                 <li><strong>Car/Bike Rentals:</strong> Rent vehicles for self-drive or with a chauffeur.</li>
                 <li><strong>Live Tracking:</strong> Track real-time status of buses and trains.</li>
                 <li><strong>EV Charging/Rest Stops:</strong> Find nearby EV stations or highway amenities.</li>
                 <li><strong>AI Travel Assistant:</strong> Plan trips and get recommendations using AI.</li>
                 <li><strong>Emergency Assistance:</strong> Request roadside or medical help during travel.</li>
               </ul>
             </section>

             <section>
               <h3 className="font-semibold text-lg mb-2">9. Financial Services</h3>
               <p className="text-sm text-muted-foreground">Manage investments and other financial products:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li><strong>Mutual Funds:</strong> Invest in SIPs or Lumpsum, browse funds.</li>
                 <li><strong>Digital Gold:</strong> Buy, sell, and manage digital gold investments.</li>
                 <li><strong>Fixed/Recurring Deposits:</strong> Book FDs/RDs with partner banks.</li>
                 <li><strong>Loans (Micro & Personal):</strong> Check eligibility and apply for instant micro-loans or view personal loan offers. Includes "Study Now, Pay Later".</li>
                 <li><strong>Credit Score:</strong> Check your credit score and report.</li>
                  <li><strong>Digital Pocket Money:</strong> Manage allowances and spending for children, link school fees.</li>
                  <li><strong>Goal-Based Savings:</strong> Set savings goals and automate contributions.</li>
               </ul>
             </section>

             <section>
               <h3 className="font-semibold text-lg mb-2">10. Entertainment & Events</h3>
               <p className="text-sm text-muted-foreground">Book tickets and manage subscriptions:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li><strong>Movie/Event Tickets:</strong> Book tickets for movies, concerts, comedy shows, sports matches.</li>
                 <li><strong>OTT Subscriptions:</strong> Pay for streaming services.</li>
                 <li><strong>Subscription Manager:</strong> View and manage recurring subscriptions.</li>
                 <li><strong>Game Zones/Amusement Parks:</strong> Book entry tickets or slots.</li>
               </ul>
             </section>

              <section>
               <h3 className="font-semibold text-lg mb-2">11. Food & Hyperlocal Services</h3>
               <p className="text-sm text-muted-foreground">Order food and book local services:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li><strong>Online Food Ordering:</strong> Browse restaurants, order food for delivery (Zomato/Swiggy style).</li>
                 <li><strong>Hyperlocal Services:</strong> Book Electrician, Plumber, Cleaning, Laundry, Courier, Car Wash, Tailoring, Pet Care, Salon, AC Repair, etc.</li>
                 <li><strong>Coworking Space/Parking Booking:</strong> Find and book slots.</li>
               </ul>
             </section>

              <section>
               <h3 className="font-semibold text-lg mb-2">12. Temple & Spiritual Services</h3>
               <p className="text-sm text-muted-foreground">Access various temple-related services:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li><strong>Darshan Slot Booking:</strong> Book timed slots for temple visits.</li>
                 <li><strong>Live Darshan:</strong> Watch live video feeds from temples.</li>
                 <li><strong>Virtual Pooja Booking:</strong> Participate in rituals remotely.</li>
                 <li><strong>Prasadam Delivery:</strong> Order prasadam online.</li>
                 <li><strong>Temple Donations:</strong> Donate securely to temples/trusts.</li>
                 <li><strong>Info & Audio:</strong> Access timings, queue estimates, Aarti/Mantra audio.</li>
                 <li><strong>Event Booking & Accommodation Info:</strong> Browse festivals, find nearby stays.</li>
                  <li><strong>Smart Access Pass:</strong> Use QR codes for entry based on bookings.</li>
               </ul>
             </section>

              <section>
               <h3 className="font-semibold text-lg mb-2">13. Healthcare & Wellness</h3>
               <p className="text-sm text-muted-foreground">Manage your health needs:</p>
               <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                 <li><strong>Doctor Appointments/Video Consultations:</strong> Book online or in-person appointments.</li>
                 <li><strong>Lab Tests:</strong> Book tests with home sample collection.</li>
                 <li><strong>Order Medicines/Subscriptions:</strong> Get medicines delivered, set up recurring orders.</li>
                 <li><strong>Hospital Bed/OPD Booking:</strong> Check availability and book slots.</li>
                 <li><strong>Emergency Ambulance Booking.</strong></li>
                 <li><strong>Fitness Trainers:</strong> Find and book sessions.</li>
                 <li><strong>Health Wallet:</strong> Store prescriptions and reports securely.</li>
               </ul>
             </section>

             <section>
                <h3 className="font-semibold text-lg mb-2">14. Unique & AI Features</h3>
                 <p className="text-sm text-muted-foreground">Advanced capabilities enhancing user experience:</p>
                 <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li><strong>Conversational Actions:</strong> Use voice or text commands ("Ask PayFriend") to perform actions like recharge or booking.</li>
                    <li><strong>Smart Payee Suggestions:</strong> AI predicts frequent contacts for payments.</li>
                    <li><strong>Spending Analysis:</strong> AI provides insights and summaries of spending patterns.</li>
                    <li><strong>AI Plan Recommendations:</strong> Suggests optimal mobile recharge plans.</li>
                     <li><strong>Smart Wallet Bridge:</strong> Auto-uses wallet balance if UPI limit is exceeded, recovers later.</li>
                     <li><strong>Recharge Undo:</strong> Cancel wrong recharges within a time limit.</li>
                     <li><strong>Auto-Credit for Failed Payments:</strong> Provides instant support/credit for debited but failed transactions.</li>
                     <li><strong>Secure Vault:</strong> Automatically saves tickets, bills, etc.</li>
                     <li><strong>Emergency Mode:</strong> One-tap action to share location, call help, and prepare wallet.</li>
                     <li><strong>Payment Freeze Mode:</strong> Temporarily disable payments.</li>
                     <li><strong>Temporary Virtual UPI ID:</strong> Generate disposable UPI IDs for privacy.</li>
                     <li><strong>Self-Imposed Spending Limits:</strong> Set daily/weekly/monthly spending caps.</li>
                     <li><strong>24/7 Live Human Support Chat.</strong></li>
                     <li><strong>Multilingual Voice Commands.</strong></li>
                     <li><strong>AI Gifting Assistant:</strong> Helps choose gifts based on criteria.</li>
                     <li><strong>AI Queue Prediction (Temple):</strong> Estimates wait times.</li>
                     <li><strong>Goal-Based Financial Planning AI:</strong> Helps set and track savings goals.</li>
                 </ul>
             </section>

              <section>
                 <h3 className="font-semibold text-lg mb-2">15. Investment Services</h3>
                 <p className="text-sm text-muted-foreground">Explore and manage your investments:</p>
                 <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                     <li><strong>Mutual Funds:</strong> Invest via SIP or Lumpsum. Browse funds, view NAV, and track performance.</li>
                     <li><strong>Digital Gold:</strong> Buy, sell, and hold 24K digital gold securely. View live prices and manage holdings.</li>
                     <li><strong>Stock Market:</strong> (Coming Soon) Integration with brokerage platforms to buy/sell stocks.</li>
                     <li><strong>Portfolio Summary:</strong> View total investment value, current value, and profit/loss across assets managed within the app.</li>
                 </ul>
             </section>

          </CardContent>
        </Card>

        {/* Security Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
            <CardDescription>How PayFriend ensures your data and transactions are secure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <section>
               <h4 className="font-semibold mb-1">Bank-Level Security</h4>
               <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>PCI DSS Compliance:</strong> For secure card data handling.</li>
                  <li><strong>RBI/NPCI Guidelines:</strong> Adherence to regulatory standards for UPI and wallets.</li>
                  <li><strong>End-to-End Encryption (E2EE):</strong> Protecting sensitive data like PINs and OTPs.</li>
                  <li><strong>Tokenization:</strong> Replacing actual card/account numbers with secure tokens.</li>
                  <li><strong>Secure Payment Gateway Integration:</strong> Partnering with RBI-approved gateways.</li>
                  <li><strong>KYC Verification:</strong> Mandatory verification for wallets and certain features.</li>
                  <li><strong>Fraud Detection Systems:</strong> Real-time monitoring for suspicious activity.</li>
               </ul>
             </section>
             <section>
               <h4 className="font-semibold mb-1">App-Level Security</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Biometric/PIN Authentication:</strong> Secure app access and transaction authorization.</li>
                  <li><strong>Device Binding:</strong> Linking accounts to a specific trusted device.</li>
                  <li><strong>Session Management:</strong> Secure session handling with timeouts.</li>
                  <li><strong>App Integrity Checks:</strong> Protection against rooted/jailbroken devices and tampering.</li>
                  <li><strong>SSL Pinning:</strong> Preventing man-in-the-middle attacks.</li>
                  <li><strong>Data Encryption:</strong> Encrypting data both at rest (locally) and in transit (API calls).</li>
                  <li><strong>Two-Factor Authentication (2FA):</strong> Required for critical actions.</li>
                  <li><strong>Secure Local Storage:</strong> Using platform-specific secure storage (Keystore/Secure Enclave).</li>
                  <li><strong>Real-Time Transaction Alerts:</strong> Instant notifications for financial activities.</li>
                </ul>
             </section>
          </CardContent>
        </Card>

        {/* Add sections for How-Tos, API Details (if public), Contribution Guidelines etc. */}

      </div>
    </div>
  );
}

