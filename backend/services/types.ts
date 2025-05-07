/**
 * @fileOverview Shared type definitions for data structures used across services.
 */
import type { Timestamp } from 'firebase/firestore'; // Keep for potential backend alignment

// Replicated from user.ts - keep this as the single source of truth
export interface UserProfile {
    id: string; // Corresponds to Firebase Auth UID
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    kycStatus?: 'Verified' | 'Not Verified' | 'Pending';
    // Use simple types for client-side, backend will handle Timestamps
    createdAt?: Date | string | Timestamp; // Allow Timestamp for backend
    updatedAt?: Date | string | Timestamp;
    notificationsEnabled?: boolean;
    biometricEnabled?: boolean;
    appLockEnabled?: boolean;
    isSmartWalletBridgeEnabled?: boolean;
    smartWalletBridgeLimit?: number;
    defaultPaymentMethod?: 'upi' | 'wallet' | string;
    isSeniorCitizenMode?: boolean;
    familyGroupIds?: string[];
}

export interface Transaction {
  id: string; // Firestore document ID
  userId: string;
  type: string; // Consider using a stricter enum matching backend values e.g., 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Investment' | 'Service Booking' | 'Wallet Top-up' etc.
  name: string; // Payee name, Biller name, Service name, Fund name etc.
  description: string; // Transaction note, plan details, purpose
  amount: number; // Negative for debits, positive for credits/refunds
  date: Date | string | Timestamp; // Allow string initially from client, Timestamp in backend
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled' | 'Refunded'; // Added Refunded
  avatarSeed?: string; // Seed for generating avatar placeholder
  upiId?: string; // Relevant UPI ID (payee or self)
  billerId?: string; // Biller ID if applicable
  loanId?: string; // Loan ID if applicable
  ticketId?: string; // Booking ID / PNR / Support Ticket ID
  refundEta?: string; // Expected refund time on failure
  blockchainHash?: string; // Hash if logged on blockchain
  paymentMethodUsed?: 'UPI' | 'Wallet' | 'Card' | 'NetBanking'; // Optional: How was it paid?
  originalTransactionId?: string; // For refunds/chargebacks
  // Fields from backend Transaction type
  operatorReferenceId?: string;
  billerReferenceId?: string;
  planId?: string;
  identifier?: string;
  withdrawalRequestId?: string;
  createdAt?: Date | string | Timestamp;
  updatedAt?: Date | string | Timestamp;
}

export interface BankAccount {
  id?: string; // Firestore document ID or backend ID
  bankName: string;
  accountNumber: string; // Masked number
  upiId: string; // Generated/linked UPI ID
  userId: string; // Link to the user
  isDefault?: boolean;
  pinLength?: 4 | 6;
  createdAt?: Timestamp | Date | string; // Allow Timestamp for backend
}

export interface UpiTransactionResult {
  transactionId?: string; // NPCI/PSP transaction reference
  amount: number;
  recipientUpiId: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'FallbackSuccess'; // FallbackSuccess indicates wallet was used
  message?: string; // Message from bank/NPCI/PSP
  usedWalletFallback?: boolean;
  walletTransactionId?: string; // Transaction ID if paid via wallet fallback
  ticketId?: string; // For failed transactions needing support
  refundEta?: string; // ETA for refund on failure
  errorCode?: string; // For UPI payment failures
  mightBeDebited?: boolean; // For UPI payment failures
}

export interface Payee {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this contact
  name: string;
  identifier: string; // Phone number or UPI ID/Account
  type: 'mobile' | 'bank' | 'dth' | 'fastag'; // Added more types
  avatarSeed?: string;
  upiId?: string; // Specifically store verified UPI ID if type is bank/upi
  accountNumber?: string; // Store account number if type is bank
  ifsc?: string; // Store IFSC if type is bank
  isFavorite?: boolean;
  createdAt?: Timestamp | Date | string; // Allow multiple types
  updatedAt?: Timestamp | Date | string;
}

// --- Offer Types ---
export interface Offer {
  id?: string; // Backend ID
  offerId: string; // Your internal offer code
  description: string;
  imageUrl: string;
  offerType: 'Cashback' | 'Coupon' | 'Discount' | 'Partner';
  terms?: string;
  validUntil?: Date | string | Timestamp;
  category?: string; // e.g., "Recharge", "Shopping", "Travel"
  isActive: boolean;
  createdAt?: Date | string | Timestamp;
}

// --- Loyalty Types ---
export interface LoyaltyStatus {
    userId: string;
    points: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    benefits: string[];
    lastUpdated: Date | string | Timestamp;
}

// --- Referral Types ---
export interface ReferralStatus {
    userId: string;
    referralCode: string;
    successfulReferrals: number;
    pendingReferrals: number;
    totalEarnings: number;
}

// --- Scratch Card Types ---
export interface ScratchCardData {
    id?: string; // Firestore ID
    userId: string;
    isScratched: boolean;
    rewardAmount?: number;
    expiryDate: Date | string | Timestamp;
    message: string; // "You won X" or "Better luck next time"
    sourceOfferId?: string; // Link to original offer if applicable
    createdAt: Date | string | Timestamp;
    scratchedAt?: Date | string | Timestamp;
}

// --- Card Types ---
export interface CardDetails {
    id: string; // Backend database ID / Gateway token ID
    userId: string;
    gatewayToken?: string; // Added from card service
    cardIssuer?: string;
    bankName?: string;
    last4: string;
    expiryMonth: string; // MM
    expiryYear: string; // YYYY
    cardHolderName?: string;
    cardType: 'Credit' | 'Debit';
    isPrimary?: boolean;
    createdAt?: Timestamp | Date | string; // Added from card service
}

export interface CardPaymentResult {
    success: boolean;
    transactionId?: string; // Backend-generated transaction ID (Firestore ID)
    gatewayTransactionId?: string; // Optional ID from the payment gateway
    message: string;
    usedWalletFallback?: boolean;
    walletTransactionId?: string;
    retryWithDifferentMethod?: boolean;
    errorCode?: string;
}

// --- Autopay Mandate Types ---
export interface Mandate {
    id?: string; // Backend ID / Firestore ID
    userId: string;
    merchantName: string;
    upiId: string; // User's UPI ID used for the mandate
    maxAmount: number;
    frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented';
    startDate: Date | string | Timestamp;
    validUntil: Date | string | Timestamp;
    status: 'Active' | 'Paused' | 'Cancelled' | 'Failed' | 'Pending Approval';
    createdAt?: Date | string | Timestamp;
    updatedAt?: Date | string | Timestamp;
    mandateUrn?: string; // Unique reference number from NPCI/PSP
    pspReferenceId?: string; // PSP's internal reference
}

// --- Loan Types ---
export interface MicroLoanStatus {
    hasActiveLoan: boolean;
    loanId?: string; // Firestore document ID of the active loan
    amountDue?: number;
    dueDate?: Date | string | Timestamp; // Allow Timestamp for backend
    purpose?: 'General' | 'Education';
}

// --- Wallet Types ---
export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string; // The ID of the transaction record created by the backend
    newBalance?: number; // Optionally returned by the backend after update
    message?: string;
}


// --- UPI Lite ---
export interface UpiLiteDetails {
    isEnabled: boolean;
    balance: number;
    maxBalance: number;
    maxTxnAmount: number;
    linkedAccountUpiId?: string;
}

// --- Pocket Money ---
export interface ChildAccountConfig {
    id: string;
    name: string;
    avatarSeed: string;
    balance: number;
    allowanceAmount?: number;
    allowanceFrequency?: 'Daily' | 'Weekly' | 'Monthly' | 'None';
    lastAllowanceDate?: Date | string | Timestamp;
    spendingLimitPerTxn?: number;
    linkedSchoolBillerId?: string;
}
export interface PocketMoneyConfig {
    userId: string;
    children: ChildAccountConfig[];
}
export interface PocketMoneyTransaction {
    id: string;
    userId: string;
    childId: string;
    description: string;
    amount: number;
    date: Date | string | Timestamp;
}

// --- Cash Withdrawal ---
export interface ZetAgent {
    id: string;
    name: string;
    address: string;
    distanceKm: number;
    operatingHours: string;
}
export interface WithdrawalDetails {
    id?: string;
    userId: string;
    agentId: string;
    agentName?: string;
    amount: number;
    otp: string;
    qrData: string;
    status: 'Pending Confirmation' | 'Completed' | 'Expired' | 'Cancelled' | 'Failed';
    createdAt: Timestamp | Date | string;
    expiresAt: Timestamp | Date | string;
    completedAt?: Timestamp | Date | string;
    failureReason?: string;
    transactionId?: string;
    updatedAt?: Timestamp | Date | string;
    expiresInSeconds?: number;
    holdTransactionId?: string; // Added for linking
}

// --- Booking Types ---
export interface BookingSearchResult {
    id: string;
    name: string;
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event' | 'marriage';
    imageUrl?: string;
    priceRange?: string;
    rating?: number;
    location?: string;
    capacity?: number;
}

export interface FlightListing extends BookingSearchResult {
    airline: string;
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stops: number;
    price: number;
    refundable?: boolean;
    baggage: { cabin: string; checkin: string };
}

// For Marriage Venue Bookings (Backend uses this for Firestore)
export interface MarriageVenue {
    id: string; // Corresponds to Firestore document ID
    name: string;
    location: string;
    city: string;
    capacity: number;
    price: number; // Base or starting price
    priceRange?: string;
    rating?: number;
    imageUrl?: string;
    description?: string;
    amenities?: string[];
    contact?: string;
    requiresApproval?: boolean; // Added from mock data
    bookingFee?: number; // Added from mock data
}

export interface MarriageBookingDetails { // For making a booking request
    venueId: string;
    venueName: string;
    city: string;
    date: string; // YYYY-MM-DD
    guestCount?: string;
    userName: string;
    userContact: string;
    totalAmount?: number; // Booking fee
    userId?: string; // Added for backend storage
    paymentTransactionId?: string; // Added for backend
    status?: 'Pending Approval' | 'Confirmed' | 'Cancelled' | 'Completed'; // Added status
    createdAt?: Timestamp; // Added for backend
}


// Note: Where Date | string is used, API will return string (likely ISO 8601),
// and the service function should convert it to a Date object for client use.
// Backend types might use Timestamp directly.
