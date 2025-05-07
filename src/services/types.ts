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
    createdAt?: Date | string; // Allow string for initial fetch, convert to Date later
    updatedAt?: Date | string;
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
  id: string;
  userId: string;
  type: string; // Consider using a stricter enum matching backend values
  name: string;
  description: string;
  amount: number;
  date: Date | string; // Allow string initially
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled';
  avatarSeed?: string;
  upiId?: string;
  billerId?: string;
  loanId?: string;
  ticketId?: string; // Can be booking ID, PNR, etc.
  refundEta?: string;
  blockchainHash?: string;
  paymentMethodUsed?: 'UPI' | 'Wallet' | 'Card' | 'NetBanking';
  originalTransactionId?: string;
  // Fields from backend Transaction type
  operatorReferenceId?: string;
  billerReferenceId?: string;
  planId?: string;
  identifier?: string;
  withdrawalRequestId?: string;
  createdAt?: Date | string; // Allow string initially
  updatedAt?: Date | string;
}


export interface BankAccount {
  id?: string; // Firestore document ID or backend ID
  bankName: string;
  accountNumber: string; // Masked number
  upiId: string; // Generated/linked UPI ID
  userId: string; // Link to the user
  isDefault?: boolean;
  pinLength?: 4 | 6;
}

export interface UpiTransactionResult {
  transactionId?: string;
  amount: number;
  recipientUpiId: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'FallbackSuccess';
  message?: string;
  usedWalletFallback?: boolean;
  walletTransactionId?: string;
  ticketId?: string; // For failed transactions
  refundEta?: string; // ETA for refund on failure
}

export interface Payee {
  id: string;
  userId: string; // ID of the user who owns this contact
  name: string;
  identifier: string; // Phone number or UPI ID/Account
  type: 'mobile' | 'bank' | 'dth' | 'fastag'; // Added more types
  avatarSeed?: string;
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
  isFavorite?: boolean;
  createdAt?: Timestamp | Date | string; // Allow multiple types
  updatedAt?: Timestamp | Date | string;
}

// Client-side interface for Payee with Date objects
export interface PayeeClient extends Omit<Payee, 'createdAt' | 'updatedAt'> {
    createdAt?: Date;
    updatedAt?: Date;
}

// --- Offer Types ---
export interface Offer {
  id?: string; // Backend ID
  offerId: string; // Your internal offer code
  description: string;
  imageUrl: string;
  offerType: 'Cashback' | 'Coupon' | 'Discount' | 'Partner';
  terms?: string;
  validUntil?: Date | string; // Allow string from API
  category?: string;
  isActive: boolean;
  createdAt?: Date | string;
}

// --- Loyalty Types ---
export interface LoyaltyStatus {
    userId: string;
    points: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    benefits: string[];
    lastUpdated: Date | string; // Allow string from API
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
    id?: string;
    userId: string;
    isScratched: boolean;
    rewardAmount?: number;
    expiryDate: Date | string; // Allow string from API
    message: string;
    sourceOfferId?: string;
    createdAt: Date | string;
    scratchedAt?: Date | string;
}

// --- Card Types ---
// Interface for card metadata stored/returned by backend API
export interface CardDetails {
    id: string; // Backend database ID / Gateway token ID
    userId: string;
    cardIssuer?: string; // e.g., "Visa", "Mastercard", "Rupay"
    bankName?: string;
    last4: string;
    expiryMonth: string; // MM
    expiryYear: string; // YYYY
    cardHolderName?: string;
    cardType: 'Credit' | 'Debit';
    isPrimary?: boolean;
    // No sensitive info like full number or CVV is exposed by the API here
}

// Interface for the result of a card payment attempt from the backend
export interface CardPaymentResult {
    success: boolean;
    transactionId?: string; // Backend-generated transaction ID
    message: string;
    usedWalletFallback?: boolean;
    walletTransactionId?: string;
    retryWithDifferentMethod?: boolean; // Suggest retry if card failed but others might work
    errorCode?: string; // Optional error code from gateway/bank
}

// --- Autopay Mandate Types ---
export interface Mandate {
    id?: string; // Backend ID
    userId: string;
    merchantName: string;
    upiId: string; // User's UPI ID used for the mandate
    maxAmount: number;
    frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented';
    startDate: Date | string;
    validUntil: Date | string;
    status: 'Active' | 'Paused' | 'Cancelled' | 'Failed' | 'Pending Approval';
    createdAt?: Date | string;
    updatedAt?: Date | string;
    mandateUrn?: string;
}

// --- BNPL Types ---
export interface BnplDetails {
    userId: string; // Firestore document ID (same as auth UID)
    isActive: boolean;
    creditLimit: number;
    providerName?: string;
    partnerBank?: string;
    activationDate?: Timestamp | Date | string; // Allow Date for client, string from API
    lastUpdated?: Timestamp | Date | string;
}

export interface BnplStatement {
    id?: string; // Firestore document ID
    userId: string;
    statementId: string; // e.g., YYYYMM format
    statementPeriodStart: Timestamp | Date | string;
    statementPeriodEnd: Timestamp | Date | string;
    dueDate: Timestamp | Date | string;
    dueAmount: number;
    minAmountDue: number;
    isPaid: boolean; // New field to track payment status
    paidDate?: Timestamp | Date | string;
    transactions?: BnplTransaction[]; // Embed or fetch separately
}

export interface BnplTransaction {
    id?: string; // Firestore document ID
    userId: string;
    statementId: string; // Link to the statement
    transactionId: string; // Original transaction ID (e.g., from UPI/Card)
    date: Timestamp | Date | string;
    merchantName: string;
    amount: number;
}

// --- Cash Withdrawal Types ---
export interface ZetAgent {
    id: string; // Firestore document ID of the agent (if stored)
    name: string;
    address: string;
    distanceKm: number; // Calculated distance
    operatingHours: string;
    // Add other relevant fields like geo-location, current cash limit, etc.
}

export interface WithdrawalDetails {
    id?: string; // Firestore document ID for the withdrawal request
    userId: string;
    agentId: string;
    agentName?: string; // Optional denormalized agent name
    amount: number;
    otp: string;
    qrData: string;
    status: 'Pending Confirmation' | 'Completed' | 'Expired' | 'Cancelled' | 'Failed';
    createdAt: Timestamp | Date | string; // Allow multiple types
    expiresAt: Timestamp | Date | string;
    completedAt?: Timestamp | Date | string;
    failureReason?: string;
    transactionId?: string; // ID of the final transaction log entry
    updatedAt?: Timestamp | Date | string; // Allow multiple types
    expiresInSeconds?: number; // Calculated on client potentially
}

// --- Wallet Recovery Types ---
export interface RecoveryTask {
    id?: string; // Firestore document ID
    userId: string;
    amount: number;
    originalRecipientUpiId: string;
    recoveryStatus: 'Scheduled' | 'Processing' | 'Completed' | 'Failed';
    scheduledTime: Timestamp | Date | string;
    createdAt: Timestamp | Date | string;
    updatedAt: Timestamp | Date | string;
    failureReason?: string;
    bankUpiId?: string; // The bank account used/attempted for recovery
    recoveryTransactionId?: string; // ID of the successful debit transaction
    walletCreditTransactionId?: string; // ID of the successful wallet credit transaction
}

// --- Booking Types ---
// For Search results
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
// For specific entity details
export interface FlightListing {
    id: string;
    airline: string;
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime: string; // HH:mm
    arrivalTime: string; // HH:mm
    duration: string; // e.g., "2h 30m"
    stops: number;
    price: number;
    refundable?: boolean;
    baggage: { cabin: string; checkin: string };
    imageUrl?: string;
}
// Add other specific listing types like BusListing, TrainListing if needed

// For general booking confirmation (align with backend)
export interface BookingConfirmation {
    status: Transaction['status'];
    message?: string;
    transactionId?: string; // For payment transaction
    bookingId?: string; // Specific booking ID from provider or system
    bookingDetails?: {
        pnr?: string;
        seatNumbers?: string;
        providerMessage?: string;
    } | null;
}

// For Marriage Venue Bookings
export interface MarriageVenue extends BookingSearchResult {
    city: string;
    description?: string;
    amenities?: string[];
    price: number; // Base or starting price
}

export interface MarriageBookingDetails {
    venueId: string;
    venueName: string;
    city: string;
    date: string; // YYYY-MM-DD
    guestCount?: string;
    userName: string;
    userContact: string;
    totalAmount?: number; // Actual booking fee paid
}


// Note: Where Date | string is used, API will return string (likely ISO 8601),
// and the service function should convert it to a Date object for client use.
// Backend types might use Timestamp directly.
