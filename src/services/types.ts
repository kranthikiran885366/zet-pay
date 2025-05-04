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
  ticketId?: string;
  refundEta?: string;
  blockchainHash?: string;
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


// Note: If using Firestore Timestamps directly on client was intended,
// import Timestamp type from 'firebase/firestore' and use it here.
// However, generally, it's better to work with JS Dates on the client.
