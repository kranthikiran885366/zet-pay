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
  id: string; // Firestore document ID
  userId: string;
  type: string; // Consider using a stricter enum matching backend values e.g., 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Investment' | 'Service Booking' | 'Wallet Top-up' etc.
  name: string; // Payee name, Biller name, Service name, Fund name etc.
  description: string; // Transaction note, plan details, purpose
  amount: number; // Negative for debits, positive for credits/refunds
  date: Date | string; // Allow string initially
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
}

export interface BankAccount {
  id?: string; // Firestore document ID or backend ID
  bankName: string;
  accountNumber: string; // Masked number
  upiId: string; // Generated/linked UPI ID
  userId: string; // Link to the user
  isDefault?: boolean;
  pinLength?: 4 | 6;
  // Add balance if backend provides it securely
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
  createdAt?: Timestamp | Date | string; // Allow multiple types for flexibility
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
  category?: string; // e.g., "Recharge", "Shopping", "Travel"
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
    id?: string; // Firestore ID
    userId: string;
    isScratched: boolean;
    rewardAmount?: number;
    expiryDate: Date | string; // Allow string from API
    message: string; // "You won X" or "Better luck next time"
    sourceOfferId?: string; // Link to original offer if applicable
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
    transactionId?: string; // Backend-generated transaction ID (Firestore ID)
    gatewayTransactionId?: string; // Optional ID from the payment gateway
    message: string;
    usedWalletFallback?: boolean;
    walletTransactionId?: string;
    retryWithDifferentMethod?: boolean; // Suggest retry if card failed but others might work
    errorCode?: string; // Optional error code from gateway/bank
}

// --- Autopay Mandate Types ---
export interface Mandate {
    id?: string; // Backend ID / Firestore ID
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
    mandateUrn?: string; // Unique reference number from NPCI/PSP
}

// --- Loan Types ---
export interface MicroLoanStatus {
    hasActiveLoan: boolean;
    loanId?: string; // Firestore document ID of the active loan
    amountDue?: number;
    dueDate?: Date;
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
    id: string; // Unique ID for the child
    name: string;
    avatarSeed: string;
    balance: number;
    allowanceAmount?: number;
    allowanceFrequency?: 'Daily' | 'Weekly' | 'Monthly' | 'None';
    lastAllowanceDate?: Date | string; // Allow string from backend
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
    date: Date | string; // Allow string from backend
}

// --- Cash Withdrawal ---
export interface ZetAgent {
    id: string;
    name: string;
    address: string;
    distanceKm: number; // Calculated distance
    operatingHours: string;
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
    // Added from backend
    transactionId?: string; // ID of the final transaction log entry
    updatedAt?: Timestamp | Date | string; // Allow multiple types
    expiresInSeconds?: number; // Calculated on client potentially
}


// Note: Where Date | string is used, API will return string (likely ISO 8601),
// and the service function should convert it to a Date object for client use.

    