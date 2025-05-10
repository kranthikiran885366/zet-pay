/**
 * @fileOverview Shared type definitions for data structures used across services.
 */
import type { Timestamp } from 'firebase/firestore'; // For client-side date representations that might come from Firestore

// Replicated from user.ts - keep this as the single source of truth
export interface UserProfile {
    id: string; // Corresponds to Firebase Auth UID
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    kycStatus?: 'Verified' | 'Not Verified' | 'Pending';
    createdAt?: Date | string | Timestamp;
    updatedAt?: Date | string | Timestamp;
    notificationsEnabled?: boolean;
    biometricEnabled?: boolean;
    appLockEnabled?: boolean;
    isSmartWalletBridgeEnabled?: boolean;
    smartWalletBridgeLimit?: number;
    defaultPaymentMethod?: 'upi' | 'wallet' | string;
    isSeniorCitizenMode?: boolean;
    familyGroupIds?: string[];
    upiId?: string;
}


export interface Transaction {
  id: string;
  userId: string;
  type: string;
  name: string;
  description: string;
  amount: number;
  date: Date | string | Timestamp;
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled' | 'Refunded' | 'Refunded_To_Wallet';
  avatarSeed?: string;
  upiId?: string;
  billerId?: string;
  loanId?: string;
  ticketId?: string;
  refundEta?: string;
  blockchainHash?: string;
  paymentMethodUsed?: 'UPI' | 'Wallet' | 'Card' | 'NetBanking';
  originalTransactionId?: string;
  operatorReferenceId?: string;
  billerReferenceId?: string;
  planId?: string;
  identifier?: string;
  withdrawalRequestId?: string;
  createdAt?: Date | string | Timestamp;
  updatedAt?: Date | string | Timestamp;
  pspTransactionId?: string; // Added for refund service
  refundTransactionId?: string; // Added for refund service
  failureReason?: string; // Added for refund service
}


export interface BankAccount {
  id?: string;
  bankName: string;
  accountNumber: string; // Masked number
  upiId: string;
  userId: string;
  isDefault?: boolean;
  pinLength?: 4 | 6;
  createdAt?: Date | string | Timestamp;
}


export interface UpiTransactionResult {
  transactionId?: string;
  amount: number;
  recipientUpiId: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'FallbackSuccess';
  message?: string;
  usedWalletFallback?: boolean;
  walletTransactionId?: string;
  ticketId?: string;
  refundEta?: string;
  success?: boolean;
  errorCode?: string;
  mightBeDebited?: boolean;
}


export interface Payee {
  id: string;
  userId: string;
  name: string;
  identifier: string;
  type: 'mobile' | 'bank' | 'dth' | 'fastag';
  avatarSeed?: string;
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
  isFavorite?: boolean;
  isVerified?: boolean; // Added missing field
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface PayeeClient extends Omit<Payee, 'createdAt' | 'updatedAt'> {
    isVerified?: boolean; // Added missing field
    createdAt?: Date;
    updatedAt?: Date;
}

// --- Offer Types ---
export interface Offer {
  id?: string;
  offerId: string;
  description: string;
  imageUrl: string;
  offerType: 'Cashback' | 'Coupon' | 'Discount' | 'Partner';
  terms?: string;
  validUntil?: Date | string | Timestamp;
  category?: string;
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
    id?: string;
    userId: string;
    isScratched: boolean;
    rewardAmount?: number;
    expiryDate: Date | string | Timestamp;
    message: string;
    sourceOfferId?: string;
    createdAt: Date | string | Timestamp;
    scratchedAt?: Date | string | Timestamp;
}

// --- Card Types ---
export interface CardDetails {
    id: string;
    userId: string;
    gatewayToken?: string;
    cardIssuer?: string;
    bankName?: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    cardHolderName?: string;
    cardType: 'Credit' | 'Debit';
    isPrimary?: boolean;
    createdAt?: Timestamp | Date | string;
}

export interface CardPaymentResult {
    success: boolean;
    transactionId?: string;
    gatewayTransactionId?: string;
    message: string;
    usedWalletFallback?: boolean;
    walletTransactionId?: string;
    retryWithDifferentMethod?: boolean;
    errorCode?: string;
}

// --- Autopay Mandate Types ---
export interface Mandate {
    id?: string;
    userId: string;
    merchantName: string;
    upiId: string;
    maxAmount: number;
    frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented';
    startDate: Date | string | Timestamp;
    validUntil: Date | string | Timestamp;
    status: 'Active' | 'Paused' | 'Cancelled' | 'Failed' | 'Pending Approval';
    createdAt?: Date | string | Timestamp;
    updatedAt?: Date | string | Timestamp;
    mandateUrn?: string;
    pspReferenceId?: string;
}

// --- BNPL Types ---
export interface BnplDetails {
    userId: string;
    isActive: boolean;
    creditLimit: number;
    providerName?: string;
    partnerBank?: string;
    activationDate?: Timestamp | Date | string;
    lastUpdated?: Timestamp | Date | string;
    usedLimit?: number; // Added from bnpl.js service
}

export interface BnplStatement {
    id?: string;
    userId: string;
    statementId: string;
    statementPeriodStart: Timestamp | Date | string;
    statementPeriodEnd: Timestamp | Date | string;
    dueDate: Timestamp | Date | string;
    dueAmount: number;
    minAmountDue: number;
    isPaid: boolean;
    paidDate?: Timestamp | Date | string;
    transactions?: BnplTransaction[];
    lastPaymentAmount?: number; // Added from bnpl.js
    lastPaymentDate?: Timestamp | Date | string; // Added from bnpl.js
    lastPaymentMethod?: string; // Added from bnpl.js
    updatedAt?: Timestamp | Date | string; // Added from bnpl.js
}

export interface BnplTransaction {
    id?: string;
    userId: string;
    statementId: string;
    originalTransactionId: string; // Renamed from transactionId for clarity
    date: Timestamp | Date | string;
    merchantName: string;
    amount: number;
}

// --- Cash Withdrawal Types ---
export interface ZetAgent {
    id: string;
    name: string;
    address: string;
    distanceKm: number;
    operatingHours: string;
    lat?: number; // Added for map display
    lon?: number; // Added for map display
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
    holdTransactionId?: string;
}

// --- Wallet Recovery Types ---
export interface RecoveryTask {
    id?: string;
    userId: string;
    amount: number;
    originalRecipientUpiId: string;
    recoveryStatus: 'Scheduled' | 'Processing' | 'Completed' | 'Failed';
    scheduledTime: Timestamp | Date | string;
    createdAt: Timestamp | Date | string;
    updatedAt: Timestamp | Date | string;
    failureReason?: string;
    bankUpiId?: string;
    recoveryTransactionId?: string;
    walletCreditTransactionId?: string;
}

// --- Booking Types ---
export interface BookingSearchResult {
    id: string;
    name: string;
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event' | 'marriage' | 'car' | 'bike'; // Added car and bike
    imageUrl?: string;
    priceRange?: string;
    rating?: number;
    location?: string;
    capacity?: number;
    description?: string;
    amenities?: string[];
    price?: number;
    // Car/Bike specific summary fields (can be added to the base or kept in specific types)
    transmission?: string;
    fuelType?: string;
    seats?: number;
    pricePerDay?: number; // For cars
    pricePerHour?: number; // For bikes
    kmsLimit?: string;
    isAvailable?: boolean; // For cars
    availability?: 'Available' | 'In Use' | 'Low Battery'; // For bikes
    batteryPercent?: number; // For bikes
    requiresHelmet?: boolean; // For bikes
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
    // price is already in BookingSearchResult
    refundable?: boolean;
    baggage: { cabin: string; checkin: string };
}

export interface CarListing extends BookingSearchResult {
    // Type already ensures transmission, fuelType, seats, pricePerDay, kmsLimit, isAvailable exist
}

export interface BikeListing extends BookingSearchResult {
    // Type already ensures pricePerHour, pricePerDay, availability, batteryPercent, requiresHelmet exist
}

export interface BookingConfirmation {
    status: Transaction['status'] | 'Pending Approval' | 'Confirmed';
    message?: string;
    transactionId?: string;
    bookingId?: string;
    bookingDetails?: {
        pnr?: string;
        seatNumbers?: string;
        providerMessage?: string;
        flightDetails?: Pick<FlightListing, 'airline' | 'flightNumber' | 'departureTime' | 'arrivalTime' | 'departureAirport' | 'arrivalAirport'>;
        providerConfirmationId?: string; // Added from bookingProviderService
        // busDetails?: ...
        // trainDetails?: ...
    } | null;
}

export interface MarriageVenue extends BookingSearchResult {
    city: string;
    requiresApproval?: boolean;
    bookingFee?: number;
    contact?: string; // Added from bookingProviderService
}

export interface MarriageBookingDetails {
    venueId: string;
    venueName: string;
    city: string;
    date: string;
    guestCount?: string;
    userName: string;
    userContact: string;
    userEmail: string;
    specialRequests?: string;
    totalAmount?: number;
    userId?: string;
    paymentTransactionId?: string;
    status?: 'Pending Approval' | 'Confirmed' | 'Cancelled' | 'Completed';
    createdAt?: Timestamp | Date | string; // Consistent with other types
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
    userId: string; // Parent's UID
    childId: string;
    description: string;
    amount: number;
    date: Date | string | Timestamp;
}

// --- Micro Loan Types ---
export interface MicroLoanEligibility {
    eligible: boolean;
    limit: number;
    message?: string;
}
export interface MicroLoanStatus {
    hasActiveLoan: boolean;
    loanId?: string;
    amountDue?: number;
    dueDate?: Date | string | Timestamp;
    purpose?: 'General' | 'Education';
}
export interface MicroLoanApplicationResult {
    success: boolean;
    loanId?: string;
    dueDate?: Date; // From backend
    message?: string;
}
export interface MicroLoanRepaymentResult {
    success: boolean;
    message?: string;
}